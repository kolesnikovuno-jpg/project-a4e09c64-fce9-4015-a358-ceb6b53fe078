import { createHash, randomBytes } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createClient } from "@supabase/supabase-js";
import { getEggStorageConfig } from "../src/server/eggStorageConfig.js";

type Request = IncomingMessage & { body?: unknown };
const spheres = new Set(["marketing","legal","design","production","testDrive","procurement","commerce","retail"]);
const validUuid = (v:unknown):v is string => typeof v==="string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const respond=(res:ServerResponse,status:number,value:unknown)=>{res.statusCode=status;res.end(JSON.stringify(value));};
async function body(req:Request):Promise<Record<string,unknown>>{
  if(req.body !== undefined){const value=typeof req.body==="string"?JSON.parse(req.body):req.body;return value && typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};}
  const chunks:Buffer[]=[];let total=0;
  for await(const chunk of req){const b=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk as Uint8Array);total+=b.length;if(total>16000)throw Error("body_too_large");chunks.push(b);}
  const value=JSON.parse(Buffer.concat(chunks).toString("utf8"));return value && typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};
}
export default async function handler(req:Request,res:ServerResponse){
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Cache-Control","private, no-store");res.setHeader("Vary","Authorization");res.setHeader("X-Content-Type-Options","nosniff");
  if(req.method!=="POST")return respond(res,405,{error:"method_not_allowed"});
  const bearer=/^Bearer\s+(\S+)$/i.exec(req.headers.authorization??"");
  if(!bearer)return respond(res,401,{error:"sign_in_required"});
  const cfg=getEggStorageConfig(process.env);if(!cfg)return respond(res,503,{error:"not_configured"});
  try {
    const auth=createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:identity,error:authError}=await auth.auth.getUser(bearer[1]);
    const user=identity.user;
    if(authError||!user?.id)return respond(res,401,{error:"invalid_session"});
    const db=createClient(cfg.url,cfg.serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const input=await body(req);
    if(input.action==="create"){
      const projectId=input.projectId,email=typeof input.email==="string"?input.email.trim().toLowerCase():"";
      const role=input.role, assigned=input.spheres;
      if(!validUuid(projectId)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>320||!["contributor","observer"].includes(String(role))||!Array.isArray(assigned)||assigned.length>8||!assigned.every(s=>typeof s==="string"&&spheres.has(s))||new Set(assigned).size!==assigned.length)
        return respond(res,400,{error:"invalid_invitation"});
      if(role==="contributor"&&assigned.length===0)return respond(res,400,{error:"sphere_required"});
      const {data:project,error:projectError}=await db.from("egg_engine_projects").select("id").eq("id",projectId).eq("owner_id",user.id).maybeSingle();
      if(projectError)return respond(res,503,{error:"database_unavailable"});
      if(!project)return respond(res,403,{error:"not_project_author"});
      if(user.email?.toLowerCase()===email)return respond(res,400,{error:"author_already_has_access"});
      const token=randomBytes(32).toString("base64url"),hash=createHash("sha256").update(token).digest("hex");
      const {error}=await db.from("egg_project_invites").insert({project_id:projectId,invited_email:email,invited_by:user.id,role,spheres:assigned,token_hash:hash,expires_at:new Date(Date.now()+7*86400000).toISOString()});
      if(error)return respond(res,503,{error:"database_unavailable"});
      return respond(res,201,{token,expiresInDays:7});
    }
    if(input.action==="accept"){
      const token=input.token;
      if(typeof token!=="string"||!/^[a-zA-Z0-9_-]{43}$/.test(token))return respond(res,400,{error:"invalid_invite_token"});
      if(!user.email || !user.email_confirmed_at)return respond(res,403,{error:"verified_email_required"});
      const hash=createHash("sha256").update(token).digest("hex");
      const {data:invite,error}=await db.from("egg_project_invites").select("id,project_id,invited_email,role,spheres,expires_at,accepted_at,revoked_at").eq("token_hash",hash).maybeSingle();
      if(error)return respond(res,503,{error:"database_unavailable"});
      if(!invite||invite.revoked_at||invite.accepted_at||new Date(invite.expires_at).getTime()<=Date.now())return respond(res,410,{error:"invite_expired_or_used"});
      if(user.email.toLowerCase()!==invite.invited_email)return respond(res,403,{error:"invite_for_different_email"});
      const {error:memberError}=await db.from("egg_project_members").upsert({project_id:invite.project_id,user_id:user.id,role:invite.role,spheres:invite.spheres},{onConflict:"project_id,user_id"});
      if(memberError)return respond(res,503,{error:"membership_unavailable"});
      const {data:accepted,error:markError}=await db.from("egg_project_invites").update({accepted_by:user.id,accepted_at:new Date().toISOString()}).eq("id",invite.id).is("accepted_at",null).is("revoked_at",null).select("project_id").maybeSingle();
      if(markError||!accepted)return respond(res,409,{error:"invite_already_accepted"});
      return respond(res,200,{projectId:invite.project_id,role:invite.role});
    }
    return respond(res,400,{error:"invalid_action"});
  } catch{return respond(res,400,{error:"invalid_request"});}
}

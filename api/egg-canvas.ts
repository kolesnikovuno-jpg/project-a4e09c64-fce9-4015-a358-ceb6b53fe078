import type {IncomingMessage,ServerResponse} from "node:http";
import {createClient} from "@supabase/supabase-js";
import {getEggStorageConfig} from "../src/server/eggStorageConfig.js";

/** Author-owned fragment bridge. Agent findings remain in egg_field_items, never in approved Core. */
export default async function handler(req:IncomingMessage & {body?:unknown},res:ServerResponse){
 const send=(status:number,data:unknown)=>{res.statusCode=status;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store, private");res.end(JSON.stringify(data));};
 if(req.method!=="GET"&&req.method!=="POST")return send(405,{ok:false,error:"method_not_allowed"});
 const cfg=getEggStorageConfig(process.env);
 if(!cfg)return send(503,{ok:false,error:"egg_engine_not_configured"});
 const token=/^Bearer\\s+(\\S+)$/i.exec(String(req.headers.authorization||""))?.[1];
 if(!token||token.startsWith("egg_v1_"))return send(401,{ok:false,error:"author_session_required"});
 const auth=createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await auth.auth.getUser(token);
 if(authError||!user)return send(401,{ok:false,error:"invalid_session"});
 const db=createClient(cfg.url,cfg.serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
 try{
  const url=new URL(req.url||"/","https://local.invalid");
  const raw=req.method==="POST"?(typeof req.body==="string"?JSON.parse(req.body):req.body):null;
  const data=raw&&typeof raw==="object"&&!Array.isArray(raw)?raw as Record<string,unknown>:null;
  const projectId=req.method==="GET"?url.searchParams.get("projectId"):data?.projectId;
  if(typeof projectId!=="string"||!/^[0-9a-f-]{36}$/i.test(projectId))return send(400,{ok:false,error:"invalid_project"});
  const {data:project,error:projectError}=await db.from("egg_engine_projects").select("id").eq("id",projectId).eq("owner_id",user.id).maybeSingle();
  if(projectError)return send(503,{ok:false,error:"project_lookup_failed"});
  if(!project)return send(403,{ok:false,error:"project_access_denied"});
  if(req.method==="GET"){
   const {data:items,error}=await db.from("egg_field_items").select("id,title,content,source_kind,claim_type,created_at,actor_kind,operation_id").eq("project_id",projectId).order("created_at",{ascending:false}).limit(250);
   if(error)return send(503,{ok:false,error:"field_read_failed"});
   return send(200,{ok:true,items});
  }
  if(!data||data.command!=="save_fragment")return send(400,{ok:false,error:"invalid_command"});
  const fragment=data.fragment;
  if(!fragment||typeof fragment!=="object"||Array.isArray(fragment))return send(400,{ok:false,error:"invalid_fragment"});
  const f=fragment as Record<string,unknown>;
  if(typeof f.id!=="string"||!/^[0-9a-f-]{36}$/i.test(f.id)||typeof f.note!=="string"||f.note.length>2000||!["x","y","w","h"].every(k=>typeof f[k]==="number"&&Number.isFinite(f[k])&&Number(f[k])>=0&&Number(f[k])<=1000))return send(400,{ok:false,error:"invalid_fragment"});
  const content=JSON.stringify({kind:"canvas_fragment",fragment:{id:f.id,x:f.x,y:f.y,w:f.w,h:f.h,note:f.note}});
  const {data:inserted,error}=await db.from("egg_field_items").insert({project_id:projectId,sphere:null,flow:"field",origin:"internal",source_kind:"human",title:"Холст / фрагмент "+f.id,content,claim_type:"proposal",actor_kind:"user",created_by:user.id,operation_id:"canvas_"+crypto.randomUUID().replace(/-/g,"")}).select("id").single();
  if(error)return send(503,{ok:false,error:"fragment_save_failed"});
  return send(201,{ok:true,id:inserted.id});
 }catch{return send(400,{ok:false,error:"invalid_request"});}
}

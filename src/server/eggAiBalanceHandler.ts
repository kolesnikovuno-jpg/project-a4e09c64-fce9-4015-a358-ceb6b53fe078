import type {IncomingMessage,ServerResponse} from "node:http";
import {createClient} from "@supabase/supabase-js";
import {getEggStorageConfig} from "../src/server/eggStorageConfig.js";
const ids=new Set(["matter","idea","marketing","design","testDrive","commerce","legal","production","procurement","retail"]);
const uuid=(v:unknown)=>typeof v==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const reply=(res:ServerResponse,status:number,data:unknown)=>{res.statusCode=status;res.end(JSON.stringify(data));};
export async function aiBalanceHandler(req:IncomingMessage&{body?:unknown},res:ServerResponse){
 res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","private, no-store");res.setHeader("Vary","Authorization");
 if(req.method!=="GET"&&req.method!=="POST")return reply(res,405,{error:"method_not_allowed"});
 const bearer=/^Bearer\s+(\S+)$/i.exec(req.headers.authorization??"");if(!bearer)return reply(res,401,{error:"sign_in_required"});
 const cfg=getEggStorageConfig(process.env);if(!cfg)return reply(res,503,{error:"not_configured"});
 try{
  const auth=createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await auth.auth.getUser(bearer[1]);if(authError||!user)return reply(res,401,{error:"invalid_session"});
  const db=createClient(cfg.url,cfg.serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  let input:Record<string,unknown>={};
  if(req.method==="GET"){input.projectId=new URL(req.url??"/","https://egg.invalid").searchParams.get("project");}
  else {let raw=req.body;if(raw===undefined){const chunks:Buffer[]=[];let size=0;for await(const chunk of req){const b=Buffer.from(chunk);size+=b.length;if(size>4096)return reply(res,413,{error:"too_large"});chunks.push(b);}raw=Buffer.concat(chunks).toString("utf8");}if(typeof raw==="string")raw=JSON.parse(raw);if(!raw||typeof raw!=="object"||Array.isArray(raw))return reply(res,400,{error:"invalid_request"});input=raw as Record<string,unknown>;}
  if(!uuid(input.projectId))return reply(res,400,{error:"invalid_project"});
  const projectId=input.projectId as string;
  const {data:owner,error:ownerError}=await db.from("egg_engine_projects").select("id").eq("id",projectId).eq("owner_id",user.id).maybeSingle();
  if(ownerError)return reply(res,503,{error:"database_unavailable"});
  if(!owner)return reply(res,403,{error:"not_project_author"});
  if(req.method==="GET"){
   const {data,error}=await db.from("egg_sphere_settings").select("sphere,ai_share").eq("project_id",projectId);
   if(error)return reply(res,503,{error:"settings_unavailable"});
   return reply(res,200,{shares:Object.fromEntries((data??[]).filter(v=>ids.has(v.sphere)).map(v=>[v.sphere,v.ai_share]))});
  }
  const sphere=input.sphere,value=input.value;
  if(typeof sphere!=="string"||!ids.has(sphere)||typeof value!=="number"||!Number.isInteger(value)||value<0||value>100||value%5!==0)return reply(res,400,{error:"invalid_ai_share"});
  const {data:existing,error:lookupError}=await db.from("egg_sphere_settings").select("mode").eq("project_id",projectId).eq("sphere",sphere).maybeSingle();
  if(lookupError)return reply(res,503,{error:"settings_unavailable"});
  const {error}=await db.from("egg_sphere_settings").upsert({project_id:projectId,sphere,mode:existing?.mode??"symbiosis",ai_share:value,updated_by:user.id,updated_at:new Date().toISOString()},{onConflict:"project_id,sphere"});
  if(error)return reply(res,503,{error:"settings_unavailable"});
  return reply(res,200,{sphere,value});
 }catch{return reply(res,400,{error:"invalid_request"});}
}

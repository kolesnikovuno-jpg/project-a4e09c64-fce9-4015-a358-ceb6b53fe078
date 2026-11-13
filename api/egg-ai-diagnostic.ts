import type {IncomingMessage,ServerResponse} from "node:http";
import {createClient} from "@supabase/supabase-js";
import {getEggStorageConfig} from "../src/server/eggStorageConfig.js";
import {providerFromEnv} from "./egg-flow-ai.js";
export const config={maxDuration:30};
export default async function handler(req:IncomingMessage,res:ServerResponse){
 const send=(status:number,body:unknown)=>{res.statusCode=status;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store, private");res.end(JSON.stringify(body));};
 if(req.method!=="GET")return send(405,{error:"method_not_allowed"});
 const cfg=getEggStorageConfig(process.env);if(!cfg)return send(503,{error:"storage_not_configured"});
 const bearer=/^Bearer\s+(\S+)$/i.exec(String(req.headers.authorization??""));if(!bearer)return send(401,{error:"sign_in_required"});
 const auth=createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user}}=await auth.auth.getUser(bearer[1]);if(!user)return send(401,{error:"invalid_session"});
 const provider=providerFromEnv(process.env,req.headers["x-vercel-oidc-token"]);
 if(!provider)return send(503,{error:"ai_provider_not_configured"});
 const keySource=process.env.EGG_AUTOMATION_ENDPOINT?"custom_endpoint":process.env.AI_GATEWAY_API_KEY?.trim()?"explicit_gateway_key":"vercel_oidc";
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);
 try{
  // Auth-only probe; no generation, user content, or credit usage.
  const response=await fetch("https://ai-gateway.vercel.sh/v1/models",{method:"GET",headers:{Authorization:"Bearer "+provider.key},redirect:"error",signal:controller.signal});
  const result={ok:response.ok,httpStatus:response.status,keySource,providerKind:provider.kind,model:provider.model,environment:process.env.VERCEL_ENV??"unknown",branch:process.env.VERCEL_GIT_COMMIT_REF??"unknown"};
  console.info("egg_gateway_auth_probe",{...result,model:undefined});
  return send(200,result);
 }catch(e){return send(502,{ok:false,error:controller.signal.aborted?"gateway_timeout":"gateway_unreachable",keySource,environment:process.env.VERCEL_ENV??"unknown"});}
 finally{clearTimeout(timeout);}
}

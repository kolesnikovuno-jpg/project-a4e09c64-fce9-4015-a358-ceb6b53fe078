/** Read-only AI synthesis: Yolk instruction -> Idea proposal. Never mutates project. */
import type {IncomingMessage,ServerResponse} from "node:http";
import {createClient} from "@supabase/supabase-js";
import {z} from "zod";
import {getEggStorageConfig} from "../src/server/eggStorageConfig.js";
import {providerFromEnv} from "./egg-flow-ai.js";
import {EGG_SPHERES} from "../src/lib/eggEngine.js";
export const config={maxDuration:60};
type Request=IncomingMessage&{body?:unknown};
const inputSchema=z.object({projectId:z.string().uuid(),instruction:z.string().trim().min(3).max(3000)}).strict();
const resultSchema=z.object({
  brief:z.string().trim().min(5).max(3000),
  rationale:z.string().trim().min(5).max(1200),
  activeSpheres:z.array(z.enum(EGG_SPHERES)).min(1).max(8),
  dnaConflict:z.string().max(1200),
  needsAuthorClarification:z.boolean(),
}).strict();
const send=(res:ServerResponse,status:number,data:unknown)=>{
  res.statusCode=status;res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Cache-Control","no-store, private");res.end(JSON.stringify(data));
};
export default async function handler(req:Request,res:ServerResponse){
  if(req.method!=="POST")return send(res,405,{ok:false,error:"method_not_allowed"});
  if(req.headers.origin){
    try{const origin=new URL(req.headers.origin);
      const host=String(req.headers["x-forwarded-host"]||req.headers.host||"").split(",")[0].trim();
      if(origin.protocol!=="https:"||origin.host!==host)return send(res,403,{ok:false,error:"cross_origin_forbidden"});
    }catch{return send(res,403,{ok:false,error:"cross_origin_forbidden"});}
  }
  const cfg=getEggStorageConfig(process.env);
  if(!cfg)return send(res,503,{ok:false,error:"egg_engine_not_configured"});
  const bearer=/^Bearer\\s+(\\S+)$/i.exec(String(req.headers.authorization??""));
  if(!bearer||bearer[1].startsWith("egg_v1_"))return send(res,401,{ok:false,error:"author_session_required"});
  let raw:unknown;
  try{
    if(req.body!==undefined)raw=typeof req.body==="string"?JSON.parse(req.body):req.body;
    else{let text="";for await(const chunk of req){text+=chunk.toString();if(text.length>5000)throw Error("too_large");}raw=JSON.parse(text);}
  }catch{return send(res,400,{ok:false,error:"invalid_request"});}
  const parsed=inputSchema.safeParse(raw);
  if(!parsed.success)return send(res,400,{ok:false,error:"invalid_request"});
  const auth=createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const {data:{user}}=await auth.auth.getUser(bearer[1]);
  if(!user)return send(res,401,{ok:false,error:"invalid_author_session"});
  const db=createClient(cfg.url,cfg.serviceKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const {data:row,error}=await db.from("egg_engine_projects").select("document").eq("id",parsed.data.projectId).eq("owner_id",user.id).maybeSingle();
  if(error)return send(res,503,{ok:false,error:"database_unavailable"});
  if(!row)return send(res,404,{ok:false,error:"project_not_found"});
  const project=row.document as {seed?:{text?:string};concepts?:unknown[];flowCycles?:unknown[]};
  const provider=providerFromEnv(process.env,req.headers["x-vercel-oidc-token"]);
  if(!provider)return send(res,503,{ok:false,error:"ai_provider_not_configured"});
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),35000);
  try{
    const response=await fetch(provider.url,{method:"POST",signal:controller.signal,headers:{
      Authorization:"Bearer "+provider.key,"Content-Type":"application/json",
    },body:JSON.stringify({
      model:provider.model,store:false,max_output_tokens:1300,
      text:{format:{type:"json_object"}},
      instructions:"You are the EGG Idea sphere. Return ONLY a JSON object with exactly brief, rationale, activeSpheres, dnaConflict, needsAuthorClarification. Preserve original Author DNA. Distinguish hypotheses from verified facts. Choose the MINIMUM relevant sphere IDs from marketing, legal, design, production, testDrive, procurement, commerce, retail. If instruction conflicts with DNA, set needsAuthorClarification true. Never claim to have tested or searched anything. Do not execute any work.",
      input:JSON.stringify({dna:project.seed?.text??"",concepts:(project.concepts??[]).slice(-3),instruction:parsed.data.instruction}),
    })});
    if(!response.ok)return send(res,502,{ok:false,error:response.status===429?"ai_rate_limited":"model_request_failed"});
    const data=await response.json() as {status?:string;output?:Array<{type?:string;content?:Array<{type?:string;text?:string}>}>};
    if(data.status!=="completed")return send(res,502,{ok:false,error:"model_incomplete"});
    const text=data.output?.flatMap(x=>x.type==="message"?x.content??[]:[]).filter(x=>x.type==="output_text").map(x=>x.text??"").join("")??"";
    const result=resultSchema.parse(JSON.parse(text));
    return send(res,200,{ok:true,proposal:result});
  }catch{return send(res,502,{ok:false,error:controller.signal.aborted?"provider_timeout":"invalid_ai_output"});}
  finally{clearTimeout(timeout);}
}

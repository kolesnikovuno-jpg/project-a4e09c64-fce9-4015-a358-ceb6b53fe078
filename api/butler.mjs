import {createStudioButler} from "../butler/studio-runtime.mjs";
export default async function handler(req,res){
 res.setHeader("Cache-Control","no-store");
 console.info("butler_request",req.method);
 if(req.method!=="POST") return res.status(405).json({error:"method_not_allowed"});
 const origin=req.headers.origin;
 if(origin!== "https://"+req.headers.host) return res.status(403).json({error:"forbidden"});
 if(!req.headers["content-type"]?.startsWith("application/json")) return res.status(415).json({error:"invalid_content_type"});
 try{
 const dialogue=createStudioButler({env:process.env,authorizeBudget:async()=>{
 const endpoint=new URL("/rest/v1/rpc/butler_reserve_request",process.env.SUPABASE_URL);
 const response=await fetch(endpoint,{method:"POST",headers:{apikey:process.env.BUTLER_SUPABASE_PUBLISHABLE_KEY,"Content-Type":"application/json"},body:JSON.stringify({p_secret:process.env.BUTLER_BUDGET_SECRET}),signal:AbortSignal.timeout(5000)});
 return response.ok && (await response.json())===true;
 }});
 const result=await dialogue(typeof req.body==="string"?JSON.parse(req.body):req.body);
 console.info("butler_result",result.status);
 return res.status(result.status).json(result.body);
 }catch(e){console.warn("butler_handler_failure",e?.name);return res.status(503).json({error:"unavailable"});}
}

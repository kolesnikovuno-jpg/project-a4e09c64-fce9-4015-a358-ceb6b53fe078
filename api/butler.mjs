import {createStudioButler} from "../butler/studio-runtime.mjs";
export default async function handler(req,res){
 res.setHeader("Cache-Control","no-store");
 if(req.method!=="POST") return res.status(405).json({error:"method_not_allowed"});
 const origin=req.headers.origin;
 if(origin!== "https://"+req.headers.host) return res.status(403).json({error:"forbidden"});
 if(!req.headers["content-type"]?.startsWith("application/json")) return res.status(415).json({error:"invalid_content_type"});
 try{
 const dialogue=createStudioButler({env:process.env,authorizeBudget:async()=>{
 // Fail closed until a durable, server-authenticated budget reservation is installed.
 return false;
 }});
 const result=await dialogue(req.body);
 return res.status(result.status).json(result.body);
 }catch{return res.status(503).json({error:"unavailable"});}
}

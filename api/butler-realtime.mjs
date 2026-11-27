import {createHmac,timingSafeEqual} from "node:crypto";
import {waitUntil} from "@vercel/functions";
export const config={maxDuration:180};
export default async function handler(req,res){
 res.setHeader("Cache-Control","no-store");
 if(req.method!=="POST"||req.headers.origin!=="https://"+req.headers.host)return res.status(403).json({error:"forbidden"});
 const key=process.env.OPENAI_API_KEY,secret=process.env.BUTLER_BUDGET_SECRET;
 if(!key||!secret)return res.status(503).json({error:"configuration"});
 const sign=id=>createHmac("sha256",secret).update("voice:"+id).digest("hex");
 const headers={Authorization:"Bearer "+key};
 try{
 const body=typeof req.body==="string"?JSON.parse(req.body):req.body;
 if(body?.action==="stop"){
 const {id,signature}=body;
 if(typeof id!=="string"||!/^rtc_[a-zA-Z0-9_-]+$/.test(id)||typeof signature!=="string"||!/^[a-f0-9]{64}$/.test(signature)||!timingSafeEqual(Buffer.from(signature),Buffer.from(sign(id))))return res.status(403).json({error:"forbidden"});
 const r=await fetch("https://api.openai.com/v1/realtime/calls/"+id+"/hangup",{method:"POST",headers,signal:AbortSignal.timeout(5000)});
 return res.status(r.ok?200:502).json({closed:r.ok});
 }
 if(process.env.BUTLER_REALTIME_ENABLED!=="true")return res.status(503).json({error:"voice_disabled"});
 if(typeof body?.sdp!=="string"||body.sdp.length>32000||!body.sdp.startsWith("v=0"))return res.status(400).json({error:"sdp"});
 const base=process.env.SUPABASE_URL,h={apikey:process.env.BUTLER_SUPABASE_PUBLISHABLE_KEY,"Content-Type":"application/json"};
 const budget=await fetch(base+"/rest/v1/rpc/butler_reserve_voice",{method:"POST",headers:h,body:JSON.stringify({p_secret:secret}),signal:AbortSignal.timeout(5000)});
 if(!budget.ok||await budget.json()!==true)return res.status(429).json({error:"limit"});
 const knowledge=await fetch(base+"/rest/v1/rpc/butler_public_records",{headers:h,signal:AbortSignal.timeout(5000)});
 if(!knowledge.ok)return res.status(503).json({error:"knowledge"});
 const facts=await knowledge.json();if(!Array.isArray(facts)||!facts.length)return res.status(503).json({error:"knowledge"});
 const form=new FormData();form.set("sdp",body.sdp);form.set("session",JSON.stringify({type:"realtime",model:"gpt-realtime-mini",instructions:"You are Butler, AI representative of kolesnikov.studio. Detect and speak the visitor's language. Behave like a discreet human studio butler, not a presenter. Speak with a very gentle, mellow, low-energy masculine delivery, as in a quiet private conversation. Use relaxed articulation, soft consonants, restrained intonation, natural pauses and unhurried pacing. Avoid announcer projection, emphatic pitch rises, theatricality, whispering and sales enthusiasm. Match the visitor's language and conversational pace. For a greeting, respond with a greeting only or one short offer of help. Default to one or two short sentences per turn, then wait. Answer only what was asked. Ask at most one relevant clarifying question at a time. Never recite the studio overview unless explicitly requested. Expand only when invited. Do not fill silence. Use only approved studio facts. Never promise prices or contracts or claim to register requests. Offer the existing inquiry form. Facts: "+JSON.stringify(facts).slice(0,16000),audio:{input:{transcription:{model:"gpt-4o-mini-transcribe"},turn_detection:{type:"server_vad",create_response:true,interrupt_response:true}},output:{voice:"cedar"}},tools:[{type:"function",name:"show_studio_object",description:"Show a public studio object when the visitor explicitly asks to see it.",parameters:{type:"object",properties:{object:{type:"string",enum:["lyra","nava"]}},required:["object"],additionalProperties:false}}],max_output_tokens:500}));
 const r=await fetch("https://api.openai.com/v1/realtime/calls",{method:"POST",headers,body:form,signal:AbortSignal.timeout(15000)});
 if(!r.ok){console.warn("butler_realtime_provider",r.status);return res.status(503).json({error:"provider"});}
 const id=r.headers.get("location")?.split("/").pop();if(!id||!/^rtc_[a-zA-Z0-9_-]+$/.test(id))return res.status(503).json({error:"call_id"});
 waitUntil((async()=>{await new Promise(resolve=>setTimeout(resolve,120000));for(let i=0;i<3;i++){try{const stop=await fetch("https://api.openai.com/v1/realtime/calls/"+id+"/hangup",{method:"POST",headers,signal:AbortSignal.timeout(5000)});if(stop.ok||stop.status===404)return;}catch{}await new Promise(resolve=>setTimeout(resolve,1000));}console.error("butler_voice_expiry_failed",id);})());
 return res.status(200).json({sdp:await r.text(),id,signature:sign(id)});
 }catch{return res.status(503).json({error:"unavailable"});}
}
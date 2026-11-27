export default async function handler(req,res){
 res.setHeader("Cache-Control","no-store");
 if(req.method!=="POST"||req.headers.origin!=="https://"+req.headers.host)return res.status(403).json({error:"forbidden"});
 if(!process.env.BUTLER_REALTIME_ENABLED)return res.status(503).json({error:"voice_disabled"});
 try{
 const base=process.env.SUPABASE_URL,headers={apikey:process.env.BUTLER_SUPABASE_PUBLISHABLE_KEY,"Content-Type":"application/json"};
 const budget=await fetch(base+"/rest/v1/rpc/butler_reserve_request",{method:"POST",headers,body:JSON.stringify({p_secret:process.env.BUTLER_BUDGET_SECRET}),signal:AbortSignal.timeout(5000)});
 if(!budget.ok||await budget.json()!==true)return res.status(429).json({error:"limit"});
 const knowledge=await fetch(base+"/rest/v1/rpc/butler_public_records",{headers,signal:AbortSignal.timeout(5000)});
 if(!knowledge.ok)return res.status(503).json({error:"knowledge"});
 const facts=await knowledge.json();if(!Array.isArray(facts)||!facts.length)return res.status(503).json({error:"knowledge"});
 const r=await fetch("https://api.openai.com/v1/realtime/client_secrets",{method:"POST",headers:{Authorization:"Bearer "+process.env.OPENAI_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({expires_after:{anchor:"created_at",seconds:60},session:{type:"realtime",model:process.env.BUTLER_REALTIME_MODEL||"gpt-realtime-mini",instructions:"You are Butler, an AI representative of kolesnikov.studio. Detect and speak the visitor's language. Greet briefly; use only these approved facts for studio claims. Never promise prices or contracts or claim to register a request. Offer the existing inquiry form. Facts: "+JSON.stringify(facts).slice(0,16000),audio:{input:{transcription:{model:"gpt-4o-mini-transcribe"},turn_detection:{type:"server_vad",create_response:true,interrupt_response:true}},output:{voice:"marin"}},max_output_tokens:500}}),signal:AbortSignal.timeout(15000)});
 if(!r.ok){console.warn("butler_realtime_provider",r.status);return res.status(503).json({error:"provider"});}
 const d=await r.json();return res.status(200).json({value:d.value});
 }catch{return res.status(503).json({error:"unavailable"});}
}
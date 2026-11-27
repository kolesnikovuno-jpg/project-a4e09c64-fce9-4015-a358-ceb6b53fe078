export default async function handler(req,res){
 res.setHeader("Cache-Control","no-store");
 if(req.method!=="POST")return res.status(405).json({error:"method"});
 if(req.headers.origin!=="https://"+req.headers.host)return res.status(403).json({error:"origin"});
 if(!req.headers["content-type"]?.startsWith("application/json"))return res.status(415).json({error:"format"});
 try{
 const {contact,summary,consent}=typeof req.body==="string"?JSON.parse(req.body):req.body??{};
 if(consent!==true||typeof contact!=="string"||!contact.trim()||contact.length>320||typeof summary!=="string"||!summary.trim()||summary.length>4000)return res.status(400).json({error:"invalid"});
 const r=await fetch(new URL("/rest/v1/rpc/butler_submit_inquiry",process.env.SUPABASE_URL),{method:"POST",headers:{apikey:process.env.BUTLER_SUPABASE_PUBLISHABLE_KEY,"Content-Type":"application/json"},body:JSON.stringify({p_secret:process.env.BUTLER_BUDGET_SECRET,p_contact:contact,p_summary:summary,p_consent:true}),signal:AbortSignal.timeout(5000)});
 const id=r.ok?await r.json():null;
 if(typeof id!=="string")return res.status(503).json({error:"unavailable"});
 let notified=false;
 try{
 const mail=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:"Bearer "+process.env.RESEND_API_KEY,"Content-Type":"application/json","Idempotency-Key":"butler-inquiry/"+id},body:JSON.stringify({from:process.env.BUTLER_MAIL_FROM||"Butler <onboarding@resend.dev>",to:[process.env.BUTLER_MAIL_TO||"kolesnikow.ua@gmail.com"],subject:"Butler — новое обращение "+id,text:"Контакт: "+contact+"\n\nЗапрос:\n"+summary+"\n\nНомер: "+id}),signal:AbortSignal.timeout(8000)});
 notified=mail.ok;console.info("butler_notification",id,mail.status);
 }catch{console.warn("butler_notification_failed",id);}
 return res.status(201).json({id,notified});
 }catch{return res.status(503).json({error:"unavailable"});}
}

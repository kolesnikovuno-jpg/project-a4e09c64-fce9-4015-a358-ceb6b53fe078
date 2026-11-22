/**
 * Lyra -> EGG private daily feed, no names, contacts, notes, raw sessions or
 * Google Ads claim. Authenticated by a distinct high-entropy connector secret.
 * The SHA-256 digest is public; the plaintext token is ONLY in Vercel env.
 *
 * Deployed on Lyra's Supabase project, verify_jwt=false: the function enforces
 * its own private header key BEFORE making any database request.
 */
const EXPECTED_SHA256="94e15ee4c7d6f91c5c0cf2b24b3ed90a1ee9f47e4afacadfca2d9d752f12b852";
const jsonHeaders={
  "content-type":"application/json; charset=utf-8",
  "cache-control":"no-store, private",
  "x-content-type-options":"nosniff",
};
const send=(status:number,data:Record<string,unknown>)=>new Response(JSON.stringify(data),{status,headers:jsonHeaders});
async function authorized(value:string|null){
  if(!value||value.length<32||value.length>256)return false;
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
  const actual=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,"0")).join("");
  let diff=0;for(let i=0;i<EXPECTED_SHA256.length;i++)diff|=EXPECTED_SHA256.charCodeAt(i)^actual.charCodeAt(i);
  return diff===0;
}
const kyivToday=()=>{
  const parts=new Intl.DateTimeFormat("en-US",{timeZone:"Europe/Kyiv",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const get=(kind:string)=>parts.find(p=>p.type===kind)?.value??"";
  return [get("year"),get("month"),get("day")].join("-");
};
Deno.serve(async(req:Request)=>{
  if(req.method!=="GET")return send(405,{ok:false,error:"method_not_allowed"});
  if(!await authorized(req.headers.get("x-egg-feed-token")))return send(401,{ok:false,error:"unauthorized"});
  let date:string;
  try{
    const url=new URL(req.url);
    date=url.searchParams.get("day")??"";
  }catch{return send(400,{ok:false,error:"invalid_request"});}
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||
     !Number.isFinite(Date.parse(date+"T00:00:00Z"))||
     new Date(date+"T00:00:00Z").toISOString().slice(0,10)!==date||
     date>=kyivToday()||
     Date.now()-Date.parse(date+"T00:00:00Z")>100*86400000){
    return send(400,{ok:false,error:"invalid_closed_kyiv_day"});
  }
  const base=Deno.env.get("SUPABASE_URL")??"";
  const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
  if(base!=="https://gdsvwiemdggxboxzbdqd.supabase.co"||!key)
    return send(503,{ok:false,error:"feed_not_configured"});
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),12000);
  try{
    const response=await fetch(base+"/rest/v1/rpc/lyra_egg_daily_snapshot",{
      method:"POST",
      headers:{"content-type":"application/json","apikey":key,"authorization":"Bearer "+key},
      body:JSON.stringify({p_day:date}),
      signal:controller.signal,
    });
    if(!response.ok)return send(503,{ok:false,error:"source_query_unavailable"});
    const result=await response.json() as Record<string,unknown>;
    if(result.day!==date||result.timezone!=="Europe/Kyiv")
      return send(502,{ok:false,error:"source_response_invalid"});
    return send(200,{ok:true,source:"lyra_supabase_daily_v1",metrics:result});
  }catch{
    return send(503,{ok:false,error:"source_transport_unavailable"});
  }finally{clearTimeout(timer);}
});

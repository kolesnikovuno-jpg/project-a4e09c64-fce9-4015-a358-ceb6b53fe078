/**
 * Public-page screenshot prototype for EGG.
 * Delegates rendering to WordPress mShots (no browser binary or API key).
 * This is an experimental cached THUMBNAIL, not a live-tab capture.
 * Important: a user's URL is disclosed to WordPress.com; do not use private URLs.
 */
import type { IncomingMessage, ServerResponse } from "node:http";

type Request=IncomingMessage & {body?:unknown};
const reply=(res:ServerResponse,status:number,value:unknown)=>{
 res.statusCode=status;
 res.setHeader("Content-Type","application/json; charset=utf-8");
 res.setHeader("Cache-Control","no-store, private");
 res.setHeader("X-Content-Type-Options","nosniff");
 res.end(JSON.stringify(value));
};
const validTarget=(input:unknown):string|null=>{
 if(typeof input!=="string"||input.length>2048||/[\u0000-\u001f\u007f]/.test(input))return null;
 try{
  const u=new URL(input);
  if(!["https:","http:"].includes(u.protocol)||u.username||u.password)return null;
  const host=u.hostname.toLowerCase().replace(/\.$/,"");
  if(!host.includes(".")||host.includes(":")||host.includes("[")||host.includes("]"))return null;
  if(/(^|\.)(localhost|local|internal|test|invalid|example|onion)$/.test(host))return null;
  if(/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host))return null;
  if(/^(?:0x[0-9a-f]+|\d+)$/.test(host))return null;
  if(u.port&&u.port!=="80"&&u.port!=="443")return null;
  u.hash="";
  return u.href;
 }catch{return null;}
};
const readPayload=async(req:Request)=>{
 if(req.body!==undefined){
  if(typeof req.body==="string")return JSON.parse(req.body) as unknown;
  return req.body;
 }
 let body="";for await(const chunk of req){body+=String(chunk);if(body.length>5000)throw Error("body_too_large");}
 return JSON.parse(body) as unknown;
};

export default async function handler(req:Request,res:ServerResponse){
 if(req.method!=="POST"){res.setHeader("Allow","POST");return reply(res,405,{ok:false,error:"method_not_allowed"});}
 const origin=req.headers.origin;
 const host=req.headers.host;
 if(origin&&host){
  try{if(new URL(origin).host!==host)return reply(res,403,{ok:false,error:"origin_mismatch"});}
  catch{return reply(res,403,{ok:false,error:"origin_mismatch"});}
 }
 let data:unknown;
 try{data=await readPayload(req);}catch{return reply(res,400,{ok:false,error:"invalid_json"});}
 const input=(data&&typeof data==="object"&&!Array.isArray(data))?(data as {url?:unknown}).url:null;
 const target=validTarget(input);
 if(!target)return reply(res,400,{ok:false,error:"invalid_public_url"});
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),12000);
 try{
  const endpoint="https://s.wordpress.com/mshots/v1/"+encodeURIComponent(target)+"?w=1280&h=960";
  const image=await fetch(endpoint,{signal:controller.signal,redirect:"manual",headers:{Accept:"image/jpeg,image/png,image/webp"}});
  if(image.status===307||image.status===302||image.status===303||image.status===202)
   return reply(res,202,{ok:false,status:"pending",message:"Сервис формирует превью. Повторите запрос."});
  if(!image.ok)return reply(res,502,{ok:false,error:"screenshot_provider_unavailable"});
  const mime=(image.headers.get("content-type")||"").split(";")[0].trim().toLowerCase();
  if(!["image/jpeg","image/png","image/webp"].includes(mime))
   return reply(res,502,{ok:false,error:"screenshot_not_image"});
  const length=Number(image.headers.get("content-length")||0);
  if(length>3_000_000)return reply(res,502,{ok:false,error:"screenshot_too_large"});
  const bytes=Buffer.from(await image.arrayBuffer());
  if(!bytes.length||bytes.length>3_000_000)
   return reply(res,502,{ok:false,error:"screenshot_too_large"});
  const jpg=mime==="image/jpeg"&&bytes[0]===0xff&&bytes[1]===0xd8;
  const png=mime==="image/png"&&bytes.subarray(0,4).toString("hex")==="89504e47";
  const webp=mime==="image/webp"&&bytes.subarray(0,4).toString("ascii")==="RIFF";
  if(!jpg&&!png&&!webp)return reply(res,502,{ok:false,error:"invalid_screenshot"});
  return reply(res,200,{ok:true,status:"ready",provider:"wordpress-mshots",cached:true,
   imageDataUrl:"data:"+mime+";base64,"+bytes.toString("base64")});
 }catch{return reply(res,502,{ok:false,error:"screenshot_failed"});}
 finally{clearTimeout(timeout);}
}

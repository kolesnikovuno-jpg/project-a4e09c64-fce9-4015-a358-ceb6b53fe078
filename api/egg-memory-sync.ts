/** Owner-authorized EGG archive push to Google Drive.
 * Requires a separately provisioned Google service account with folder access.
 * No ChatGPT connector token is exposed to the app.
 */
import {createSign} from "node:crypto";
import type {IncomingMessage,ServerResponse} from "node:http";
import {createClient} from "@supabase/supabase-js";
import {getEggStorageConfig} from "../src/server/eggStorageConfig.js";
import {exportEggMemory} from "../src/lib/eggMemoryArchive.js";
import type {EggProject} from "../src/lib/eggEngine.js";
const encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString("base64url");
async function driveToken(email:string,key:string):Promise<string>{
 const now=Math.floor(Date.now()/1000);
 const header=encode({alg:"RS256",typ:"JWT"});
 const payload=encode({iss:email,scope:"https://www.googleapis.com/auth/drive.file",aud:"https://oauth2.googleapis.com/token",iat:now,exp:now+3600});
 const input=header+"."+payload;
 const signer=createSign("RSA-SHA256");signer.update(input);signer.end();
 const assertion=input+"."+signer.sign(key.replace(/\\n/g,"\n"),"base64url");
 const body=new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion});
 const response=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body});
 if(!response.ok)throw Error("drive_auth_failed");
 const token=await response.json() as {access_token?:string};
 if(!token.access_token)throw Error("drive_auth_failed");
 return token.access_token;
}
export default async function handler(req:IncomingMessage,res:ServerResponse){
 res.setHeader("Content-Type","application/json; charset=utf-8");
 res.setHeader("Cache-Control","private, no-store");
 res.setHeader("X-Content-Type-Options","nosniff");
 const fail=(status:number,error:string)=>{res.statusCode=status;res.end(JSON.stringify({ok:false,error}));};
 if(req.method!=="POST")return fail(405,"method_not_allowed");
 const match=/^Bearer\s+(\S+)$/i.exec(req.headers.authorization??"");
 if(!match||match[1].startsWith("egg_v1_"))return fail(401,"author_session_required");
 const config=getEggStorageConfig(process.env);
 if(!config)return fail(503,"egg_storage_not_configured");
 const email=process.env.EGG_DRIVE_SERVICE_ACCOUNT_EMAIL;
 const key=process.env.EGG_DRIVE_PRIVATE_KEY;
 const folder=process.env.EGG_DRIVE_FOLDER_ID;
 if(!email||!key||!folder)return fail(503,"drive_sync_not_configured");
 const requestUrl=new URL(req.url??"/","https://egg.invalid");
 const projectId=requestUrl.searchParams.get("project")??"";
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(projectId))return fail(400,"invalid_project");
 try{
  const auth=createClient(config.url,config.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await auth.auth.getUser(match[1]);
  if(authError||!user)return fail(401,"invalid_session");
  const db=createClient(config.url,config.serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await db.from("egg_engine_projects").select("id,owner_id,revision,document").eq("id",projectId).eq("owner_id",user.id).maybeSingle();
  if(error)return fail(503,"database_unavailable");
  if(!data)return fail(404,"project_not_found");
  const project=data.document as EggProject;
  if(project.schema!=="egg.engine/0.1"||project.id!==projectId)return fail(409,"invalid_project_document");
  const archive=exportEggMemory(project,new Date().toISOString());
  const payload=JSON.stringify({...archive,sourceRevision:data.revision});
  if(Buffer.byteLength(payload)>1_000_000)return fail(413,"archive_too_large");
  const token=await driveToken(email,key);
  const name="egg-"+projectId+"-rev-"+data.revision+"-"+Date.now()+".json";
  const boundary="eggarchive"+Date.now();
  const multipart="--"+boundary+"\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n"+
   JSON.stringify({name,parents:[folder],mimeType:"application/json"})+"\r\n--"+boundary+
   "\r\nContent-Type: application/json\r\n\r\n"+payload+"\r\n--"+boundary+"--";
  const upload=await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name",{
   method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"multipart/related; boundary="+boundary},body:multipart,
  });
  if(!upload.ok)return fail(502,"drive_upload_failed");
  const file=await upload.json() as {id?:string;name?:string};
  if(!file.id)return fail(502,"drive_upload_failed");
  res.statusCode=200;res.end(JSON.stringify({ok:true,fileId:file.id,name:file.name,revision:data.revision}));
 }catch{return fail(502,"sync_failed");}
}

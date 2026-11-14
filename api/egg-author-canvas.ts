import type {IncomingMessage,ServerResponse} from "node:http";
import {createClient} from "@supabase/supabase-js";
import {getEggStorageConfig} from "../src/server/eggStorageConfig.js";
import {providerFromEnv} from "./egg-flow-ai.js";
type Req=IncomingMessage&{body?:unknown};
const send=(res:ServerResponse,status:number,data:unknown)=>{res.statusCode=status;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store, private");res.end(JSON.stringify(data));};
const uuid=(s:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
async function body(req:Req,max=1_600_000):Promise<any>{
 if(req.body!==undefined){const s=typeof req.body==="string"?req.body:JSON.stringify(req.body);if(Buffer.byteLength(s)>max)throw Error("too_large");return JSON.parse(s);}
 let total=0;const chunks:Buffer[]=[];for await(const part of req){const b=Buffer.isBuffer(part)?part:Buffer.from(part as Uint8Array);total+=b.length;if(total>max)throw Error("too_large");chunks.push(b);}return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
export const config={maxDuration:60};
export default async function handler(req:Req,res:ServerResponse){
 if(!["GET","PUT","POST"].includes(req.method??""))return send(res,405,{error:"method_not_allowed"});
 if(req.headers.origin){const host=String(req.headers["x-forwarded-host"]||req.headers.host||"").split(",")[0].trim();try{const o=new URL(req.headers.origin);if(o.protocol!=="https:"||o.host!==host)return send(res,403,{error:"cross_origin_forbidden"});}catch{return send(res,403,{error:"cross_origin_forbidden"});}}
 const cfg=getEggStorageConfig(process.env);if(!cfg)return send(res,503,{error:"storage_not_configured"});
 const bearer=/^Bearer\s+(\S+)$/i.exec(String(req.headers.authorization??""));if(!bearer||bearer[1].startsWith("egg_v1_"))return send(res,401,{error:"sign_in_required"});
 try{
  const auth=createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await auth.auth.getUser(bearer[1]);if(authError||!user)return send(res,401,{error:"invalid_session"});
  const url=new URL(req.url??"/","https://local.invalid");
  if(req.method==="GET"&&url.searchParams.get("diagnostic")==="1"){
   const geminiKey=process.env.GEMINI_API_KEY?.trim();
   if(geminiKey&&url.searchParams.get("probe")==="text"){
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),20000);
    try{
     const tests:Array<{api:string;model:string;status:number;reason:string;answered:boolean}>=[];
     for(const [api,model] of [["v1beta","gemini-2.5-flash"],["v1","gemini-2.5-flash"],["v1beta","gemini-2.5-flash-lite"],["v1beta","gemini-3-flash-preview"]]){
      if(controller.signal.aborted)break;
      const result=await fetch("https://generativelanguage.googleapis.com/"+api+"/models/"+model+":generateContent",{
       method:"POST",headers:{"x-goog-api-key":geminiKey,"Content-Type":"application/json"},signal:controller.signal,redirect:"error",
       body:JSON.stringify({contents:[{parts:[{text:"Reply with OK"}]}]})});
      const raw=await result.json() as {error?:{status?:string;message?:string};candidates?:Array<{content?:{parts?:Array<{text?:string}>}}>}};
      const msg=raw.error?.message??"";
      const reason=/not found for API version|not supported for generateContent/i.test(msg)?"model_api_incompatible":/not found|does not exist/i.test(msg)?"model_not_found":/region|country|location/i.test(msg)?"region_restriction":/quota|billing|limit/i.test(msg)?"quota":/API key|permission|access denied/i.test(msg)?"access_denied":raw.error?.status??"none";
      tests.push({api,model,status:result.status,reason,answered:!!raw.candidates?.[0]?.content?.parts?.some(p=>p.text)});
      if(result.ok)break;
     }
     console.info("egg_gemini_text_probe",{tests});
     return send(res,200,{ok:tests.some(t=>t.answered),tests});
    }catch(e){return send(res,502,{ok:false,error:controller.signal.aborted?"probe_timeout":"probe_failed"});}
    finally{clearTimeout(timer);}
   }
   if(geminiKey){
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
    try{
     const response=await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=100",{headers:{"x-goog-api-key":geminiKey},signal:controller.signal,redirect:"error"});
     const data=await response.json() as {models?:Array<{name?:string;supportedGenerationMethods?:string[]}>};
     const models=(data.models??[]).filter(m=>m.supportedGenerationMethods?.includes("generateContent")).map(m=>m.name?.replace(/^models\//,"")).filter(Boolean);
     return send(res,200,{ok:response.ok,httpStatus:response.status,providerKind:"gemini",configuredModel:process.env.EGG_AUTHOR_GEMINI_MODEL?.trim()||"gemini-2.5-flash",availableModels:models.slice(0,30),environment:process.env.VERCEL_ENV??"unknown"});
    }catch{return send(res,502,{ok:false,error:"gemini_model_discovery_failed"});}
    finally{clearTimeout(timer);}
   }
   const provider=providerFromEnv(process.env,req.headers["x-vercel-oidc-token"]);
   if(!provider)return send(res,503,{ok:false,error:"ai_provider_not_configured"});
   const keySource=process.env.EGG_AUTOMATION_ENDPOINT?"custom_endpoint":process.env.AI_GATEWAY_API_KEY?.trim()?"explicit_gateway_key":"vercel_oidc";
   const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
   try{const response=await fetch("https://ai-gateway.vercel.sh/v1/models",{headers:{Authorization:"Bearer "+provider.key},redirect:"error",signal:controller.signal});
    console.info("egg_ai_diagnostic",{httpStatus:response.status,keySource,providerKind:provider.kind});
    return send(res,200,{ok:response.ok,httpStatus:response.status,keySource,providerKind:provider.kind,model:provider.model,environment:process.env.VERCEL_ENV??"unknown"});
   }catch{return send(res,502,{ok:false,error:controller.signal.aborted?"gateway_timeout":"gateway_unreachable",keySource});}
   finally{clearTimeout(timer);}
  }
  const input=req.method==="GET"?null:await body(req);
  const projectId=req.method==="GET"?(url.searchParams.get("project")??""):String(input?.projectId??"");
  if(!uuid(projectId))return send(res,400,{error:"invalid_project"});
  const db=createClient(cfg.url,cfg.serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:project,error:pe}=await db.from("egg_engine_projects").select("id").eq("id",projectId).eq("owner_id",user.id).maybeSingle();
  if(pe)return send(res,503,{error:"database_unavailable"});if(!project)return send(res,404,{error:"project_not_found"});
  if(req.method==="GET"){const {data,error}=await db.from("egg_author_canvases").select("board,updated_at").eq("project_id",projectId).maybeSingle();if(error)return send(res,503,{error:"database_unavailable"});return send(res,200,{ok:true,board:data?.board??null,updatedAt:data?.updated_at??null});}
  if(req.method==="PUT"){
   const board=input?.board;if(!board||typeof board!=="object"||!Array.isArray(board.strokes)||!Array.isArray(board.pins)||!Array.isArray(board.photos)||typeof board.idea!=="string"||board.idea.length>10000||board.strokes.length>5000||board.photos.length>30||board.pins.length>200)return send(res,400,{error:"invalid_board"});
   const {error}=await db.from("egg_author_canvases").upsert({project_id:projectId,owner_id:user.id,board,updated_at:new Date().toISOString()},{onConflict:"project_id"});if(error)return send(res,503,{error:"save_failed"});return send(res,200,{ok:true});
  }
  if(input?.action!=="discuss"||typeof input.question!=="string"||input.question.length>2000||!input.question.trim())return send(res,400,{error:"invalid_question"});
  const {data:stored,error:readError}=await db.from("egg_author_canvases").select("board").eq("project_id",projectId).maybeSingle();
  if(readError)return send(res,503,{error:"database_unavailable"});
  const board=(input.board??stored?.board) as {idea?:string;strokes?:unknown[];pins?:Array<{text:string}>;photos?:Array<{src:string;name:string}>}|undefined;
  if(!board)return send(res,409,{error:"save_board_first"});
  const geminiKey=process.env.GEMINI_API_KEY?.trim();
  const provider=geminiKey?null:providerFromEnv(process.env,req.headers["x-vercel-oidc-token"]);
  if(!geminiKey&&!provider)return send(res,503,{error:"ai_provider_not_configured"});
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),35000);
  try{
   // The rendered sketch is supplied by the browser, not inferred from stroke counts.
   const image=typeof input.image==="string"&&/^data:image\/(png|jpeg|webp);base64,/.test(input.image)&&input.image.length<900000?input.image:null;
   const text="Идея: "+String(board.idea??"").slice(0,10000)+"\nПометки: "+JSON.stringify((board.pins??[]).slice(0,100))+"\nРеференсы: "+JSON.stringify((board.photos??[]).map(p=>p.name).slice(0,30))+"\nВопрос Автора: "+input.question;
   const content:any[]=[{type:"input_text",text}];if(image)content.push({type:"input_image",image_url:image});
   const geminiModel=process.env.EGG_AUTHOR_GEMINI_MODEL?.trim()||"gemini-2.5-flash";
   const geminiContents:any[]=[{text}];
   if(image){const match=/^data:image\/(png|jpeg|webp);base64,(.+)$/.exec(image);if(match)geminiContents.push({inline_data:{mime_type:"image/"+match[1],data:match[2]}});}
   const geminiRequest=(model:string)=>fetch("https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(model)+":generateContent",{
      method:"POST",headers:{"x-goog-api-key":geminiKey!,"Content-Type":"application/json"},signal:controller.signal,redirect:"error",
      body:JSON.stringify({systemInstruction:{parts:[{text:"Ты соучастник сферы Автор EGG. Различай наблюдаемое и гипотезы. Не придумывай размеры и материалы. Отвечай по-русски кратко и конкретно."}]},contents:[{role:"user",parts:geminiContents}],generationConfig:{maxOutputTokens:900}})});
   let activeModel=geminiModel;
   let response=geminiKey
    ?await geminiRequest(geminiModel)
    :await fetch(provider!.url,{method:"POST",headers:{"Authorization":"Bearer "+provider!.key,"Content-Type":"application/json"},signal:controller.signal,redirect:"error",body:JSON.stringify({model:provider!.model,instructions:"Ты соучастник сферы Автор EGG. Анализируй предоставленный рисунок и пометки как предварительный замысел. Различай наблюдаемое и гипотезы. Не придумывай размеры и материалы. Отвечай на русском кратко, конкретно и без навязывания формы. Не утверждай, что видишь изображение, если оно не передано.",input:[{role:"user",content}],max_output_tokens:750,store:false})});
   // A model may be listed but unavailable for generation under this key.
   // Retry once on a distinct low-cost multimodal model, only for a 404.
   if(geminiKey&&response.status===404&&geminiModel!=="gemini-2.5-flash-lite"){
    activeModel="gemini-2.5-flash-lite";
    response=await geminiRequest(activeModel);
   }
   if(!response.ok){
    // Capture only bounded, machine-readable provider error identifiers; never log
    // provider messages, request content, tokens, or user images.
    let providerCode="unknown",providerType="unknown",providerStatus="unknown",providerMessageKind="none";
    try{
     const raw=await response.json() as {error?:{code?:unknown;type?:unknown;status?:unknown}};
     const safe=(value:unknown)=>typeof value==="string"&&/^[a-zA-Z0-9_.-]{1,80}$/.test(value)?value:"unknown";
     providerCode=safe(raw?.error?.code);providerType=safe(raw?.error?.type);providerStatus=safe(raw?.error?.status);
     if(geminiKey){
      const message=typeof (raw as any)?.error?.message==="string"?(raw as any).error.message:"";
      const reason=/not found for API version|not supported for generateContent/i.test(message)?"model_api_incompatible"
       :/not found|does not exist/i.test(message)?"model_not_found"
       :/API key|permission|access denied/i.test(message)?"api_access_denied"
       :/location|region|country/i.test(message)?"region_restriction"
       :/quota|billing|limit/i.test(message)?"quota_or_billing"
       :"unclassified";
      providerType=reason;
      // Report only a non-sensitive error shape, never provider message or key.
      providerMessageKind=message.length===0?"empty":message.includes("models/")?"model_path":/api key/i.test(message)?"api_key":/project/i.test(message)?"project":/not found/i.test(message)?"not_found":/quota/i.test(message)?"quota":"other";
     }
    }catch{/* Provider may not return JSON. */}
    console.error("egg_author_ai_provider_failure",{status:response.status,kind:geminiKey?"gemini":provider!.kind,model:geminiKey?activeModel:provider!.model,providerCode,providerType,providerStatus,providerMessageKind});
    const code=response.status===429?"ai_rate_limited":response.status===402?"ai_budget_exhausted":response.status===401||response.status===403?"ai_model_not_authorized":response.status===404||response.status===400?"ai_model_or_request_unsupported":"ai_request_failed";
    return send(res,response.status===429?429:502,{error:code,providerHttpStatus:response.status,providerCode,providerType,providerStatus});
   }
   const data=await response.json() as {output?:Array<{type?:string;content?:Array<{type?:string;text?:string}>}>};
   const answer=geminiKey?(data as any).candidates?.[0]?.content?.parts?.map((p:any)=>p.text??"").join("")??"":data.output?.flatMap(o=>o.content??[]).filter(x=>x.type==="output_text").map(x=>x.text??"").join("")??"";
   if(!answer)return send(res,502,{error:"empty_ai_answer"});return send(res,200,{ok:true,answer,hasImage:!!image});
  }finally{clearTimeout(timeout);}
 }catch(e){return send(res,String(e).includes("too_large")?413:500,{error:String(e).includes("too_large")?"too_large":"internal_error"});}
}

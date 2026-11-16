/**
 * EGG Form Study: Author-triggered AI semantic interpretation + real image.
 * Requires a completed 8-sphere Yolk synthesis. Never updates the project's
 * DNA, approved concept, maturity level, or 3D geometry.
 * All images are stored in a PRIVATE Supabase bucket, accessible only through
 * signed links returned after checking project ownership.
 */
import {randomUUID} from "node:crypto";
import type {IncomingMessage,ServerResponse} from "node:http";
import {createClient} from "@supabase/supabase-js";
import {getEggStorageConfig} from "./eggStorageConfig.js";
import type {EggProject} from "../lib/eggEngine.js";
import type {EggFlowCycle} from "../lib/eggFlowCycle.js";

type Req=IncomingMessage&{body?:unknown};
type Row={id:string;project_id:string;owner_id:string;cycle_id:string;
  synthesis_id:string;form_prompt:string;image_path:string;model:string;
  source_kind:string;created_at:string};
const BUCKET="egg-author-media";
const IMAGE_MODEL="gpt-image-1-mini";
const fail=(res:ServerResponse,status:number,error:string)=>{
  res.statusCode=status;
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Cache-Control","no-store");
  res.end(JSON.stringify({ok:false,error}));
};
const send=(res:ServerResponse,data:unknown)=>{
  res.statusCode=200;
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Cache-Control","no-store");
  res.end(JSON.stringify(data));
};
function complete(c:EggFlowCycle):boolean{
  const s=c.synthesis;
  if(!s||c.status==="running")return false;
  const all=[...s.first,...s.second];
  return all.length===8&&new Set(all.map(x=>x.sphere)).size===8&&
    all.every(x=>x.status!=="missing"&&!!x.resultId&&!!x.text?.trim());
}
function scope(project:EggProject,cycle:EggFlowCycle):string{
  const s=cycle.synthesis!;
  const concept=[...(project.concepts??[])].reverse().find(c=>c.status==="accepted");
  const lines=[
    "ORIGINAL AUTHOR IDEA (not final DNA): "+project.seed.text.slice(0,2000),
    "AUTHOR'S CURRENT IDEA INTENT: "+(cycle.ideaHandoff?.intent??cycle.authorBrief).slice(0,1500),
    "WORKING DNA CANDIDATE — NOT APPROVED: "+(cycle.ideaHandoff?.workingDna??"Not recorded").slice(0,1000),
    "APPROVED CONCEPT REFERENCE (only if one actually exists): "+(concept?.text??"None").slice(0,1300),
    "SPHERE RESULTS — retain hypothesis/evidence provenance:",
    ...[...s.first,...s.second].map(x=>
      x.sphere+" ["+x.evidence+", "+x.status+"]: "+(x.text??"").slice(0,850)),
    "YOLK SYNTHESIS OPEN GAPS: "+s.gaps.slice(0,8).join("; ").slice(0,1200),
    "YOLK SEMANTIC REVIEW (unverified): "+(cycle.semanticReview?.summary??"Not recorded").slice(0,1400),
  ];
  return lines.join("\n");
}
async function readBody(req:Req):Promise<unknown>{
  if(req.body!==undefined)return typeof req.body==="string"?JSON.parse(req.body):req.body;
  const chunks:Buffer[]=[];let size=0;
  for await(const part of req){
    const chunk=Buffer.isBuffer(part)?part:Buffer.from(part as Uint8Array);
    size+=chunk.length;
    if(size>4096)throw Error("too_large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
async function callOpenAI(key:string,endpoint:string,payload:unknown,timeoutMs:number):Promise<Response>{
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    return await fetch("https://api.openai.com/v1/"+endpoint,{
      method:"POST",headers:{Authorization:"Bearer "+key,"Content-Type":"application/json"},
      body:JSON.stringify(payload),signal:controller.signal,redirect:"error",
    });
  }finally{clearTimeout(timer);}
}
async function formPrompt(key:string,project:EggProject,cycle:EggFlowCycle):Promise<string>{
  const requested=process.env.EGG_AUTOMATION_MODEL?.trim();
  const model=requested&&!/^(google\/|openai\/|gemini[-\/])/i.test(requested)?
    requested:"gpt-6-luna";
  const response=await callOpenAI(key,"responses",{
    model,store:false,max_output_tokens:1100,
    ...(model==="gpt-6-luna"?{reasoning:{effort:"none"}}:{}),
    instructions:[
      "You are the EGG spatial interpretation specialist, not an image renderer.",
      "Read the original idea and ALL eight sphere contributions as exploratory material.",
      "Derive ONE coherent art-directed image prompt in English, not an arbitrary shape.",
      "Capture the author's intention, spatial character, tensions, silhouette, density,",
      "subtle hints of details, and a distinct relationship to surrounding negative space.",
      "Early mental form: concentrated luminous particulate field, partial contour",
      "attractors, emerging morphological accents, neither a random sphere nor a finished CAD object.",
      "If evidence does not establish scale, materials, geometry or product type, DO NOT invent these as facts.",
      "Treat any visual choices as exploratory hypotheses. Do not claim physical validation.",
      "No labels, captions, lettering, people, logos, or diagram annotations.",
      "Do not invent a product type, building, mechanics, or materials absent from the sources.",
      "Return ONLY JSON with one property: image_prompt (string, 100-1800 chars)."
    ].join(" "),
    input:scope(project,cycle),text:{format:{type:"json_object"}},
  },45000);
  if(!response.ok)throw Error(response.status===429?"rate_limited":
    response.status===401||response.status===403?"model_not_authorized":"prompt_failed");
  const data=await response.json() as {
    status?:string;output?:Array<{type?:string;content?:Array<{type?:string;text?:string}>}>;
  };
  if(data.status!=="completed")throw Error("prompt_incomplete");
  const raw=data.output?.flatMap(x=>x.type==="message"?(x.content??[]):[])
    .filter(x=>x.type==="output_text").map(x=>x.text??"").join("")??"";
  let prompt="";
  try{const parsed=JSON.parse(raw) as {image_prompt?:unknown};
    if(typeof parsed.image_prompt==="string")prompt=parsed.image_prompt.trim();
  }catch{/* fail closed */}
  if(prompt.length<100||prompt.length>1800)throw Error("invalid_prompt");
  return prompt;
}
async function generateImage(key:string,prompt:string):Promise<Buffer>{
  const image=await callOpenAI(key,"images/generations",{
    model:IMAGE_MODEL,n:1,size:"1024x1024",quality:"low",
    output_format:"webp",output_compression:72,
    prompt:prompt+"\nVisual: a single source-faithful exploratory form study on a quiet warm ivory",
  },85000);
  if(!image.ok)throw Error(image.status===429?"rate_limited":
    image.status===401||image.status===403?"model_not_authorized":"image_failed");
  const result=await image.json() as {data?:Array<{b64_json?:string}>};
  const base64=result.data?.[0]?.b64_json;
  if(!base64||base64.length>4500000)throw Error("invalid_image");
  const bytes=Buffer.from(base64,"base64");
  if(bytes.length<3000||bytes.length>2800000||
    bytes.toString("ascii",0,4)!=="RIFF"||bytes.toString("ascii",8,12)!=="WEBP")
    throw Error("invalid_image");
  return bytes;
}
export async function eggFormImageHandler(req:Req,res:ServerResponse){
  res.setHeader("Allow","GET, POST");
  if(req.method!=="GET"&&req.method!=="POST")return fail(res,405,"method_not_allowed");
  if(req.method==="POST"&&req.headers.origin){
    try{
      const o=new URL(String(req.headers.origin));
      const host=String(req.headers["x-forwarded-host"]||req.headers.host||"").split(",")[0].trim();
      if(o.protocol!=="https:"||o.host!==host)return fail(res,403,"cross_origin_forbidden");
    }catch{return fail(res,403,"cross_origin_forbidden");}
  }
  const bearer=/^Bearer\s+(\S+)$/i.exec(String(req.headers.authorization??""));
  if(!bearer||bearer[1].startsWith("egg_v1_"))return fail(res,401,"author_session_required");
  const cfg=getEggStorageConfig(process.env);
  if(!cfg)return fail(res,503,"egg_engine_not_configured");
  const url=new URL(req.url??"/","https://egg.invalid");
  let projectId=url.searchParams.get("projectId")??"";
  let synthesisId=url.searchParams.get("synthesisId")??"";
  let revision:number|undefined;
  if(req.method==="POST"){
    let payload:unknown;
    try{payload=await readBody(req);}catch{return fail(res,400,"invalid_request");}
    if(!payload||typeof payload!=="object"||Array.isArray(payload))
      return fail(res,400,"invalid_request");
    const o=payload as Record<string,unknown>;
    projectId=typeof o.projectId==="string"?o.projectId:"";
    synthesisId=typeof o.synthesisId==="string"?o.synthesisId:"";
    revision=typeof o.expectedRevision==="number"?o.expectedRevision:undefined;
  }
  if(!/^[a-f\d-]{36}$/i.test(projectId)||synthesisId.length>120||
    (req.method==="POST"&&(revision===undefined||!Number.isInteger(revision)||revision<0||!synthesisId)))
    return fail(res,400,"invalid_request");
  try{
    const auth=createClient(cfg.url,cfg.publishableKey,{auth:{
      persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,
    }});
    const {data:authData,error:authError}=await auth.auth.getUser(bearer[1]);
    if(authError||!authData.user?.id)return fail(res,401,"invalid_author_session");
    const ownerId=authData.user.id;
    const db=createClient(cfg.url,cfg.serviceKey,{auth:{
      persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,
    }});
    const {data:row,error:readError}=await db.from("egg_engine_projects")
      .select("document,revision").eq("id",projectId).eq("owner_id",ownerId).maybeSingle();
    if(readError)return fail(res,503,"database_unavailable");
    if(!row)return fail(res,404,"project_not_found");
    const project=row.document as EggProject;
    if(project.id!==projectId||project.schema!=="egg.engine/0.1")
      return fail(res,409,"invalid_project");
    if(req.method==="POST"&&row.revision!==revision)return fail(res,409,"revision_conflict");
    const cycle=synthesisId?(project.flowCycles??[]).find(c=>c.synthesis?.id===synthesisId):
      [...(project.flowCycles??[])].reverse().find(complete);
    if(!cycle||!complete(cycle))return fail(res,409,"complete_synthesis_required");
    const id=cycle.synthesis!.id;
    if(req.method==="GET"){
      const {data:latest,error:latestError}=await db.from("egg_form_studies")
        .select("*").eq("project_id",projectId).eq("owner_id",ownerId)
        .eq("synthesis_id",id).order("created_at",{ascending:false}).limit(1).maybeSingle();
      if(latestError)return fail(res,503,"database_unavailable");
      if(!latest)return send(res,{ok:true,study:null,synthesisId:id});
      const study=latest as Row;
      const {data:link,error:linkError}=await db.storage.from(BUCKET)
        .createSignedUrl(study.image_path,3600);
      if(linkError||!link)return fail(res,503,"storage_unavailable");
      return send(res,{ok:true,study:{
        id:study.id,prompt:study.form_prompt,imageUrl:link.signedUrl,
        model:study.model,sourceKind:study.source_kind,cycleId:study.cycle_id,
        synthesisId:study.synthesis_id,createdAt:study.created_at,
        is3d:false,approved:false,
      }});
    }
    const key=process.env.OPENAI_API_KEY?.trim();
    if(!key)return fail(res,503,"openai_image_key_not_configured");
    const {count,error:countError}=await db.from("egg_form_studies")
      .select("id",{count:"exact",head:true}).eq("project_id",projectId)
      .eq("owner_id",ownerId).eq("synthesis_id",id);
    if(countError)return fail(res,503,"database_unavailable");
    if((count??0)>=3)return fail(res,409,"study_limit_reached");
    const prompt=await formPrompt(key,project,cycle);
    const bytes=await generateImage(key,prompt);
    const studyId=randomUUID();
    const path="generated-form/"+ownerId+"/"+projectId+"/"+studyId+".webp";
    const {error:uploadError}=await db.storage.from(BUCKET)
      .upload(path,bytes,{contentType:"image/webp",upsert:false,cacheControl:"60"});
    if(uploadError)return fail(res,503,"storage_unavailable");
    const sourceKind=cycle.level===1?
      "unapproved_idea_with_completed_cycle":"completed_cycle_visual_hypothesis";
    const {data:saved,error:saveError}=await db.from("egg_form_studies").insert({
      id:studyId,project_id:projectId,owner_id:ownerId,cycle_id:cycle.id,
      synthesis_id:id,form_prompt:prompt,image_path:path,model:IMAGE_MODEL,
      source_kind:sourceKind,
    }).select("*").single();
    if(saveError||!saved)return fail(res,503,"database_unavailable");
    const {data:link,error:linkError}=await db.storage.from(BUCKET)
      .createSignedUrl(path,3600);
    if(linkError||!link)return fail(res,503,"storage_unavailable");
    return send(res,{ok:true,study:{id:studyId,prompt,
      imageUrl:link.signedUrl,model:IMAGE_MODEL,sourceKind,cycleId:cycle.id,
      synthesisId:id,createdAt:(saved as Row).created_at,is3d:false,approved:false,
    }});
  }catch(error){
    const code=error instanceof Error?error.message:"generation_failed";
    console.warn("egg_form_generation_failure",{
      class:code==="rate_limited"?"rate_limit":
        code==="model_not_authorized"?"access":
        code==="prompt_incomplete"||code==="invalid_prompt"?"prompt":
        code==="invalid_image"||code==="image_failed"?"image":"provider",
    });
    const status=code==="rate_limited"?429:
      code==="model_not_authorized"?503:502;
    return fail(res,status,["rate_limited","model_not_authorized","image_failed",
      "invalid_image","prompt_incomplete","invalid_prompt","prompt_failed"]
      .includes(code)?code:"generation_failed");
  }
}

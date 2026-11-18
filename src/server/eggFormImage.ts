/**
 * EGG Form Study: Author-triggered AI semantic interpretation + real image.
 * Accepts current Author Idea drafts OR completed eight-sphere synthesis,
 * without crossing or merging them. Never changes approved geometry or DNA.
 * All images are stored in a PRIVATE Supabase bucket, accessible only through
 * signed links returned after checking project ownership.
 */
import {randomUUID} from "node:crypto";
import type {IncomingMessage,ServerResponse} from "node:http";
import {createClient} from "@supabase/supabase-js";
import {getEggStorageConfig} from "./eggStorageConfig.js";
import type {EggProject} from "../lib/eggEngine.js";
import type {EggFlowCycle} from "../lib/eggFlowCycle.js";
import {eggIdeaFormSourceId,normalizeEggIdeaFormSource,type EggIdeaFormSource} from "../lib/eggIdeaFormSource.js";
import {EGG_SKETCH_IMAGE_LIMIT,isEggSketchStyle,eggSketchStyleInstruction,type EggSketchStyleId} from "../lib/eggSketchStyles.js";

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
    if(size>480000)throw Error("too_large");
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
/** The image model interprets the real source directly, avoiding a second
 * text-model call and preserving the explicit distinction between Idea and
 * the old completed eight-sphere synthesis. This prompt is a working study,
 * never an Author approval, established geometry, or AI-generated DNA.
 */
/**
 * The first successful image showed that model branding + a generic "single
 * particle blob" can overpower a sparse Author idea. The *author's statement*
 * therefore leads each prompt, then the full contextual information, then a
 * modest, explicit morphology direction. Separate test variants explore form
 * without claiming that a drawing has already been approved or synthesized.
 */
function formDirection(variant:number):string{
 return [
  "Explore the object's main silhouette, key openings, support system and continuous form, not decoration.",
  "Explore the SAME object's identity from a slightly different three-quarter view, retaining proportions and openings.",
  "Reduce detail to a very loose economical concept drawing while retaining distinctive geometry.",
 ][variant%3];
}
function morphologySafeguard(idea:string):string{
 return /(яйц|egg|овал|овои|сфер|шар|губк|порист|foam|sponge|sphere|ovoid)/i.test(idea)?
  "Respect the Author's explicitly defined geometry.":
  "Do not substitute a generic blob, egg, sponge, coral or stone for the Author's object.";
}
function sketchContract(style:EggSketchStyleId,customStyle:string,editInstruction:string,hasReference:boolean){
 return [
  "EGG_STYLE_ID: "+style,
  "EGG_SKETCH_MODE: draft_not_approved",
  "EARLY INDUSTRIAL DESIGN SKETCH of the Author's actual object, not a polished product render or a replacement concept.",
  hasReference?
    "IMAGE 1 IS A VISUAL FORM REFERENCE. Preserve its recognizable silhouette, proportions, number and arrangement of legs, seat/back articulation and holes/negative space unless the Author EXPLICITLY requests otherwise. Correct its drawing style, not its identity.":
    "No confirmed form reference: interpret only explicit Author constraints and leave unknown geometry exploratory.",
  "Changing presentation style does NOT authorize changing the geometry.",
  eggSketchStyleInstruction(style,customStyle),
  editInstruction?"AUTHOR'S TARGETED FORM CORRECTION: "+editInstruction:"",
  "One clear object, uncluttered white/off-white paper; no text, logos, labels or extra objects; a sketch, NOT CAD, not a manufactured object and not an approved design.",
 ].filter(Boolean).join("\n");
}
function ideaImagePrompt(source:EggIdeaFormSource,variant:number,style:EggSketchStyleId,
 customStyle:string,editInstruction:string,hasReference:boolean,referenceStudyId:string):string{
 const input=normalizeEggIdeaFormSource(source);
 const all=[input.intent,input.constraints,input.draft,input.materialInsight,
  ...input.materials.map(m=>m.text)].join(" ");
 return [
  "AUTHOR'S IDEA (PRIMARY): "+input.intent,
  input.constraints?"AUTHOR'S CONSTRAINTS: "+input.constraints:"",
  input.draft?"UNAPPROVED DRAFT: "+input.draft:"",
  input.materialInsight?"MATERIAL FIELD INSIGHT: "+input.materialInsight:"",
  input.materials.length?"SELECTED NOTES: "+input.materials.map(m=>m.type+": "+m.text).join("; "):"",
  referenceStudyId?"EGG_REFERENCE_STUDY_ID: "+referenceStudyId:"",
  input.formReference?"AUTHOR-SELECTED SHAPE DRAWING IS ATTACHED: preserve its form, DO NOT copy its rendering style unless requested.":"",
  input.spacePhoto?"SEPARATE ROOM PHOTO IS CONTEXT ONLY, not a design reference; do not turn the requested DESIGN SKETCH into a photoreal interior. Do not invent room dimensions.":"",
  "Interpret artistic metaphors as formal relationships, not literal signs or unrelated instruments.",
  sketchContract(style,customStyle,editInstruction,hasReference),
  formDirection(variant),morphologySafeguard(all),
 ].filter(Boolean).join("\n").slice(0,12500);
}
function cycleImagePrompt(project:EggProject,cycle:EggFlowCycle,variant:number,
 style:EggSketchStyleId,customStyle:string,editInstruction:string,hasReference:boolean,
 referenceStudyId:string):string{
 const source=scope(project,cycle);
 return [
  "AUTHOR IDEA AND VERIFIED EIGHT-SPHERE WORKING INPUTS:\n"+source,
  referenceStudyId?"EGG_REFERENCE_STUDY_ID: "+referenceStudyId:"",
  "Sphere contributions are hypotheses/evidence, not approval. Keep form choices grounded.",
  sketchContract(style,customStyle,editInstruction,hasReference),
  formDirection(variant),morphologySafeguard(source),
 ].filter(Boolean).join("\n").slice(0,14500);
}
function savedStyle(prompt:string):EggSketchStyleId|null{
 const match=/^EGG_STYLE_ID: ([a-z]+)$/m.exec(prompt);
 return isEggSketchStyle(match?.[1])?match[1]:null;
}
function savedParent(prompt:string):string|null{
 return /^EGG_REFERENCE_STUDY_ID: ([0-9a-f-]{36})$/im.exec(prompt)?.[1]??null;
}
export function decodeEggRoomPhoto(dataUrl:string):Buffer{
 if(!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(dataUrl)||dataUrl.length>210000)
  throw Error("invalid_idea_photo");
 const content=dataUrl.slice("data:image/jpeg;base64,".length);
 const bytes=Buffer.from(content,"base64");
 if(bytes.length<250||bytes.length>165000||bytes[0]!==255||bytes[1]!==216||
  bytes[bytes.length-2]!==255||bytes[bytes.length-1]!==217)
  throw Error("invalid_idea_photo");
 return bytes;
}
type FormImageInput={bytes:Buffer;mime:"image/jpeg"|"image/webp"};
async function callImageEdit(key:string,prompt:string,images:FormImageInput[]):Promise<Response>{
 const form=new FormData();
 form.append("model",IMAGE_MODEL);
 images.forEach((image,i)=>form.append(images.length>1?"image[]":"image",
  new Blob([new Uint8Array(image.bytes)],{type:image.mime}),
  "reference-"+i+(image.mime==="image/webp"?".webp":".jpg")));
 form.append("prompt",prompt);
 form.append("n","1");form.append("size","1024x1024");
 form.append("quality","low");form.append("output_format","webp");
 form.append("output_compression","72");
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),85000);
 try{return await fetch("https://api.openai.com/v1/images/edits",{
  method:"POST",headers:{Authorization:"Bearer "+key},
  body:form,signal:controller.signal,redirect:"error",
 });}finally{clearTimeout(timeout);}
}
async function generateImage(key:string,prompt:string,images:FormImageInput[]):Promise<Buffer>{
 const image=images.length?await callImageEdit(key,prompt,images):
  await callOpenAI(key,"images/generations",{
   model:IMAGE_MODEL,n:1,size:"1024x1024",quality:"low",
   output_format:"webp",output_compression:72,prompt,
  },85000);
 if(!image.ok){
  console.warn("egg_form_provider_response",{stage:"image",status:image.status,model:IMAGE_MODEL});
  throw Error(image.status===429?"rate_limited":
   image.status===401||image.status===403?"model_not_authorized":
   image.status===400||image.status===404?"image_request_invalid":"image_failed");
 }
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
  let idea:EggIdeaFormSource|null=null;
  let stylePreset:EggSketchStyleId="pencil";
  let customStyle="";
  let editInstruction="";
  let referenceStudyId="";
  if(req.method==="POST"){
    let payload:unknown;
    try{payload=await readBody(req);}catch{return fail(res,400,"invalid_request");}
    if(!payload||typeof payload!=="object"||Array.isArray(payload))
      return fail(res,400,"invalid_request");
    if(JSON.stringify(payload).length>460000)return fail(res,413,"invalid_request");
    const o=payload as Record<string,unknown>;
    projectId=typeof o.projectId==="string"?o.projectId:"";
    synthesisId=typeof o.synthesisId==="string"?o.synthesisId:"";
    revision=typeof o.expectedRevision==="number"?o.expectedRevision:undefined;
    if(o.stylePreset!==undefined&&!isEggSketchStyle(o.stylePreset))
      return fail(res,400,"invalid_style");
    stylePreset=isEggSketchStyle(o.stylePreset)?o.stylePreset:"pencil";
    if(o.customStyle!==undefined&&(typeof o.customStyle!=="string"||o.customStyle.length>200))
      return fail(res,400,"invalid_style");
    customStyle=typeof o.customStyle==="string"?o.customStyle.replace(/\s+/g," ").trim():"";
    if(o.editInstruction!==undefined&&(typeof o.editInstruction!=="string"||o.editInstruction.length>400))
      return fail(res,400,"invalid_request");
    editInstruction=typeof o.editInstruction==="string"?o.editInstruction.trim():"";
    if(o.referenceStudyId!==undefined&&(typeof o.referenceStudyId!=="string"||
      !/^[0-9a-f-]{36}$/i.test(o.referenceStudyId)))return fail(res,400,"invalid_reference_study");
    referenceStudyId=typeof o.referenceStudyId==="string"?o.referenceStudyId:"";
    if(o.idea!==undefined){
      if(!o.idea||typeof o.idea!=="object"||Array.isArray(o.idea))
        return fail(res,400,"invalid_idea");
      const v=o.idea as Record<string,unknown>;
      if(typeof v.intent!=="string"||v.intent.trim().length<8||
        v.intent.length>3000||typeof v.constraints!=="string"||v.constraints.length>2000||
        typeof v.draft!=="string"||v.draft.length>3000||
        typeof v.materialInsight!=="string"||v.materialInsight.length>1400||
        !Array.isArray(v.materials)||v.materials.length>20||
        v.materials.some(x=>!x||typeof x!=="object"||typeof x.type!=="string"||
          typeof x.text!=="string"||x.text.length>250||x.type.length>40))
        return fail(res,400,"invalid_idea");
      if(v.spacePhoto!==undefined&&v.spacePhoto!==""){
        if(typeof v.spacePhoto!=="string")return fail(res,400,"invalid_idea_photo");
        try{decodeEggRoomPhoto(v.spacePhoto);}
        catch{return fail(res,400,"invalid_idea_photo");}
      }
      if(v.formReference!==undefined&&v.formReference!==""){
        if(typeof v.formReference!=="string")return fail(res,400,"invalid_form_reference");
        try{decodeEggRoomPhoto(v.formReference);}
        catch{return fail(res,400,"invalid_form_reference");}
      }
      idea=normalizeEggIdeaFormSource(v as EggIdeaFormSource);
    }
  }
  if(!/^[a-f\d-]{36}$/i.test(projectId)||synthesisId.length>120||
    (req.method==="POST"&&(revision===undefined||!Number.isInteger(revision)||revision<0||
      (!synthesisId&&!idea))))
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
    const draftMode=Boolean(idea)||/^idea:[0-9a-f]{16}$/.test(synthesisId);
    const cycle=draftMode?null:synthesisId?
      (project.flowCycles??[]).find(c=>c.synthesis?.id===synthesisId):
      [...(project.flowCycles??[])].reverse().find(complete);
    if(!draftMode&&(!cycle||!complete(cycle)))
      return fail(res,409,"complete_synthesis_required");
    const id=idea?eggIdeaFormSourceId(idea):draftMode?synthesisId:cycle!.synthesis!.id;
    if(req.method==="GET"){
      const {data:records,error:latestError}=await db.from("egg_form_studies")
        .select("*").eq("project_id",projectId).eq("owner_id",ownerId)
        .eq("synthesis_id",id).order("created_at",{ascending:false}).limit(EGG_SKETCH_IMAGE_LIMIT);
      if(latestError)return fail(res,503,"database_unavailable");
      if(!records?.length)return send(res,{ok:true,study:null,studies:[],synthesisId:id});
      const studies=await Promise.all((records as Row[]).map(async saved=>{
        const {data:link,error:linkError}=await db.storage.from(BUCKET)
          .createSignedUrl(saved.image_path,3600);
        if(linkError||!link)return null;
        return {
          id:saved.id,prompt:saved.form_prompt,imageUrl:link.signedUrl,
          model:saved.model,sourceKind:saved.source_kind,cycleId:saved.cycle_id,
          synthesisId:saved.synthesis_id,createdAt:saved.created_at,
          stylePreset:savedStyle(saved.form_prompt),referenceStudyId:savedParent(saved.form_prompt),
          is3d:false,approved:false,
        };
      }));
      if(studies.some(v=>!v))return fail(res,503,"storage_unavailable");
      return send(res,{ok:true,study:studies[0],studies,synthesisId:id});
    }
    const key=process.env.OPENAI_API_KEY?.trim();
    if(!key)return fail(res,503,"openai_image_key_not_configured");
    const {count,error:countError}=await db.from("egg_form_studies")
      .select("id",{count:"exact",head:true}).eq("project_id",projectId)
      .eq("owner_id",ownerId).eq("synthesis_id",id);
    if(countError)return fail(res,503,"database_unavailable");
    if((count??0)>=EGG_SKETCH_IMAGE_LIMIT)return fail(res,409,"study_limit_reached");
    // The image model itself performs semantic interpretation of this source.
    // No unrelated sphere synthesis can influence a local Idea draft.
    const images:FormImageInput[]=[];
    if(referenceStudyId){
      const {data:parent,error:parentError}=await db.from("egg_form_studies")
        .select("*").eq("id",referenceStudyId).eq("project_id",projectId)
        .eq("owner_id",ownerId).eq("synthesis_id",id).maybeSingle();
      if(parentError)return fail(res,503,"database_unavailable");
      if(!parent)return fail(res,409,"invalid_reference_study");
      const {data:file,error:downloadError}=await db.storage.from(BUCKET).download(parent.image_path);
      if(downloadError||!file)return fail(res,503,"storage_unavailable");
      const parentBytes=Buffer.from(await file.arrayBuffer());
      if(parentBytes.length<3000||parentBytes.length>2800000||
        parentBytes.toString("ascii",0,4)!=="RIFF"||
        parentBytes.toString("ascii",8,12)!=="WEBP")
        return fail(res,409,"invalid_reference_study");
      images.push({bytes:parentBytes,mime:"image/webp"});
    }
    if(idea?.formReference)images.push({bytes:decodeEggRoomPhoto(idea.formReference),mime:"image/jpeg"});
    if(idea?.spacePhoto)images.push({bytes:decodeEggRoomPhoto(idea.spacePhoto),mime:"image/jpeg"});
    const prompt=idea?
      ideaImagePrompt(idea,count??0,stylePreset,customStyle,editInstruction,
        Boolean(referenceStudyId||idea.formReference),referenceStudyId):
      cycleImagePrompt(project,cycle!,count??0,stylePreset,customStyle,editInstruction,
        Boolean(referenceStudyId),referenceStudyId);
    const bytes=await generateImage(key,prompt,images);
    const studyId=randomUUID();
    const path="generated-form/"+ownerId+"/"+projectId+"/"+studyId+".webp";
    const {error:uploadError}=await db.storage.from(BUCKET)
      .upload(path,bytes,{contentType:"image/webp",upsert:false,cacheControl:"60"});
    if(uploadError)return fail(res,503,"storage_unavailable");
    const sourceKind=idea?"idea_draft_visual_hypothesis":cycle!.level===1?
      "unapproved_idea_with_completed_cycle":"completed_cycle_visual_hypothesis";
    const {data:saved,error:saveError}=await db.from("egg_form_studies").insert({
      id:studyId,project_id:projectId,owner_id:ownerId,cycle_id:cycle?.id??"idea-draft",
      synthesis_id:id,form_prompt:prompt,image_path:path,model:IMAGE_MODEL,
      source_kind:sourceKind,
    }).select("*").single();
    if(saveError||!saved)return fail(res,503,"database_unavailable");
    const {data:link,error:linkError}=await db.storage.from(BUCKET)
      .createSignedUrl(path,3600);
    if(linkError||!link)return fail(res,503,"storage_unavailable");
    return send(res,{ok:true,study:{id:studyId,prompt,
      imageUrl:link.signedUrl,model:IMAGE_MODEL,sourceKind,cycleId:cycle?.id??"idea-draft",
      synthesisId:id,createdAt:(saved as Row).created_at,stylePreset,
      referenceStudyId:referenceStudyId||null,is3d:false,approved:false,
    }});
  }catch(error){
    const code=error instanceof Error?error.message:"generation_failed";
    console.warn("egg_form_generation_failure",{
      class:code==="rate_limited"?"rate_limit":
        code==="model_not_authorized"?"access":
        code.startsWith("prompt_")||code==="invalid_prompt"?"prompt":
        code.startsWith("image_")||code==="invalid_image"?"image":"provider",
      code,
    });
    const status=code==="rate_limited"?429:
      code==="model_not_authorized"?503:502;
    return fail(res,status,["rate_limited","model_not_authorized","image_failed",
      "invalid_image","prompt_incomplete","invalid_prompt","prompt_failed",
      "prompt_request_invalid","image_request_invalid"]
      .includes(code)?code:"generation_failed");
  }
}

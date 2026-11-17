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
    if(size>16000)throw Error("too_large");
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
 const directions=[
  "Spatial hypothesis A — one distinctive asymmetrical gesture: a few coherent, slender curved spatial trajectories and concentrated nodes hold a clearly perceivable presence; generous openings and voids remain integral to the shape.",
  "Spatial hypothesis B — a delicate but dense-enough spatial constellation: one strong focal point, secondary points and connecting rhythms, with a partially legible three-dimensional silhouette and deep open negative space.",
  "Spatial hypothesis C — layered sculptural contours: a coherent sequence of offset flowing planes, slender contours and partially condensed accents, suggesting a form through voids rather than a closed shell.",
 ];
 return directions[variant%directions.length];
}
function morphologySafeguard(idea:string):string{
 const authorRequestedClosedShape=/(яйц|egg|овал|овои|сфер|шар|губк|порист|foam|sponge|sphere|ovoid)/i.test(idea);
 return authorRequestedClosedShape?"Respect any author-defined geometry.":
  "Avoid generic closed ovoid, egg, stone, potato, sphere or sponge-shaped lumps; no foamy, cratered, coral-like or porous surface that replaces the author's spatial concept.";
}
function ideaImagePrompt(source:EggIdeaFormSource,variant:number):string{
 const input=normalizeEggIdeaFormSource(source);
 const fullIdea=[input.intent,input.constraints,input.draft,input.materialInsight,
  ...input.materials.map(m=>m.text)].join(" ");
 return [
  "AUTHOR'S IDEA (PRIMARY CREATIVE DIRECTION): "+input.intent,
  input.constraints?"AUTHOR'S CONSTRAINTS: "+input.constraints:"",
  input.draft?"WORKING IDEA DRAFT (not approved): "+input.draft:"",
  input.materialInsight?"MATERIAL FIELD INSIGHT: "+input.materialInsight:"",
  input.materials.length?"SELECTED RESEARCH NOTES: "+
   input.materials.map(m=>m.type+": "+m.text).join("; "):"",
  "IMAGE OBJECTIVE: Conceptual spatial form study, not a finished product or architecture project.",
  "Translate the AUTHOR'S METAPHOR into formal relationships, never literalize a metaphor as a physical object.",
  "Interpret a 'separate note' as the distinct presence, rhythmic accent and tension of one form in surrounding space; not a music symbol and not a literal musical instrument.",
  formDirection(variant),
  "The form should feel mentally present and sufficiently manifested to suggest an identity, while retaining uncertainty and openness. If using point density, use it to reveal joints, directions and gaps — NOT to imitate porous physical material or a grainy blob.",
  morphologySafeguard(fullIdea),
  "One believable sculptural presence, no utility or function invented. Quiet warm-neutral architectural lighting, considered depth, no text, logos, captions or diagrams.",
  "This is an exploratory visual hypothesis, not an approved design or CAD model.",
 ].filter(Boolean).join("\n").slice(0,10000);
}
function cycleImagePrompt(project:EggProject,cycle:EggFlowCycle,variant:number):string{
 const source=scope(project,cycle);
 return [
  "AUTHOR'S IDEA AND VERIFIED WORKING INPUTS:",
  source,
  "IMAGE OBJECTIVE: One exploratory spatial manifestation from the given cycle, not a finished product or established geometry.",
  "Interpret all eight contributions as evidence or hypotheses according to their labels. Preserve any explicitly defined function and do not invent one.",
  formDirection(variant),
  "Point density may express tension and attractors but must not turn into a sponge or pitted rock surface.",
  morphologySafeguard(source),
  "Use meaningful negative space, partial contours, coherent volume and subtle details. No lettering, labels or diagrams.",
 ].join("\n").slice(0,11800);
}
async function generateImage(key:string,prompt:string):Promise<Buffer>{
  const image=await callOpenAI(key,"images/generations",{
    model:IMAGE_MODEL,n:1,size:"1024x1024",quality:"low",
    output_format:"webp",output_compression:72,
    prompt,
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
  if(req.method==="POST"){
    let payload:unknown;
    try{payload=await readBody(req);}catch{return fail(res,400,"invalid_request");}
    if(!payload||typeof payload!=="object"||Array.isArray(payload))
      return fail(res,400,"invalid_request");
    if(JSON.stringify(payload).length>14000)return fail(res,413,"invalid_request");
    const o=payload as Record<string,unknown>;
    projectId=typeof o.projectId==="string"?o.projectId:"";
    synthesisId=typeof o.synthesisId==="string"?o.synthesisId:"";
    revision=typeof o.expectedRevision==="number"?o.expectedRevision:undefined;
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
    // The image model itself performs semantic interpretation of this source.
    // No unrelated sphere synthesis can influence a local Idea draft.
    const prompt=idea?ideaImagePrompt(idea,count??0):cycleImagePrompt(project,cycle!,count??0);
    const bytes=await generateImage(key,prompt);
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
      synthesisId:id,createdAt:(saved as Row).created_at,is3d:false,approved:false,
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

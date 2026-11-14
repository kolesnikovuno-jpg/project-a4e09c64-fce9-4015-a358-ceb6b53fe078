/**
 * Author-controlled one-step EGG automated flow.
 *
 * Uses the same Supabase owner verification + CAS revision lock as api/egg.
 * Never accepts an egg_v1_ agent key and never changes Author DNA/levels.
 * One HTTP request executes at most one model call and one EGG contribution.
 * No long-running worker, cron, queue or hidden background processing.
 */
import type {IncomingMessage,ServerResponse} from "node:http";
import {createClient} from "@supabase/supabase-js";
import {getEggStorageConfig} from "../src/server/eggStorageConfig.js";
import type {EggProject} from "../src/lib/eggEngine.js";
import {eggMutationSchema,runEggMutation} from "../src/lib/eggCommands.js";
import {
  eggAutomationRequestSchema,nextEggAutomationStep,
  buildEggAutomationPrompt,parseEggAutomationOutput,
} from "../src/lib/eggFlowAutomation.js";

export const config={maxDuration:60};
type Request=IncomingMessage&{body?:unknown};
const send=(res:ServerResponse,status:number,data:unknown)=>{
  res.statusCode=status;
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Cache-Control","no-store, private");
  res.setHeader("X-Content-Type-Options","nosniff");
  res.end(JSON.stringify(data));
};
type StepError="method_not_allowed"|"cross_origin_forbidden"|"egg_engine_not_configured"|
  "invalid_request"|"body_too_large"|"author_session_required"|"invalid_author_session"|
  "project_not_found"|"revision_conflict"|"unsupported_project_schema"|"cycle_not_ready"|
  "ai_provider_not_configured"|"model_request_failed"|"ai_model_not_authorized"|
  "ai_budget_exhausted"|"ai_rate_limited"|"model_incomplete"|"invalid_ai_output"|
  "ai_context_too_large"|"provider_timeout"|"database_unavailable"|"invalid_state_transition"|
  "internal_error";
function fail(res:ServerResponse,status:number,error:StepError){
  send(res,status,{ok:false,error});
}
async function readBody(req:Request):Promise<unknown>{
  const max=2500;
  if(req.body!==undefined){
    const data=req.body;
    const value=typeof data==="string"?JSON.parse(data) as unknown:data;
    if(Buffer.byteLength(JSON.stringify(value))>max)throw Error("body_too_large");
    return value;
  }
  const chunks:Buffer[]=[];
  let total=0;
  for await(const c of req){
    const buf=Buffer.isBuffer(c)?c:Buffer.from(c as Uint8Array);
    total+=buf.length;
    if(total>max)throw Error("body_too_large");
    chunks.push(buf);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}
type Provider={url:string;key:string;model:string;kind:"gateway"|"direct_openai"|"self_hosted"|"direct_gemini"};
/** Vercel injects runtime OIDC on x-vercel-oidc-token, not reliably in env. */
export function providerFromEnv(env:NodeJS.ProcessEnv,oidcHeader?:string|string[]):Provider|null{
  // Explicit opt-in for a private OpenAI Responses-compatible HTTPS bridge.
  // Never accept arbitrary request-provided URLs (SSRF prevention).
  const endpoint=env.EGG_AUTOMATION_ENDPOINT?.trim();
  if(endpoint){
    let url:URL;
    try{url=new URL(endpoint);}catch{return null;}
    if(url.protocol!=="https:"||url.username||url.password||url.search||url.hash||
       !url.hostname.includes(".")||url.pathname!=="/v1/responses"||url.port||
       /^(localhost|127\\.|10\\.|192\\.168\\.|169\\.254\\.)/.test(url.hostname))return null;
    const key=env.EGG_AUTOMATION_ENDPOINT_KEY?.trim();
    const model=env.EGG_AUTOMATION_MODEL?.trim();
    if(!key||!model)return null;
    return {url:url.toString(),key,model,kind:"self_hosted"};
  }
  // Prefer the already configured Gemini key: it is independent of Gateway billing/auth.
  const geminiKey=env.GEMINI_API_KEY?.trim();
  if(geminiKey)return {
    url:"https://generativelanguage.googleapis.com/v1beta/models/",
    key:geminiKey,kind:"direct_gemini",
    model:env.EGG_GEMINI_MODEL?.trim()||"gemini-3-flash-preview",
  };
  const injected=typeof oidcHeader==="string"?oidcHeader.trim():"";
  const oidc=(env.VERCEL&&injected)||env.VERCEL_OIDC_TOKEN?.trim();
  const gatewayKey=env.AI_GATEWAY_API_KEY?.trim()||oidc;
  if(gatewayKey)return {
    url:"https://ai-gateway.vercel.sh/v1/responses",key:gatewayKey,kind:"gateway",
    model:env.EGG_AUTOMATION_MODEL?.trim()||"openai/gpt-5.4-mini",
  };
  const directKey=env.OPENAI_API_KEY?.trim();
  if(directKey)return {
    url:"https://api.openai.com/v1/responses",key:directKey,kind:"direct_openai",
    model:env.EGG_AUTOMATION_MODEL?.trim()||"gpt-5-mini",
  };
  return null;
}
async function generate(model:Provider,prompt:{instructions:string;input:string},
  maxTokens=2200):Promise<string>{
  if(Buffer.byteLength(prompt.instructions)+Buffer.byteLength(prompt.input)>60000)
    throw Error("ai_context_too_large");
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),50000);
  let response:Response;
  try{
    if(model.kind==="direct_gemini"){
      response=await fetch(model.url+encodeURIComponent(model.model)+":generateContent",{
        method:"POST",
        headers:{"x-goog-api-key":model.key,"Content-Type":"application/json"},
        signal:controller.signal,redirect:"error",
        body:JSON.stringify({
          systemInstruction:{parts:[{text:prompt.instructions}]},
          contents:[{role:"user",parts:[{text:prompt.input}]}],
          generationConfig:{responseMimeType:"application/json",maxOutputTokens:maxTokens,...(model.model.startsWith("gemini-3")?{thinkingConfig:{thinkingLevel:"minimal"}}:{})},
        }),
      });
    }else response=await fetch(model.url,{
      method:"POST",
      headers:{"Authorization":"Bearer "+model.key,"Content-Type":"application/json"},
      signal:controller.signal,
      redirect:"error",
      body:JSON.stringify({
        model:model.model,instructions:prompt.instructions,input:prompt.input,
        max_output_tokens:maxTokens,store:false,
        text:{format:{type:"json_object"}},
      }),
    });
  }catch(error){
    if(controller.signal.aborted)throw Error("provider_timeout");
    throw Error("model_request_failed");
  }finally{clearTimeout(timeout);}
  if(!response.ok){
    // Do not echo provider errors; they can include private customer context.
    if(response.status===429)throw Error("ai_rate_limited");
    if(response.status===402)throw Error("ai_budget_exhausted");
    if(response.status===401||response.status===403)throw Error("ai_model_not_authorized");
    throw Error("model_request_failed");
  }
  if(model.kind==="direct_gemini"){
    let data:{candidates?:Array<{content?:{parts?:Array<{text?:string}>},finishReason?:string}>};
    try{data=await response.json() as typeof data;}catch{throw Error("invalid_ai_output");}
    const raw=data.candidates?.[0]?.content?.parts?.map(p=>p.text??"").join("")??"";
    if(!raw||raw.length>25000)throw Error("invalid_ai_output");
    return raw;
  }
  let data:{
    status?:string;output?:Array<{type?:string;content?:Array<{type?:string;text?:string}>}>;
  };
  try{data=await response.json() as typeof data;}catch{throw Error("invalid_ai_output");}
  if(data.status!=="completed")throw Error("model_incomplete");
  const raw=data.output?.flatMap(x=>x.type==="message"?(x.content??[]):[])
    .filter(x=>x.type==="output_text")
    .map(x=>x.text??"").join("")??"";
  if(!raw||raw.length>25000)throw Error("invalid_ai_output");
  return raw;
}

export default async function handler(req:Request,res:ServerResponse){
  res.setHeader("Allow","POST");
  if(req.method!=="POST")return fail(res,405,"method_not_allowed");
  // Block cross-origin browser writes; nothing ever enters the URL.
  if(req.headers.origin){
    let same=false;
    try{
      const origin=new URL(req.headers.origin);
      const host=String(req.headers["x-forwarded-host"]||req.headers.host||"").split(",")[0].trim();
      same=origin.protocol==="https:"&&origin.host===host;
    }catch{/* bad Origin */}
    if(!same)return fail(res,403,"cross_origin_forbidden");
  }
  const cfg=getEggStorageConfig(process.env);
  if(!cfg)return fail(res,503,"egg_engine_not_configured");
  const bearer=/^Bearer\s+(\S+)$/i.exec(String(req.headers.authorization??""));
  if(!bearer||bearer[1].startsWith("egg_v1_"))
    return fail(res,401,"author_session_required");
  let body:unknown;
  try{body=await readBody(req);}
  catch(e){return fail(res,String(e).includes("body_too_large")?413:400,
    String(e).includes("body_too_large")?"body_too_large":"invalid_request");}
  const parsed=eggAutomationRequestSchema.safeParse(body);
  if(!parsed.success)return fail(res,400,"invalid_request");
  const input=parsed.data;
  try{
    const auth=createClient(cfg.url,cfg.publishableKey,{
      auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
    });
    const {data:authData,error:authError}=await auth.auth.getUser(bearer[1]);
    if(authError||!authData.user?.id)return fail(res,401,"invalid_author_session");
    const ownerId=authData.user.id;
    const db=createClient(cfg.url,cfg.serviceKey,{
      auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
    });
    const {data:row,error:readError}=await db.from("egg_engine_projects")
      .select("id,owner_id,document,revision").eq("id",input.projectId)
      .eq("owner_id",ownerId).maybeSingle();
    if(readError)return fail(res,503,"database_unavailable");
    if(!row)return fail(res,404,"project_not_found");
    if(row.revision!==input.expectedRevision)return fail(res,409,"revision_conflict");
    const project=row.document as EggProject;
    if(project.schema!=="egg.engine/0.1"||project.id!==input.projectId)
      return fail(res,409,"unsupported_project_schema");
    const provider=providerFromEnv(process.env,req.headers["x-vercel-oidc-token"]);
    if(!provider)return fail(res,503,"ai_provider_not_configured");
    if(input.mode==="preflight"){
      // A single minimal REAL model call validates auth and provider/budget.
      // Crucially, this runs BEFORE any cycle starts, and saves NOTHING.
      let answer:string;
      try{
        answer=await generate(provider,{
          instructions:"Return only a JSON object with ready set to true. No explanation.",
          input:"Connectivity check for EGG; no project data provided.",
        },350);
      }catch(e){
        const code=e instanceof Error?e.message:"model_request_failed";
        if(code==="ai_rate_limited")return fail(res,429,"ai_rate_limited");
        if(code==="ai_budget_exhausted")return fail(res,402,"ai_budget_exhausted");
        if(code==="ai_model_not_authorized")return fail(res,503,"ai_model_not_authorized");
        if(code==="provider_timeout")return fail(res,502,"provider_timeout");
        if(code==="model_incomplete")return fail(res,502,"model_incomplete");
        return fail(res,502,"model_request_failed");
      }
      try{
        const parsed=JSON.parse(answer) as {ready?:unknown};
        if(parsed?.ready!==true)return fail(res,502,"invalid_ai_output");
      }catch{return fail(res,502,"invalid_ai_output");}
      return send(res,200,{
        ok:true,ready:true,revision:row.revision,
        provider:provider.kind,model:provider.model,
        projectChanged:false,chargedModelCheck:true,
      });
    }
    let step:ReturnType<typeof nextEggAutomationStep>;
    try{step=nextEggAutomationStep(project);}
    catch{return fail(res,409,"invalid_state_transition");}
    if(step.kind==="not_started")return fail(res,409,"cycle_not_ready");
    if(step.kind==="done")return send(res,200,{
      ok:true,revision:row.revision,done:true,completed:{kind:"done"},next:step,
    });
    const prompt=buildEggAutomationPrompt(project,step);
    let raw:string;
    try{raw=await generate(provider,prompt);}
    catch(e){
      const code=(e instanceof Error?e.message:"model_request_failed");
      const known=[
        "ai_context_too_large","provider_timeout","ai_rate_limited",
        "ai_budget_exhausted","ai_model_not_authorized","model_incomplete",
      ] as const;
      const failure=known.find(x=>x===code)??"model_request_failed";
      return fail(res,code==="ai_context_too_large"?413:
        code==="ai_budget_exhausted"?402:
        code==="ai_rate_limited"?429:
        code==="ai_model_not_authorized"?503:502,failure);
    }
    let generated:ReturnType<typeof parseEggAutomationOutput>;
    try{
      // Normalize only the model's evidence label at the trusted server boundary.
      // Unknown labels are never upgraded to verified facts.
      if(step.kind==="sphere"){
        const obj=JSON.parse(raw) as Record<string,unknown>;
        if(obj&&typeof obj==="object"&&!Array.isArray(obj)&&typeof obj.evidence==="string"&&
          obj.evidence!=="hypothesis"&&obj.evidence!=="question"){
          obj.evidence="hypothesis";raw=JSON.stringify(obj);
        }
      }
      generated=parseEggAutomationOutput(step,raw);
    }
    catch(error){
      const issues=error&&typeof error==="object"&&"issues" in error&&Array.isArray((error as {issues?:unknown[]}).issues)?(error as {issues:unknown[]}).issues:[];
      console.warn("egg_flow_ai_schema_failure",{
        step:step.kind,sphere:step.kind==="sphere"?step.sphere:undefined,
        provider:provider.kind,model:provider.model,
        outputLength:raw.length,
        issuePaths:issues.slice(0,8).map(issue=>issue&&typeof issue==="object"&&"path" in issue?String((issue as {path:unknown}).path):"unknown"),
        issueCodes:issues.slice(0,8).map(issue=>issue&&typeof issue==="object"&&"code" in issue?String((issue as {code:unknown}).code):"unknown"),
        parseKind:error instanceof SyntaxError?"json_syntax":"schema",
      });
      return fail(res,502,"invalid_ai_output");
    }
    const agent={kind:"agent" as const,projectId:project.id,ownerId,
      scopes:["contribute" as const]};
    let nextProject:EggProject;
    try{
      const mutation=step.kind==="sphere"&&generated.kind==="sphere"?
        eggMutationSchema.parse({
          command:"complete_flow_sphere",projectId:project.id,expectedRevision:row.revision,
          sphere:step.sphere,text:generated.data.text,evidence:generated.data.evidence,
          discoveredQuestions:generated.data.discoveredQuestions?.map(q=>({
            domain:q.domain,question:q.question,basis:q.basis,
          })),
        }):
        step.kind==="yolk"&&generated.kind==="yolk"?
        eggMutationSchema.parse({
          command:"contribute_yolk_review",projectId:project.id,expectedRevision:row.revision,
          ...generated.data,
        }):null;
      if(!mutation)throw Error("wrong_step");
      nextProject=runEggMutation(project,mutation,agent,ownerId,new Date().toISOString());
    }catch{return fail(res,502,"invalid_ai_output");}
    const {data:saved,error:saveError}=await db.rpc("egg_engine_cas_update",{
      p_project_id:project.id,p_owner_id:ownerId,
      p_expected_revision:row.revision,p_document:nextProject,
    });
    if(saveError)return fail(res,503,"database_unavailable");
    if(!Array.isArray(saved)||!saved.length)return fail(res,409,"revision_conflict");
    const next=nextEggAutomationStep(nextProject);
    return send(res,200,{
      ok:true,revision:saved[0].new_revision,
      completed:{kind:step.kind,...(step.kind==="sphere"?{sphere:step.sphere}:{})},
      next,done:next.kind==="done",
    });
  }catch{
    return fail(res,500,"internal_error");
  }
}

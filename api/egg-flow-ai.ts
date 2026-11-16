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
import {EGG_MATERIAL_RESONANCE_INSTRUCTIONS,EGG_ENTRY_MANIFESTS} from "../src/lib/eggSphereProtocol.js";
import {EggEngineError,type EggProject} from "../src/lib/eggEngine.js";
import {prepareGroundedEggYolkReview} from "../src/lib/eggYolkSemantic.js";
import {parseEggRetryAfter} from "../src/lib/eggAiPacing.js";
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
  "ai_context_too_large"|"provider_timeout"|"database_unavailable"|"invalid_state_transition"|"invalid_ai_sources"|
  "internal_error";
type EggRateLimitScope="minute"|"daily"|"unknown";
type EggRateLimitDetails={retryAfterSeconds?:number;rateLimitScope:EggRateLimitScope};
function fail(res:ServerResponse,status:number,error:StepError,meta?:Partial<EggRateLimitDetails>){
  send(res,status,{ok:false,error,...(meta??{})});
}
class EggProviderLimitError extends Error{
  readonly retryAfterSeconds?:number;
  readonly rateLimitScope:EggRateLimitScope;
  constructor(info:EggRateLimitDetails){
    super("ai_rate_limited");this.name="EggProviderLimitError";
    this.retryAfterSeconds=info.retryAfterSeconds;
    this.rateLimitScope=info.rateLimitScope;
  }
}
/** Read only allowlisted quota hints; never surface raw Google errors,
 * project identifiers, request data, credentials or provider error text.
 */
export async function parseEggProviderRateLimit(response:Response):Promise<EggRateLimitDetails>{
  const headerSeconds=parseEggRetryAfter(response.headers.get("retry-after"));
  let body:unknown;
  try{body=await response.clone().json();}catch{return {rateLimitScope:"unknown",
    ...(headerSeconds?{retryAfterSeconds:headerSeconds}:{})};}
  const envelope=body&&typeof body==="object"&&"error" in body?
    (body as {error?:unknown}).error:undefined;
  const error=envelope&&typeof envelope==="object"?
    envelope as {details?:unknown;message?:unknown}:undefined;
  const items=Array.isArray(error?.details)?error.details:[];
  const quotaHints:string[]=[];
  let retry=headerSeconds;
  for(const detail of items){
    if(!detail||typeof detail!=="object")continue;
    const data=detail as {violations?:unknown;retryDelay?:unknown;quotaId?:unknown;quotaMetric?:unknown};
    const violations=Array.isArray(data.violations)?data.violations:[data];
    for(const violation of violations){
      if(!violation||typeof violation!=="object")continue;
      const q=violation as {quotaId?:unknown;quotaMetric?:unknown};
      for(const value of [q.quotaId,q.quotaMetric])
        if(typeof value==="string")quotaHints.push(value.slice(0,180));
    }
    if(!retry&&typeof data.retryDelay==="string"){
      const m=/^(\d+(?:\.\d+)?)s$/.exec(data.retryDelay);
      if(m)retry=Math.min(86400,Math.ceil(Number(m[1])));
    }
  }
  // Google sometimes supplies only a textual quota hint. Inspect locally,
  // then discard the source text; clients receive only a coarse classification.
  const signals=quotaHints.join(" ")+(typeof error?.message==="string"?
    " "+error.message.slice(0,600):"");
  const rateLimitScope:EggRateLimitScope=/per.?day|daily|requests.?per.?day|rpd/i.test(signals)?
    "daily":/per.?minute|requests.?per.?minute|tokens.?per.?minute|rpm|tpm/i.test(signals)?
    "minute":"unknown";
  return {rateLimitScope,...(retry?{retryAfterSeconds:retry}:{})};
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
  // Direct OpenAI is explicitly enabled only when the Author provisions a
  // server-side key. No silent fallback to Gemini if an OpenAI call fails.
  // In the absence of this key the existing Gemini installation is unchanged.
  const directKey=env.OPENAI_API_KEY?.trim();
  if(directKey){
    // A previous Gemini/Gateway setting must not be sent as an OpenAI model ID.
    // When the provider changes, retain an explicitly chosen native OpenAI ID,
    // otherwise use the known low-cost default.
    const requested=env.EGG_AUTOMATION_MODEL?.trim();
    const directModel=requested && !/^(google\/|openai\/|gemini[-\/])/i.test(requested)
      ?requested:"gpt-6-luna";
    return {
      url:"https://api.openai.com/v1/responses",key:directKey,kind:"direct_openai",
      model:directModel,
    };
  }
  // Keep Gemini as the configured default until an OpenAI key exists.
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
  return null;
}
/** A small JSON Schema for Gemini generateContent. The source IDs and the
 * synthesis ID are actual server-side records, not model-invented strings.
 * Zod plus engine checks remain authoritative after generation.
 */
export function buildEggYolkGeminiResponseSchema(project:EggProject){
 const cycle=project.flowCycles?.at(-1);
 const synthesis=cycle?.synthesis;
 if(!synthesis)throw Error("Yolk synthesis is missing");
 const ids=[...synthesis.first,...synthesis.second]
  .map(x=>x.resultId).filter((x):x is string=>typeof x==="string"&&x.length>0);
 if(!ids.length)throw Error("No sphere result IDs");
 const string={type:"string"} as const;
 const sphereNames=["marketing","design","testDrive","commerce","legal","production","procurement","retail"];
 return {
  type:"object",additionalProperties:false,
  properties:{
   synthesisId:{type:"string",enum:[synthesis.id]},
   summary:string,
   interpretations:{
    type:"array",maxItems:4,
    items:{type:"object",additionalProperties:false,
     properties:{
      kind:{type:"string",enum:["alignment","tension","gap","opportunity"]},
      title:string,
      explanation:string,
      sourceResultIds:{type:"array",minItems:1,maxItems:8,items:{type:"string",enum:ids}},
      suggestedSphereTargets:{type:"array",maxItems:4,items:{type:"string",enum:sphereNames}},
      verificationNeeded:string,
     },
     required:["kind","title","explanation","sourceResultIds","suggestedSphereTargets","verificationNeeded"],
    },
   },
   limitations:{type:"array",minItems:1,maxItems:8,items:string},
  },
  required:["synthesisId","summary","interpretations","limitations"],
 };
}
async function generate(model:Provider,prompt:{instructions:string;input:string;imageData?:string;responseJsonSchema?:unknown},
  maxTokens=2200):Promise<string>{
  if(Buffer.byteLength(prompt.instructions)+Buffer.byteLength(prompt.input)+(prompt.imageData?.length??0)>115000)
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
          contents:[{role:"user",parts:[{text:prompt.input},...(prompt.imageData?[{inlineData:{mimeType:"image/jpeg",data:prompt.imageData.slice("data:image/jpeg;base64,".length)}}]:[])]}],
          generationConfig:{responseMimeType:"application/json",maxOutputTokens:maxTokens,
            ...(prompt.responseJsonSchema?{responseJsonSchema:prompt.responseJsonSchema}:{}),
            ...(model.model.startsWith("gemini-3")?{thinkingConfig:{thinkingLevel:"minimal"}}:{})},
        }),
      });
    }else response=await fetch(model.url,{
      method:"POST",
      headers:{"Authorization":"Bearer "+model.key,"Content-Type":"application/json"},
      signal:controller.signal,
      redirect:"error",
      body:JSON.stringify({
        model:model.model,instructions:prompt.instructions,
        input:prompt.imageData?[{role:"user",content:[{type:"input_text",text:prompt.input},
          {type:"input_image",image_url:prompt.imageData}]}]:prompt.input,
        max_output_tokens:maxTokens,store:false,
        text:{format:{type:"json_object"}},
      }),
    });
  }catch(error){
    console.warn("egg_ai_provider_transport",{provider:model.kind,model:model.model,aborted:controller.signal.aborted,errorType:error instanceof Error?error.name:"unknown"});
    if(controller.signal.aborted)throw Error("provider_timeout");
    throw Error("model_request_failed");
  }finally{clearTimeout(timeout);}
  if(!response.ok){
    console.warn("egg_ai_provider_http",{provider:model.kind,model:model.model,status:response.status});
    // Do not echo provider errors; they can include private customer context.
    if(response.status===429)throw new EggProviderLimitError(await parseEggProviderRateLimit(response));
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


type MatterMaterial={id:string;type:"thought"|"link"|"image"|"sketch"|"video";text:string;url?:string;imageData?:string};
type MatterMessage={role:"user"|"assistant";content:string};
type MatterPayload={projectId:string;materials:MatterMaterial[];messages:MatterMessage[];focusId?:string;intent?:string;constraints?:string;materialInsight?:string};
const matterTypes=new Set(["thought","link","image","sketch","video"]);
const isMatterPayload=(value:unknown):value is MatterPayload=>{
 if(!value||typeof value!=="object"||Array.isArray(value))return false;
 const v=value as Partial<MatterPayload>;
 return typeof v.projectId==="string"&&/^[0-9a-f-]{8,80}$/i.test(v.projectId)&&
  Array.isArray(v.materials)&&v.materials.length<=100&&
  v.materials.every(m=>m&&typeof m.id==="string"&&m.id.length<=120&&
   typeof m.type==="string"&&matterTypes.has(m.type)&&
   typeof m.text==="string"&&m.text.length<=2000&&
   (m.url===undefined||(typeof m.url==="string"&&m.url.length<=2048&&/^https?:\/\//i.test(m.url)))&&
   (m.imageData===undefined||(typeof m.imageData==="string"&&
    /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(m.imageData)&&m.imageData.length<220000)))&&
  Array.isArray(v.messages)&&v.messages.length>=1&&v.messages.length<=16&&
  v.messages.every(m=>m&&(m.role==="user"||m.role==="assistant")&&typeof m.content==="string"&&m.content.length<=3000)&&
  v.messages[v.messages.length-1].role==="user"&&
  (v.focusId===undefined||(typeof v.focusId==="string"&&v.focusId.length<=120))&&
  (v.intent===undefined||(typeof v.intent==="string"&&v.intent.length<=3000))&&
  (v.constraints===undefined||(typeof v.constraints==="string"&&v.constraints.length<=2000))&&
  (v.materialInsight===undefined||(typeof v.materialInsight==="string"&&v.materialInsight.length<=4000));
};
const matterInstructions=[
 ...EGG_MATERIAL_RESONANCE_INSTRUCTIONS,
 "Ты — исследовательский партнёр Автора в сфере EGG «Материальное». Общайся по-русски, компактно, предметно и критически.",
 "Сфера содержит отобранные Автором материалы: изображения, эскизы, тексты, ссылки и другие объекты. Это рабочая подборка, а не обязательно единый проект или уже готовая идея.",
 "Главная цель — исследовать отношения между материалами и идеей: (А) если Автор сформулировал идею в доступном контексте — проверяй соответствие материалов этому замыслу; (Б) если идея не сформулирована — помогай проявить возможные идеи из подборки. Не объявляй режим выбранным без оснований.",
 "Если идея дана: кратко переформулируй её как рабочее предположение, выявляй подтверждающие и противоречащие материалы, открытые вопросы и пробелы. Не подменяй замысел Автора собственной интерпретацией.",
 "Если идея не дана: ищи повторяющиеся функции, образы, напряжения, контрасты и возможные связи; предложи одну-две альтернативные гипотезы ядра только при наличии оснований. Если связи недостаточны — скажи об этом. Не объединяй всё искусственно.",
 "Единичный уникальный материал может быть важнее множества похожих. Не принимай частоту повторения за доказательство значимости.",
 "Строго разделяй НАБЛЮДЕНИЕ (содержимое доступных материалов), ВЫВОД (обоснованная связь), ГИПОТЕЗА (требует проверки) и ВОПРОС (уточнение Автору). Не выдавай визуальные догадки за установленные факты.",
 "Ссылайся на конкретные материалы по переданным идентификаторам или кратким названиям, чтобы Автор мог найти их на холсте. Если указан focusId — сначала обсуждай этот материал в контексте всей подборки.",
 "После анализа сформулируй один наиболее полезный вопрос Автору. Не превращай ответ в длинный отчёт и не повторяй уже согласованное без необходимости.",
 "Диалог итеративен: учитывай ответы Автора, пересматривай гипотезы, явно показывай, что изменилось. Несогласие или отсутствие единой идеи — допустимый результат.",
 "Автор единолично утверждает, отклоняет и переносит результаты. Ты не меняешь содержимое карточек, исходную идею, ДНК или уровни; не записываешь ничего сам и не передаёшь результат в следующую сферу.",
 "Потенциальный результат сферы — структурированное основание для сферы «Идея»: выбранные материалы, связи, противоречия, гипотезы и открытые вопросы. Оно остаётся предложением до утверждения Автором.",
 "Визуально анализируй лишь реально приложенные превью. Содержимое сайтов по URL, видео и документов, не переданных как содержимое, тебе неизвестно. Не выдумывай детали.",
 "Сначала отвечай на конкретный запрос Автора; общую диагностику выполняй только по его просьбе или когда без неё нельзя продвинуть обсуждение.",
].join("\n");
const ideaInstructions=[
 "Ты — исследовательский партнёр Автора в сфере EGG «Идея».",
 "Твоя роль: "+EGG_ENTRY_MANIFESTS.idea.role+". "+EGG_ENTRY_MANIFESTS.idea.mission,
 "Только Автор инициирует направление и утверждает идею. Рамки Автора имеют приоритет над гипотезами Материального.",
 "Используй подготовленную карту поля и разрешённые карточки как контекст, а не как готовый или утверждённый концепт.",
 "Если среди материалов есть id space-context-photo, это отдельная ФОТОГРАФИЯ СУЩЕСТВУЮЩЕГО ПРОСТРАНСТВА: анализируй только видимые композиционные и средовые особенности как контекст размещения замысла. Это не референс формы будущего объекта. Не выводи точные размеры, материалы скрытых конструкций, требования заказчика или геометрию по одному фото.",
 "Если у Автора есть намерение, развивай его образно-смысловое ядро. Если рамки не заданы, не выдумывай размеры, материалы, назначение или технологию.",
 "Не своди идею преждевременно к утилитарному предмету либо геометрии; сохраняй образ, характер, аккорд и потенциал.",
 "Предлагай одну развиваемую версию идеи, отмечай инварианты, гипотезы, противоречия и наиболее важный вопрос Автору.",
 "Каждая следующая итерация учитывает авторские корректировки, но не утверждает за Автора и не меняет ДНК или уровень EGG.",
 "Ссылки и документы без прочитанного содержимого не считаются изученными. Не выдумывай источник или визуальные детали.",
 "Отвечай компактно, сначала на конкретный вопрос Автора. Если нужно — предложи одну ясную формулировку черновика идеи."
].join("\n");
async function matterModelReply(provider:Provider,input:MatterPayload,mode:"matter"|"idea"="matter"):Promise<string>{
 const materials=input.materials.map((m,i)=>({
  ref:i+1,id:m.id,type:m.type,text:m.text,url:m.url??null,
  vision:m.imageData?"Визуальное превью приложено":"Изображение/содержимое не передано",
 }));
 const messages=input.messages.map(m=>m.role+": "+m.content).join("\n\n");
 const prompt="Состав материального холста ("+materials.length+" материалов):\n"+
  JSON.stringify(materials)+"\n\n"+(mode==="idea"&&materials.some(m=>m.id==="space-context-photo")?"Материал space-context-photo обозначает фото СРЕДЫ, не образец проектируемого объекта. Вложенные изображения даны в порядке перечисления их материалов.\n\n":"")+"Фокус: "+(input.focusId??"весь холст")+
  (mode==="idea"?"\n\nИнициация Автора: "+(input.intent??"не задана")+"\nРамки: "+(input.constraints??"не заданы")+"\nЧерновая карта из Материального: "+(input.materialInsight??"нет"):"")+"\n\nДиалог:\n"+messages;
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),45000);
 try{
  let response:Response;
  const images=input.materials.filter(m=>Boolean(m.imageData)).map(m=>m.imageData as string);
  if(provider.kind==="direct_gemini"){
   response=await fetch(provider.url+encodeURIComponent(provider.model)+":generateContent",{
    method:"POST",redirect:"error",signal:controller.signal,
    headers:{"x-goog-api-key":provider.key,"Content-Type":"application/json"},
    body:JSON.stringify({
     systemInstruction:{parts:[{text:mode==="idea"?ideaInstructions:matterInstructions}]},
     contents:[{role:"user",parts:[{text:prompt},...images.map(src=>({
      inlineData:{mimeType:"image/jpeg",data:src.slice("data:image/jpeg;base64,".length)}
     }))]}],
     generationConfig:{maxOutputTokens:2400,...(provider.model.startsWith("gemini-3")?{thinkingConfig:{thinkingLevel:"minimal"}}:{})}
    })
   });
  }else{
   response=await fetch(provider.url,{
    method:"POST",redirect:"error",signal:controller.signal,
    headers:{Authorization:"Bearer "+provider.key,"Content-Type":"application/json"},
    body:JSON.stringify({
     model:provider.model,instructions:mode==="idea"?ideaInstructions:matterInstructions,store:false,max_output_tokens:2400,
     input:[{role:"user",content:[{type:"input_text",text:prompt},
      ...images.map(src=>({type:"input_image",image_url:src,detail:"low"}))]}]
    })
   });
  }
  if(!response.ok){
   if(response.status===429)throw new EggProviderLimitError(await parseEggProviderRateLimit(response));
   if(response.status===401||response.status===403)throw Error("ai_model_not_authorized");
   throw Error("model_request_failed");
  }
  const data=await response.json() as {
   candidates?:Array<{content?:{parts?:Array<{text?:string}>};finishReason?:string}>;
   status?:string;incomplete_details?:{reason?:string};
   output?:Array<{type?:string;content?:Array<{type?:string;text?:string}>}>;
  };
  // HTTP 200 may still contain a model response truncated at its token limit.
  if(provider.kind==="direct_gemini"){
   const finish=data.candidates?.[0]?.finishReason;
   if(finish&&finish!=="STOP")throw Error("model_incomplete");
  }else if(data.status&&data.status!=="completed")throw Error("model_incomplete");
  const result=provider.kind==="direct_gemini"?
   (data.candidates?.[0]?.content?.parts??[]).map(x=>x.text??"").join(""):
   (data.output??[]).flatMap(x=>x.type==="message"?x.content??[]:[])
    .filter(x=>x.type==="output_text").map(x=>x.text??"").join("");
  if(!result.trim()||result.length>8000)throw Error("invalid_ai_output");
  return result.trim();
 }finally{clearTimeout(timeout);}
}
async function matterDialogue(req:Request,res:ServerResponse,mode:"matter"|"idea"="matter"){
 if(req.method!=="POST")return fail(res,405,"method_not_allowed");
 if(req.headers.origin){
  try{
   const origin=new URL(req.headers.origin);
   const host=String(req.headers["x-forwarded-host"]||req.headers.host||"").split(",")[0].trim();
   if(origin.protocol!=="https:"||origin.host!==host)return fail(res,403,"cross_origin_forbidden");
  }catch{return fail(res,403,"cross_origin_forbidden");}
 }
 const bearer=/^Bearer\s+(\S+)$/i.exec(String(req.headers.authorization??""));
 if(!bearer||bearer[1].startsWith("egg_v1_"))return fail(res,401,"author_session_required");
 const cfg=getEggStorageConfig(process.env);
 if(!cfg)return fail(res,503,"egg_engine_not_configured");
 let payload:unknown;
 try{
  if(req.body!==undefined)payload=typeof req.body==="string"?JSON.parse(req.body):req.body;
  else{
   const chunks:Buffer[]=[];let total=0;
   for await(const part of req){
    const chunk=Buffer.isBuffer(part)?part:Buffer.from(part as Uint8Array);
    total+=chunk.length;if(total>3200000)return fail(res,413,"body_too_large");
    chunks.push(chunk);
   }
   payload=JSON.parse(Buffer.concat(chunks).toString("utf8"));
  }
 }catch{return fail(res,400,"invalid_request");}
 if(!isMatterPayload(payload)||Buffer.byteLength(JSON.stringify(payload))>3200000)
  return fail(res,400,"invalid_request");
 try{
  const auth=createClient(cfg.url,cfg.publishableKey,{
   auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
  });
  const {data:authData,error:authError}=await auth.auth.getUser(bearer[1]);
  if(authError||!authData.user?.id)return fail(res,401,"invalid_author_session");
  const db=createClient(cfg.url,cfg.serviceKey,{
   auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
  });
  const {data:owned,error:dbError}=await db.from("egg_engine_projects")
   .select("id").eq("id",payload.projectId).eq("owner_id",authData.user.id).maybeSingle();
  if(dbError)return fail(res,503,"database_unavailable");
  if(!owned)return fail(res,404,"project_not_found");
  const provider=providerFromEnv(process.env,req.headers["x-vercel-oidc-token"]);
  if(!provider)return fail(res,503,"ai_provider_not_configured");
  if(mode==="idea"&&!payload.intent?.trim())return fail(res,400,"invalid_request");
  const replyText=await matterModelReply(provider,payload,mode);
  return send(res,200,{ok:true,reply:replyText,materialsSeen:payload.materials.length,
   imagesSeen:payload.materials.filter(m=>Boolean(m.imageData)).length});
 }catch(e){
  const reason=e instanceof Error?e.message:"model_request_failed";
  if(reason==="ai_rate_limited")return fail(res,429,"ai_rate_limited",
   e instanceof EggProviderLimitError?{rateLimitScope:e.rateLimitScope,
    retryAfterSeconds:e.retryAfterSeconds}:undefined);
  if(reason==="ai_model_not_authorized")return fail(res,503,"ai_model_not_authorized");
  if(reason==="invalid_ai_output")return fail(res,502,"invalid_ai_output");
  if(reason==="model_incomplete")return fail(res,502,"model_incomplete");
  return fail(res,502,"model_request_failed");
 }
}
export default async function handler(req:Request,res:ServerResponse){
  const dialogueOp=new URL(req.url||"/","https://egg.invalid").searchParams.get("op");
  if(dialogueOp==="matter-dialogue"||dialogueOp==="idea-dialogue")
    return matterDialogue(req,res,dialogueOp==="idea-dialogue"?"idea":"matter");
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
        if(code==="ai_rate_limited")return fail(res,429,"ai_rate_limited",
          e instanceof EggProviderLimitError?{rateLimitScope:e.rateLimitScope,
            retryAfterSeconds:e.retryAfterSeconds}:undefined);
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
    if(input.mode==="draft"&&step.kind!=="sphere")return fail(res,409,"invalid_state_transition");
    const prompt=buildEggAutomationPrompt(project,step);
    let raw:string;
    try{raw=await generate(provider,
      step.kind==="yolk"?{...prompt,responseJsonSchema:buildEggYolkGeminiResponseSchema(project)}:prompt,
      step.kind==="yolk"?5800:2200);}
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
        code==="ai_model_not_authorized"?503:502,failure,
        e instanceof EggProviderLimitError?{rateLimitScope:e.rateLimitScope,
          retryAfterSeconds:e.retryAfterSeconds}:undefined);
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
      if(step.kind==="yolk"&&generated.kind==="yolk"){
        const synthesis=project.flowCycles?.at(-1)?.synthesis;
        if(!synthesis)throw new EggEngineError("Missing synthesis");
        const prepared=prepareGroundedEggYolkReview(synthesis,generated.data);
        generated={kind:"yolk",data:prepared.draft};
        if(prepared.discarded)console.warn("egg_flow_ai_interpretations_discarded",{
          step:"yolk",count:prepared.discarded,reason:"unverified_source_references",
        });
      }
    }
    catch(error){
      const issues=error&&typeof error==="object"&&"issues" in error&&Array.isArray((error as {issues?:unknown[]}).issues)?(error as {issues:unknown[]}).issues:[];
      console.warn("egg_flow_ai_schema_failure",{
        step:step.kind,sphere:step.kind==="sphere"?step.sphere:undefined,
        provider:provider.kind,model:provider.model,
        outputLength:raw.length,
        issuePaths:issues.slice(0,8).map(issue=>issue&&typeof issue==="object"&&"path" in issue?String((issue as {path:unknown}).path):"unknown"),
        issueCodes:issues.slice(0,8).map(issue=>issue&&typeof issue==="object"&&"code" in issue?String((issue as {code:unknown}).code):"unknown"),
        parseKind:error instanceof SyntaxError?"json_syntax":
          error instanceof EggEngineError?"semantic_grounding":"schema",
      });
      return fail(res,502,error instanceof EggEngineError?"invalid_ai_sources":"invalid_ai_output");
    }
    if(input.mode==="draft"){
      if(step.kind!=="sphere"||generated.kind!=="sphere")return fail(res,409,"invalid_state_transition");
      // Symbiosis: real AI draft, never an automatic contribution, DB update or
      // Author approval. The Author edits and explicitly submits it separately.
      return send(res,200,{ok:true,revision:row.revision,
        sphere:step.sphere,draft:generated.data,saved:false});
    }
    const agent={kind:"agent" as const,projectId:project.id,ownerId,
      scopes:["contribute" as const]};
    let nextProject:EggProject;
    try{
      const mutation=step.kind==="sphere"&&generated.kind==="sphere"?
        eggMutationSchema.parse({
          command:"complete_flow_sphere",projectId:project.id,expectedRevision:row.revision,
          sphere:step.sphere,text:generated.data.text,evidence:generated.data.evidence,mode:"auto",
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
    }catch(error){
      const message=error instanceof Error?error.message:"";
      const sourceFailure=step.kind==="yolk"&&(
        /source IDs|cite both flows|Duplicate semantic interpretation|different synthesis|Duplicate suggested sphere target/i.test(message));
      console.warn("egg_flow_ai_mutation_failure",{
        step:step.kind,provider:provider.kind,model:provider.model,
        errorType:error instanceof Error?error.name:"unknown",
        failureClass:sourceFailure?"semantic_grounding":"other",
        // Do not log project data, model text or raw error messages.
      });
      return fail(res,502,sourceFailure?"invalid_ai_sources":"invalid_ai_output");
    }
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

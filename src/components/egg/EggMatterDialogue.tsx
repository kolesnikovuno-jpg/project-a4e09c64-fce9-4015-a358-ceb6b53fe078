import { useEffect, useRef, useState } from "react";
import { ArrowLeft, BrainCircuit, Mic, MicOff, Send, X } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import EggWorkspaceSync from "./EggWorkspaceSync";
import {
 eggMaterialMapDraftSchema,createEggMaterialMapRecord,eggMaterialMapKey,
 isEggMaterialMapCurrent,readEggMaterialMapRecord,
 readLocalEggMaterialMap,type EggMaterialMapRecord,type EggMaterialMapDraft,
} from "../../lib/eggMaterialMap";
import {waitForEggAiRequest,postponeEggAiRequests} from "../../lib/eggAiPacing";

export type MatterCard={
 id:string;type:"thought"|"link"|"image"|"sketch"|"video";text:string;src?:string;
 strokes?:Array<{points:Array<{x:number;y:number}>;strokeWidth:number;color:string}>;
};
type Message={role:"user"|"assistant";content:string};
type SpeechResult={results:ArrayLike<ArrayLike<{transcript:string}>>};
type SpeechRecognitionLike={
 lang:string;continuous:boolean;interimResults:boolean;
 onresult:((event:SpeechResult)=>void)|null;
 onerror:((event:{error?:string})=>void)|null;
 onend:(()=>void)|null;
 start:()=>void;stop:()=>void;
};
type SpeechRecognitionWindow=Window&{
 SpeechRecognition?:new()=>SpeechRecognitionLike;
 webkitSpeechRecognition?:new()=>SpeechRecognitionLike;
};

export const makePreview=async(card:MatterCard):Promise<string|undefined>=>{
 try{
  const canvas=document.createElement("canvas");
  const ctx=canvas.getContext("2d");if(!ctx)return undefined;
  if(card.type==="sketch"&&card.strokes?.length){
   canvas.width=480;canvas.height=336;
   ctx.fillStyle="#ffffff";ctx.fillRect(0,0,480,336);
   ctx.save();ctx.scale(.48,.48);
   for(const stroke of card.strokes){
    if(!stroke.points.length)continue;
    ctx.beginPath();ctx.strokeStyle=stroke.color||"#252525";ctx.lineWidth=stroke.strokeWidth||2;
    ctx.lineCap="round";ctx.lineJoin="round";
    stroke.points.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y));
    ctx.stroke();
   }
   ctx.restore();
   return canvas.toDataURL("image/jpeg",.55);
  }
  if(card.type!=="image"||!card.src?.startsWith("data:image/"))return undefined;
  const image=new Image();image.src=card.src;await image.decode();
  const scale=Math.min(1,480/Math.max(image.naturalWidth,image.naturalHeight));
  canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));
  canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  ctx.fillStyle="#ffffff";ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(image,0,0,canvas.width,canvas.height);
  const preview=canvas.toDataURL("image/jpeg",.48);
  return preview.length<210000?preview:undefined;
 }catch{return undefined;}
};
const errorMessage=(code:string)=>{
 if(code==="egg_engine_not_configured")return "Конфигурация EGG недоступна. Повторите попытку позже.";
 if(code==="ai_provider_not_configured")return "Для настоящего диалога необходимо настроить ИИ-провайдера на сервере EGG.";
 if(code==="author_session_required"||code==="invalid_author_session")return "Для диалога необходимо войти в аккаунт EGG.";
 if(code==="project_not_found")return "Проект не найден в аккаунте Автора. Локальные материалы остаются на холсте.";
 if(code==="ai_rate_limited")return "Лимит запросов ИИ. Попробуйте позже.";
 if(code==="model_incomplete")return "ИИ не завершил ответ. Незаконченный текст не сохранён как результат. Повторите запрос короче.";
 if(code==="ai_model_not_authorized")return "ИИ-модель сейчас недоступна для этого проекта.";
 return "Не удалось получить ответ ИИ. Материалы и история диалога сохранены.";
};
export default function EggMatterDialogue({
 projectId,cards,focusId,onClearFocus,onBack,onClose,onOpenIdea
}:{projectId:string;cards:MatterCard[];focusId:string|null;onClearFocus:()=>void;onBack:()=>void;onClose:()=>void;onOpenIdea?:()=>void}){
 const storageKey="egg:matter-dialogue:v1:"+projectId;
 const [messages,setMessages]=useState<Message[]>([]);
 const [research,setResearch]=useState<EggMaterialMapRecord|null>(null);
 const [editingMap,setEditingMap]=useState(false);
 const [mapStorageError,setMapStorageError]=useState("");
 const mapKey=eggMaterialMapKey(projectId);
 const [draft,setDraft]=useState("");
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 const [listening,setListening]=useState(false);
 const [speechAvailable,setSpeechAvailable]=useState(false);
 const recognition=useRef<SpeechRecognitionLike|null>(null);
 const speechBase=useRef("");

 const [overviewed,setOverviewed]=useState(false);
 const [ready,setReady]=useState(false);
 const bottom=useRef<HTMLDivElement>(null);
 const focus=cards.find(card=>card.id===focusId);
 useEffect(()=>{
  const browser=window as SpeechRecognitionWindow;
  setSpeechAvailable(Boolean(browser.SpeechRecognition||browser.webkitSpeechRecognition));
  return ()=>{
   const active=recognition.current;
   if(active){active.onend=null;active.onerror=null;active.onresult=null;active.stop();recognition.current=null;}
  };
 },[]);
 const toggleMicrophone=()=>{
  if(listening){recognition.current?.stop();return;}
  const browser=window as SpeechRecognitionWindow;
  const Speech=browser.SpeechRecognition??browser.webkitSpeechRecognition;
  if(!Speech){setError("В этом браузере распознавание речи недоступно. Можно использовать диктовку клавиатуры.");return;}
  try{
   const next=new Speech();
   recognition.current=next;
   speechBase.current=draft.trim();
   next.lang=document.documentElement.lang==="uk"?"uk-UA":document.documentElement.lang==="en"?"en-US":"ru-RU";
   next.continuous=false;
   next.interimResults=true;
   next.onresult=event=>{
    const parts:string[]=[];
    for(let i=0;i<event.results.length;i++)parts.push(event.results[i][0]?.transcript??"");
    const transcript=parts.join(" ").trim();
    setDraft((speechBase.current?speechBase.current+" ":"")+transcript);
   };
   next.onerror=event=>{
    const code=event.error??"";
    if(code==="not-allowed"||code==="service-not-allowed")setError("Нет разрешения на микрофон. Разрешите доступ в настройках Safari.");
    else if(code!=="no-speech"&&code!=="aborted")setError("Не удалось распознать речь. Используйте текстовый ввод или диктовку клавиатуры.");
    setListening(false);
   };
   next.onend=()=>{setListening(false);recognition.current=null;};
   setError("");
   next.start();
   setListening(true);
  }catch{
   recognition.current=null;setListening(false);
   setError("Микрофон недоступен. Используйте диктовку клавиатуры.");
  }
 };

 useEffect(()=>{
  try{
   const stored=JSON.parse(localStorage.getItem(storageKey)||"[]") as Message[];
   setMessages(Array.isArray(stored)?stored.filter(m=>m&&
    (m.role==="user"||m.role==="assistant")&&typeof m.content==="string").slice(-40):[]);
  }catch{setMessages([]);}
  setResearch(readLocalEggMaterialMap(projectId));
  setDraft("");setError("");setReady(true);setOverviewed(false);
 },[storageKey]);
 useEffect(()=>{if(ready)try{localStorage.setItem(storageKey,JSON.stringify(messages.slice(-40)));}catch{/* local storage full */}},[storageKey,messages,ready]);
 useEffect(()=>{
  if(!ready||!research)return;
  try{localStorage.setItem(mapKey,JSON.stringify(research));setMapStorageError("");}
  catch{setMapStorageError("Локальная копия карты не сохранилась; проверьте облачную синхронизацию ниже.");}
 },[mapKey,research,ready]);
 const mapCurrent=isEggMaterialMapCurrent(research,cards);
 const updateMapEntry=(key:"observations"|"connections"|"tensions"|"hypotheses",index:number,text:string)=>{
  setResearch(old=>old?{...old,status:"draft",acceptedAt:undefined,updatedAt:new Date().toISOString(),
   map:{...old.map,[key]:old.map[key].map((v,i)=>i===index?{...v,text}:v)}}:old);
 };
 const updateMapQuestion=(index:number,text:string)=>{
  setResearch(old=>old?{...old,status:"draft",acceptedAt:undefined,updatedAt:new Date().toISOString(),
   map:{...old.map,questions:old.map.questions.map((v,i)=>i===index?text:v)}}:old);
 };
 const acceptMap=()=>{
  if(!research||!mapCurrent||!eggMaterialMapDraftSchema.safeParse(research.map).success)return;
  const next:EggMaterialMapRecord={...research,status:"accepted",acceptedAt:new Date().toISOString()};
  // Preserve Author's decision in memory even when Safari cannot store more
  // images in localStorage; the separate EGG cloud record will still retry.
  setResearch(next);setEditingMap(false);
 };
 useEffect(()=>{bottom.current?.scrollIntoView?.({behavior:"smooth",block:"nearest"});},[messages,busy]);
 const submit=async(content:string,asMap=false)=>{
  if(busy||!content.trim())return;
  if(listening)recognition.current?.stop();
  const userMessage:Message={role:"user",content:content.trim().slice(0,3000)};
  const previous=[...messages,userMessage].slice(-16);
  setMessages(v=>[...v,userMessage]);setDraft("");setError("");setBusy(true);
  try{
   // EGG uses its own runtime-configured Supabase project, not the legacy site client.
   const configResponse=await fetch("/api/egg-config",{cache:"no-store"});
   if(!configResponse.ok)throw Error("egg_engine_not_configured");
   const config=await configResponse.json() as {supabaseUrl:string;publishableKey:string};
   const auth=createClient(config.supabaseUrl,config.publishableKey);
   const {data:{session}}=await auth.auth.getSession();
   if(!session?.access_token)throw Error("author_session_required");
   // Each turn refreshes the entire board; model knows which item is the focus.
   let previewCount=0;
   const materials=await Promise.all(cards.slice(0,100).map(async card=>{
    const hasVisual=card.type==="image"||card.type==="sketch";
    const attachVisual=hasVisual&&previewCount<12;
    if(attachVisual)previewCount+=1;
    return {
     id:card.id,type:card.type,text:card.text.slice(0,2000),
     ...(card.type==="link"?{url:card.text}:{}),
     ...(attachVisual?{imageData:await makePreview(card)}:{})
    };
   }));
   await waitForEggAiRequest({onWaiting:seconds=>setError("Лимит Gemini: запрос начнётся через "+seconds+" с…")});
   setError("");
   const response=await fetch("/api/egg-flow-ai?op=matter-dialogue",{
    method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token},
    body:JSON.stringify({projectId,materials,messages:previous,focusId:focus?.id,
      ...(asMap?{mapRequested:true}:{})})
   });
   const output=await response.json() as {ok?:boolean;reply?:string;error?:string;materialMap?:EggMaterialMapDraft};
   if(response.status===429){
    postponeEggAiRequests(70_000);
    throw Error("Gemini ограничил запросы; материалы и сообщения сохранены. Повторите позднее.");
   }
   if(!response.ok||!output.ok||!output.reply)throw Error(output.error??"model_request_failed");
   setMessages(v=>[...v,{role:"assistant",content:output.reply!}]);
   if(asMap){
    const valid=eggMaterialMapDraftSchema.safeParse(output.materialMap);
    if(valid.success){
     setResearch(createEggMaterialMapRecord(valid.data,cards,new Date().toISOString()));
     setEditingMap(false);
    }else setError("ИИ не сформировал структурированную карту. Текст сохранён; повторите создание карты.");
   }
  }catch(e){setError(errorMessage(e instanceof Error?e.message:"model_request_failed"));}
  finally{setBusy(false);}
 };
 const firstReview=()=>{setOverviewed(true);void submit("Изучи весь состав холста и сформируй карту: наблюдения, связи, напряжения, гипотезы и вопросы. Не утверждай идею за Автора.",true);};
 const mapSections=[
  {key:"observations" as const,label:"Наблюдения · что видно в материалах"},
  {key:"connections" as const,label:"Связи · что сопоставляется"},
  {key:"tensions" as const,label:"Напряжения · что противоречит"},
  {key:"hypotheses" as const,label:"Гипотезы · что требует проверки"},
 ];
 return <aside aria-label="Диалог Материальное" data-testid="egg-matter-dialogue"
  className="absolute inset-y-0 right-0 z-[60] flex w-full flex-col bg-background/95 text-foreground md:z-40 md:w-1/2 md:bg-background/85">
  <div className="flex shrink-0 items-center justify-between gap-2 px-3 pb-3 pt-[max(1rem,env(safe-area-inset-top))] md:py-3">
   <div className="flex min-w-0 items-center gap-2"><BrainCircuit size={17}/>
    <div className="min-w-0"><h2 className="truncate text-sm font-medium">Материальное</h2>
     <p className="text-[10px] opacity-65">Автор ↔ ИИ · исследование</p></div></div>
   <div className="flex items-center gap-1">
    <button type="button" aria-label="Вернуться в общее поле" title="Общее поле"
     className="rounded-full p-2 hover:bg-[#e8ede5]" onClick={onBack}><ArrowLeft size={17}/></button>
    <button type="button" aria-label="Скрыть диалог" title="Скрыть диалог"
     className="rounded-full p-2 hover:bg-[#e8ede5]" onClick={onClose}><X size={17}/></button>
   </div>
  </div>
  <div className="shrink-0 px-3 py-2">
   <p className="text-[11px] text-[#57675b]">В контексте: {cards.length} материалов · визуально до 12 изображений и эскизов</p>
   <EggWorkspaceSync projectId={projectId} scope="matter" ready={ready}
    value={messages.slice(-40)} isEmpty={v=>v.length===0}
    onRestore={v=>{if(Array.isArray(v))setMessages(v.filter(m=>m&&
      (m.role==="user"||m.role==="assistant")&&typeof m.content==="string").slice(-40));}}
    className="mt-1" />
   <EggWorkspaceSync projectId={projectId} scope="research" ready={ready}
    value={research??{status:"empty" as const}} isEmpty={v=>v.status==="empty"}
    onRestore={v=>{
     const parsed=readEggMaterialMapRecord(v);
     if(parsed)setResearch(parsed);
    }}
    className="mt-1" />
   {focus?<div className="mt-1 flex items-center gap-2 rounded-lg bg-[#e7ede6] px-2 py-1.5 text-xs">
    <span className="min-w-0 flex-1 truncate" title={focus.text}>Фокус: {focus.text}</span>
    <button type="button" aria-label="Сбросить фокус" onClick={onClearFocus}><X size={14}/></button>
   </div>:<p className="mt-1 text-[10px] opacity-60">Фокус: весь холст · наведите на материал или коснитесь его</p>}
   <p className="mt-1 text-[10px] opacity-55">Фокус применяется к следующему запросу. Весь холст остаётся в контексте. Сайты и видео представлены описанием.</p>
  </div>
  <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 pb-28 pt-4 md:pb-4" aria-live="polite">
   {!messages.length&&<div className="space-y-3">
    <p className="text-sm leading-relaxed">Начнём с общего обзора. Наведите курсор на карточку слева или коснитесь её, чтобы выбрать предмет обсуждения.</p>
    <button type="button" aria-label="Начать исследование" disabled={busy||!cards.length||overviewed}
     className="rounded-full bg-[#607466] px-4 py-2.5 text-xs text-white disabled:opacity-40"
     onClick={firstReview}>Исследовать весь холст</button>
    {!cards.length&&<p className="text-xs opacity-65">Перенесите материалы из общего поля — они появятся здесь.</p>}
   </div>}
   {messages.map((message,index)=><div key={index} className={"max-w-[94%] whitespace-pre-wrap break-words px-3 py-2.5 text-[13px] leading-relaxed "+
    (message.role==="assistant"?"mr-auto bg-transparent":"ml-auto rounded-xl bg-foreground/[.055] text-right")}>
    {message.role==="assistant"?<div className="mb-1 flex items-center gap-1 text-[10px] opacity-60"><BrainCircuit size={12}/> ИИ · гипотезы требуют проверки</div>:<div className="mb-1 text-right text-[10px] opacity-60">Автор</div>}
    {message.content}
   </div>)}
   {research&&<section data-testid="egg-material-research-map"
     className="space-y-3 rounded-xl border border-foreground/20 bg-background/80 p-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
     <div><h3 className="text-sm font-medium">Карта исследования</h3>
      <p className="text-[10px] text-foreground/60">
       {research.status==="accepted"&&mapCurrent?"Принято Автором":"Гипотеза ИИ · не принята"}
       {!mapCurrent?" · подборка изменена: нужно повторить анализ":""}
      </p></div>
     <button type="button" className="rounded-full border px-3 py-1.5 text-[11px]"
      onClick={()=>setEditingMap(v=>!v)}>{editingMap?"Завершить уточнение":"Уточнить карту"}</button>
    </div>
    {mapSections.map(section=>research.map[section.key].length>0&&
     <div key={section.key} className="space-y-1">
      <h4 className="text-xs font-semibold">{section.label}</h4>
      {research.map[section.key].map((entry,i)=><div key={section.key+"-"+i}
       className="rounded-lg bg-foreground/[.035] px-2 py-1.5">
       {editingMap?<textarea aria-label={section.label+" "+(i+1)}
        rows={2} value={entry.text} maxLength={450}
        className="w-full resize-y rounded border border-foreground/15 bg-background p-2 text-xs"
        onChange={e=>updateMapEntry(section.key,i,e.target.value)}/>:
        <p className="whitespace-pre-wrap text-xs">{entry.text}</p>}
       <p className="mt-1 text-[10px] opacity-55">Основания: {entry.sourceIds
        .map(id=>cards.find(c=>c.id===id)?.text||id).join(" · ")}</p>
      </div>)}
     </div>)}
    {research.map.questions.length>0&&<div className="space-y-1">
     <h4 className="text-xs font-semibold">Открытые вопросы Автору</h4>
     {research.map.questions.map((q,i)=>editingMap?
      <textarea key={i} aria-label={"Открытый вопрос "+(i+1)} rows={2}
       value={q} maxLength={350}
       onChange={e=>updateMapQuestion(i,e.target.value)}
       className="w-full rounded border border-foreground/15 bg-background p-2 text-xs"/>:
      <p key={i} className="text-xs">{q}</p>)}
    </div>}
    {mapStorageError&&<p role="status" className="text-[11px] text-amber-800">{mapStorageError}</p>}
    <div className="flex flex-wrap gap-2">
     {research.status!=="accepted"&&<button type="button" data-testid="egg-accept-material-map"
      disabled={!mapCurrent||!eggMaterialMapDraftSchema.safeParse(research.map).success}
      onClick={acceptMap}
      className="rounded-full bg-[#607466] px-3 py-2 text-xs text-white disabled:opacity-40">
      Принять карту исследования
     </button>}
     {research.status==="accepted"&&mapCurrent&&onOpenIdea&&<button type="button"
      data-testid="egg-material-map-to-idea" onClick={onOpenIdea}
      className="rounded-full border border-[#607466] px-3 py-2 text-xs text-[#607466]">
      Перейти к Идее
     </button>}
     <button type="button" disabled={busy||!cards.length}
      className="rounded-full border border-foreground/20 px-3 py-2 text-xs disabled:opacity-40"
      onClick={()=>void submit("Пересмотри всё исследование и сформируй актуальную карту, учитывая наши уточнения и текущий набор карточек.",true)}>
      Обновить карту с ИИ
     </button>
    </div>
    <p className="text-[10px] opacity-55">Утверждение карты не создаёт идею, ДНК и не запускает восемь сфер.</p>
   </section>}
   {busy&&<p role="status" className="text-xs opacity-65">ИИ исследует материалы…</p>}
   {error&&<p role="alert" className="rounded-lg border border-[#b6aa91]/40 bg-[#fff7e9] p-2 text-xs">{error}</p>}
   <div ref={bottom}/>
  </div>
  <form className="shrink-0 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3" onSubmit={event=>{event.preventDefault();void submit(draft);}}>
   <textarea aria-label="Сообщение Автору и ИИ" rows={2} maxLength={3000} value={draft}
    onChange={e=>setDraft(e.target.value)}
    placeholder="Наблюдение, вопрос или уточнение…"
    className="w-full resize-none rounded-xl border border-[#a4afa2]/35 bg-white/90 p-3 text-base outline-none focus:border-[#607466] md:text-sm"/>
   <div className="mt-2 flex items-center justify-between gap-2">
    <span className="text-[10px] opacity-55">{listening?"Слушаю… · нажмите, чтобы остановить":"Голос → текст · ответ не утверждает решения"}</span>
    <div className="flex items-center gap-2">
     <button type="button" onClick={toggleMicrophone} aria-label={listening?"Остановить запись голоса":"Голосовой ввод"} aria-pressed={listening}
      title={speechAvailable?"Продиктовать сообщение":"Если диктовка недоступна, используйте микрофон клавиатуры"}
      className={"flex h-9 w-9 items-center justify-center rounded-full border border-[#a4afa2]/35 "+(listening?"bg-[#607466] text-white":"bg-white/80 text-[#607466]")}>
      {listening?<MicOff size={17}/>:<Mic size={17}/>}
     </button>
     <button type="submit" aria-label="Отправить сообщение" disabled={!draft.trim()||busy}
     className="flex items-center gap-1.5 rounded-full bg-[#607466] px-3 py-2 text-xs text-white disabled:opacity-35">
     <Send size={14}/> Отправить
    </button></div>
   </div>
  </form>
 </aside>;
}

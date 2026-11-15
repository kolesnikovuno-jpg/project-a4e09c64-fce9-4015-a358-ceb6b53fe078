import { useEffect, useRef, useState } from "react";
import { ArrowLeft, BrainCircuit, Mic, MicOff, Send, X } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

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

const makePreview=async(card:MatterCard):Promise<string|undefined>=>{
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
 projectId,cards,focusId,onClearFocus,onBack,onClose
}:{projectId:string;cards:MatterCard[];focusId:string|null;onClearFocus:()=>void;onBack:()=>void;onClose:()=>void}){
 const storageKey="egg:matter-dialogue:v1:"+projectId;
 const [messages,setMessages]=useState<Message[]>([]);
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
  setDraft("");setError("");setReady(true);setOverviewed(false);
 },[storageKey]);
 useEffect(()=>{if(ready)try{localStorage.setItem(storageKey,JSON.stringify(messages.slice(-40)));}catch{/* local storage full */}},[storageKey,messages,ready]);
 useEffect(()=>{bottom.current?.scrollIntoView?.({behavior:"smooth",block:"nearest"});},[messages,busy]);
 const submit=async(content:string)=>{
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
   const response=await fetch("/api/egg-flow-ai?op=matter-dialogue",{
    method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token},
    body:JSON.stringify({projectId,materials,messages:previous,focusId:focus?.id})
   });
   const output=await response.json() as {ok?:boolean;reply?:string;error?:string};
   if(!response.ok||!output.ok||!output.reply)throw Error(output.error??"model_request_failed");
   setMessages(v=>[...v,{role:"assistant",content:output.reply!}]);
  }catch(e){setError(errorMessage(e instanceof Error?e.message:"model_request_failed"));}
  finally{setBusy(false);}
 };
 const firstReview=()=>{setOverviewed(true);void submit("Изучи весь состав холста. Какие мотивы, противоречия и вопросы ты видишь? Отделяй наблюдения от гипотез.");};
 return <aside aria-label="Диалог Материальное" data-testid="egg-matter-dialogue"
  className="absolute inset-y-0 right-0 z-40 flex w-full flex-col bg-transparent text-foreground md:w-1/2">
  <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-3">
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
   {focus?<div className="mt-1 flex items-center gap-2 rounded-lg bg-[#e7ede6] px-2 py-1.5 text-xs">
    <span className="min-w-0 flex-1 truncate" title={focus.text}>Фокус: {focus.text}</span>
    <button type="button" aria-label="Сбросить фокус" onClick={onClearFocus}><X size={14}/></button>
   </div>:<p className="mt-1 text-[10px] opacity-60">Фокус: весь холст · наведите на материал или коснитесь его</p>}
   <p className="mt-1 text-[10px] opacity-55">Фокус применяется к следующему запросу. Весь холст остаётся в контексте. Сайты и видео представлены описанием.</p>
  </div>
  <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-4" aria-live="polite">
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
   {busy&&<p role="status" className="text-xs opacity-65">ИИ исследует материалы…</p>}
   {error&&<p role="alert" className="rounded-lg border border-[#b6aa91]/40 bg-[#fff7e9] p-2 text-xs">{error}</p>}
   <div ref={bottom}/>
  </div>
  <form className="shrink-0 p-3" onSubmit={event=>{event.preventDefault();void submit(draft);}}>
   <textarea aria-label="Сообщение Автору и ИИ" rows={2} maxLength={3000} value={draft}
    onChange={e=>setDraft(e.target.value)}
    placeholder="Наблюдение, вопрос или уточнение…"
    className="w-full resize-none rounded-xl border border-[#a4afa2]/35 bg-white/90 p-3 text-sm outline-none focus:border-[#607466]"/>
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

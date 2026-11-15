import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BrainCircuit, Check, Send, X } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { makePreview, type MatterCard } from "./EggMatterDialogue";

type Message={role:"user"|"assistant";content:string};
type FieldItem=MatterCard&{location?:string;sourceUrl?:string};
type IdeaRecord={intent:string;constraints:string;messages:Message[];savedDraft:string};
const readJSON=(key:string):unknown=>{
 try{return JSON.parse(localStorage.getItem(key)??"null");}catch{return null;}
};
export default function EggIdeaWorkspace({projectId,onClose,onOpenMatter}:{
 projectId:string;onClose:()=>void;onOpenMatter:()=>void;
}){
 const key="egg:idea-workspace:v1:"+projectId;
 const [intent,setIntent]=useState("");
 const [constraints,setConstraints]=useState("");
 const [draft,setDraft]=useState("");
 const [savedDraft,setSavedDraft]=useState("");
 const [messages,setMessages]=useState<Message[]>([]);
 const [materials,setMaterials]=useState<FieldItem[]>([]);
 const [materialInsight,setMaterialInsight]=useState("");
 const [loaded,setLoaded]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const bottom=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const state=readJSON(key) as Partial<IdeaRecord>|null;
  if(state){
   setIntent(typeof state.intent==="string"?state.intent:"");
   setConstraints(typeof state.constraints==="string"?state.constraints:"");
   setSavedDraft(typeof state.savedDraft==="string"?state.savedDraft:"");
   setMessages(Array.isArray(state.messages)?state.messages.filter(m=>m&&(m.role==="user"||m.role==="assistant")&&typeof m.content==="string").slice(-40):[]);
  }
  const source=readJSON("egg:project-field:v1:"+projectId);
  if(Array.isArray(source))setMaterials(source.filter((m:FieldItem)=>m&&m.location==="matter"&&typeof m.id==="string"&&typeof m.text==="string").slice(0,100));
  const dialogue=readJSON("egg:matter-dialogue:v1:"+projectId);
  if(Array.isArray(dialogue)){
   const last=[...dialogue].reverse().find((m:Message)=>m?.role==="assistant"&&typeof m.content==="string");
   if(last)setMaterialInsight(last.content.slice(0,4000));
  }
  setLoaded(true);
 },[key,projectId]);
 useEffect(()=>{
  if(loaded)try{localStorage.setItem(key,JSON.stringify({intent,constraints,messages:messages.slice(-40),savedDraft}));}catch{setError("Недостаточно места для сохранения черновика.");}
 },[key,intent,constraints,messages,savedDraft,loaded]);
 useEffect(()=>{bottom.current?.scrollIntoView?.({behavior:"smooth",block:"nearest"});},[messages,busy]);
 const latestAnswer=useMemo(()=>[...messages].reverse().find(m=>m.role==="assistant")?.content??"",[messages]);
 const submit=async(text:string)=>{
  if(!intent.trim()||!text.trim()||busy)return;
  const next:Message={role:"user",content:text.trim().slice(0,3000)};
  const history=[...messages,next].slice(-16);
  setMessages(previous=>[...previous,next]);setDraft("");setBusy(true);setError("");
  try{
   const cfgResponse=await fetch("/api/egg-config",{cache:"no-store"});
   if(!cfgResponse.ok)throw Error("Не удалось получить настройки EGG.");
   const cfg=await cfgResponse.json() as {supabaseUrl:string;publishableKey:string};
   const auth=createClient(cfg.supabaseUrl,cfg.publishableKey);
   const {data:{session}}=await auth.auth.getSession();
   if(!session?.access_token)throw Error("Войдите в аккаунт EGG.");
   const payloadMaterials=await Promise.all(materials.map(async(m,i)=>({
    id:m.id,type:m.type,text:m.text.slice(0,2000),
    ...(m.type==="link"&&/^https?:\/\//.test(m.text)?{url:m.text.slice(0,2048)}:{}),
    ...(i<12&&(m.type==="image"||m.type==="sketch")?{imageData:await makePreview(m)}:{})
   })));
   const response=await fetch("/api/egg-flow-ai?op=idea-dialogue",{
    method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token},
    body:JSON.stringify({projectId,materials:payloadMaterials,messages:history,intent:intent.slice(0,3000),constraints:constraints.slice(0,2000),materialInsight})
   });
   const data=await response.json() as {ok?:boolean;reply?:string;error?:string};
   if(!response.ok||!data.ok||!data.reply)throw Error(data.error==="model_incomplete"?"ИИ не завершил мысль. Попробуйте уточнить запрос.":data.error??"Ошибка ИИ.");
   setMessages(previous=>[...previous,{role:"assistant",content:data.reply!}]);
  }catch(e){setError(e instanceof Error?e.message:"Не удалось получить ответ ИИ.");}
  finally{setBusy(false);}
 };
 return <section aria-label="Сфера Идея — мастерская" data-testid="egg-idea-workspace"
  className="fixed inset-0 z-[90] flex bg-background text-foreground"
  style={{backgroundImage:"radial-gradient(hsl(var(--foreground) / .10) 1px, transparent 1px)",backgroundSize:"25px 25px"}}>
  <div className="flex min-w-0 w-1/2 flex-col px-4 py-5 sm:px-8">
   <div className="mb-6 flex items-center justify-between gap-2">
    <h2 className="text-lg font-light">Идея <span className="text-xs opacity-50">· Автор инициирует</span></h2>
    <button type="button" onClick={onOpenMatter} className="flex items-center gap-1 rounded-full bg-background/80 px-3 py-2 text-xs shadow-sm"><ArrowLeft size={14}/> Материальное</button>
   </div>
   <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-5">
    <label className="block text-xs text-foreground/60">Намерение Автора
     <textarea aria-label="Намерение Автора" value={intent} maxLength={3000} rows={4} onChange={e=>setIntent(e.target.value)}
      placeholder="Что хочешь инициировать? Например: неутилитарный элемент пространства — отдельная нота…"
      className="mt-2 w-full resize-y rounded-xl border border-foreground/15 bg-background/80 p-3 text-sm outline-none focus:border-foreground/40"/>
    </label>
    <label className="block text-xs text-foreground/60">Рамки · необязательно
     <textarea aria-label="Рамки идеи" value={constraints} maxLength={2000} rows={2} onChange={e=>setConstraints(e.target.value)}
      placeholder="Габариты, среда, характер, ограничения — только если определены"
      className="mt-2 w-full resize-y rounded-xl border border-foreground/15 bg-background/80 p-3 text-sm outline-none focus:border-foreground/40"/>
    </label>
    <div className="space-y-2">
     <div className="text-xs text-foreground/70">Поле из «Материального» · {materials.length} материалов</div>
     {materialInsight?<p className="max-h-32 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-foreground/65">{materialInsight}</p>:<p className="text-xs opacity-50">Карты исследования пока нет. Идею можно инициировать самостоятельно.</p>}
     <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {materials.map(m=><div key={m.id} className="min-w-0 rounded-lg bg-background/50 p-2">
       {m.src?.startsWith("data:image/")?<img src={m.src} alt={m.text||"Материал"} className="h-24 w-full object-contain"/>:<div className="line-clamp-4 break-words text-xs">{m.text||m.type}</div>}
       {m.src&&<p className="mt-1 truncate text-[10px] opacity-60">{m.text||m.type}</p>}
      </div>)}
     </div>
    </div>
    {savedDraft&&<div className="space-y-2 rounded-xl border border-foreground/15 bg-background/50 p-3">
     <div className="text-xs font-medium">Сохранённый черновик · не утверждён</div>
     <p className="whitespace-pre-wrap text-xs">{savedDraft}</p>
    </div>}
   </div>
  </div>
  <div className="flex min-w-0 w-1/2 flex-col px-3 py-5 sm:px-6">
   <div className="mb-3 flex items-center justify-between gap-2">
    <div className="flex items-center gap-2 text-sm"><BrainCircuit size={16}/> Идея · Автор ↔ ИИ</div>
    <button type="button" onClick={onClose} aria-label="Закрыть сферу Идея" className="rounded-full bg-background/70 p-2"><X size={17}/></button>
   </div>
   <div className="min-h-0 flex-1 space-y-3 overflow-y-auto py-3" aria-live="polite">
    {!messages.length&&<div className="space-y-3 text-sm text-foreground/65">
     <p>Задай намерение слева. ИИ подтянет материалы и последний анализ из «Материального», затем поможет проявить первую версию идеи.</p>
     <button type="button" disabled={!intent.trim()||busy} onClick={()=>void submit("Исследуй моё намерение в контексте поля. Предложи первую образно-смысловую версию идеи, её инварианты и один вопрос мне.")} className="rounded-full bg-[#607466] px-4 py-2 text-xs text-white disabled:opacity-35">Проявить идею</button>
    </div>}
    {messages.map((m,i)=><div key={i} className={"max-w-[96%] whitespace-pre-wrap break-words p-3 text-sm leading-relaxed "+(m.role==="user"?"ml-auto rounded-xl bg-foreground/[.06] text-right":"mr-auto")}>
     <div className="mb-1 text-[10px] opacity-50">{m.role==="user"?"Автор":"ИИ · гипотеза, не утверждена"}</div>{m.content}
    </div>)}
    {busy&&<p role="status" className="text-xs opacity-60">ИИ исследует намерение и поле…</p>}
    {error&&<p role="alert" className="text-xs text-red-800">{error}</p>}
    <div ref={bottom}/>
   </div>
   {latestAnswer&&<button type="button" className="mb-3 flex items-center justify-center gap-2 rounded-full border border-foreground/20 bg-background/70 p-2 text-xs" onClick={()=>setSavedDraft(latestAnswer)}>
    <Check size={14}/> Сохранить ответ как черновик идеи
   </button>}
   <form className="flex shrink-0 gap-2 pb-[max(.5rem,env(safe-area-inset-bottom))]" onSubmit={e=>{e.preventDefault();void submit(draft);}}>
    <textarea aria-label="Уточнение идеи" rows={2} maxLength={3000} value={draft} onChange={e=>setDraft(e.target.value)}
     placeholder={intent.trim()?"Уточни, возрази, предложи образ…":"Сначала задай намерение слева"}
     className="min-w-0 flex-1 resize-none rounded-xl border border-foreground/15 bg-background/90 p-3 text-sm outline-none"/>
    <button type="submit" aria-label="Отправить уточнение идеи" disabled={!draft.trim()||!intent.trim()||busy}
     className="self-end rounded-full bg-[#607466] p-3 text-white disabled:opacity-35"><Send size={17}/></button>
   </form>
   <p className="text-[10px] opacity-55">Локальный черновик · не меняет ДНК, уровень или решения Автора</p>
  </div>
 </section>;
}

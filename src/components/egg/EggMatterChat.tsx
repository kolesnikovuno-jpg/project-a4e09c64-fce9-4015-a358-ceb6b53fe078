import {useEffect,useState} from "react";
import {createClient} from "@supabase/supabase-js";
import {MessageCircle,Send,X,Plus} from "lucide-react";

type Card={id:string;type:"thought"|"link"|"image"|"sketch"|"video";text:string;src?:string;sourceUrl?:string};
type Message={role:"user"|"assistant";content:string};
type Props={projectId:string;cards:Card[];focus?:Card|null;onClose:()=>void;onAddObservation:(text:string)=>void};
const errorNames:Record<string,string>={
 ai_provider_not_configured:"ИИ пока не подключён на сервере.",
 ai_rate_limited:"Лимит запросов ИИ. Повторите позже.",
 ai_model_not_authorized:"Доступ к модели ИИ не настроен.",
 author_session_required:"Войдите в аккаунт EGG.",
 invalid_author_session:"Сессия завершилась. Войдите снова.",
 body_too_large:"Материалов слишком много для одного запроса.",
 project_not_found:"Проект не найден или недоступен."
};
async function preview(src:string):Promise<string|undefined>{
 if(!src.startsWith("data:image/"))return;
 return new Promise(resolve=>{
  const img=new Image();
  img.onload=()=>{
   const canvas=document.createElement("canvas");
   const scale=Math.min(1,480/Math.max(img.naturalWidth,img.naturalHeight));
   canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));
   canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
   const ctx=canvas.getContext("2d");if(!ctx){resolve(undefined);return;}
   ctx.drawImage(img,0,0,canvas.width,canvas.height);
   const result=canvas.toDataURL("image/jpeg",.56);
   resolve(result.length<220000?result:undefined);
  };
  img.onerror=()=>resolve(undefined);
  img.src=src;
 });
}
export default function EggMatterChat({projectId,cards,focus,onClose,onAddObservation}:Props){
 const key="egg:matter-chat:v1:"+projectId;
 const [messages,setMessages]=useState<Message[]>([]);
 const [draft,setDraft]=useState("");
 const [pending,setPending]=useState(false);
 const [error,setError]=useState("");
 useEffect(()=>{
  try{const stored=JSON.parse(localStorage.getItem(key)||"[]") as unknown;
   setMessages(Array.isArray(stored)?stored.filter((m):m is Message=>!!m&&typeof m==="object"&&
    (m.role==="user"||m.role==="assistant")&&typeof m.content==="string").slice(-40):[]);
  }catch{setMessages([]);}
 },[key]);
 useEffect(()=>{try{localStorage.setItem(key,JSON.stringify(messages.slice(-40)));}catch{/* quota */}},[key,messages]);
 async function send(){
  const question=draft.trim();if(!question||pending)return;
  const next=[...messages,{role:"user" as const,content:question}];
  setDraft("");setMessages(next);setPending(true);setError("");
  try{
   const cfg=await fetch("/api/egg-config",{cache:"no-store"});
   if(!cfg.ok)throw Error("Конфигурация EGG недоступна");
   const {supabaseUrl,publishableKey}=await cfg.json() as {supabaseUrl:string;publishableKey:string};
   const client=createClient(supabaseUrl,publishableKey);
   const {data}=await client.auth.getSession();
   if(!data.session?.access_token)throw Error("Войдите в аккаунт EGG.");
   const materials=await Promise.all(cards.slice(0,100).map(async card=>({
    id:card.id,type:card.type,text:card.text.slice(0,2000),
    ...(card.type==="link"&&/^https?:\/\//.test(card.text)?{url:card.text}:{}),
    ...(card.sourceUrl&&/^https?:\/\//.test(card.sourceUrl)?{url:card.sourceUrl}:{}),
    ...(card.type==="image"&&card.src?{imageData:await preview(card.src)}:{})
   })));
   const response=await fetch("/api/egg-flow-ai?op=matter-dialogue",{
    method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+data.session.access_token},
    body:JSON.stringify({projectId,materials,messages:next.slice(-16).map(m=>({...m,content:m.content.slice(0,3000)})),
     ...(focus?{focusId:focus.id}:{})})
   });
   const result=await response.json() as {ok?:boolean;reply?:string;error?:string};
   if(!response.ok||!result.ok||!result.reply)throw Error(errorNames[result.error||""]||result.error||"Нет ответа от ИИ");
   setMessages(old=>[...old,{role:"assistant",content:result.reply!}]);
  }catch(e){setError(e instanceof Error?e.message:"Не удалось получить ответ");}
  finally{setPending(false);}
 }
 return <aside data-testid="egg-matter-chat" aria-label="Диалог о материалах" className="absolute inset-y-0 right-0 z-40 flex w-full flex-col border-l border-foreground/15 bg-background shadow-xl lg:w-[420px]">
  <header className="flex shrink-0 items-center justify-between border-b border-foreground/10 px-4 py-4">
   <div className="flex items-center gap-2"><MessageCircle size={17}/><div><p className="text-sm font-medium">Диалог · Материальное</p>
    <p className="text-[11px] text-foreground/50">{cards.length} карточек в контексте</p></div></div>
   <button type="button" aria-label="Скрыть чат" title="Скрыть чат" onClick={onClose} className="rounded-full p-2 hover:bg-foreground/10"><X size={18}/></button>
  </header>
  {focus&&<div className="border-b border-foreground/10 px-4 py-2 text-xs text-foreground/65">Фокус: {focus.text.slice(0,70)}</div>}
  <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
   {messages.length===0&&<div className="space-y-2 text-sm leading-relaxed text-foreground/65">
    <p>ИИ получит содержание карточек этого холста при первом запросе. Обсуждайте мотивы, связи и противоречия.</p>
    <p className="text-xs text-foreground/45">Внешние сайты и видео не просматриваются автоматически. Доступные фото передаются как небольшие превью.</p>
   </div>}
   {messages.map((m,i)=><div key={i} className={"rounded-xl p-3 text-[13px] leading-relaxed whitespace-pre-wrap "+(m.role==="user"?"ml-8 bg-foreground/10":"mr-4 bg-foreground/[.04]")}>
    <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-foreground/45">{m.role==="user"?"Автор":"ИИ · гипотезы"}</p>{m.content}
    {m.role==="assistant"&&<div className="mt-3 border-t border-foreground/10 pt-2"><button type="button" onClick={()=>onAddObservation(m.content)} className="inline-flex items-center gap-1 text-[11px] text-foreground/60 hover:text-foreground"><Plus size={13}/> Внести как заметку</button></div>}
   </div>)}
   {pending&&<p className="text-xs text-foreground/50">ИИ анализирует холст…</p>}
  </div>
  {error&&<p role="alert" className="px-4 py-2 text-xs text-red-600">{error}</p>}
  <form onSubmit={e=>{e.preventDefault();void send();}} className="shrink-0 border-t border-foreground/10 p-3">
   <textarea aria-label="Сообщение ИИ" rows={3} value={draft} onChange={e=>setDraft(e.target.value)}
    onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();void send();}}}
    placeholder="Что замечаешь в этих материалах?" className="w-full resize-none rounded-xl border border-foreground/15 bg-transparent p-3 text-sm outline-none focus:border-foreground/40"/>
   <div className="mt-2 flex items-center justify-between"><span className="text-[10px] text-foreground/45">Enter — отправить · Shift+Enter — строка</span>
    <button type="submit" disabled={pending||!draft.trim()} aria-label="Отправить сообщение" className="rounded-full bg-foreground p-2 text-background disabled:opacity-40"><Send size={16}/></button></div>
  </form>
 </aside>;
}

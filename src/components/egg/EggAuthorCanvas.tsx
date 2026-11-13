import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Stroke = { id:string; points:{x:number;y:number}[] };
type Pin = { id:string;x:number;y:number;text:string };
type Photo = { id:string;x:number;y:number;src:string;name:string };
type Board = { strokes:Stroke[]; pins:Pin[]; photos:Photo[]; idea:string };
type Mode = "draw"|"note"|"move";
const empty:Board={strokes:[],pins:[],photos:[],idea:""};
const uid=()=>Math.random().toString(36).slice(2);
export default function EggAuthorCanvas({projectId,seed,revision,onSaved}:{projectId:string;seed:string;revision:number;onSaved:()=>void}){
 const [board,setBoard]=useState<Board>({...empty,idea:seed});
 const [mode,setMode]=useState<Mode>("draw");
 const [presence,setPresence]=useState<"silent"|"partner"|"dialog">("partner");
 const [panel,setPanel]=useState(true);
 const [message,setMessage]=useState("");
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 const [zoom,setZoom]=useState(1);
 const [selected,setSelected]=useState<string|null>(null);
 const [observations,setObservations]=useState<string[]>([]);
 const [draft,setDraft]=useState<Stroke|null>(null);
 const drawing=useRef<Stroke|null>(null);
 const surface=useRef<HTMLDivElement|null>(null);
 const file=useRef<HTMLInputElement|null>(null);
 const loaded=useRef(false);
 const key="egg:author:canvas:v1:"+projectId;
 useEffect(()=>{
  loaded.current=false;
  try{const saved=localStorage.getItem(key);setBoard(saved?JSON.parse(saved) as Board:{...empty,idea:seed});}
  catch{setBoard({...empty,idea:seed});}
  loaded.current=true;setObservations([]);setSelected(null);
 },[key]);
 useEffect(()=>{if(!loaded.current)return;try{localStorage.setItem(key,JSON.stringify(board));}catch{setError("Недостаточно места для локального сохранения. Удалите крупные изображения.");}},[board,key]);
 function position(e:React.PointerEvent){const r=surface.current!.getBoundingClientRect();return{x:(e.clientX-r.left)/zoom,y:(e.clientY-r.top)/zoom};}
 function start(e:React.PointerEvent){if(mode!=="draw"||e.button!==0)return;e.currentTarget.setPointerCapture(e.pointerId);const s={id:uid(),points:[position(e)]};drawing.current=s;setDraft(s);}
 function move(e:React.PointerEvent){if(!drawing.current)return;const s={...drawing.current,points:[...drawing.current.points,position(e)]};drawing.current=s;setDraft(s);}
 function end(){if(!drawing.current)return;const s=drawing.current;drawing.current=null;setDraft(null);setBoard(b=>({...b,strokes:[...b.strokes,s]}));}
 function addPin(e:React.MouseEvent){if(mode!=="note"||e.target!==surface.current)return;const r=surface.current!.getBoundingClientRect();const text=window.prompt("Пометка к идее");if(!text?.trim())return;setBoard(b=>({...b,pins:[...b.pins,{id:uid(),x:(e.clientX-r.left)/zoom,y:(e.clientY-r.top)/zoom,text:text.trim()}]}));}
 async function upload(files:FileList|null){if(!files)return;for(const f of Array.from(files).slice(0,6)){if(!f.type.startsWith("image/")||f.size>3_000_000){setError("Допустимы изображения до 3 МБ.");continue;}const src=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error("Не удалось прочитать файл"));reader.readAsDataURL(f);});setBoard(b=>({...b,photos:[...b.photos,{id:uid(),x:80+(b.photos.length%3)*160,y:65+(b.photos.length%3)*35,src,name:f.name}]}));}}
 function observe(){const summary="На холсте: "+board.strokes.length+" линий, "+board.photos.length+" изображений, "+board.pins.length+" пометок. "+(board.idea?"Смысл: "+board.idea.slice(0,180):"Формулировка идеи пока открыта.");setObservations(v=>[summary,...v].slice(0,8));}
 async function approve(){if(!board.idea.trim())return;setBusy(true);setError("");try{
  const config=await fetch("/api/egg-config",{cache:"no-store"});if(!config.ok)throw new Error("Авторизация недоступна");
  const cfg=await config.json() as {supabaseUrl:string;publishableKey:string};
  const auth=createClient(cfg.supabaseUrl,cfg.publishableKey);const {data:{session}}=await auth.auth.getSession();
  if(!session)throw new Error("Войдите в аккаунт EGG");
  const res=await fetch("/api/egg",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token},body:JSON.stringify({command:"set_seed",projectId,expectedRevision:revision,seed:board.idea.trim()})});
  const result=await res.json() as {error?:string};if(!res.ok)throw new Error(result.error||"Не удалось утвердить идею");
  onSaved();
 }catch(e){setError(e instanceof Error?e.message:"Ошибка");}finally{setBusy(false);}}
 const strokes=[...board.strokes,...(draft?[draft]:[])];
 return <section className="relative w-full overflow-hidden rounded-xl border border-foreground/20 bg-background" aria-label="Холст сферы Автор" data-testid="egg-author-canvas">
  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-foreground/15 p-3">
   <div><strong className="text-sm">Автор / Холст идеи</strong><p className="text-[11px] text-foreground/60">Эскиз · образы · смыслы</p></div>
   <div className="flex flex-wrap gap-2">
    <button type="button" onClick={()=>setPanel(v=>!v)} className="rounded-full border px-3 py-1.5 text-xs">{panel?"Скрыть":"Открыть"} контекст</button>
    <button type="button" onClick={()=>setZoom(z=>Math.max(.5,z-.25))} className="rounded border px-2 text-sm" aria-label="Уменьшить">−</button>
    <span className="self-center text-xs">{Math.round(zoom*100)}%</span>
    <button type="button" onClick={()=>setZoom(z=>Math.min(2,z+.25))} className="rounded border px-2 text-sm" aria-label="Увеличить">+</button>
   </div>
  </div>
  <div className="flex flex-wrap gap-2 border-b border-foreground/10 p-2">
   {([["draw","Карандаш"],["note","Пометка"],["move","Выбор"]] as const).map(([id,label])=><button key={id} type="button" aria-pressed={mode===id} onClick={()=>setMode(id)} className={"rounded-full border px-3 py-1.5 text-xs "+(mode===id?"bg-foreground text-background":"")}>{label}</button>)}
   <button type="button" onClick={()=>file.current?.click()} className="rounded-full border px-3 py-1.5 text-xs">+ Изображение</button>
   <input ref={file} type="file" accept="image/*" multiple className="hidden" onChange={e=>{void upload(e.target.files);e.target.value="";}}/>
   <button type="button" onClick={()=>setBoard(b=>({...b,strokes:b.strokes.slice(0,-1)}))} disabled={!board.strokes.length} className="rounded-full border px-3 py-1.5 text-xs disabled:opacity-30">Отменить линию</button>
   <button type="button" onClick={()=>{if(selected)setBoard(b=>({...b,pins:b.pins.filter(p=>p.id!==selected),photos:b.photos.filter(p=>p.id!==selected)}));setSelected(null);}} disabled={!selected} className="rounded-full border px-3 py-1.5 text-xs disabled:opacity-30">Удалить выбранное</button>
  </div>
  <div className="flex min-h-[480px] flex-col lg:flex-row">
   <div className="relative min-h-[440px] flex-1 overflow-auto bg-[#f5f3ed] text-[#242424]">
    <div ref={surface} onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onClick={addPin}
      className="relative min-h-[620px] min-w-[820px] touch-none" style={{width:1000,height:700,transform:`scale(${zoom})`,transformOrigin:"top left",cursor:mode==="draw"?"crosshair":mode==="note"?"cell":"default",
       backgroundImage:"radial-gradient(#d7d3ca 1px, transparent 1px)",backgroundSize:"24px 24px"}}>
     <svg className="pointer-events-none absolute inset-0" width="1000" height="700" viewBox="0 0 1000 700" aria-hidden="true">
      {strokes.map(s=><polyline key={s.id} points={s.points.map(p=>p.x+","+p.y).join(" ")} fill="none" stroke="#252525" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>)}
     </svg>
     {board.photos.map(p=><button key={p.id} type="button" onClick={()=>{setSelected(p.id);setMode("move");}} className={"absolute overflow-hidden rounded-md border-2 bg-white shadow-md "+(selected===p.id?"border-amber-500":"border-white")} style={{left:p.x,top:p.y,width:230}}><img src={p.src} alt={p.name} className="max-h-[220px] w-full object-contain"/><span className="block truncate px-2 py-1 text-[10px]">{p.name}</span></button>)}
     {board.pins.map(p=><button key={p.id} type="button" onClick={()=>{setSelected(p.id);setMode("move");}} className={"absolute max-w-[200px] rounded-lg border bg-[#fff0b6] p-2 text-left text-xs shadow "+(selected===p.id?"border-amber-700":"border-[#d5c48e]")} style={{left:p.x,top:p.y}}>{p.text}</button>)}
    </div>
   </div>
   {panel&&<aside className="w-full shrink-0 space-y-3 border-t border-foreground/15 p-3 lg:w-[300px] lg:border-l lg:border-t-0">
    <label className="block text-xs font-medium">Смысл идеи<textarea value={board.idea} onChange={e=>setBoard(b=>({...b,idea:e.target.value}))} rows={5} maxLength={10000} placeholder="Мысль, ощущение, назначение, образ…" className="mt-2 w-full rounded-lg border border-foreground/20 bg-background p-2 text-sm"/></label>
    <div className="rounded-lg border border-foreground/15 p-3">
     <p className="mb-2 text-xs font-medium">AI Presence · подготовка</p>
     <select value={presence} onChange={e=>setPresence(e.target.value as typeof presence)} className="w-full rounded border bg-background p-2 text-xs"><option value="silent">Наблюдение</option><option value="partner">Соучастие</option><option value="dialog">По запросу</option></select>
     <p className="mt-2 text-[11px] text-foreground/60">ИИ пока не подключён. Контекст холста можно собрать и скопировать для обсуждения.</p>
     <button type="button" onClick={observe} className="mt-2 rounded-full border px-3 py-2 text-xs">Собрать контекст</button>
     {observations[0]&&<div className="mt-2 space-y-2"><p className="whitespace-pre-wrap text-xs">{observations[0]}</p><button type="button" onClick={()=>void navigator.clipboard.writeText(observations[0])} className="text-xs underline">Копировать</button></div>}
     <textarea value={message} onChange={e=>setMessage(e.target.value)} rows={2} placeholder="Вопрос к будущему соучастнику…" className="mt-3 w-full rounded border bg-background p-2 text-xs"/>
    </div>
    {!seed.trim()?<button type="button" disabled={busy||!board.idea.trim()} onClick={()=>void approve()} className="w-full rounded-full bg-foreground px-4 py-2 text-sm text-background disabled:opacity-40">{busy?"Сохраняем…":"Утвердить идею"}</button>:<p className="text-xs text-foreground/60">Исходная идея утверждена в проекте. Холст пока хранится только в этом браузере; для передачи его материалов в Концепт потребуется серверное сохранение.</p>}
    <p className="text-[11px] text-foreground/50">Локальный черновик сохраняется автоматически. Не очищайте данные браузера до синхронизации с сервером.</p>
    {error&&<p role="alert" className="text-xs text-red-600">{error}</p>}
   </aside>}
  </div>
 </section>;
}

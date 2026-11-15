import { useEffect, useState } from "react";
import { Check, ExternalLink, Globe2, MapPin, Pencil, Trash2, X } from "lucide-react";

/** Only web URLs may be embedded or linked. */
export function normalizeSiteUrl(value:string):string|null {
 const trimmed=value.trim();
 if(!trimmed||/[\u0000-\u001f\u007f]/.test(trimmed))return null;
 const address=/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)?trimmed:"https://"+trimmed;
 try {
  const url=new URL(address);
  if(!["https:","http:"].includes(url.protocol)||!url.hostname||url.username||url.password)return null;
  return url.href;
 } catch {return null;}
}

/** A visual note is pinned to the viewport of this link, not to a cross-origin DOM node. */
export type SiteMark={id:string;x:number;y:number;text:string};
const clamp=(value:number)=>Math.max(2,Math.min(98,value));
const makeId=()=>Math.random().toString(36).slice(2);

/** Embedded website with persistent author-owned viewport pins. */
export default function EggLinkWorkspace({
 address,onClose,marks=[],onMarksChange,
}:{address:string;onClose:()=>void;
 marks?:SiteMark[];
 onMarksChange?:(marks:SiteMark[])=>void;
}){
 const url=normalizeSiteUrl(address);
 const host=url?new URL(url).host:address;
 const [placing,setPlacing]=useState(false);
 const [draft,setDraft]=useState<{id:string|null;x:number;y:number;text:string}|null>(null);
 const [selected,setSelected]=useState<string|null>(null);
 const selectedMark=marks.find(mark=>mark.id===selected);
 const control="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background/95 text-foreground shadow-[0_3px_14px_rgba(0,0,0,.15)] backdrop-blur-md hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";
 const startMark=(event:React.MouseEvent<HTMLDivElement>)=>{
  if(!placing||!onMarksChange)return;
  const rect=event.currentTarget.getBoundingClientRect();
  setDraft({id:null,x:clamp((event.clientX-rect.left)/rect.width*100),
   y:clamp((event.clientY-rect.top)/rect.height*100),text:""});
  setPlacing(false);setSelected(null);
 };
 const saveMark=()=>{
  if(!draft||!onMarksChange||!draft.text.trim())return;
  const next:SiteMark={id:draft.id??makeId(),x:draft.x,y:draft.y,text:draft.text.trim()};
  onMarksChange(draft.id?marks.map(mark=>mark.id===draft.id?next:mark):[...marks,next]);
  setDraft(null);setSelected(next.id);
 };
 const removeMark=(id:string)=>{
  onMarksChange?.(marks.filter(mark=>mark.id!==id));
  setSelected(null);setDraft(null);
 };
 useEffect(()=>{
  const handler=(event:KeyboardEvent)=>{
   if(event.key!=="Escape")return;
   event.stopPropagation();
   if(draft){setDraft(null);return;}
   if(placing){setPlacing(false);return;}
   if(selected){setSelected(null);return;}
   onClose();
  };
  window.addEventListener("keydown",handler,true);
  return()=>window.removeEventListener("keydown",handler,true);
 },[draft,placing,selected,onClose]);
 return <section data-testid="egg-link-workspace" aria-label="Просмотр сайта" role="dialog"
  className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center p-2 sm:p-6">
  <div className="pointer-events-auto relative h-[min(76dvh,900px)] w-[min(92vw,1050px)] overflow-hidden bg-background shadow-[0_10px_45px_rgba(0,0,0,.16)] sm:h-[min(82dvh,900px)]" style={{borderRadius:"12px"}}>
   <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-2 sm:p-3">
    <span className="min-w-0 max-w-[45%] truncate rounded-full bg-background/90 px-3 py-2 text-[11px] text-foreground/70 shadow-sm backdrop-blur-md">
     <Globe2 size={13} className="mr-1 inline"/>{host}
    </span>
    <div className="pointer-events-auto flex items-center gap-1.5">
     {url&&onMarksChange&&<button type="button" aria-label="Добавить пометку" title="Пометка — коснитесь места на сайте"
       aria-pressed={placing} className={control+(placing?" ring-2 ring-foreground/60":"")}
       onClick={()=>{setPlacing(v=>!v);setDraft(null);setSelected(null);}}><MapPin size={18}/></button>}
     {url&&<a data-testid="egg-site-open-external" href={url} target="_blank" rel="noopener noreferrer"
       aria-label="Открыть сайт отдельно" title="В браузере" className={control}><ExternalLink size={18}/></a>}
     <button type="button" aria-label="Закрыть сайт" title="Закрыть" className={control} onClick={onClose}><X size={19}/></button>
    </div>
   </div>
   {url?<iframe data-testid="egg-site-frame" src={url} title={"Сайт "+host}
     referrerPolicy="no-referrer"
     sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
     className="h-full w-full bg-white"/>
    :<div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <Globe2 size={28} className="text-foreground/45"/>
      <p className="text-sm">Это не адрес сайта. Укажите ссылку с http:// или https://.</p>
      <p className="break-all text-xs text-foreground/55">{address}</p>
     </div>}
   {url&&<div data-testid="egg-site-mark-layer" className="pointer-events-none absolute inset-0 z-10">
     {placing&&<div data-testid="egg-site-mark-target" role="button" tabIndex={0}
       aria-label="Укажите место пометки" onClick={startMark}
       onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();setDraft({id:null,x:50,y:50,text:""});setPlacing(false);}}}
       className="pointer-events-auto absolute inset-0 cursor-crosshair bg-foreground/[.035]"/>}
     {marks.map((mark,i)=><button type="button" key={mark.id}
       data-testid="egg-site-mark" aria-label={"Пометка "+(i+1)} title={mark.text}
       onClick={()=>{setSelected(mark.id);setDraft(null);setPlacing(false);}}
       style={{left:mark.x+"%",top:mark.y+"%"}}
       className="pointer-events-auto absolute z-20 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-amber-300 text-neutral-900 shadow-[0_2px_10px_rgba(0,0,0,.35)] ring-2 ring-white/90">
       <MapPin size={17}/></button>)}
   </div>}
   {selectedMark&&!draft&&<div data-testid="egg-site-mark-note"
     className="pointer-events-auto absolute bottom-3 right-3 z-30 w-[min(300px,calc(100%-24px))] rounded-xl bg-background/95 p-3 shadow-[0_5px_28px_rgba(0,0,0,.22)] backdrop-blur-md">
     <div className="flex items-start justify-between gap-2">
      <p className="max-h-40 flex-1 overflow-auto whitespace-pre-wrap text-sm leading-relaxed">{selectedMark.text}</p>
      <button aria-label="Закрыть пометку" type="button" className="rounded-full p-1" onClick={()=>setSelected(null)}><X size={17}/></button>
     </div>
     <div className="mt-3 flex gap-3">
      <button type="button" aria-label="Редактировать пометку" onClick={()=>setDraft({...selectedMark})}
       className="flex items-center gap-1 text-xs"><Pencil size={14}/> Изменить</button>
      <button type="button" aria-label="Удалить пометку" onClick={()=>removeMark(selectedMark.id)}
       className="flex items-center gap-1 text-xs text-foreground/65"><Trash2 size={14}/> Удалить</button>
     </div>
   </div>}
   {draft&&<div data-testid="egg-site-mark-editor"
     className="pointer-events-auto absolute bottom-3 right-3 z-30 w-[min(320px,calc(100%-24px))] rounded-xl bg-background/95 p-3 shadow-[0_5px_28px_rgba(0,0,0,.22)] backdrop-blur-md">
     <div className="mb-2 flex items-center justify-between">
      <span className="text-sm font-medium">Пометка</span>
      <button type="button" aria-label="Отменить пометку" onClick={()=>setDraft(null)}><X size={18}/></button>
     </div>
     <textarea aria-label="Текст пометки" autoFocus rows={3} value={draft.text} onChange={e=>setDraft({...draft,text:e.target.value})}
       placeholder="Что важно в этом месте?" className="w-full resize-y rounded-lg border border-foreground/15 bg-background p-2.5 text-sm"/>
     <button type="button" disabled={!draft.text.trim()} aria-label="Сохранить пометку" onClick={saveMark}
       className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-3 py-2.5 text-xs text-background disabled:opacity-35">
       <Check size={15}/> Сохранить
     </button>
   </div>}
   {placing&&<div className="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full bg-background/95 px-3 py-2 text-center text-xs shadow-sm">
     Коснитесь нужной точки на странице
   </div>}
  </div>
 </section>;
}

import { useEffect, useRef, useState, type ReactNode, type PointerEvent } from "react";
import { Check, Crop, Eraser, MessageSquareText, Pencil, RotateCcw, RotateCw, X } from "lucide-react";

export type PhotoPoint = { x:number; y:number }; // x/y in 0..1000 image coordinates
export type PhotoStroke = { points:PhotoPoint[]; color:string; width:number };
export type PhotoNote = { id:string; x:number; y:number; text:string };
export type PhotoMarkup = { strokes:PhotoStroke[]; notes:PhotoNote[] };
type Mode = "view" | "pen" | "erase" | "note" | "crop";
type Selection = { x:number; y:number; width:number; height:number };
type Draft = { start:PhotoPoint; points:PhotoPoint[]; mode:"pen"|"crop" };
const COLORS = ["#f7f5f1","#242424","#e54843","#ffcb43","#417fc6","#47966c"];
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
const empty:PhotoMarkup={strokes:[],notes:[]};
const uid=()=>Math.random().toString(36).slice(2);

export function PhotoMarkupOverlay({markup}:{markup?:PhotoMarkup}){
 if(!markup?.strokes?.length&&!markup?.notes?.length)return null;
 return <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 1000 1000" preserveAspectRatio="none">
  {markup.strokes.map((stroke,i)=><polyline key={i} points={stroke.points.map(p=>p.x+","+p.y).join(" ")}
   fill="none" stroke={stroke.color} strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>)}
  {markup.notes.map((note,i)=><g key={note.id}>
   <circle cx={note.x} cy={note.y} r="14" vectorEffect="non-scaling-stroke" fill="#f5f3ef" stroke="#292929" strokeWidth="2"/>
   <text x={note.x} y={note.y+5} textAnchor="middle" fontSize="16" fontWeight="600" fill="#292929">{i+1}</text>
  </g>)}
 </svg>;
}

export default function EggPhotoWorkspace({
  src, title, initialMarkup, onSave, onCrop, onClose,
}:{
  src:string; title:string; initialMarkup?:PhotoMarkup;
  onSave:(value:PhotoMarkup)=>void;
  onCrop:(dataUrl:string)=>void;
  onClose:()=>void;
}){
 const [markup,setMarkup]=useState<PhotoMarkup>(()=>initialMarkup||empty);
 const [mode,setMode]=useState<Mode>("view");
 const [color,setColor]=useState(COLORS[2]);
 const [width,setWidth]=useState(2);
 const [draft,setDraft]=useState<PhotoStroke|null>(null);
 const [selection,setSelection]=useState<Selection|null>(null);
 const [pendingNote,setPendingNote]=useState<PhotoPoint|null>(null);
 const [noteText,setNoteText]=useState("");
 const [error,setError]=useState("");
 const [dirty,setDirty]=useState(false);
 const undo=useRef<PhotoMarkup[]>([]);
 const redo=useRef<PhotoMarkup[]>([]);
 const drag=useRef<{pointerId:number;start:PhotoPoint;points:PhotoPoint[]}|null>(null);
 const svg=useRef<SVGSVGElement|null>(null);
 const image=useRef<HTMLImageElement|null>(null);

 useEffect(()=>{
  const onKey=(e:KeyboardEvent)=>{if(e.key==="Escape"){e.stopPropagation();if(dirty&&!window.confirm("Закрыть фото без сохранения пометок?"))return;onClose();}};
  window.addEventListener("keydown",onKey,true);
  return ()=>window.removeEventListener("keydown",onKey,true);
 },[onClose,dirty]);
 const commit=(next:PhotoMarkup)=>{
  undo.current.push(markup);
  if(undo.current.length>60)undo.current.shift();
  redo.current=[];
  setMarkup(next);setDirty(true);
 };
 const rollback=()=>{
  const previous=undo.current.pop();
  if(!previous)return;
  redo.current.push(markup);setMarkup(previous);setDirty(true);
 };
 const forward=()=>{
  const next=redo.current.pop();
  if(!next)return;
  undo.current.push(markup);setMarkup(next);setDirty(true);
 };
 const point=(e:PointerEvent<SVGSVGElement>):PhotoPoint=>{
  const node=svg.current;
  if(!node)return {x:0,y:0};
  const rect=node.getBoundingClientRect();
  return {x:clamp((e.clientX-rect.left)/Math.max(1,rect.width)*1000,0,1000),
   y:clamp((e.clientY-rect.top)/Math.max(1,rect.height)*1000,0,1000)};
 };
 const distanceToStroke=(p:PhotoPoint,stroke:PhotoStroke)=>{
  let best=Infinity;
  for(let i=0;i<stroke.points.length;i++){
   const a=stroke.points[i],b=stroke.points[Math.min(i+1,stroke.points.length-1)];
   const dx=b.x-a.x,dy=b.y-a.y;
   const t=dx*dx+dy*dy?clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy),0,1):0;
   best=Math.min(best,Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy));
  }
  return best;
 };
 const begin=(e:PointerEvent<SVGSVGElement>)=>{
  if(mode==="view"||e.pointerType==="mouse"&&e.button!==0)return;
  const p=point(e);
  if(mode==="note"){setPendingNote(p);setNoteText("");return;}
  if(mode==="erase"){
   let index=-1;
   for(let i=markup.strokes.length-1;i>=0;i--){if(distanceToStroke(p,markup.strokes[i])<18){index=i;break;}}
   if(index>=0)commit({...markup,strokes:markup.strokes.filter((_,i)=>i!==index)});
   return;
  }
  if(mode==="crop")setSelection(null);
  drag.current={pointerId:e.pointerId,start:p,points:[p]};
  if(mode==="pen")setDraft({points:[p],color,width});
  try{e.currentTarget.setPointerCapture(e.pointerId);}catch{/* browser-controlled pointer */}
 };
 const move=(e:PointerEvent<SVGSVGElement>)=>{
  const d=drag.current;
  if(!d||d.pointerId!==e.pointerId)return;
  const p=point(e);
  if(mode==="pen"){
   const prior=d.points[d.points.length-1];
   if(Math.hypot(prior.x-p.x,prior.y-p.y)<.5)return;
   d.points=[...d.points,p];
   setDraft({points:d.points,color,width});
  }else if(mode==="crop"){
   setSelection({x:Math.min(d.start.x,p.x),y:Math.min(d.start.y,p.y),
    width:Math.abs(p.x-d.start.x),height:Math.abs(p.y-d.start.y)});
  }
 };
 const end=(e:PointerEvent<SVGSVGElement>)=>{
  const d=drag.current;
  if(!d||d.pointerId!==e.pointerId)return;
  drag.current=null;
  if(mode==="pen"){
   commit({...markup,strokes:[...markup.strokes,{points:d.points,color,width}]});
   setDraft(null);
  }else if(mode==="crop"){
   const p=point(e);
   const rect={x:Math.min(d.start.x,p.x),y:Math.min(d.start.y,p.y),width:Math.abs(p.x-d.start.x),height:Math.abs(p.y-d.start.y)};
   setSelection(rect.width>12&&rect.height>12?rect:null);
  }
  try{if(e.currentTarget.hasPointerCapture?.(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}catch{/* auto released */}
 };
 const addNote=()=>{
  if(!pendingNote||!noteText.trim())return;
  commit({...markup,notes:[...markup.notes,{id:uid(),...pendingNote,text:noteText.trim()}]});
  setPendingNote(null);setNoteText("");setMode("view");
 };
 const crop=async()=>{
  const box=selection,el=image.current;
  if(!box||!el||box.width<12||box.height<12)return;
  try{
   const bitmap=new Image();bitmap.src=src;await bitmap.decode();
   const left=Math.round(box.x/1000*bitmap.naturalWidth),top=Math.round(box.y/1000*bitmap.naturalHeight);
   const w=Math.min(bitmap.naturalWidth-left,Math.max(1,Math.round(box.width/1000*bitmap.naturalWidth)));
   const h=Math.min(bitmap.naturalHeight-top,Math.max(1,Math.round(box.height/1000*bitmap.naturalHeight)));
   const scale=Math.min(1,1200/Math.max(w,h));
   const canvas=document.createElement("canvas");
   canvas.width=Math.max(1,Math.round(w*scale));canvas.height=Math.max(1,Math.round(h*scale));
   const context=canvas.getContext("2d");
   if(!context)throw Error("Canvas not available");
   context.drawImage(bitmap,left,top,w,h,0,0,canvas.width,canvas.height);
   onCrop(canvas.toDataURL("image/jpeg",.82));
   setSelection(null);setMode("view");setError("");
  }catch{setError("Не удалось сохранить фрагмент изображения.");}
 };
 const close=()=>{if(dirty&&!window.confirm("Закрыть фото без сохранения пометок?"))return;onClose();};
 const IconButton=({label,selected,onClick,children,disabled}:{label:string;selected?:boolean;onClick:()=>void;children:ReactNode;disabled?:boolean})=>
  <button type="button" title={label} aria-label={label} aria-pressed={selected} onClick={onClick} disabled={disabled}
   className={"flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-[0_3px_14px_rgba(0,0,0,.19)] backdrop-blur-md transition-colors disabled:opacity-40 "+(selected?"bg-foreground text-background":"bg-background/95 text-foreground hover:bg-background")}>{children}</button>;
 return <div data-testid="egg-photo-workspace" className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center p-3" aria-label="Увеличенное фото">
  <div className="pointer-events-auto relative flex max-h-[96dvh] max-w-[95vw] flex-col items-center justify-center">
   <div className="relative max-h-[80dvh] max-w-[92vw] shadow-[0_8px_35px_rgba(0,0,0,.12)]">
    <img ref={image} src={src} alt={title} draggable={false}
     className="block h-auto max-h-[80dvh] w-auto max-w-[92vw] object-contain"
     style={{borderRadius:0,clipPath:"none",maskImage:"none",WebkitMaskImage:"none"}}/>
    <svg ref={svg} viewBox="0 0 1000 1000" preserveAspectRatio="none"
     data-testid="egg-photo-ink-layer"
     className={"absolute inset-0 h-full w-full "+(mode==="view"?"pointer-events-none":"touch-none")}
     style={{cursor:mode==="pen"?"crosshair":mode==="crop"?"crosshair":mode==="erase"?"cell":mode==="note"?"copy":"default"}}
     onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
      {markup.strokes.map((stroke,i)=><polyline key={i} points={stroke.points.map(p=>p.x+","+p.y).join(" ")}
       stroke={stroke.color} strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round" fill="none" vectorEffect="non-scaling-stroke"/>)}
      {draft&&<polyline points={draft.points.map(p=>p.x+","+p.y).join(" ")}
       stroke={draft.color} strokeWidth={draft.width} strokeLinecap="round" fill="none" vectorEffect="non-scaling-stroke"/>}
      {markup.notes.map((note,i)=><g key={note.id}>
       <circle cx={note.x} cy={note.y} r="13" fill="#f6f4f0" stroke="#252525" strokeWidth="1.7" vectorEffect="non-scaling-stroke"/>
       <text x={note.x} y={note.y+5} textAnchor="middle" fill="#252525" fontSize="16">{i+1}</text>
      </g>)}
      {selection&&<rect x={selection.x} y={selection.y} width={selection.width} height={selection.height}
       stroke="#f9f9f9" strokeWidth="2" strokeDasharray="8 6" vectorEffect="non-scaling-stroke"
       fill="#f9f9f9" fillOpacity=".14"/>}
    </svg>
    <div className="absolute right-2 top-2 z-10 flex max-w-[calc(100%-16px)] flex-wrap justify-end gap-1.5">
     <IconButton label="Перо — пометка" selected={mode==="pen"} onClick={()=>setMode(mode==="pen"?"view":"pen")}><Pencil size={18}/></IconButton>
     <IconButton label="Ластик по штрихам" selected={mode==="erase"} onClick={()=>setMode(mode==="erase"?"view":"erase")}><Eraser size={18}/></IconButton>
     <IconButton label="Текстовая пометка" selected={mode==="note"} onClick={()=>setMode(mode==="note"?"view":"note")}><MessageSquareText size={18}/></IconButton>
     <IconButton label="Выделить фрагмент" selected={mode==="crop"} onClick={()=>{setSelection(null);setMode(mode==="crop"?"view":"crop");}}><Crop size={18}/></IconButton>
     <IconButton label="Отменить действие" disabled={!undo.current.length} onClick={rollback}><RotateCcw size={18}/></IconButton>
     <IconButton label="Повторить действие" disabled={!redo.current.length} onClick={forward}><RotateCw size={18}/></IconButton>
     <IconButton label="Сохранить пометки" onClick={()=>{onSave(markup);setDirty(false);setError("");}}><Check size={19}/></IconButton>
     <IconButton label="Закрыть фото" onClick={close}><X size={20}/></IconButton>
    </div>
    {mode==="pen"&&<div className="absolute bottom-3 left-3 z-10 flex items-center gap-2 rounded-full bg-background/90 px-3 py-2 shadow-sm backdrop-blur-md">
     {COLORS.map(c=><button key={c} type="button" onClick={()=>setColor(c)} title={"Цвет "+c} aria-label={"Цвет "+c}
      className={"h-6 w-6 rounded-full "+(color===c?"ring-2 ring-foreground ring-offset-2":"")} style={{backgroundColor:c}}/>)}
     <input type="range" aria-label="Толщина пера" min="1" max="12" value={width} onChange={e=>setWidth(Number(e.target.value))} className="w-16"/>
    </div>}
    {mode==="crop"&&selection&&<div className="absolute bottom-3 right-3 z-10 flex items-center gap-2">
     <span className="rounded-full bg-background/90 px-3 py-2 text-xs text-foreground/70 shadow-sm">Фрагмент отдельно</span>
     <IconButton label="Сохранить выделенный фрагмент" onClick={()=>void crop()}><Check size={18}/></IconButton>
    </div>}
    {pendingNote&&<div className="absolute bottom-3 left-1/2 z-20 w-[min(330px,85vw)] -translate-x-1/2 bg-background/95 p-2 shadow-lg">
     <textarea value={noteText} onChange={e=>setNoteText(e.target.value)} rows={2} aria-label="Текст пометки"
      placeholder="Что здесь привлекло внимание?" className="w-full resize-none bg-transparent p-2 text-sm outline-none" autoFocus/>
     <div className="flex justify-end gap-2">
      <IconButton label="Отменить пометку" onClick={()=>setPendingNote(null)}><X size={16}/></IconButton>
      <IconButton label="Сохранить текстовую пометку" disabled={!noteText.trim()} onClick={addNote}><Check size={16}/></IconButton>
     </div>
    </div>}
   </div>
   {markup.notes.length>0&&<div className="pointer-events-auto mt-2 flex max-h-24 w-full max-w-[92vw] flex-wrap gap-1.5 overflow-y-auto">
    {markup.notes.map((note,i)=><button type="button" key={note.id} title="Удалить эту пометку"
      className="bg-background/90 px-3 py-1.5 text-left text-xs text-foreground/85 shadow-sm"
      onClick={()=>commit({...markup,notes:markup.notes.filter(v=>v.id!==note.id)})}>{i+1}. {note.text} <X size={12} className="ml-1 inline"/></button>)}
   </div>}
   <div className="pointer-events-none mt-1 max-w-[90vw] text-center text-[11px] text-foreground/60">
    {error|| (mode==="crop"?"Проведите по фото, чтобы выделить фрагмент":mode==="pen"?"Рисуйте прямо на фотографии":mode==="note"?"Коснитесь нужного места на фото":"")}
    {dirty&&<span className="ml-2">· Пометки ещё не сохранены</span>}
   </div>
  </div>
 </div>;
}

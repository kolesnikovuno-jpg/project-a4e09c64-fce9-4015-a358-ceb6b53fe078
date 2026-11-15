import { useEffect, useRef, useState } from "react";
import type { ReactNode, PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";
import { Camera, CircleDot, FileUp, FolderOpen, Image as ImageIcon, Layers, Link2, Maximize2, Mic, Minus, Move, Pencil, Plus, RotateCcw, UserRound, Video, X, ZoomIn, ZoomOut } from "lucide-react";
import EggRadialMenu, { type EggMenuAction } from "./EggRadialMenu";
import EggSketchEditor, { type SketchStroke } from "./EggSketchEditor";

type Point = { x:number; y:number };
type Item = { id:string; type:"thought"|"link"|"image"|"sketch"|"video"; x:number; y:number; text:string; src?:string; points?:Point[]; strokes?:SketchStroke[]; color?:string; strokeWidth?:number; mediaId?:string };
type Tool = "thought"|"link"|null;
type SpeechResult = { results:ArrayLike<ArrayLike<{transcript:string}>> };
type Recognition = { lang:string; interimResults:boolean; onresult:((event:SpeechResult)=>void)|null; onerror:(()=>void)|null; onend:(()=>void)|null; start:()=>void; stop:()=>void };
const uid=()=>Math.random().toString(36).slice(2);
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));


function openMediaDb():Promise<IDBDatabase>{
 return new Promise((resolve,reject)=>{
  if(!("indexedDB" in window)){reject(new Error("no_indexed_db"));return;}
  const request=indexedDB.open("egg-project-field-media-v1",1);
  request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains("videos"))request.result.createObjectStore("videos");};
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error);
 });
}
async function storeVideo(key:string,file:File){
 const db=await openMediaDb();
 try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction("videos","readwrite");tx.objectStore("videos").put(file,key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}
 finally{db.close();}
}
async function readVideo(key:string):Promise<Blob|null>{
 const db=await openMediaDb();
 try{return await new Promise<Blob|null>((resolve,reject)=>{const req=db.transaction("videos","readonly").objectStore("videos").get(key);req.onsuccess=()=>resolve(req.result instanceof Blob?req.result:null);req.onerror=()=>reject(req.error);});}
 finally{db.close();}
}

export default function EggProjectField({projectId,children,onOpenAuthor,onOpenProject,onOpenYolk,onOpenAccount}:{projectId:string;children:ReactNode;onOpenAuthor?:()=>void;onOpenProject?:()=>void;onOpenYolk?:()=>void;onOpenAccount?:()=>void}){
 const key="egg:project-field:v1:"+projectId;
 const [items,setItems]=useState<Item[]>([]);
 const [ready,setReady]=useState(false);
 const [tool,setTool]=useState<Tool>(null);
 const [entry,setEntry]=useState("");
 const [zoom,setZoom]=useState(1);
 const [pan,setPan]=useState<Point>({x:0,y:0});
 const [eggScale,setEggScale]=useState(.8);
 const [sketchEditor,setSketchEditor]=useState<{id:string|null;initialStrokes:SketchStroke[]}|null>(null);
 const [openId,setOpenId]=useState<string|null>(null);
 const [notice,setNotice]=useState("");
 const [listening,setListening]=useState(false);
 const [videoUrls,setVideoUrls]=useState<Record<string,string>>({});
 const gesture=useRef<{kind:"pan"|"item";id?:string;x:number;y:number;px:number;py:number}|null>(null);
 const pointers=useRef(new Map<number,Point>());
 const pinch=useRef<{distance:number;zoom:number;pan:Point;world:Point}|null>(null);
 const eggPointers=useRef(new Map<number,Point>());
 const eggPinch=useRef<{distance:number;scale:number}|null>(null);
 const recognition=useRef<Recognition|null>(null);
 const imageInput=useRef<HTMLInputElement>(null);
 const camera=useRef<HTMLInputElement>(null);
 const videoInput=useRef<HTMLInputElement>(null);
 const field=useRef<HTMLDivElement>(null);
 const videoKeys=items.filter(item=>item.type==="video"&&item.mediaId).map(item=>item.mediaId).join("|");

 useEffect(()=>{
  setReady(false);
  try{const raw=localStorage.getItem(key);const saved=raw?JSON.parse(raw):[];setItems(Array.isArray(saved)?saved:[]);}
  catch{setItems([]);}
  setSketchEditor(null);setPan({x:0,y:0});setZoom(1);setReady(true);
 },[key]);
 useEffect(()=>{if(ready)try{localStorage.setItem(key,JSON.stringify(items));}catch{setNotice("Место для сохранения заполнено. Некоторые изменения могут не сохраниться.");}},[items,key,ready]);
 useEffect(()=>{
  let active=true;const urls:string[]=[];
  void (async()=>{const next:Record<string,string>={};for(const mediaId of videoKeys.split("|").filter(Boolean)){
   try{const blob=await readVideo(mediaId);if(blob){const url=URL.createObjectURL(blob);urls.push(url);next[mediaId]=url;}}catch{/* unavailable locally */}
  }if(active)setVideoUrls(next);else urls.forEach(url=>URL.revokeObjectURL(url));})();
  return()=>{active=false;urls.forEach(url=>URL.revokeObjectURL(url));};
 },[videoKeys]);
 useEffect(()=>()=>{recognition.current?.stop();},[]);
 const center=()=>({x:(field.current?.clientWidth||window.innerWidth)/2,y:(field.current?.clientHeight||window.innerHeight)/2});
 const world=(x:number,y:number)=>{const c=center();return{x:(x-c.x-pan.x)/zoom,y:(y-c.y-pan.y)/zoom};};
 const change=(fn:(previous:Item[])=>Item[])=>setItems(previous=>fn(previous));
 const add=(type:Item["type"],text:string,src?:string,points?:Point[],mediaId?:string)=>{
  change(previous=>[...previous,{id:uid(),type,x:310+(previous.length%3)*38,y:-210+(previous.length%6)*75,text,src,points,mediaId}]);
 };
 const commit=()=>{if(!entry.trim())return;add(tool==="link"?"link":"thought",entry.trim());setEntry("");setTool(null);};
 async function images(files:FileList|null){
  if(!files)return;
  for(const file of Array.from(files).slice(0,5)){
   if(!file.type.startsWith("image/"))continue;
   let url="";
   try{
    const img=new Image();url=URL.createObjectURL(file);img.src=url;await img.decode();
    const cv=document.createElement("canvas");const ratio=Math.min(1,1200/Math.max(img.width,img.height));
    cv.width=Math.max(1,Math.round(img.width*ratio));cv.height=Math.max(1,Math.round(img.height*ratio));
    cv.getContext("2d")?.drawImage(img,0,0,cv.width,cv.height);
    add("image",file.name,cv.toDataURL("image/jpeg",.75));
   }catch{setNotice("Изображение не удалось открыть.");}
   finally{if(url)URL.revokeObjectURL(url);}
  }
  setTool(null);
 }
 async function videos(files:FileList|null){
  if(!files)return;
  for(const file of Array.from(files).slice(0,3)){
   if(!file.type.startsWith("video/"))continue;
   if(file.size>35*1024*1024){setNotice("Видео слишком большое. Максимум — 35 МБ.");continue;}
   try{const mediaId=uid();await storeVideo(mediaId,file);add("video",file.name,undefined,undefined,mediaId);}
   catch{setNotice("Не удалось сохранить видео в памяти устройства.");}
  }
  setTool(null);
 }
 function voice(){
  if(listening){recognition.current?.stop();return;}
  const w=window as unknown as {SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition};
  const Speech=w.SpeechRecognition??w.webkitSpeechRecognition;
  if(!Speech){setNotice("Распознавание речи недоступно в этом браузере. Используйте диктовку клавиатуры.");return;}
  try{
   const speech=new Speech();recognition.current=speech;speech.lang=document.documentElement.lang==="uk"?"uk-UA":document.documentElement.lang==="en"?"en-US":"ru-RU";
   speech.interimResults=false;
   speech.onresult=e=>{const transcript=Array.from(e.results).map(result=>result[0]?.transcript||"").join(" ").trim();if(transcript)setEntry(old=>(old.trim()?old.trim()+" ":"")+transcript);};
   speech.onerror=()=>{setNotice("Не удалось распознать речь. Проверьте доступ к микрофону.");setListening(false);};
   speech.onend=()=>setListening(false);speech.start();setListening(true);
  }catch{setNotice("Микрофон или распознавание речи недоступны.");setListening(false);}
 }
 const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
 function down(e:ReactPointerEvent<HTMLDivElement>){
  if((e.target as Element).closest("button,textarea,input,a,[data-no-drag],[data-egg-anchor]"))return;
  const rect=e.currentTarget.getBoundingClientRect();const x=e.clientX-rect.left,y=e.clientY-rect.top;
  pointers.current.set(e.pointerId,{x,y});
  if(pointers.current.size===2){
   const [a,b]=Array.from(pointers.current.values());const c=center();const mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
   pinch.current={distance:Math.max(1,distance(a,b)),zoom,pan,world:{x:(mx-c.x-pan.x)/zoom,y:(my-c.y-pan.y)/zoom}};
   gesture.current=null;return;
  }
  const target=(e.target as Element).closest("[data-field-item]") as HTMLElement|null;
  gesture.current={kind:target?"item":"pan",id:target?.dataset.fieldItem,x,y,px:pan.x,py:pan.y};
  e.currentTarget.setPointerCapture(e.pointerId);
 }
 function move(e:ReactPointerEvent<HTMLDivElement>){
  const rect=e.currentTarget.getBoundingClientRect();const x=e.clientX-rect.left,y=e.clientY-rect.top;
  if(pointers.current.has(e.pointerId))pointers.current.set(e.pointerId,{x,y});
  if(pinch.current&&pointers.current.size>=2){
   const [a,b]=Array.from(pointers.current.values());const d=pinch.current;const next=clamp(d.zoom*distance(a,b)/d.distance,.25,3);
   const c=center(),mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
   setZoom(next);setPan({x:mx-c.x-d.world.x*next,y:my-c.y-d.world.y*next});return;
  }
  const g=gesture.current;if(!g)return;
  const dx=x-g.x,dy=y-g.y;
  if(g.kind==="pan")setPan({x:g.px+dx,y:g.py+dy});
  else{setItems(previous=>previous.map(item=>item.id===g.id?{...item,x:item.x+dx/zoom,y:item.y+dy/zoom}:item));g.x=x;g.y=y;}
 }
 function up(e:ReactPointerEvent<HTMLDivElement>){
  pointers.current.delete(e.pointerId);
  if(pinch.current){if(pointers.current.size<2)pinch.current=null;gesture.current=null;return;}
  gesture.current=null;
 }
 function wheel(e:ReactWheelEvent<HTMLDivElement>){
  if((e.target as Element).closest("[data-egg-anchor],[data-field-item]"))return;
  e.preventDefault();const rect=e.currentTarget.getBoundingClientRect(),c=center();
  const x=e.clientX-rect.left,y=e.clientY-rect.top;const old=world(x,y);
  const next=clamp(zoom*(e.deltaY>0?.92:1.08),.25,3);
  setZoom(next);setPan({x:x-c.x-old.x*next,y:y-c.y-old.y*next});
 }
 function eggDown(e:ReactPointerEvent<HTMLDivElement>){
  eggPointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(eggPointers.current.size===2){const [a,b]=Array.from(eggPointers.current.values());eggPinch.current={distance:Math.max(1,distance(a,b)),scale:eggScale};}
 }
 function eggMove(e:ReactPointerEvent<HTMLDivElement>){
  if(!eggPointers.current.has(e.pointerId))return;
  eggPointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(eggPinch.current&&eggPointers.current.size>=2){const [a,b]=Array.from(eggPointers.current.values());setEggScale(clamp(eggPinch.current.scale*distance(a,b)/eggPinch.current.distance,.35,1.8));}
 }
 function eggUp(e:ReactPointerEvent<HTMLDivElement>){eggPointers.current.delete(e.pointerId);if(eggPointers.current.size<2)eggPinch.current=null;}
 const legacySketch = (item:Item):SketchStroke[] => {
  if(item.strokes?.length)return item.strokes;
  if(!item.points?.length)return [];
  const minX=Math.min(...item.points.map(p=>p.x)), minY=Math.min(...item.points.map(p=>p.y));
  const maxX=Math.max(...item.points.map(p=>p.x)), maxY=Math.max(...item.points.map(p=>p.y));
  const scale=Math.min(780/Math.max(1,maxX-minX),540/Math.max(1,maxY-minY),6);
  return [{color:item.color||"#252525",strokeWidth:item.strokeWidth||2,points:item.points.map(p=>({x:110+(p.x-minX)*scale,y:80+(p.y-minY)*scale}))}];
 };
 const saveSketch = (strokes:SketchStroke[]) => {
  const editing=sketchEditor;
  if(!editing)return;
  if(editing.id){
   change(previous=>previous.map(item=>item.id===editing.id?{...item,strokes,points:undefined}:item));
  }else if(strokes.length){
   change(previous=>[...previous,{id:uid(),type:"sketch",text:"Скетч",x:300+(previous.length%3)*45,y:-200+(previous.length%6)*70,strokes}]);
  }
  setSketchEditor(null);
 };
 const menuActions: EggMenuAction[] = [
  {id:"collect",label:"Добавить",icon:Layers,children:[
   {id:"thought",label:"Заметка",icon:Pencil,onSelect:()=>{setTool("thought");setEntry("");}},
   {id:"photo",label:"Фото",icon:Camera,onSelect:()=>camera.current?.click()},
   {id:"file",label:"Изображение",icon:ImageIcon,onSelect:()=>imageInput.current?.click()},
   {id:"video",label:"Видео",icon:Video,onSelect:()=>videoInput.current?.click()},
   {id:"link",label:"Ссылка",icon:Link2,onSelect:()=>{setTool("link");setEntry("");}},
  ]},
  {id:"sketch",label:"Скетч",icon:Pencil,onSelect:()=>{setTool(null);setSketchEditor({id:null,initialStrokes:[]});}},
  {id:"field",label:"Поле",icon:Move,children:[
   {id:"center",label:"К центру",icon:Move,onSelect:()=>{setPan({x:0,y:0});setZoom(1);}},
   {id:"zoomIn",label:"Приблизить",icon:ZoomIn,onSelect:()=>setZoom(v=>clamp(v*1.2,.25,3))},
   {id:"zoomOut",label:"Отдалить",icon:ZoomOut,onSelect:()=>setZoom(v=>clamp(v/1.2,.25,3))},
   {id:"resetZoom",label:"Масштаб 100%",icon:RotateCcw,onSelect:()=>setZoom(1)},
  ]},
  {id:"egg",label:"Яйцо",icon:CircleDot,children:[
   {id:"eggIn",label:"Увеличить",icon:ZoomIn,onSelect:()=>setEggScale(v=>clamp(v*1.15,.35,1.8))},
   {id:"eggOut",label:"Уменьшить",icon:ZoomOut,onSelect:()=>setEggScale(v=>clamp(v/1.15,.35,1.8))},
   {id:"eggReset",label:"Исходный размер",icon:RotateCcw,onSelect:()=>setEggScale(.8)},
  ]},
  {id:"navigation",label:"Разделы",icon:FolderOpen,children:[
   {id:"author",label:"Автор",icon:UserRound,onSelect:onOpenAuthor},
   {id:"project",label:"Проект",icon:FolderOpen,onSelect:onOpenProject},
   {id:"yolk",label:"Желток",icon:CircleDot,onSelect:onOpenYolk},
   {id:"account",label:"Аккаунт",icon:UserRound,onSelect:onOpenAccount},
  ]}
 ];
 const active=items.find(item=>item.id===openId);
 const currentScale=Math.round(zoom*100);
 return <section className="absolute inset-0 overflow-hidden bg-background" aria-label="Поле проекта EGG" data-testid="egg-project-field">
  <div ref={field} className="absolute inset-0 touch-none overflow-hidden" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onWheel={wheel}
   style={{backgroundImage:"radial-gradient(hsl(var(--foreground) / .10) 1px, transparent 1px)",backgroundSize:"25px 25px"}}>
   <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
    <div data-egg-anchor className="pointer-events-auto relative shrink-0" style={{width:900,height:620,transform:"scale("+eggScale+")",touchAction:"none"}}
     onPointerDownCapture={eggDown} onPointerMoveCapture={eggMove} onPointerUpCapture={eggUp} onPointerCancelCapture={eggUp}
     onPointerDown={e=>e.stopPropagation()} onPointerMove={e=>e.stopPropagation()} onPointerUp={e=>e.stopPropagation()} onPointerCancel={e=>e.stopPropagation()}
     onWheel={e=>{e.stopPropagation();setEggScale(s=>clamp(s*(e.deltaY>0?.95:1.05),.35,1.8));}}>
     {children}
    </div>
   </div>
   <div className="absolute left-0 top-0 z-20" style={{transform:"translate("+(center().x+pan.x)+"px,"+(center().y+pan.y)+"px) scale("+zoom+")",transformOrigin:"0 0"}}>
    {items.map(item=><div key={item.id} data-field-item={item.id} className="group absolute w-[218px] cursor-grab rounded-2xl border border-foreground/10 bg-background/95 p-2 shadow-[0_10px_32px_rgba(0,0,0,.09)] backdrop-blur-md transition-shadow hover:shadow-[0_15px_42px_rgba(0,0,0,.14)] active:cursor-grabbing"
     style={{left:item.x,top:item.y}}>
     <div className="mb-1 flex items-center justify-between gap-2 px-1 py-0.5">
      <span className="truncate text-[10px] tracking-[.06em] text-foreground/45">{item.type==="image"?"Фото":item.type==="thought"?"Заметка":item.type==="link"?"Ссылка":item.type==="video"?"Видео":"Скетч"}</span>
      <div className="flex gap-1 opacity-80 sm:opacity-0 sm:group-hover:opacity-100">
       <button type="button" data-no-drag aria-label="Развернуть элемент" className="rounded-full p-1 hover:bg-foreground/10" onClick={()=>setOpenId(item.id)}><Maximize2 size={13}/></button>
       <button type="button" data-no-drag aria-label="Удалить элемент" className="rounded-full p-1 hover:bg-foreground/10" onClick={()=>change(v=>v.filter(x=>x.id!==item.id))}><X size={13}/></button>
      </div>
     </div>
     {item.src?<button type="button" data-no-drag className="block w-full overflow-hidden rounded-xl bg-foreground/[.025]" onClick={()=>setOpenId(item.id)}><img src={item.src} alt={item.text} className="max-h-[180px] w-full object-contain"/></button>
      :item.type==="video"?<button type="button" data-no-drag className="flex h-28 w-full items-center justify-center rounded-xl bg-foreground/5" onClick={()=>setOpenId(item.id)}><Video size={28} strokeWidth={1}/></button>
      :item.strokes?.length?<button type="button" data-no-drag className="w-full" onClick={()=>setOpenId(item.id)}><svg viewBox="0 0 1000 700" className="h-32 w-full" aria-label="Скетч">{item.strokes.map((stroke,i)=><polyline key={i} points={stroke.points.map(p=>p.x+","+p.y).join(" ")} fill="none" stroke={stroke.color} strokeWidth={stroke.strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>)}</svg></button>
      :item.points?<button type="button" data-no-drag className="w-full" onClick={()=>setOpenId(item.id)}><svg viewBox={"0 0 "+(Math.max(1,...item.points.map(p=>p.x))+4)+" "+(Math.max(1,...item.points.map(p=>p.y))+4)} className="h-24 w-full" aria-label="Скетч"><polyline points={item.points.map(p=>p.x+","+p.y).join(" ")} fill="none" stroke={item.color||"currentColor"} strokeWidth={item.strokeWidth||2} strokeLinecap="round" strokeLinejoin="round"/></svg></button>
      :item.type==="link"?<a href={/^https?:\/\//.test(item.text)?item.text:undefined} target="_blank" rel="noopener noreferrer" className="block break-all px-1 py-2 text-[12px] text-foreground/75 underline underline-offset-2">{item.text}</a>
      :<button type="button" data-no-drag className="block w-full px-1 py-2 text-left" onClick={()=>setOpenId(item.id)}><p className="line-clamp-6 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-foreground/85">{item.text}</p></button>}
    </div>)}
   </div>
  </div>
  {!tool && !sketchEditor && !openId && <EggRadialMenu actions={menuActions}/>}
  {tool!==null&&<div className="absolute bottom-[max(6rem,env(safe-area-inset-bottom))] left-4 z-40 w-[min(340px,calc(100vw-32px))] rounded-2xl border border-foreground/15 bg-background/95 p-3 shadow-xl sm:left-6">
   <div className="flex items-center justify-between px-1 pb-1">
     <span className="text-sm font-medium">{tool==="link"?"Ссылка":"Заметка"}</span>
     <button type="button" aria-label="Закрыть ввод" className="rounded-full p-1 text-foreground/60" onClick={()=>setTool(null)}><X size={17}/></button>
   </div>
   <div className="mt-3 border-t border-foreground/10 pt-3"><div className="relative">
      <textarea rows={3} value={entry} onChange={e=>setEntry(e.target.value)} placeholder={tool==="link"?"Вставьте ссылку":"Запишите мысль или наблюдение"} className="w-full resize-y rounded-xl border border-foreground/15 bg-background p-3 pr-10 text-sm"/>
      {tool==="thought"&&<button type="button" title="Голосовой ввод" aria-label="Голосовой ввод" className={"absolute right-2 top-2 rounded-full p-1.5 "+(listening?"bg-red-100 text-red-700":"text-foreground/65")} onClick={voice}><Mic size={18}/></button>}
     </div><div className="mt-2 flex justify-between gap-2"><button onClick={commit} disabled={!entry.trim()} className="rounded-full bg-foreground px-4 py-2 text-xs text-background disabled:opacity-40">Добавить в поле</button><button className="px-2 text-xs text-foreground/60" onClick={()=>setTool(null)}>Закрыть</button></div></div>
  </div>}
  <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" onChange={e=>{void images(e.target.files);e.target.value="";}}/>
  <input ref={imageInput} type="file" accept="image/*" multiple className="hidden" onChange={e=>{void images(e.target.files);e.target.value="";}}/>
  <input ref={videoInput} type="file" accept="video/*" multiple className="hidden" onChange={e=>{void videos(e.target.files);e.target.value="";}}/>
  {notice&&<div role="status" className="absolute bottom-5 left-1/2 z-50 max-w-[90vw] -translate-x-1/2 rounded-full border border-foreground/10 bg-background px-4 py-2 text-xs shadow-md" onClick={()=>setNotice("")}>{notice}</div>}
  {active&&<div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/65 p-4" role="presentation" onClick={()=>setOpenId(null)}>
   <div role="dialog" aria-modal="true" aria-label="Просмотр материала" onClick={e=>e.stopPropagation()} className="relative max-h-[92dvh] w-full max-w-[min(92vw,900px)] overflow-y-auto rounded-2xl bg-background p-4 shadow-2xl sm:p-6">
    <div className="mb-4 flex items-center justify-between gap-3"><span className="truncate text-xs text-foreground/50">{active.text}</span><button type="button" aria-label="Закрыть просмотр" onClick={()=>setOpenId(null)} className="rounded-full p-2 hover:bg-foreground/10"><X size={19}/></button></div>
    {active.src?<img src={active.src} alt={active.text} className="mx-auto max-h-[72dvh] w-auto max-w-full rounded-lg object-contain"/>
     :active.type==="video"?(videoUrls[active.mediaId||""]?<video src={videoUrls[active.mediaId||""]} className="mx-auto max-h-[72dvh] w-full" controls playsInline/>:<p className="p-5 text-sm">Видео недоступно в памяти этого устройства.</p>)
     :active.strokes?.length?<svg viewBox="0 0 1000 700" className="h-[65dvh] w-full">{active.strokes.map((stroke,i)=><polyline key={i} points={stroke.points.map(p=>p.x+","+p.y).join(" ")} fill="none" stroke={stroke.color} strokeWidth={stroke.strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>)}</svg>
     :active.points?<svg viewBox={"0 0 "+(Math.max(1,...active.points.map(p=>p.x))+4)+" "+(Math.max(1,...active.points.map(p=>p.y))+4)} className="h-[65dvh] w-full"><polyline points={active.points.map(p=>p.x+","+p.y).join(" ")} fill="none" stroke={active.color||"currentColor"} strokeWidth={active.strokeWidth||2} strokeLinecap="round" strokeLinejoin="round"/></svg>
     :active.type==="thought"?<textarea aria-label="Редактировать заметку" value={active.text} onChange={e=>setItems(v=>v.map(item=>item.id===active.id?{...item,text:e.target.value}:item))} className="min-h-48 w-full resize-y rounded-xl border border-foreground/10 bg-background p-4 text-base leading-relaxed"/>
     :<a href={/^https?:\/\//.test(active.text)?active.text:undefined} target="_blank" rel="noopener noreferrer" className="break-all text-sm underline">{active.text}</a>}
    {active.type==="sketch"&&<button type="button" className="mt-3 rounded-full border border-foreground/15 px-4 py-2 text-xs" onClick={()=>{setSketchEditor({id:active.id,initialStrokes:legacySketch(active)});setOpenId(null);}}>Продолжить рисование</button>}
   </div>
  </div>}
  {sketchEditor&&<EggSketchEditor key={sketchEditor.id??"new"} initialStrokes={sketchEditor.initialStrokes} onSave={saveSketch} onClose={()=>setSketchEditor(null)}/>}
 </section>;
}

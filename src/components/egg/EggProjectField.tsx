import { useEffect, useRef, useState } from "react";
import type { ReactNode, PointerEvent as ReactPointerEvent } from "react";

type Item={id:string;type:"thought"|"link"|"image"|"sketch";x:number;y:number;text:string;src?:string;points?:{x:number;y:number}[]};
const id=()=>Math.random().toString(36).slice(2);
export default function EggProjectField({projectId,children}:{projectId:string;children:ReactNode}){
 const key="egg:project-field:v1:"+projectId;
 const [items,setItems]=useState<Item[]>([]);
 const [ready,setReady]=useState(false);
 const [tool,setTool]=useState<"thought"|"link"|"sketch"|null>(null);
 const [entry,setEntry]=useState("");
 const [zoom,setZoom]=useState(1);
 const [pan,setPan]=useState({x:0,y:0});
 const [eggScale,setEggScale]=useState(.8);
 const [drawing,setDrawing]=useState<{x:number;y:number}[]|null>(null);
 const gesture=useRef<{kind:"pan"|"item";id?:string;x:number;y:number;px:number;py:number}|null>(null);
 const input=useRef<HTMLInputElement>(null);
 const camera=useRef<HTMLInputElement>(null);
 const field=useRef<HTMLDivElement>(null);
 useEffect(()=>{setReady(false);try{const raw=localStorage.getItem(key);setItems(raw?JSON.parse(raw):[]);}catch{setItems([]);}setPan({x:0,y:0});setReady(true);},[key]);
 useEffect(()=>{if(ready)try{localStorage.setItem(key,JSON.stringify(items));}catch{/* storage full */}},[items,key,ready]);
 const center=()=>({x:(field.current?.clientWidth||700)/2,y:(field.current?.clientHeight||650)/2});
 const world=(x:number,y:number)=>{const c=center();return{x:(x-c.x-pan.x)/zoom,y:(y-c.y-pan.y)/zoom};};
 const add=(type:Item["type"],text:string,src?:string,points?:Item["points"])=>setItems(v=>[...v,{id:id(),type,x:120+(v.length%4)*55,y:30+(v.length%5)*65,text,src,points}]);
 const commit=()=>{if(!entry.trim())return;add(tool==="link"?"link":"thought",entry.trim());setEntry("");setTool(null);};
 async function images(files:FileList|null){if(!files)return;for(const f of Array.from(files).slice(0,5)){if(!f.type.startsWith("image/"))continue;try{const img=new Image();img.src=URL.createObjectURL(f);await img.decode();const cv=document.createElement("canvas");const ratio=Math.min(1,850/Math.max(img.width,img.height));cv.width=Math.max(1,Math.round(img.width*ratio));cv.height=Math.max(1,Math.round(img.height*ratio));cv.getContext("2d")?.drawImage(img,0,0,cv.width,cv.height);URL.revokeObjectURL(img.src);add("image",f.name,cv.toDataURL("image/jpeg",.7));}catch{/* invalid image */}}}
 function down(e:ReactPointerEvent<HTMLDivElement>){if((e.target as HTMLElement).closest("button,textarea,input,a"))return;const rect=e.currentTarget.getBoundingClientRect();const x=e.clientX-rect.left,y=e.clientY-rect.top;const target=(e.target as HTMLElement).closest("[data-field-item]") as HTMLElement|null;
 if(tool==="sketch"&&!target){setDrawing([world(x,y)]);e.currentTarget.setPointerCapture(e.pointerId);return;}
 gesture.current={kind:target?"item":"pan",id:target?.dataset.fieldItem,x,y,px:pan.x,py:pan.y};e.currentTarget.setPointerCapture(e.pointerId);}
 function move(e:ReactPointerEvent<HTMLDivElement>){const r=e.currentTarget.getBoundingClientRect();const x=e.clientX-r.left,y=e.clientY-r.top;
 if(drawing){setDrawing(v=>v?[...v,world(x,y)]:null);return;}
 const g=gesture.current;if(!g)return;const dx=x-g.x,dy=y-g.y;
 if(g.kind==="pan")setPan({x:g.px+dx,y:g.py+dy});
 else setItems(v=>v.map(item=>item.id===g.id?{...item,x:item.x+dx/zoom,y:item.y+dy/zoom}:item));if(g.kind==="item"){g.x=x;g.y=y;}}
 function up(){if(drawing&&drawing.length>1){const p=drawing;add("sketch","Скетч",undefined,p);}setDrawing(null);gesture.current=null;}
 const c=center();
 return <section className="relative mt-3 overflow-hidden rounded-2xl border border-foreground/15 bg-background" aria-label="Пространство проекта EGG">
  <div className="absolute left-3 top-3 z-30 flex flex-wrap items-center gap-2 rounded-2xl border border-foreground/15 bg-background/95 p-2 shadow-sm">
   <button type="button" className="rounded-full bg-foreground px-3 py-2 text-xs text-background" onClick={()=>setTool(v=>v===null?"thought":null)}>＋ Добавить</button>
   <button type="button" className="rounded-full border px-3 py-2 text-xs" onClick={()=>{setPan({x:0,y:0});setZoom(1)}}>Центр</button>
   <button type="button" className="rounded-full border px-2 py-2 text-xs" onClick={()=>setZoom(z=>Math.max(.4,z-.15))}>−</button>
   <span className="text-xs">{Math.round(zoom*100)}%</span>
   <button type="button" className="rounded-full border px-2 py-2 text-xs" onClick={()=>setZoom(z=>Math.min(2,z+.15))}>＋</button>
  </div>
  <div className="absolute right-3 top-3 z-30 rounded-xl border border-foreground/15 bg-background/95 px-3 py-2 text-xs">Яйцо <input aria-label="Размер яйца" type="range" min=".45" max="1.1" step=".05" value={eggScale} onChange={e=>setEggScale(Number(e.target.value))} className="ml-2 w-20 align-middle"/></div>
  {tool!==null&&<div className="absolute left-3 top-16 z-40 w-[min(330px,calc(100%-24px))] rounded-2xl border border-foreground/20 bg-background p-3 shadow-xl">
   <div className="mb-3 grid grid-cols-2 gap-2">
    <button className="rounded-lg border p-2 text-sm" onClick={()=>{setTool("thought");setEntry("")}}>Мысль</button>
    <button className="rounded-lg border p-2 text-sm" onClick={()=>camera.current?.click()}>Фото</button>
    <button className="rounded-lg border p-2 text-sm" onClick={()=>{setTool("sketch");setEntry("")}}>Скетч</button>
    <button className="rounded-lg border p-2 text-sm" onClick={()=>{setTool("link");setEntry("")}}>Ссылка</button>
    <button className="col-span-2 rounded-lg border p-2 text-sm" onClick={()=>input.current?.click()}>Изображение из файлов</button>
   </div>
   {tool==="sketch"?<p className="text-xs text-foreground/65">Рисуйте пальцем или указателем на свободном участке поля. Завершение штриха сохранит скетч.</p>:<><textarea rows={3} value={entry} onChange={e=>setEntry(e.target.value)} placeholder={tool==="link"?"Вставьте ссылку":"Запишите мысль или наблюдение"} className="w-full rounded-lg border bg-background p-2 text-sm"/><button onClick={commit} disabled={!entry.trim()} className="mt-2 rounded-full bg-foreground px-4 py-2 text-xs text-background disabled:opacity-40">Разместить в поле</button></>}
   <button className="ml-3 text-xs text-foreground/60" onClick={()=>setTool(null)}>Закрыть</button>
  </div>}
  <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" onChange={e=>{void images(e.target.files);e.target.value="";}}/>
  <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={e=>{void images(e.target.files);e.target.value="";}}/>
  <div ref={field} className="relative h-[min(78vh,780px)] min-h-[560px] w-full overflow-hidden touch-none" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} style={{backgroundImage:"radial-gradient(hsl(var(--foreground) / .12) 1px,transparent 1px)",backgroundSize:"24px 24px"}}>
   <div className="absolute left-0 top-0" style={{transform:`translate(${c.x+pan.x}px,${c.y+pan.y}px) scale(${zoom})`,transformOrigin:"0 0"}}>
    <div className="absolute" style={{width:900,height:620,left:-450,top:-310,transform:`scale(${eggScale})`,transformOrigin:"center center"}}>{children}</div>
    {items.map(item=><div key={item.id} data-field-item={item.id} className="absolute w-[190px] cursor-grab rounded-xl border border-foreground/20 bg-background/95 p-3 shadow-md active:cursor-grabbing" style={{left:item.x,top:item.y}}>
     <div className="mb-1 flex items-center justify-between"><span className="text-[10px] uppercase tracking-wider text-foreground/50">{item.type==="thought"?"Мысль":item.type==="image"?"Образ":item.type==="link"?"Ссылка":"Скетч"}</span><button type="button" aria-label="Удалить элемент" className="text-xs text-foreground/60" onClick={()=>setItems(v=>v.filter(x=>x.id!==item.id))}>×</button></div>
     {item.src?<img src={item.src} alt={item.text} className="max-h-40 w-full object-contain"/>:item.points?<svg viewBox="0 0 200 140" className="w-full" aria-label="Скетч"><polyline points={item.points.map(p=>`${p.x-item.x+50},${p.y-item.y+30}`).join(" ")} fill="none" stroke="currentColor" strokeWidth="2"/></svg>:item.type==="link"?<a href={/^https?:\/\//.test(item.text)?item.text:undefined} target="_blank" rel="noopener noreferrer" className="break-all text-xs underline">{item.text}</a>:<p className="whitespace-pre-wrap break-words text-sm">{item.text}</p>}
    </div>)}
    {drawing&&<svg className="pointer-events-none absolute overflow-visible" width="1" height="1"><polyline points={drawing.map(p=>`${p.x},${p.y}`).join(" ")} fill="none" stroke="currentColor" strokeWidth="2"/></svg>}
   </div>
  </div>
  <div className="absolute bottom-3 left-3 z-20 rounded-full bg-background/90 px-3 py-1.5 text-[11px] text-foreground/60">Перемещайте поле и карточки · {items.length} материалов · сохранение в этом браузере</div>
 </section>;
}

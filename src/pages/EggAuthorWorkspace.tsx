import {useEffect,useRef,useState,type PointerEvent,type ChangeEvent} from "react";
import {Link,useSearchParams} from "react-router-dom";
import {ArrowLeft,ImagePlus,Pencil,Eraser,Download,Copy,Trash2,Undo2} from "lucide-react";

type Mark={points:{x:number;y:number}[];color:string;size:number};
type BoardImage={id:string;src:string;x:number;y:number;w:number;h:number};
const keyFor=(id:string)=>"egg-author-draft-"+id;
export default function EggAuthorWorkspace(){
 const [params]=useSearchParams();
 const id=params.get("project")??"demo";
 const [text,setText]=useState("");
 const [images,setImages]=useState<BoardImage[]>([]);
 const [marks,setMarks]=useState<Mark[]>([]);
 const [tool,setTool]=useState<"pen"|"erase"|"move">("pen");
 const [active,setActive]=useState<string|null>(null);
 const [notice,setNotice]=useState("");
 const board=useRef<HTMLDivElement>(null);
 const drawing=useRef(false);
 const drag=useRef<{id:string;x:number;y:number;ox:number;oy:number}|null>(null);
 const file=useRef<HTMLInputElement>(null);
 useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem(keyFor(id))??"null");if(saved){setText(saved.text??"");setImages(saved.images??[]);setMarks(saved.marks??[]);}}catch{}},[id]);
 useEffect(()=>{const t=window.setTimeout(()=>{try{localStorage.setItem(keyFor(id),JSON.stringify({text,images,marks}));}catch{setNotice("Недостаточно памяти браузера для сохранения. Экспортируйте черновик.");}},400);return()=>clearTimeout(t);},[id,text,images,marks]);
 const xy=(e:PointerEvent)=>{const r=board.current!.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*1000,y:(e.clientY-r.top)/r.height*650};};
 const down=(e:PointerEvent<HTMLDivElement>)=>{if(tool==="move")return;if((e.target as HTMLElement).closest("[data-board-image]"))return;const p=xy(e);drawing.current=true;e.currentTarget.setPointerCapture(e.pointerId);if(tool==="erase"){setMarks(v=>v.filter(m=>!m.points.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<24)));return;}setMarks(v=>[...v,{points:[p],color:"#8b654e",size:3}]);};
 const move=(e:PointerEvent<HTMLDivElement>)=>{if(drag.current){const p=xy(e),d=drag.current;setImages(v=>v.map(im=>im.id===d.id?{...im,x:Math.max(0,Math.min(850,d.ox+p.x-d.x)),y:Math.max(0,Math.min(520,d.oy+p.y-d.y))}:im));return;}if(!drawing.current||tool!=="pen")return;const p=xy(e);setMarks(v=>v.map((m,i)=>i===v.length-1?{...m,points:[...m.points,p]}:m));};
 const stop=()=>{drawing.current=false;drag.current=null;};
 const add=(e:ChangeEvent<HTMLInputElement>)=>{const fs=Array.from(e.target.files??[]).slice(0,6);e.target.value="";fs.forEach(f=>{if(!f.type.startsWith("image/")||f.size>3*1024*1024){setNotice("Допустимы изображения до 3 МБ.");return;}const reader=new FileReader();reader.onload=()=>{const src=String(reader.result);setImages(v=>[...v,{id:crypto.randomUUID(),src,x:80+(v.length%4)*85,y:70+(v.length%3)*60,w:280,h:210}]);};reader.readAsDataURL(f);});};
 const payload={version:1,project:id,text,images,marks,exportedAt:new Date().toISOString()};
 const exportDraft=()=>{const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="EGG-author-"+id.slice(0,8)+".json";a.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);};
 const copy=async()=>{const prompt="EGG / Автор → Идея. Сохрани авторский замысел, отдели факты от гипотез, предложи краткую визуально-текстовую концепцию и перечисли открытые вопросы. Не считай концепцию утверждённой.\n\nЗамысел:\n"+text+"\n\nВизуальных референсов: "+images.length+". Пометок: "+marks.length+". Изображения и рисунки передаются отдельным JSON-экспортом.";try{await navigator.clipboard.writeText(prompt);setNotice("Текст для обсуждения с ИИ скопирован. Изображения нужно приложить отдельно.");}catch{setNotice("Копирование недоступно в этом браузере.");}};
 return <main className="min-h-screen bg-background px-4 py-4 text-foreground sm:px-8" data-testid="egg-author-workspace">
  <header className="mx-auto mb-5 flex max-w-6xl items-center justify-between gap-3"><Link to={"/egg/yolk"+(params.get("project")?"?project="+encodeURIComponent(id):"")} className="flex items-center gap-2 text-xs text-foreground/65"><ArrowLeft size={15}/> Желток</Link><h1 className="text-sm font-light tracking-widest">EGG / АВТОР</h1><button type="button" onClick={exportDraft} className="flex items-center gap-1 text-xs"><Download size={15}/> Экспорт</button></header>
  <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
   <section className="min-w-0"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h2 className="text-xs text-foreground/60">Визуальный холст · референсы и пометки</h2><div className="flex gap-2">
    <input ref={file} type="file" accept="image/*" multiple className="hidden" onChange={add}/>
    <button type="button" aria-label="Добавить изображения" onClick={()=>file.current?.click()} className="rounded-full border border-foreground/20 p-2"><ImagePlus size={17}/></button>
    <button type="button" aria-label="Рисовать" aria-pressed={tool==="pen"} onClick={()=>setTool("pen")} className={"rounded-full border p-2 "+(tool==="pen"?"border-foreground/70":"border-foreground/20")}><Pencil size={17}/></button>
    <button type="button" aria-label="Перемещать изображения" aria-pressed={tool==="move"} onClick={()=>setTool("move")} className={"rounded-full border px-3 py-2 text-xs "+(tool==="move"?"border-foreground/70":"border-foreground/20")}>Двигать</button>
    <button type="button" aria-label="Ластик" aria-pressed={tool==="erase"} onClick={()=>setTool("erase")} className={"rounded-full border p-2 "+(tool==="erase"?"border-foreground/70":"border-foreground/20")}><Eraser size={17}/></button>
    <button type="button" aria-label="Отменить последнюю линию" onClick={()=>setMarks(v=>v.slice(0,-1))} className="rounded-full border border-foreground/20 p-2"><Undo2 size={17}/></button>
   </div></div>
   <div ref={board} onPointerDown={down} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} className="relative aspect-[1000/650] w-full touch-none overflow-hidden rounded-2xl border border-foreground/15 bg-[#f4f0e8]" style={{cursor:tool==="pen"?"crosshair":"default"}} data-testid="egg-author-board">
    {images.map(im=><div key={im.id} data-board-image className={"absolute overflow-hidden rounded-md border shadow-sm "+(active===im.id?"border-[#a07d65]":"border-[#c8bba8]")} style={{left:im.x/10+"%",top:im.y/6.5+"%",width:im.w/10+"%",height:im.h/6.5+"%",touchAction:"none"}} onPointerDown={e=>{if(tool!=="move")return;e.stopPropagation();const p=xy(e);drag.current={id:im.id,x:p.x,y:p.y,ox:im.x,oy:im.y};setActive(im.id);e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(drag.current?.id!==im.id)return;e.stopPropagation();move(e);}} onPointerUp={stop}>
      <img src={im.src} alt="Референс Автора" draggable={false} className="h-full w-full object-contain"/>
     </div>)}
    <svg viewBox="0 0 1000 650" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">{marks.map((m,i)=><polyline key={i} points={m.points.map(p=>p.x+","+p.y).join(" ")} fill="none" stroke={m.color} strokeWidth={m.size} strokeLinecap="round" strokeLinejoin="round"/>)}</svg>
    {!images.length&&!marks.length&&<div className="pointer-events-none absolute inset-0 grid place-items-center text-center text-xs text-[#a59b8c]">Добавьте изображение или нарисуйте первый штрих</div>}
   </div>
   <div className="mt-2 flex items-center justify-between text-[11px] text-foreground/50"><span>Изображений: {images.length} · линий: {marks.length}</span><button type="button" onClick={()=>{if(active)setImages(v=>v.filter(im=>im.id!==active));setActive(null);}} disabled={!active} className="flex items-center gap-1 disabled:opacity-35"><Trash2 size={13}/> Удалить выбранное</button></div>
   </section>
   <section className="flex min-w-0 flex-col gap-3"><h2 className="text-xs text-foreground/60">Замысел / свободная формулировка</h2><textarea aria-label="Замысел Автора" value={text} onChange={e=>setText(e.target.value)} placeholder="С чего начинается идея? Что важно сохранить? Какие образы, ощущения, функции или ограничения уже известны?" className="min-h-[240px] w-full flex-1 resize-y rounded-2xl border border-foreground/15 bg-transparent p-4 text-sm leading-relaxed outline-none focus:border-foreground/45"/>
    <p className="text-[11px] leading-relaxed text-foreground/55">Черновик автоматически сохраняется только в этом браузере. Передача в проект EGG пока не подключена.</p>
    <button type="button" onClick={()=>void copy()} className="flex items-center justify-center gap-2 rounded-xl border border-foreground/30 px-4 py-3 text-sm"><Copy size={15}/> Подготовить текст для ИИ</button>
    <button type="button" onClick={exportDraft} className="rounded-xl bg-foreground px-4 py-3 text-sm text-background">Сохранить пакет для сферы Идеи (JSON)</button>
    {notice&&<p role="status" className="text-xs text-foreground/65">{notice}</p>}
   </section>
  </div>
 </main>;
}

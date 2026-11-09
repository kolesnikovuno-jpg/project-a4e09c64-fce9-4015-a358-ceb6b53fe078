import {useEffect,useRef,useState,type PointerEvent,type ChangeEvent} from "react";
import {createClient} from "@supabase/supabase-js";
import {Link,useSearchParams} from "react-router-dom";
import {ArrowLeft,ImagePlus,Pencil,Eraser,Download,Copy,Trash2,Undo2} from "lucide-react";

type Mark={points:{x:number;y:number}[];color:string;size:number};
type Fragment={id:string;x:number;y:number;w:number;h:number;note:string;createdAt:string};
type BoardImage={id:string;src:string;x:number;y:number;w:number;h:number;path?:string};
const keyFor=(id:string)=>"egg-author-draft-"+id;
export default function EggAuthorWorkspace(){
 const [params]=useSearchParams();
 const id=params.get("project")??"demo";
 const [text,setText]=useState("");
 const [images,setImages]=useState<BoardImage[]>([]);
 const [marks,setMarks]=useState<Mark[]>([]);
 const [discussion,setDiscussion]=useState("");
 const [fragments,setFragments]=useState<Fragment[]>([]);
 const [selectedFragment,setSelectedFragment]=useState<string|null>(null);
 const [region,setRegion]=useState<{x:number;y:number;w:number;h:number}|null>(null);
 const regionStart=useRef<{x:number;y:number}|null>(null);
 const [findings,setFindings]=useState<{id:string;text:string;createdAt:string}[]>([]);
 const [showTransfer,setShowTransfer]=useState(false);
 const [tool,setTool]=useState<"pen"|"erase"|"move"|"select">("pen");
 const [active,setActive]=useState<string|null>(null);
 const [notice,setNotice]=useState("");
 const [remoteFindings,setRemoteFindings]=useState<{id:string;title:string;content:string;actor_kind:string;created_at:string}[]>([]);
 const [bridgeStatus,setBridgeStatus]=useState("Соединение с EGG не проверено");
 const tokenRef=useRef<string|null>(null);
 const sentRef=useRef<Record<string,string>>({});
 const readyRef=useRef(false);
 const [storageReady,setStorageReady]=useState(false);
 const board=useRef<HTMLDivElement>(null);
 const drawing=useRef(false);
 const drag=useRef<{id:string;x:number;y:number;ox:number;oy:number}|null>(null);
 const file=useRef<HTMLInputElement>(null);
 useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem(keyFor(id))??"null");if(saved){setText(saved.text??"");setImages((saved.images??[]).filter((im:BoardImage)=>!im.src?.startsWith("blob:")));setMarks(saved.marks??[]);setFindings(saved.findings??[]);setFragments(saved.fragments??[]);}}catch{}},[id]);
 useEffect(()=>{const t=window.setTimeout(()=>{try{localStorage.setItem(keyFor(id),JSON.stringify({text,images:images.filter(im=>!im.src.startsWith("blob:")).map(im=>im.path?{...im,src:""}:im),marks,findings,fragments}));}catch{setNotice("Недостаточно памяти браузера для сохранения. Экспортируйте черновик.");}},400);return()=>clearTimeout(t);},[id,text,images,marks,findings,fragments]);
 useEffect(()=>{let cancelled=false;let timer:number|undefined;
  const refresh=async()=>{try{
   const cfgResponse=await fetch("/api/egg-config",{cache:"no-store"});
   if(!cfgResponse.ok)throw Error("Конфигурация EGG недоступна");
   const cfg=await cfgResponse.json() as {supabaseUrl:string;publishableKey:string};
   const client=createClient(cfg.supabaseUrl,cfg.publishableKey);
   const {data}=await client.auth.getSession();
   if(!data.session?.access_token)throw Error("Требуется вход в EGG");
   tokenRef.current=data.session.access_token;
   const response=await fetch("/api/egg?canvas=1&projectId="+encodeURIComponent(id),{headers:{Authorization:"Bearer "+tokenRef.current},cache:"no-store"});
   if(!response.ok)throw Error("Не удалось получить материалы проекта");
   const body=await response.json() as {items:Array<{id:string;title:string;content:string;actor_kind:string;created_at:string}>;signed?:Record<string,string>};
   if(cancelled)return;
   const remoteImages:BoardImage[]=[];
   for(const item of body.items){try{const v=JSON.parse(item.content) as {kind?:string;image?:BoardImage};if(v.kind==="canvas_image"&&v.image&&body.signed?.[v.image.id])remoteImages.push({...v.image,src:body.signed[v.image.id]});}catch{}}
   setImages(current=>{
    const remote=new Map(remoteImages.map(im=>[im.id,im]));
    const merged=current.map(im=>{
      const cloud=remote.get(im.id);
      if(!cloud)return im;
      remote.delete(im.id);
      return {...im,src:cloud.src,path:cloud.path};
    });
    return [...merged,...remote.values()];
   });
   setRemoteFindings(body.items.filter(x=>x.actor_kind==="agent"||!x.content.includes('"kind":"canvas_fragment"')));
   const latest=new Map<string,Fragment>();
   for(const item of body.items){try{const parsed=JSON.parse(item.content) as {kind?:string;fragment?:Fragment};if(parsed.kind==="canvas_fragment"&&parsed.fragment&&!latest.has(parsed.fragment.id))latest.set(parsed.fragment.id,parsed.fragment);}catch{}}
   setFragments(current=>{const localIds=new Set(current.map(f=>f.id));return [...current,...Array.from(latest.values()).filter(f=>!localIds.has(f.id))];});
   for(const f of latest.values())sentRef.current[f.id]=JSON.stringify(f);
   readyRef.current=true;setStorageReady(true);setBridgeStatus("Связь с EGG установлена");
  }catch(e){if(!cancelled)setBridgeStatus(e instanceof Error?e.message:"Связь с EGG недоступна");}};
  void refresh();timer=window.setInterval(()=>void refresh(),20000);
  return()=>{cancelled=true;if(timer)window.clearInterval(timer);};
 },[id]);
 useEffect(()=>{if(!readyRef.current||!tokenRef.current)return;
  const pending=fragments.filter(f=>JSON.stringify(f)!==sentRef.current[f.id]);
  if(!pending.length)return;
  const timer=window.setTimeout(async()=>{for(const fragment of pending){const snapshot=JSON.stringify(fragment);try{
   const response=await fetch("/api/egg",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+tokenRef.current},body:JSON.stringify({command:"save_fragment",projectId:id,fragment})});
   if(!response.ok)throw Error("Сохранение в EGG не удалось");
   sentRef.current[fragment.id]=snapshot;setBridgeStatus("Фрагменты синхронизированы с EGG");
  }catch{setBridgeStatus("Нет синхронизации: фрагменты остались в браузере");break;}}},1400);
  return()=>window.clearTimeout(timer);
 },[id,fragments]);
 const xy=(e:PointerEvent)=>{const r=board.current!.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*1000,y:(e.clientY-r.top)/r.height*650};};
 const down=(e:PointerEvent<HTMLDivElement>)=>{if(tool==="select"){const p=xy(e);regionStart.current=p;setRegion({...p,w:0,h:0});e.currentTarget.setPointerCapture(e.pointerId);return;}if(tool==="move")return;if((e.target as HTMLElement).closest("[data-board-image]"))return;const p=xy(e);drawing.current=true;e.currentTarget.setPointerCapture(e.pointerId);if(tool==="erase"){setMarks(v=>v.filter(m=>!m.points.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<24)));return;}setMarks(v=>[...v,{points:[p],color:"#8b654e",size:3}]);};
 const move=(e:PointerEvent<HTMLDivElement>)=>{if(tool==="select"&&regionStart.current){const p=xy(e),a=regionStart.current;setRegion({x:Math.min(a.x,p.x),y:Math.min(a.y,p.y),w:Math.abs(p.x-a.x),h:Math.abs(p.y-a.y)});return;}if(drag.current){const p=xy(e),d=drag.current;setImages(v=>v.map(im=>im.id===d.id?{...im,x:Math.max(0,Math.min(850,d.ox+p.x-d.x)),y:Math.max(0,Math.min(520,d.oy+p.y-d.y))}:im));return;}if(!drawing.current||tool!=="pen")return;const p=xy(e);setMarks(v=>v.map((m,i)=>i===v.length-1?{...m,points:[...m.points,p]}:m));};
 const stop=()=>{if(regionStart.current&&region&&region.w>15&&region.h>15){const f={...region,id:crypto.randomUUID(),note:"",createdAt:new Date().toISOString()};setFragments(v=>[...v,f]);setSelectedFragment(f.id);}regionStart.current=null;setRegion(null);drawing.current=false;drag.current=null;};
 const normalizePhoto=async(file:File):Promise<File>=>{
  if(["image/jpeg","image/png","image/webp"].includes(file.type))return file;
  const isHeic=/\\.(heic|heif)$/i.test(file.name)||/image\\/(heic|heif)/i.test(file.type);
  if(!isHeic)throw Error("Неподдерживаемый формат фотографии");
  const url=URL.createObjectURL(file);
  try{
   const image=new Image();image.src=url;
   await image.decode();
   const canvas=document.createElement("canvas");
   canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
   const ctx=canvas.getContext("2d");if(!ctx)throw Error("Недоступно преобразование изображения");
   ctx.drawImage(image,0,0);
   const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/jpeg",0.86));
   if(!blob)throw Error("Не удалось преобразовать фотографию");
   return new File([blob],file.name.replace(/\\.(heic|heif)$/i,"")+".jpg",{type:"image/jpeg"});
  }catch{throw Error("Safari не смог преобразовать HEIC. Выбери фото через «Поделиться» → «Сохранить в Файлы» в JPEG или используй JPEG.");}
  finally{URL.revokeObjectURL(url);}
 };
 const add=(e:ChangeEvent<HTMLInputElement>)=>{
  const fs=Array.from(e.target.files??[]).slice(0,6);e.target.value="";
  fs.forEach(async original=>{
   let f:File;
   try{f=await normalizePhoto(original);}catch(err){setNotice(err instanceof Error?err.message:"Формат не поддерживается");return;}
   if(!["image/png","image/jpeg","image/webp"].includes(f.type)||f.size>3*1024*1024){setNotice("Файл не добавлен: нужен PNG, JPEG или WebP до 3 МБ. Для HEIC выбери экспорт в JPEG.");return;}
   const imageId=crypto.randomUUID(),placement={id:imageId,x:80+(images.length%4)*85,y:70+(images.length%3)*60,w:280,h:210};
   const localUrl=URL.createObjectURL(f);
   setImages(current=>[...current,{...placement,src:localUrl}]);
   setNotice("Изображение добавлено на холст. Сохранение в EGG…");
   if(!storageReady||!tokenRef.current){setNotice("Изображение на холсте, но облако недоступно. Экспортируй черновик.");return;}
   try{
    const headers={"Content-Type":"application/json",Authorization:"Bearer "+tokenRef.current};
    const signedResponse=await fetch("/api/egg",{method:"POST",headers,body:JSON.stringify({command:"media_upload",projectId:id,imageId,mime:f.type})});
    if(!signedResponse.ok)throw Error("Не удалось подготовить загрузку");
    const signed=await signedResponse.json() as {path:string;token:string};
    const cfgResponse=await fetch("/api/egg-config",{cache:"no-store"});
    if(!cfgResponse.ok)throw Error("Конфигурация недоступна");
    const cfg=await cfgResponse.json() as {supabaseUrl:string;publishableKey:string};
    const client=createClient(cfg.supabaseUrl,cfg.publishableKey);
    const {error}=await client.storage.from("egg-author-media").uploadToSignedUrl(signed.path,signed.token,f,{contentType:f.type});
    if(error)throw error;
    const registered=await fetch("/api/egg",{method:"POST",headers,body:JSON.stringify({command:"media_register",projectId:id,imageId,path:signed.path,...placement})});
    if(!registered.ok)throw Error("Изображение загружено, но регистрация в проекте не удалась");
    setImages(current=>current.map(im=>im.id===imageId?{...im,path:signed.path}:im));
    setNotice("Изображение сохранено в облаке EGG.");
   }catch(err){setNotice("Изображение видно на холсте, но не сохранено в облаке: "+(err instanceof Error?err.message:"ошибка загрузки"));}
  });
 };
 const payload={version:2,project:id,text,images,marks,findings,fragments,exportedAt:new Date().toISOString()};
 const transferText=()=>["EGG — контекст Автора","Проект: "+id,"Замысел:",text||"(пока не сформулирован)","Выводы предыдущих обсуждений:",...findings.map((f,i)=>String(i+1)+". "+f.text),"Фрагменты холста:",...fragments.map((f,i)=>String(i+1)+". ID "+f.id+"; область "+[f.x,f.y,f.w,f.h].map(Math.round).join(", ")+"; заметка: "+(f.note||"нет")),"Визуальные материалы: "+images.length+" изображений, "+marks.length+" линий. Для визуального анализа приложите экспорт холста.","Задача: исследуй замысел, сохрани авторское ядро, отдели факты от гипотез и предложи варианты. Не утверждай решения вместо Автора."].join("\n\n");
 const addFinding=()=>{const value=discussion.trim();if(!value)return;setFindings(v=>[...v,{id:crypto.randomUUID(),text:value,createdAt:new Date().toISOString()}]);setDiscussion("");setNotice("Итог обсуждения добавлен в материалы Автора. Он не утверждён как концепция.");};
 const exportDraft=()=>{const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="EGG-author-"+id.slice(0,8)+".json";a.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);};
 const copy=async()=>{try{await navigator.clipboard.writeText(transferText());setNotice("Контекст скопирован. В ChatGPT приложите изображения или экспорт JSON отдельно.");}catch{setNotice("Копирование недоступно в этом браузере.");}};
 return <main className="min-h-screen bg-background px-4 py-4 text-foreground sm:px-8" data-testid="egg-author-workspace">
  <header className="mx-auto mb-5 flex max-w-6xl items-center justify-between gap-3"><Link to={"/egg/yolk"+(params.get("project")?"?project="+encodeURIComponent(id):"")} className="flex items-center gap-2 text-xs text-foreground/65"><ArrowLeft size={15}/> Желток</Link><h1 className="text-sm font-light tracking-widest">EGG / АВТОР</h1><button type="button" onClick={exportDraft} className="flex items-center gap-1 text-xs"><Download size={15}/> Экспорт</button></header>
  <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
   <section className="min-w-0"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h2 className="text-xs text-foreground/60">Визуальный холст · референсы и пометки</h2><div className="flex gap-2">
    <input ref={file} type="file" accept="image/*,.heic,.heif" multiple className="hidden" onChange={add}/>
    <button type="button" aria-label="Добавить изображения" onClick={()=>file.current?.click()} className="rounded-full border border-foreground/20 p-2"><ImagePlus size={17}/></button>
    <button type="button" aria-label="Рисовать" aria-pressed={tool==="pen"} onClick={()=>setTool("pen")} className={"rounded-full border p-2 "+(tool==="pen"?"border-foreground/70":"border-foreground/20")}><Pencil size={17}/></button>
    <button type="button" aria-label="Перемещать изображения" aria-pressed={tool==="move"} onClick={()=>setTool("move")} className={"rounded-full border px-3 py-2 text-xs "+(tool==="move"?"border-foreground/70":"border-foreground/20")}>Двигать</button>
    <button type="button" aria-label="Выделить фрагмент" aria-pressed={tool==="select"} onClick={()=>setTool("select")} className={"rounded-full border px-3 py-2 text-xs "+(tool==="select"?"border-foreground/70":"border-foreground/20")}>Фрагмент</button>
    <button type="button" aria-label="Ластик" aria-pressed={tool==="erase"} onClick={()=>setTool("erase")} className={"rounded-full border p-2 "+(tool==="erase"?"border-foreground/70":"border-foreground/20")}><Eraser size={17}/></button>
    <button type="button" aria-label="Отменить последнюю линию" onClick={()=>setMarks(v=>v.slice(0,-1))} className="rounded-full border border-foreground/20 p-2"><Undo2 size={17}/></button>
   </div></div>
   <div ref={board} onPointerDown={down} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} className="relative aspect-[1000/650] w-full touch-none overflow-hidden rounded-2xl border border-foreground/15 bg-[#f4f0e8]" style={{cursor:tool==="pen"?"crosshair":"default"}} data-testid="egg-author-board">
    {images.map(im=><div key={im.id} data-board-image className={"absolute overflow-hidden rounded-md border shadow-sm "+(active===im.id?"border-[#a07d65]":"border-[#c8bba8]")} style={{left:im.x/10+"%",top:im.y/6.5+"%",width:im.w/10+"%",height:im.h/6.5+"%",touchAction:"none"}} onPointerDown={e=>{if(tool!=="move")return;e.stopPropagation();const p=xy(e);drag.current={id:im.id,x:p.x,y:p.y,ox:im.x,oy:im.y};setActive(im.id);e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(drag.current?.id!==im.id)return;e.stopPropagation();move(e);}} onPointerUp={stop}>
      <img src={im.src} alt="Референс Автора" draggable={false} className="h-full w-full object-contain"/>
     </div>)}
    <svg viewBox="0 0 1000 650" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">{marks.map((m,i)=><polyline key={i} points={m.points.map(p=>p.x+","+p.y).join(" ")} fill="none" stroke={m.color} strokeWidth={m.size} strokeLinecap="round" strokeLinejoin="round"/>)}</svg>
    {fragments.map((f,i)=><button key={f.id} type="button" onClick={e=>{e.stopPropagation();setSelectedFragment(f.id);setTool("move");}} className={"absolute border-2 border-dashed "+(selectedFragment===f.id?"border-amber-700 bg-amber-300/15":"border-amber-700/40")} style={{left:f.x/10+"%",top:f.y/6.5+"%",width:f.w/10+"%",height:f.h/6.5+"%"}} aria-label={"Выбрать фрагмент "+(i+1)}><span className="absolute left-0 top-0 bg-amber-100 px-1 text-[10px] text-amber-900">{i+1}</span></button>)}
    {region&&<div className="pointer-events-none absolute border-2 border-dashed border-amber-700 bg-amber-300/10" style={{left:region.x/10+"%",top:region.y/6.5+"%",width:region.w/10+"%",height:region.h/6.5+"%"}}/>}
    {!images.length&&!marks.length&&<div className="pointer-events-none absolute inset-0 grid place-items-center text-center text-xs text-[#a59b8c]">Добавьте изображение или нарисуйте первый штрих</div>}
   </div>
   <div className="mt-2 flex items-center justify-between text-[11px] text-foreground/50"><span>Изображений: {images.length} · линий: {marks.length}</span><button type="button" onClick={()=>{if(active)setImages(v=>v.filter(im=>im.id!==active));setActive(null);}} disabled={!active} className="flex items-center gap-1 disabled:opacity-35"><Trash2 size={13}/> Удалить выбранное</button></div>
   </section>
   <section className="flex min-w-0 flex-col gap-3">{selectedFragment&&fragments.some(f=>f.id===selectedFragment)&&<div className="rounded-xl border border-amber-700/30 p-3"><h3 className="mb-2 text-xs font-medium">Выбранный фрагмент</h3><p className="mb-2 break-all text-[10px] text-foreground/50">ID: {selectedFragment}</p><textarea aria-label="Заметка к фрагменту" value={fragments.find(f=>f.id===selectedFragment)?.note??""} onChange={e=>setFragments(v=>v.map(f=>f.id===selectedFragment?{...f,note:e.target.value}:f))} placeholder="Что именно требуется исследовать в этой области?" className="min-h-20 w-full rounded-lg border border-foreground/15 bg-transparent p-2 text-xs"/><button type="button" onClick={()=>{setFragments(v=>v.filter(f=>f.id!==selectedFragment));setSelectedFragment(null);}} className="mt-2 text-xs text-foreground/60">Удалить выделение</button></div>}<h2 className="text-xs text-foreground/60">Замысел / свободная формулировка</h2><textarea aria-label="Замысел Автора" value={text} onChange={e=>setText(e.target.value)} placeholder="С чего начинается идея? Что важно сохранить? Какие образы, ощущения, функции или ограничения уже известны?" className="min-h-[240px] w-full flex-1 resize-y rounded-2xl border border-foreground/15 bg-transparent p-4 text-sm leading-relaxed outline-none focus:border-foreground/45"/>
    <p className="text-[11px] leading-relaxed text-foreground/55">Черновик холста хранится в браузере. Изображения с подтверждённым сохранением загружаются из EGG; рисунки пока локальные. Фрагменты и заметки синхронизируются при авторизации. {bridgeStatus}.</p>
    <button type="button" onClick={()=>setShowTransfer(v=>!v)} className="flex items-center justify-center gap-2 rounded-xl border border-foreground/30 px-4 py-3 text-sm"><Copy size={15}/> Перейти к обсуждению с ИИ</button>
    {showTransfer&&<div className="rounded-xl border border-foreground/15 p-3 text-xs leading-relaxed"><p>1. Скопируйте контекст. 2. Откройте ChatGPT и вставьте его в диалог. 3. При необходимости приложите изображения или экспорт холста. 4. Вернувшись, сохраните вывод ниже.</p><div className="mt-3 flex flex-wrap gap-3"><button type="button" onClick={()=>void copy()} className="rounded-lg border border-foreground/25 px-3 py-2">Скопировать контекст</button><a href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer" className="rounded-lg border border-foreground/25 px-3 py-2">Открыть ChatGPT ↗</a></div><p className="mt-2 text-foreground/55">Это ручной переход, не автоматическая синхронизация с чатом.</p></div>}
    <div className="rounded-xl border border-foreground/15 p-3"><h3 className="mb-2 text-xs font-medium">Вернуть итог обсуждения на холст</h3><textarea value={discussion} onChange={e=>setDiscussion(e.target.value)} aria-label="Итог обсуждения с ИИ" placeholder="Вставьте сюда выбранный вывод из диалога. Он останется рабочей заметкой до вашего утверждения." className="min-h-24 w-full resize-y rounded-lg border border-foreground/15 bg-transparent p-2 text-xs"/><button type="button" disabled={!discussion.trim()} onClick={addFinding} className="mt-2 rounded-lg border border-foreground/25 px-3 py-2 text-xs disabled:opacity-40">Добавить вывод</button>{findings.length>0&&<div className="mt-3 space-y-2">{findings.map((f,i)=><div key={f.id} className="rounded-lg bg-foreground/5 p-2"><div className="flex justify-between gap-2"><span className="text-[10px] text-foreground/55">Заметка {i+1}</span><button type="button" onClick={()=>setFindings(v=>v.filter(x=>x.id!==f.id))} aria-label="Удалить заметку" className="text-foreground/55"><Trash2 size={13}/></button></div><p className="mt-1 whitespace-pre-wrap text-xs">{f.text}</p></div>)}</div>}</div>
    {remoteFindings.length>0&&<div className="rounded-xl border border-foreground/15 p-3"><h3 className="mb-2 text-xs font-medium">Материалы из EGG · обновление каждые 20 секунд</h3>{remoteFindings.slice(0,15).map(f=><div key={f.id} className="mb-2 rounded-lg bg-foreground/5 p-2"><p className="text-[10px] text-foreground/55">{f.title}</p><p className="mt-1 whitespace-pre-wrap break-words text-xs">{f.content.slice(0,1000)}</p></div>)}</div>}
    <button type="button" onClick={exportDraft} className="rounded-xl bg-foreground px-4 py-3 text-sm text-background">Сохранить пакет для сферы Идеи (JSON)</button>
    {notice&&<p role="status" className="text-xs text-foreground/65">{notice}</p>}
   </section>
  </div>
 </main>;
}

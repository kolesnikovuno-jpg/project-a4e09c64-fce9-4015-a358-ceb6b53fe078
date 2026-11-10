import { useRef, useState } from "react";
import { useLocale } from "@/i18n/useLocale";

type Item = { id: number; x: number; y: number; w: number; h: number; label: string; color: string; photo?: string };
const initial: Item[] = [{ id: 1, x: 90, y: 90, w: 115, h: 55, label: "Sofa", color: "#b5a99b" }, { id: 2, x: 280, y: 160, w: 65, h: 65, label: "Table", color: "#a18d75" }];
export default function SpatialStudio() {
 const { locale, localePath } = useLocale();
 const ru = locale === "ru", uk = locale === "uk";
 const tr = (r:string,u:string,e:string) => ru?r:uk?u:e;
 const [items,setItems] = useState<Item[]>(initial);
 const [selected,setSelected] = useState<number|null>(null);
 const [video,setVideo] = useState<string|null>(null);
 const [fileName,setFileName] = useState("");
 const [recording,setRecording] = useState(false);
 const [processing,setProcessing] = useState(false);
 const [frames,setFrames] = useState<string[]>([]);
 const [progress,setProgress] = useState("");
 const [error,setError] = useState("");
 const input = useRef<HTMLInputElement>(null);
 const preview = useRef<HTMLVideoElement>(null);
 const recorder = useRef<MediaRecorder|null>(null);
 const stream = useRef<MediaStream|null>(null);
 const parts = useRef<Blob[]>([]);
 const drag = useRef<{id:number;dx:number;dy:number}|null>(null);
 const svg = useRef<SVGSVGElement>(null);
 const photoInput = useRef<HTMLInputElement>(null);
 const activeItem = items.find(i=>i.id===selected);
 const attachPhoto = (f?:File)=>{if(!f||selected===null)return;if(!f.type.startsWith("image/")){setError("Please select an image");return;}const reader=new FileReader();reader.onload=()=>{if(typeof reader.result==="string")setItems(old=>old.map(i=>i.id===selected?{...i,photo:reader.result as string}:i))};reader.readAsDataURL(f)};
 const stop = () => {recorder.current?.state==="recording" && recorder.current.stop(); stream.current?.getTracks().forEach(t=>t.stop());if(preview.current)preview.current.srcObject=null;setRecording(false);};
 const start = async () => {
   setError("");
   try {
     if(!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error("Camera recording is unavailable in this browser");
     const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"},audio:false});stream.current=s;
     if(preview.current){preview.current.srcObject=s;await preview.current.play().catch(()=>{});}
     const mime=["video/mp4","video/webm;codecs=h264","video/webm"].find(x=>MediaRecorder.isTypeSupported(x));
     const r=new MediaRecorder(s,mime?{mimeType:mime}:undefined);recorder.current=r;parts.current=[];
     r.ondataavailable=e=>{if(e.data.size)parts.current.push(e.data)};
     r.onstop=()=>{const blob=new Blob(parts.current,{type:r.mimeType||"video/webm"});setVideo(old=>{if(old)URL.revokeObjectURL(old);return URL.createObjectURL(blob)});setFileName("camera-capture");s.getTracks().forEach(t=>t.stop());if(preview.current)preview.current.srcObject=null};
     r.start();setRecording(true);
   } catch(e){setError(e instanceof Error?e.message:String(e))}
 };
 const load=(f?:File)=>{if(!f)return;setFrames([]);setError("");setVideo(old=>{if(old)URL.revokeObjectURL(old);return URL.createObjectURL(f)});setFileName(f.name)};
 const extractFrames = async () => {
  if(!video || processing)return;
  setProcessing(true);setError("");setFrames([]);setProgress(tr("Анализ видео…","Аналіз відео…","Reading video…"));
  const v=document.createElement("video");v.preload="auto";v.muted=true;v.playsInline=true;v.src=video;
  try{
   await new Promise<void>((resolve,reject)=>{v.onloadedmetadata=()=>resolve();v.onerror=()=>reject(new Error("Cannot decode video"));v.load()});
   const duration=v.duration;if(!Number.isFinite(duration)||duration<=0)throw new Error("Video duration unavailable");
   const count=Math.min(24,Math.max(4,Math.ceil(duration*1.5)));
   const width=Math.min(960,v.videoWidth||960),height=Math.round(width*(v.videoHeight||720)/(v.videoWidth||960));
   const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;
   const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Canvas unavailable");
   const output:string[]=[];
   for(let i=0;i<count;i++){
    const t=Math.max(0.01,Math.min(duration-0.02,(i+.5)*duration/count));
    await new Promise<void>((resolve,reject)=>{const timer=window.setTimeout(()=>reject(new Error("Video seek timed out")),8000);v.onseeked=()=>{clearTimeout(timer);resolve()};v.onerror=()=>{clearTimeout(timer);reject(new Error("Video seek failed"))};v.currentTime=t});
    ctx.drawImage(v,0,0,width,height);output.push(canvas.toDataURL("image/jpeg",.82));
    setProgress(`${i+1} / ${count}`);
   }
   setFrames(output);setProgress(tr("Кадры подготовлены. Это ещё не 3D-реконструкция.","Кадри підготовлено. Це ще не 3D-реконструкція.","Frames prepared. This is not 3D reconstruction yet."));
  }catch(e){setError(e instanceof Error?e.message:String(e));setProgress("")}finally{v.removeAttribute("src");v.load();setProcessing(false)}
 };
 const downloadFrames=()=>{
  frames.forEach((url,i)=>{const a=document.createElement("a");a.href=url;a.download=`spatial-frame-${String(i+1).padStart(3,"0")}.jpg`;a.click()});
 };
 const point=(e:React.PointerEvent<SVGSVGElement>)=>{const p=svg.current!.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const matrix=svg.current!.getScreenCTM();return matrix?p.matrixTransform(matrix.inverse()):{x:0,y:0}};
 const exportScene=()=>{const data={format:"spatial-studio-concept-v1",room:{width:5,height:4,units:"illustrative"},objects:items,sourceVideo:fileName||null,notice:"Concept plan only. Not a CAD reconstruction or measured geometry."};const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));a.download="spatial-concept.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
 return <div style={{minHeight:"100dvh",background:"#f3f1ed",color:"#252622",fontFamily:"system-ui,sans-serif",padding:"24px clamp(16px,4vw,56px)"}}>
 <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",marginBottom:30}}><a href={localePath("/")} style={{color:"inherit",textDecoration:"none",fontSize:13}}>← kolesnikov.studio</a><span style={{fontSize:12,letterSpacing:2,opacity:.6}}>SPATIAL STUDIO / LAB 01</span></header>
 <h1 style={{fontSize:"clamp(32px,5vw,56px)",fontWeight:350,letterSpacing:"-.045em",margin:"0 0 8px"}}>Spatial Studio</h1>
 <p style={{maxWidth:700,lineHeight:1.6,opacity:.7,marginBottom:32}}>{tr("Экспериментальная мастерская: видеосъёмка и концептуальная расстановка объектов. Реконструкция 3D и CAD пока не подключены.","Експериментальна майстерня: відеозйомка та концептуальне розміщення об'єктів. 3D-реконструкція й CAD поки не підключені.","Experimental workspace: video capture and conceptual object layout. 3D reconstruction and CAD are not connected yet.")}</p>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,360px),1fr))",gap:20}}>
 <section style={{background:"#fff",border:"1px solid #ddd8cf",padding:20,borderRadius:12}}>
 <h2 style={{fontSize:18,fontWeight:500,margin:"0 0 8px"}}>01 / {tr("Исходный материал","Вихідний матеріал","Source material")}</h2>
 <p style={{fontSize:13,opacity:.65,lineHeight:1.5}}>{tr("Запиши видео камерой или выбери файл. Файл остаётся на устройстве — загрузки на сервер нет.","Запиши відео камерою або вибери файл. Файл залишається на пристрої.","Record with your camera or choose a file. Video stays on your device.")}</p>
 <div style={{display:"flex",gap:8,flexWrap:"wrap",margin:"18px 0"}}>
 <button onClick={recording?stop:start} style={btn}>{recording?tr("■ Остановить","■ Зупинити","■ Stop"):tr("● Записать видео","● Записати відео","● Record video")}</button>
 <button onClick={()=>input.current?.click()} style={btn}>{tr("Выбрать видео","Обрати відео","Choose video")}</button>
 <input ref={input} type="file" accept="video/*" style={{display:"none"}} onChange={e=>load(e.target.files?.[0])}/>
 </div>
 {error&&<p role="alert" style={{color:"#a43d2b",fontSize:13}}>{error}</p>}
 <video ref={preview} autoPlay muted playsInline aria-label={tr("Камера во время записи","Камера під час запису","Live camera preview")} style={{display:recording?"block":"none",width:"100%",maxHeight:300,background:"#181818",borderRadius:6}}/>
 {recording&&<p role="status" style={{color:"#9d3327",fontSize:13}}>● REC — {tr("Идёт запись","Триває запис","Recording")}</p>}
 {!recording&&(video?<video controls playsInline src={video} style={{width:"100%",maxHeight:280,background:"#181818",borderRadius:6}}/>:<div style={{height:200,display:"grid",placeItems:"center",background:"#e8e5df",borderRadius:6,color:"#777"}}>{tr("Нет видео","Немає відео","No video yet")}</div>)}
 {fileName&&<p style={{fontSize:12,overflowWrap:"anywhere"}}>{fileName}</p>}
 <div style={{marginTop:16,paddingTop:14,borderTop:"1px solid #e0dbd2"}}>
 <h3 style={{fontSize:14,fontWeight:500,margin:"0 0 8px"}}>{tr("Подготовка к реконструкции","Підготовка до реконструкції","Prepare reconstruction input")}</h3>
 <p style={{fontSize:12,opacity:.65}}>{tr("Извлекает кадры локально на iPad. Для создания 3D потребуется отдельный GPU-сервер.","Витягує кадри локально на iPad. Для 3D потрібен окремий GPU-сервер.","Extracts frames locally. Actual 3D reconstruction requires a separate GPU backend.")}</p>
 <button style={btn} disabled={!video||recording||processing} onClick={extractFrames}>{processing?tr("Обработка…","Обробка…","Processing…"):tr("Подготовить кадры для 3D","Підготувати кадри для 3D","Prepare frames for 3D")}</button>
 {progress&&<p role="status" style={{fontSize:12}}>{progress}</p>}
 {frames.length>0&&<><div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:5,margin:"12px 0"}}>{frames.slice(0,12).map((src,i)=><img key={i} src={src} alt={`Frame ${i+1}`} style={{width:"100%",borderRadius:3}}/>)}</div><p style={{fontSize:12}}>{frames.length} {tr("кадров","кадрів","frames")}</p><button style={btn} onClick={downloadFrames}>{tr("Сохранить кадры JPEG","Зберегти кадри JPEG","Save JPEG frames")}</button></>}
 </div>
 </section>
 <section style={{background:"#fff",border:"1px solid #ddd8cf",padding:20,borderRadius:12}}>
 <h2 style={{fontSize:18,fontWeight:500,margin:"0 0 8px"}}>02 / {tr("Пространственная схема","Просторова схема","Spatial sketch")}</h2>
 <p style={{fontSize:13,opacity:.65,lineHeight:1.5}}>{tr("Перетаскивай объекты на условном плане. Размеры демонстрационные, не получены из видео.","Перетягуй об'єкти на умовному плані. Розміри демонстраційні.","Drag objects on a conceptual floor plan. Dimensions are illustrative.")}</p>
 <svg ref={svg} viewBox="0 0 440 350" style={{width:"100%",background:"#eae7e1",borderRadius:6,touchAction:"none",marginTop:8}} onPointerMove={e=>{if(!drag.current)return;const p=point(e);const d=drag.current;setItems(old=>old.map(i=>i.id===d.id?{...i,x:Math.max(25,Math.min(405-i.w,p.x-d.dx)),y:Math.max(25,Math.min(315-i.h,p.y-d.dy))}:i))}} onPointerUp={()=>drag.current=null} onPointerCancel={()=>drag.current=null}>
 <rect x="25" y="25" width="390" height="290" fill="#faf9f6" stroke="#333" strokeWidth="6"/><path d="M 140 25 H 270" stroke="#8db2bb" strokeWidth="7"/><path d="M 415 220 V 290" stroke="#faf9f6" strokeWidth="9"/><path d="M 415 290 A 70 70 0 0 1 345 220" fill="none" stroke="#b9b1a6" strokeDasharray="4 4"/>
 {items.map(i=><g key={i.id} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);const p=point(e);drag.current={id:i.id,dx:p.x-i.x,dy:p.y-i.y};setSelected(i.id)}} style={{cursor:"grab"}}>{i.photo?<image href={i.photo} x={i.x} y={i.y} width={i.w} height={i.h} preserveAspectRatio="xMidYMid slice"/>:<rect x={i.x} y={i.y} width={i.w} height={i.h} rx="5" fill={i.color}/> }<rect x={i.x} y={i.y} width={i.w} height={i.h} rx="5" fill="none" stroke={selected===i.id?"#3d6d72":"#857e72"} strokeWidth={selected===i.id?3:1}/><text x={i.x+i.w/2} y={i.y+i.h/2+4} fontSize="12" textAnchor="middle" fill="#292822" pointerEvents="none">{i.label}</text></g>)}
 <text x="30" y="338" fontSize="11" fill="#777">CONCEPT / NOT TO SCALE</text>
 </svg>
 <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:12}}>
 <button style={btn} onClick={()=>setItems(a=>[...a,{id:Date.now(),x:140,y:135,w:70,h:45,label:"Object",color:"#a9b9b2"}])}>+ {tr("Объект","Об'єкт","Object")}</button>
 <button style={btn} onClick={()=>{setItems(initial);setSelected(null)}}>↺ {tr("Сброс","Скинути","Reset")}</button>
 <button style={btn} onClick={exportScene}>↓ JSON</button>
 </div>
 {activeItem&&<div style={{marginTop:16,padding:14,border:"1px solid #d8d3c9",borderRadius:8}}>
 <strong style={{fontSize:14}}>{tr("Выбранный объект","Обраний об'єкт","Selected object")}: {activeItem.label}</strong>
 <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginTop:10}}>
 <button style={btn} onClick={()=>photoInput.current?.click()}>{tr("Загрузить фото предмета","Завантажити фото предмета","Attach object photo")}</button>
 <input ref={photoInput} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{attachPhoto(e.target.files?.[0]);e.target.value=""}}/>
 {activeItem.photo&&<button style={btn} onClick={()=>setItems(old=>old.map(i=>i.id===selected?{...i,photo:undefined}:i))}>{tr("Удалить фото","Видалити фото","Remove photo")}</button>}
 </div>
 <p style={{fontSize:12,opacity:.6}}>{tr("Фото связано с объектом. Перемести его на плане — изображение переместится и в эскизе сцены.","Фото пов'язане з об'єктом. Переміщення на плані змінює його положення в ескізі сцени.","Photo is linked to this object. Dragging it on the plan also moves it in the scene sketch.")}</p>
 </div>}
 <div style={{marginTop:18}}>
 <h3 style={{fontSize:14,fontWeight:500}}>{tr("Пространственный эскиз · фото-плоскости","Просторовий ескіз · фото-площини","Spatial sketch · photo planes")}</h3>
 <svg viewBox="0 0 440 310" style={{width:"100%",background:"#e8e6e0",borderRadius:8}}>
 <defs><linearGradient id="sp-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#faf9f6"/><stop offset="1" stopColor="#d6d0c7"/></linearGradient></defs>
 <polygon points="30,75 220,15 410,75 220,145" fill="url(#sp-wall)" stroke="#b9b2a7"/>
 <polygon points="30,75 220,145 220,285 30,205" fill="#e2ddd5" stroke="#b9b2a7"/>
 <polygon points="410,75 220,145 220,285 410,205" fill="#f0ede7" stroke="#b9b2a7"/>
 <polygon points="30,205 220,285 410,205 220,130" fill="#d0c7b9" stroke="#aaa092"/>
 {items.map(i=>{const px=70+(i.x-25)/390*300,py=125+(i.y-25)/290*115;const depth=(i.y-25)/290;const width=Math.max(24,i.w*.5*(.75+depth*.4));const height=Math.max(28,i.h*.75);return <g key={i.id} onClick={()=>setSelected(i.id)} style={{cursor:"pointer"}}><ellipse cx={px} cy={py+3} rx={width*.48} ry="8" fill="#70685d" opacity=".25"/>{i.photo?<><image href={i.photo} x={px-width/2} y={py-height} width={width} height={height} preserveAspectRatio="xMidYMid meet"/><rect x={px-width/2} y={py-height} width={width} height={height} fill="none" stroke={selected===i.id?"#3d6d72":"#777"} strokeWidth="2"/></>:<rect x={px-width/2} y={py-height*.65} width={width} height={height*.65} rx="3" fill={i.color} stroke={selected===i.id?"#3d6d72":"#888"} strokeWidth="2"/>}<text x={px} y={py+17} fontSize="10" textAnchor="middle" fill="#403d38">{i.label}</text></g>})}
 </svg>
 <p style={{fontSize:12,opacity:.6}}>{tr("Это условная перспективная визуализация, не геометрия помещения. Фото показано плоскостью; Gaussian Splatting пока работает отдельно.","Це умовна перспектива, не геометрія приміщення. Фото — площина; Gaussian Splatting працює окремо.","Illustrative perspective, not measured room geometry. Photos are planes; the Gaussian Splat viewer is separate.")}</p>
 </div>
 </section></div>
 <section style={{background:"#fff",border:"1px solid #ddd8cf",padding:20,borderRadius:12,marginTop:20}}>
 <h2 style={{fontSize:18,fontWeight:500,margin:"0 0 8px"}}>03 / Gaussian Splatting · 3D Viewer</h2>
 <p style={{fontSize:13,opacity:.65,lineHeight:1.5}}>{tr("Реальная 3D-сцена: поверни демонстрационный объект пальцем или открой свой файл .spz, .ply, .splat. Это просмотр готовой реконструкции, а не преобразование записанного видео.","Справжня 3D-сцена: обертай демонстраційний об'єкт або відкрий свій файл. Це перегляд готової реконструкції, а не обробка відео.","Real Gaussian Splat viewer: rotate the demo or load a .spz, .ply, .splat file. This does not convert the captured video.")}</p>
 <iframe title="Gaussian Splat 3D viewer" src="/spatial-splat-viewer.html" loading="lazy" allow="fullscreen" style={{width:"100%",height:"min(65vh,540px)",minHeight:340,border:0,borderRadius:8,background:"#e9e7e2"}}/>
 <p style={{fontSize:12,opacity:.55}}>{tr("Демо-сцена загружается с внешнего сервера Spark. Локальные файлы остаются в браузере.","Демо-сцена завантажується із зовнішнього сервера Spark.","Demo asset loads from Spark's server. Your local files stay in the browser.")}</p>
 </section>
 <p style={{fontSize:12,opacity:.55,marginTop:24}}>{tr("Следующий этап: подключение просмотра Gaussian Splatting, затем отдельного движка реконструкции и геометрического экспорта.","Наступний етап: перегляд Gaussian Splatting, реконструкція та геометричний експорт.","Next: Gaussian Splatting viewer, reconstruction backend and geometric export.")}</p>
 </div>;
}
const btn:React.CSSProperties={border:"1px solid #bdb7ad",borderRadius:6,padding:"10px 13px",background:"#f9f8f5",color:"#252622",fontSize:13,cursor:"pointer"};

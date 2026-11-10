import { useRef, useState } from "react";
import { useLocale } from "@/i18n/useLocale";

type Item = { id: number; x: number; y: number; w: number; h: number; label: string; color: string };
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
 const [error,setError] = useState("");
 const input = useRef<HTMLInputElement>(null);
 const recorder = useRef<MediaRecorder|null>(null);
 const stream = useRef<MediaStream|null>(null);
 const parts = useRef<Blob[]>([]);
 const drag = useRef<{id:number;dx:number;dy:number}|null>(null);
 const svg = useRef<SVGSVGElement>(null);
 const stop = () => {recorder.current?.state==="recording" && recorder.current.stop(); stream.current?.getTracks().forEach(t=>t.stop());setRecording(false);};
 const start = async () => {
   setError("");
   try {
     if(!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error("Camera recording is unavailable in this browser");
     const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"},audio:false});stream.current=s;
     const mime=["video/mp4","video/webm;codecs=h264","video/webm"].find(x=>MediaRecorder.isTypeSupported(x));
     const r=new MediaRecorder(s,mime?{mimeType:mime}:undefined);recorder.current=r;parts.current=[];
     r.ondataavailable=e=>{if(e.data.size)parts.current.push(e.data)};
     r.onstop=()=>{const blob=new Blob(parts.current,{type:r.mimeType||"video/webm"});setVideo(old=>{if(old)URL.revokeObjectURL(old);return URL.createObjectURL(blob)});setFileName("camera-capture");s.getTracks().forEach(t=>t.stop())};
     r.start();setRecording(true);
   } catch(e){setError(e instanceof Error?e.message:String(e))}
 };
 const load=(f?:File)=>{if(!f)return;setError("");setVideo(old=>{if(old)URL.revokeObjectURL(old);return URL.createObjectURL(f)});setFileName(f.name)};
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
 {video?<video controls playsInline src={video} style={{width:"100%",maxHeight:280,background:"#181818",borderRadius:6}}/>:<div style={{height:200,display:"grid",placeItems:"center",background:"#e8e5df",borderRadius:6,color:"#777"}}>{tr("Нет видео","Немає відео","No video yet")}</div>}
 {fileName&&<p style={{fontSize:12,overflowWrap:"anywhere"}}>{fileName}</p>}
 </section>
 <section style={{background:"#fff",border:"1px solid #ddd8cf",padding:20,borderRadius:12}}>
 <h2 style={{fontSize:18,fontWeight:500,margin:"0 0 8px"}}>02 / {tr("Пространственная схема","Просторова схема","Spatial sketch")}</h2>
 <p style={{fontSize:13,opacity:.65,lineHeight:1.5}}>{tr("Перетаскивай объекты на условном плане. Размеры демонстрационные, не получены из видео.","Перетягуй об'єкти на умовному плані. Розміри демонстраційні.","Drag objects on a conceptual floor plan. Dimensions are illustrative.")}</p>
 <svg ref={svg} viewBox="0 0 440 350" style={{width:"100%",background:"#eae7e1",borderRadius:6,touchAction:"none",marginTop:8}} onPointerMove={e=>{if(!drag.current)return;const p=point(e);const d=drag.current;setItems(old=>old.map(i=>i.id===d.id?{...i,x:Math.max(25,Math.min(405-i.w,p.x-d.dx)),y:Math.max(25,Math.min(315-i.h,p.y-d.dy))}:i))}} onPointerUp={()=>drag.current=null} onPointerCancel={()=>drag.current=null}>
 <rect x="25" y="25" width="390" height="290" fill="#faf9f6" stroke="#333" strokeWidth="6"/><path d="M 140 25 H 270" stroke="#8db2bb" strokeWidth="7"/><path d="M 415 220 V 290" stroke="#faf9f6" strokeWidth="9"/><path d="M 415 290 A 70 70 0 0 1 345 220" fill="none" stroke="#b9b1a6" strokeDasharray="4 4"/>
 {items.map(i=><g key={i.id} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);const p=point(e);drag.current={id:i.id,dx:p.x-i.x,dy:p.y-i.y};setSelected(i.id)}} style={{cursor:"grab"}}><rect x={i.x} y={i.y} width={i.w} height={i.h} rx="5" fill={i.color} stroke={selected===i.id?"#3d6d72":"#857e72"} strokeWidth={selected===i.id?3:1}/><text x={i.x+i.w/2} y={i.y+i.h/2+4} fontSize="12" textAnchor="middle" fill="#292822" pointerEvents="none">{i.label}</text></g>)}
 <text x="30" y="338" fontSize="11" fill="#777">CONCEPT / NOT TO SCALE</text>
 </svg>
 <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:12}}>
 <button style={btn} onClick={()=>setItems(a=>[...a,{id:Date.now(),x:140,y:135,w:70,h:45,label:"Object",color:"#a9b9b2"}])}>+ {tr("Объект","Об'єкт","Object")}</button>
 <button style={btn} onClick={()=>setItems(initial)}>↺ {tr("Сброс","Скинути","Reset")}</button>
 <button style={btn} onClick={exportScene}>↓ JSON</button>
 </div>
 </section></div>
 <p style={{fontSize:12,opacity:.55,marginTop:24}}>{tr("Следующий этап: подключение просмотра Gaussian Splatting, затем отдельного движка реконструкции и геометрического экспорта.","Наступний етап: перегляд Gaussian Splatting, реконструкція та геометричний експорт.","Next: Gaussian Splatting viewer, reconstruction backend and geometric export.")}</p>
 </div>;
}
const btn:React.CSSProperties={border:"1px solid #bdb7ad",borderRadius:6,padding:"10px 13px",background:"#f9f8f5",color:"#252622",fontSize:13,cursor:"pointer"};

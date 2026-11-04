import { createElement, useEffect, useMemo, useRef, useState, type ChangeEvent, type PointerEvent, type WheelEvent } from "react";
import { RotateCcw, Upload, X } from "lucide-react";

type P3 = { x:number; y:number; z:number };
type P2 = { x:number; y:number; depth:number };
type Surface = { key:string; points:string; depth:number; alpha:number };
type Rib = { key:string; d:string; depth:number; side:number };
const stations = [
  { z: 1.08, y: 0.48 },
  { z: 0.74, y: 0.56 },
  { z: 0.18, y: 0.61 },
  { z: -0.30, y: 0.88 },
  { z: -0.61, y: 1.35 },
  { z: -0.76, y: 1.74 },
];
function pos(x:number, i:number):P3 {
  const s = stations[i];
  // Fabric curves gently inward; it is a spatial sketch, not an engineered surface.
  return { x, y:s.y - 0.12 * (1 - Math.pow(Math.abs(x)/0.72, 2)), z:s.z };
}
function viewerGeometry(yaw:number,pitch:number,zoom:number) {
  const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
  const project=(p:P3):P2=>{
    const x=p.x*cy+p.z*sy;
    const z=-p.x*sy+p.z*cy;
    const y=(p.y-0.80)*cp-z*sp;
    const depth=(p.y-0.80)*sp+z*cp;
    const perspective=(660*zoom)/(4.30-depth);
    return {x:300+x*perspective,y:315-y*perspective,depth};
  };
  const fmt=(p:P2)=>p.x.toFixed(1)+","+p.y.toFixed(1);
  const surfaces:Surface[]=[];
  const columns=12;
  for(let i=0;i<stations.length-1;i++)for(let j=0;j<columns;j++){
    const x0=-0.72+j*(1.44/columns),x1=-0.72+(j+1)*(1.44/columns);
    const points=[pos(x0,i),pos(x1,i),pos(x1,i+1),pos(x0,i+1)].map(project);
    const depth=points.reduce((acc,p)=>acc+p.depth,0)/points.length;
    surfaces.push({key:i+"-"+j,points:points.map(fmt).join(" "),depth,alpha:0.42+0.16*(i/5)+0.12*(j/columns)});
  }
  const rails:Rib[]=[-0.79,0.79].map((x,index)=>{
    const p=stations.map(s=>project({x,y:s.y,z:s.z}));
    return {key:"rail-"+index,d:p.map((q,i)=>(i===0?"M":"L")+fmt(q)).join(" "),depth:p.reduce((s,q)=>s+q.depth,0)/p.length,side:index};
  });
  const legs=[-0.79,0.79].flatMap((x,index)=>[
    { key:"front-"+index, from:{x,y:0.48,z:1.08},to:{x:x*1.04,y:0.08,z:1.17}},
    { key:"back-"+index, from:{x,y:1.03,z:-0.39},to:{x:x*1.04,y:0.08,z:-0.86}},
  ]).map(a=>{const p1=project(a.from),p2=project(a.to);return {key:a.key,d:"M"+fmt(p1)+"L"+fmt(p2),depth:(p1.depth+p2.depth)/2}});
  const clothLines=stations.map((_,i)=>[-0.72,-0.36,0,0.36,0.72].map(x=>project(pos(x,i))));
  const foot=project({x:0,y:0,z:0});
  return {surfaces:surfaces.sort((a,b)=>a.depth-b.depth),rails,legs,clothLines,foot};
}

export default function EggYolkViewer({ onFileChange }: { onFileChange?: (fileName:string|null)=>void }){
  const [yaw,setYaw]=useState(-0.52);
  const [pitch,setPitch]=useState(-0.16);
  const [zoom,setZoom]=useState(1);
  const [fileUrl,setFileUrl]=useState<string|null>(null);
  const [fileName,setFileName]=useState("");
  const [fileError,setFileError]=useState("");
  const [viewerReady,setViewerReady]=useState(false);
  const pointer=useRef<{x:number;y:number}|null>(null);
  const fileRef=useRef<string|null>(null);
  const model=useMemo(()=>viewerGeometry(yaw,pitch,zoom),[yaw,pitch,zoom]);
  useEffect(()=>()=>{if(fileRef.current)URL.revokeObjectURL(fileRef.current)},[]);
  useEffect(()=>{
    if(!fileUrl)return;
    if(window.customElements?.get("model-viewer")){setViewerReady(true);return;}
    let script=document.querySelector<HTMLScriptElement>("#egg-yolk-model-viewer");
    if(!script){
      script=document.createElement("script");
      script.id="egg-yolk-model-viewer";
      script.type="module";
      script.src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.0.1/model-viewer.min.js";
      document.head.appendChild(script);
    }
    let active=true;
    const fail=()=>{if(active)setFileError("Не удалось загрузить 3D-просмотрщик.")};
    script.addEventListener("error",fail);
    window.customElements.whenDefined("model-viewer").then(()=>{if(active)setViewerReady(true)});
    return()=>{active=false;script?.removeEventListener("error",fail)};
  },[fileUrl]);
  function dragStart(e:PointerEvent<SVGSVGElement>){
    pointer.current={x:e.clientX,y:e.clientY};
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function dragMove(e:PointerEvent<SVGSVGElement>){
    if(!pointer.current)return;
    const dx=e.clientX-pointer.current.x,dy=e.clientY-pointer.current.y;
    pointer.current={x:e.clientX,y:e.clientY};
    setYaw(v=>v+dx*0.012);
    setPitch(v=>Math.max(-0.7,Math.min(0.7,v+dy*0.006)));
  }
  function dragStop(){pointer.current=null;}
  function wheel(e:WheelEvent<SVGSVGElement>){setZoom(v=>Math.max(0.68,Math.min(1.7,v+(e.deltaY<0?0.07:-0.07))))}
  async function choose(e:ChangeEvent<HTMLInputElement>){
    const file=e.currentTarget.files?.[0];
    e.currentTarget.value="";
    if(!file)return;
    const magic=file.size>=4?new TextDecoder().decode(await file.slice(0,4).arrayBuffer()):"";
    if(!/\.glb$/i.test(file.name)||file.size>40*1024*1024||magic!=="glTF"){
      setFileError("Нужен файл GLB до 40 МБ. Файл не загружен.");return;
    }
    if(fileRef.current)URL.revokeObjectURL(fileRef.current);
    fileRef.current=URL.createObjectURL(file);
    setFileUrl(fileRef.current);setFileName(file.name);setViewerReady(Boolean(window.customElements?.get("model-viewer")));
    setFileError("");onFileChange?.(file.name);
  }
  function remove(){
    if(fileRef.current)URL.revokeObjectURL(fileRef.current);
    fileRef.current=null;setFileUrl(null);setFileName("");setFileError("");onFileChange?.(null);
  }
  return <div className="relative flex h-full min-h-0 w-full flex-col items-center justify-center" data-testid="yolk-viewer">
    <div className="relative aspect-square w-full max-w-[650px] min-h-0">
      {!fileUrl ? <svg viewBox="0 0 600 600" role="img" aria-label="Поворотная пространственная схема кресла для демонстрации вкладки Желтка"
        className="h-full w-full cursor-grab select-none touch-none active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        tabIndex={0} onPointerDown={dragStart} onPointerMove={dragMove} onPointerUp={dragStop}
        onPointerCancel={dragStop} onLostPointerCapture={dragStop} onWheel={wheel}
        onKeyDown={e=>{if(e.key==="ArrowLeft")setYaw(v=>v-0.14);if(e.key==="ArrowRight")setYaw(v=>v+0.14);if(e.key==="ArrowUp")setPitch(v=>Math.max(-0.7,v-0.12));if(e.key==="ArrowDown")setPitch(v=>Math.min(0.7,v+0.12))}}>
        <defs>
          <linearGradient id="egg-yolk-fabric" x1="0%" y1="0%" x2="100%" y2="80%">
            <stop offset="0%" stopColor="#f8edcf"/><stop offset="50%" stopColor="#dfd1ad"/><stop offset="100%" stopColor="#ae9778"/>
          </linearGradient>
          <linearGradient id="egg-yolk-wood" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#b99570"/><stop offset="50%" stopColor="#816549"/><stop offset="100%" stopColor="#d2b48c"/>
          </linearGradient>
          <radialGradient id="egg-yolk-halo"><stop offset="0" stopColor="#bfa27c" stopOpacity=".12"/><stop offset="1" stopColor="#bfa27c" stopOpacity="0"/></radialGradient>
        </defs>
        <circle cx="300" cy="310" r="225" fill="url(#egg-yolk-halo)"/>
        <ellipse cx="300" cy="472" rx="125" ry="21" fill="#7a6c59" opacity=".075" />
        {model.legs.map(l=><path key={l.key} d={l.d} fill="none" stroke="#7a5d41" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" opacity=".85"/>)}
        {model.surfaces.map(s=><polygon key={s.key} points={s.points} fill="url(#egg-yolk-fabric)" opacity={s.alpha} stroke="#a28f73" strokeOpacity=".22" strokeWidth=".55"/>)}
        {model.clothLines.map((line,i)=><polyline key={i} points={line.map(p=>p.x.toFixed(1)+","+p.y.toFixed(1)).join(" ")} fill="none" stroke="#f6f0df" strokeOpacity=".3" strokeWidth="1"/>)}
        {model.rails.map(rail=><g key={rail.key}>
          <path d={rail.d} fill="none" stroke="#5e4935" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" opacity=".8" />
          <path d={rail.d} fill="none" stroke="url(#egg-yolk-wood)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
          <path d={rail.d} fill="none" stroke="#eed9b6" strokeOpacity=".42" strokeWidth="2" strokeLinecap="round" />
        </g>)}
      </svg> : viewerReady ? createElement("model-viewer",{
        src:fileUrl,alt:"Локальная 3D-модель "+fileName,
        "camera-controls":true,"touch-action":"pan-y",
        "shadow-intensity":"0.65", "exposure":"1.05",
        style:{height:"100%",width:"100%",background:"transparent"}
      }) : <div className="grid h-full place-items-center text-xs text-foreground/60">Подключаем 3D-просмотрщик…</div>}
    </div>
    <div className="absolute inset-x-3 bottom-2 z-10 flex flex-wrap items-center justify-center gap-2 text-[11px]">
      {!fileUrl&&<button type="button" onClick={()=>{setYaw(-0.52);setPitch(-0.16);setZoom(1)}} className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-background/80 px-3 py-2 text-foreground/65 backdrop-blur-sm hover:border-foreground/40"><RotateCcw size={13}/> Сбросить ракурс</button>}
      {fileUrl&&<button type="button" onClick={remove} className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-background/80 px-3 py-2 text-foreground/65"><X size={13}/> Убрать GLB</button>}
      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-foreground/15 bg-background/80 px-3 py-2 text-foreground/65 backdrop-blur-sm hover:border-foreground/40">
        <Upload size={13}/> {fileUrl?"Заменить GLB":"Открыть GLB"}
        <input aria-label="Открыть свою 3D модель GLB" type="file" accept=".glb,model/gltf-binary" onChange={choose} className="sr-only"/>
      </label>
    </div>
    {fileError&&<p role="alert" className="absolute bottom-12 left-5 right-5 rounded bg-background/95 p-2 text-center text-xs text-red-600">{fileError}</p>}
    <span className="sr-only">Поверните схему мышью, пальцем или стрелками клавиатуры. Колесо меняет масштаб. Для настоящей 3D-модели загрузите GLB.</span>
  </div>;
}

import { createElement, useEffect, useMemo, useRef, useState, type ChangeEvent, type PointerEvent, type WheelEvent } from "react";
import { Download, RotateCcw, Upload, X } from "lucide-react";
import { buildSpatialSketch, createSpatialGlb, type SpatialStage, type SpatialVariant, type Vec3 } from "../../lib/eggSpatialGenerator";
import type {EggVisualSnapshot} from "../../lib/eggVisualHistory";

type Projection={x:number;y:number;depth:number};
const STAGES:Array<{id:SpatialStage;label:string}>= [
  {id:"gesture",label:"Линии"},
  {id:"frame",label:"Каркас"},
  {id:"volume",label:"Объём"},
];
const VARIANTS:Array<{id:SpatialVariant;label:string}>= [
  {id:"A",label:"А · Плавный"},
  {id:"B",label:"Б · Наклон"},
  {id:"C",label:"В · Раскрытый"},
];
function stageFromLevel(level:number):SpatialStage{
  return level<=1?"gesture":level===2?"frame":"volume";
}
function projectPoint(p:Vec3,yaw:number,pitch:number,zoom:number):Projection{
  const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
  const x=p.x*cy+p.z*sy;
  const z=-p.x*sy+p.z*cy;
  const y=(p.y-.80)*cp-z*sp;
  const depth=(p.y-.80)*sp+z*cp;
  const factor=(810*zoom)/(4.30-depth);
  return {x:300+x*factor,y:315-y*factor,depth};
}
export default function EggYolkViewer({
  onFileChange, onSketchChange, level=1, iteration=1, projectId, visualVersion=null, minimalControls=false
}:{
  onFileChange?:(fileName:string|null)=>void;
  /** Existing Author-linked source; never inferred from parametric local study. */
  visualVersion?:EggVisualSnapshot|null;
  onSketchChange?:(value:{stage:SpatialStage;variant:SpatialVariant;iteration:number})=>void;
  level?:number;
  iteration?:number;
  projectId?:string;
  minimalControls?:boolean;
}){
  const [stage,setStage]=useState<SpatialStage>(()=>minimalControls?"volume":stageFromLevel(level));
  const [variant,setVariant]=useState<SpatialVariant>("A");
  const [yaw,setYaw]=useState(-.52);
  const [pitch,setPitch]=useState(-.16);
  const [zoom,setZoom]=useState(1);
  const [fileUrl,setFileUrl]=useState<string|null>(null);
  const [fileName,setFileName]=useState("");
  const [fileError,setFileError]=useState("");
  const [viewerReady,setViewerReady]=useState(false);
  const [showSketch,setShowSketch]=useState(false);
  const showingBound=!!visualVersion&&!showSketch;
  const directModel=showingBound&&visualVersion?.media==="model"&&
    visualVersion.sourceKind==="concept"&&
    /\.(?:glb|gltf)$/i.test(new URL(visualVersion.url).pathname)
    ?visualVersion.url:null;
  const pointers=useRef(new Map<number,{x:number;y:number}>());
  const pinchDistance=useRef<number|null>(null);
  const clampZoom=(value:number)=>Math.max(.5,Math.min(2.5,value));
  const fileRef=useRef<string|null>(null);
  const sketch=useMemo(()=>buildSpatialSketch(stage,variant,iteration),[stage,variant,iteration]);
  useEffect(()=>{onSketchChange?.({stage,variant,iteration:sketch.iteration});},[stage,variant,sketch.iteration,onSketchChange]);
  const projected=useMemo(()=>{
    const project=(p:Vec3)=>projectPoint(p,yaw,pitch,zoom);
    const quads=sketch.quads.map(q=>{
      const pts=q.corners.map(project);
      return {id:q.id,pts,depth:pts.reduce((n,p)=>n+p.depth,0)/pts.length};
    }).sort((a,b)=>a.depth-b.depth);
    const paths=sketch.paths.map(p=>{
      const pts=p.points.map(project);
      return {id:p.id,pts,depth:pts.reduce((n,q)=>n+q.depth,0)/pts.length,
        material:p.material, radius:p.radius};
    }).sort((a,b)=>a.depth-b.depth);
    return {quads,paths};
  },[sketch,yaw,pitch,zoom]);

  useEffect(()=>{setStage(minimalControls?"volume":stageFromLevel(level));},[level,minimalControls]);
  useEffect(()=>{setShowSketch(false);},[visualVersion?.id]);
  useEffect(()=>()=>{if(fileRef.current)URL.revokeObjectURL(fileRef.current);},[]);
  useEffect(()=>{
    if(!fileUrl&&!directModel)return;
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
  },[fileUrl,directModel]);
  function dragStart(e:PointerEvent<SVGSVGElement>){
    pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.current.size===2){
      const [a,b]=[...pointers.current.values()];
      pinchDistance.current=Math.hypot(a.x-b.x,a.y-b.y);
    }
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function dragMove(e:PointerEvent<SVGSVGElement>){
    const previous=pointers.current.get(e.pointerId);
    if(!previous)return;
    pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.current.size>=2){
      const [a,b]=[...pointers.current.values()];
      const distance=Math.hypot(a.x-b.x,a.y-b.y);
      if(pinchDistance.current!==null&&pinchDistance.current>0)
        setZoom(value=>clampZoom(value*distance/pinchDistance.current!));
      pinchDistance.current=distance;
      return;
    }
    const dx=e.clientX-previous.x,dy=e.clientY-previous.y;
    setYaw(value=>value+dx*.012);
    setPitch(value=>Math.max(-.7,Math.min(.7,value+dy*.006)));
  }
  function dragStop(e:PointerEvent<SVGSVGElement>){
    pointers.current.delete(e.pointerId);
    pinchDistance.current=null;
  }
  function wheel(e:WheelEvent<SVGSVGElement>){
    setZoom(value=>clampZoom(value*Math.exp(-e.deltaY*.001)));
  }
  async function choose(e:ChangeEvent<HTMLInputElement>){
    const file=e.currentTarget.files?.[0];e.currentTarget.value="";
    if(!file)return;
    const magic=file.size>=4?new TextDecoder().decode(await file.slice(0,4).arrayBuffer()):"";
    if(!/\.glb$/i.test(file.name)||file.size>40*1024*1024||magic!=="glTF"){
      setFileError("Нужен файл GLB до 40 МБ. Файл не загружен.");return;
    }
    if(fileRef.current)URL.revokeObjectURL(fileRef.current);
    fileRef.current=URL.createObjectURL(file);
    setFileUrl(fileRef.current);setFileName(file.name);
    setShowSketch(true);
    setViewerReady(Boolean(window.customElements?.get("model-viewer")));
    setFileError("");onFileChange?.(file.name);
  }
  function remove(){
    if(fileRef.current)URL.revokeObjectURL(fileRef.current);
    fileRef.current=null;setFileUrl(null);setFileName("");setFileError("");onFileChange?.(null);
  }
  function download(){
    try{
      const bytes=createSpatialGlb(sketch);
      const blob=new Blob([new Uint8Array(bytes)],{type:"model/gltf-binary"});
      const uri=URL.createObjectURL(blob);
      const anchor=document.createElement("a");
      const safeId=(projectId??"demo").slice(0,12).replace(/[^a-zA-Z0-9-]/g,"");
      anchor.href=uri;
      anchor.download="EGG-"+safeId+"-v"+sketch.iteration+"-"+variant+"-"+stage+".glb";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(()=>URL.revokeObjectURL(uri),60000);
      setFileError("");
    }catch(error){
      setFileError(error instanceof Error?error.message:"Не удалось сформировать GLB.");
    }
  }
  const label=STAGES.find(s=>s.id===stage)?.label??"Линии";
  const pts=(points:Projection[])=>points.map(p=>p.x.toFixed(1)+","+p.y.toFixed(1)).join(" ");
  return <div className="relative flex h-full min-h-0 w-full flex-col items-center justify-center" data-testid="yolk-viewer">
    {!minimalControls&&!showingBound&&<div className="absolute inset-x-0 top-[4%] z-20 flex flex-wrap justify-center gap-2 px-2" role="group" aria-label="Уровень пространственной проработки">
      {STAGES.map(s=><button key={s.id} type="button" onClick={()=>setStage(s.id)} aria-pressed={stage===s.id}
        data-testid={"yolk-stage-"+s.id}
        className={"min-h-8 rounded-full border px-3 py-1 text-[11px] font-light backdrop-blur-sm transition-colors "+
          (stage===s.id?"border-foreground/55 bg-background/95 text-foreground":"border-foreground/15 bg-background/70 text-foreground/55 hover:border-foreground/40")}>
        {s.label}</button>)}
    </div>}
    <div className="relative aspect-square w-full max-w-[650px] min-h-0">
      {showingBound ? (
        <div className="relative flex h-full w-full flex-col items-center justify-center"
          data-testid="yolk-bound-visual">
          {visualVersion!.media==="image"&&visualVersion!.presentation==="inline_image"
            ?<img src={visualVersion!.url} alt={visualVersion!.title+" — источник из журнала визуальных версий"}
              loading="lazy" referrerPolicy="no-referrer"
              className="max-h-[82%] max-w-[85%] object-contain"
              data-testid="yolk-bound-image"/>
            :directModel&&viewerReady
              ?createElement("model-viewer",{
                src:directModel,alt:"Авторский источник 3D · "+visualVersion!.title,
                "camera-controls":true,"touch-action":"pan-y",
                "shadow-intensity":"0.55",
                style:{width:"100%",height:"84%",background:"transparent"},
                "data-testid":"yolk-bound-3d",
              })
              :<div className="max-w-[75%] rounded-xl border border-dashed border-foreground/25 bg-background/75 p-5 text-center text-[12px] text-foreground/70"
                data-testid="yolk-bound-external">
                {directModel?"Подключение 3D-просмотрщика…":
                  "Внешняя 3D-модель не встроена. Файл открывается по подтверждённой ссылке."}
              </div>}
          <div className="absolute bottom-[17%] left-3 right-3 flex justify-center">
            <a href={visualVersion!.url} target="_blank" rel="noopener noreferrer"
              className="rounded-full border border-foreground/35 bg-background/85 px-3 py-2 text-[11px] underline underline-offset-2">
              Открыть исходный материал
            </a>
          </div>
        </div>
      ) : !fileUrl?<svg viewBox="0 0 600 600" role="img"
        aria-label={"Поворотный пространственный эскиз кресла: "+label+", вариант "+variant+"; не утверждённый объект"}
        className="h-full w-full cursor-grab select-none touch-none active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        tabIndex={0} onPointerDown={dragStart} onPointerMove={dragMove} onPointerUp={dragStop}
        onPointerCancel={dragStop} onLostPointerCapture={dragStop} onWheel={wheel}
        onKeyDown={e=>{
          if(e.key==="ArrowLeft"){e.preventDefault();setYaw(v=>v-.14);}
          if(e.key==="ArrowRight"){e.preventDefault();setYaw(v=>v+.14);}
          if(e.key==="ArrowUp"){e.preventDefault();setPitch(v=>Math.max(-.7,v-.12));}
          if(e.key==="ArrowDown"){e.preventDefault();setPitch(v=>Math.min(.7,v+.12));}
        }}>
        <defs>
          <linearGradient id="egg-generated-fabric" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e8dcc4"/><stop offset="100%" stopColor="#b9a588"/>
          </linearGradient>
        </defs>
        {projected.quads.map(q=><polygon key={q.id} points={pts(q.pts)}
          fill="url(#egg-generated-fabric)" opacity=".60" stroke="#b8a88e" strokeWidth=".3" strokeOpacity=".6"/>)}
        {projected.paths.map(path=><g key={path.id}>
          <polyline points={pts(path.pts)} fill="none"
            stroke={path.material==="frame"?"#8a7057":"#766b5e"}
            strokeWidth={path.material==="frame"?Math.max(4,path.radius*260):1.8}
            strokeOpacity={path.material==="frame"?.83:.78}
            strokeLinejoin="round" strokeLinecap="round"/>
          {path.material==="frame"&&<polyline points={pts(path.pts)} fill="none"
            stroke="#d7bd98" strokeWidth="1.2" opacity=".45" strokeLinecap="round"/>}
        </g>)}
      </svg>:viewerReady?createElement("model-viewer",{
        src:fileUrl,alt:"Локальная 3D-модель "+fileName,
        "camera-controls":true,"touch-action":"pan-y",
        "shadow-intensity":"0.65","exposure":"1.05",
        style:{height:"100%",width:"100%",background:"transparent"}
      }):<div className="grid h-full place-items-center text-xs text-foreground/60">Подключаем 3D-просмотрщик…</div>}
    </div>
    {!minimalControls&&!showingBound&&<div className="absolute inset-x-0 bottom-[12%] z-20 flex flex-wrap justify-center gap-1.5 px-2" role="group" aria-label="Линии формообразования">
      {VARIANTS.map(v=><button type="button" key={v.id} onClick={()=>setVariant(v.id)}
        aria-pressed={variant===v.id} data-testid={"yolk-variant-"+v.id}
        className={"min-h-8 rounded-full border px-2.5 py-1 text-[10px] font-light backdrop-blur-sm "+
          (variant===v.id?"border-foreground/50 bg-background/95 text-foreground":"border-foreground/15 bg-background/70 text-foreground/55 hover:border-foreground/40")}>
        {v.label}</button>)}
    </div>}
    <div className={(minimalControls?"hidden":"flex")+" absolute inset-x-2 bottom-[2%] z-20 flex flex-wrap items-center justify-center gap-2 text-[11px]"}>
      {visualVersion&&<button type="button" onClick={()=>setShowSketch(v=>!v)}
        data-testid="yolk-visual-mode"
        className="rounded-full border border-foreground/35 bg-background/95 px-3 py-1.5 text-[11px]">
        {showingBound?"Исследовательский эскиз":"Версия из истории"}
      </button>}
      {!showingBound&&!fileUrl&&<button type="button" onClick={()=>{setYaw(-.52);setPitch(-.16);setZoom(1);}}
        className="inline-flex items-center gap-1 border-b border-foreground/25 pb-1 text-foreground/65 hover:text-foreground">
        <RotateCcw size={12}/> Ракурс</button>}
      {!showingBound&&!fileUrl&&<button type="button" data-testid="yolk-generate-glb" onClick={download}
        className="inline-flex items-center gap-1 border-b border-foreground/35 pb-1 text-foreground/85 hover:text-foreground">
        <Download size={13}/> Сохранить GLB</button>}
      {!showingBound&&fileUrl&&<button type="button" onClick={remove} className="inline-flex items-center gap-1 border-b border-foreground/25 pb-1 text-foreground/70">
        <X size={12}/> Убрать GLB</button>}
      {!showingBound&&<label className="inline-flex cursor-pointer items-center gap-1 border-b border-foreground/25 pb-1 text-foreground/65 hover:text-foreground">
        <Upload size={12}/> {fileUrl?"Заменить GLB":"Открыть GLB"}
        <input aria-label="Открыть свою 3D модель GLB" type="file" accept=".glb,model/gltf-binary" onChange={choose} className="sr-only"/>
      </label>}
    </div>
    {fileError&&<p role="alert" className="absolute bottom-[22%] left-5 right-5 z-30 rounded bg-background/95 p-2 text-center text-xs text-red-600">{fileError}</p>}
    <span className="sr-only">Три режима: линии, каркас, объём. Три альтернативные пространственные трактовки исходной идеи. Вращайте одним пальцем, приближайте и отдаляйте двумя пальцами или колесом мыши. Сохранение GLB выгружает геометрию локально, без утверждения и отправки на сервер.</span>
  </div>;
}

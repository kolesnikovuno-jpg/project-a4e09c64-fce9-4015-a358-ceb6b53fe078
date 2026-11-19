import {useEffect,useState,type ReactNode} from "react";
import {createClient} from "@supabase/supabase-js";
import {readEggIdeaVisualPin,type EggIdeaVisualPin} from "../../lib/eggIdeaVisualPin";

type Sketch={id:string;imageUrl:string;stylePreset?:string|null;createdAt:string};
type ViewMode="image"|"form"|"compare";

/** A read-only visual reference layer. Does not modify the 3D engine, EGG
 * project document, level, DNA, or sphere results. Signed links are refreshed
 * from EGG storage after authorization and never persisted in the browser.
 */
export default function EggYolkIdeaVisual({projectId,synthesisId=null,children}:{
 projectId:string|null;synthesisId?:string|null;children:ReactNode;
}){
 const [pin,setPin]=useState<EggIdeaVisualPin|null>(null);
 const [sketch,setSketch]=useState<Sketch|null>(null);
 const [mode,setMode]=useState<ViewMode>("image");
 const [message,setMessage]=useState("");
 useEffect(()=>{
  const read=()=>setPin(projectId?readEggIdeaVisualPin(projectId):null);
  read();
  window.addEventListener("storage",read);
  window.addEventListener("egg:idea-visual-pin",read);
  return()=>{window.removeEventListener("storage",read);window.removeEventListener("egg:idea-visual-pin",read);};
 },[projectId]);
 useEffect(()=>{
  setSketch(null);setMessage("");
  // A deliberate Author pin takes precedence. Otherwise show the newest
  // exploratory sketch actually associated with this completed synthesis.
  // Neither path approves the image or changes the authoritative project.
  const selectedPin=pin?.projectId===projectId?pin:null;
  const sourceId=selectedPin?.sourceId||synthesisId;
  if(!projectId||!sourceId)return;
  let active=true;
  void(async()=>{try{
   const config=await fetch("/api/egg-config",{cache:"no-store"});
   if(!config.ok)throw Error("Не удалось получить настройки EGG.");
   const cfg=await config.json() as {supabaseUrl:string;publishableKey:string};
   const client=createClient(cfg.supabaseUrl,cfg.publishableKey);
   const {data}=await client.auth.getSession();
   if(!data.session?.access_token)throw Error("Войдите в EGG для просмотра скетча.");
   const params=new URLSearchParams({op:"form-study",projectId,synthesisId:sourceId});
   const response=await fetch("/api/egg-flow-ai?"+params.toString(),{
    cache:"no-store",headers:{Authorization:"Bearer "+data.session.access_token},
   });
   if(!response.ok)throw Error("Не удалось загрузить сохранённый образ.");
   const result=await response.json() as {ok?:boolean;studies?:Sketch[];study?:Sketch|null};
   const studies=result.ok?(result.studies??(result.study?[result.study]:[])):[];
   const found=selectedPin?studies.find(item=>item.id===selectedPin.studyId):studies[0];
   if(!found){
    if(selectedPin)throw Error("Выбранный скетч не найден в текущем источнике.");
    if(active)setMessage("Для текущего синтеза ещё нет сохранённого скетча. Показано исследовательское поле.");
    return;
   }
   if(active){setSketch(found);setMode("image");}
  }catch(e){if(active)setMessage(e instanceof Error?e.message:"Скетч недоступен.");}})();
  return()=>{active=false;};
 },[projectId,synthesisId,pin?.sourceId,pin?.studyId]);
 const showImage=Boolean(sketch&&mode!=="form");
 return <div className="relative h-full min-h-0 w-full" data-testid="egg-yolk-visual-stage">
  <div className="absolute inset-0">{children}</div>
  {showImage&&<div
   className={mode==="compare"?
    "pointer-events-none absolute left-[3%] top-[12%] z-20 h-[47%] w-[43%] overflow-hidden rounded-xl border border-foreground/20 bg-background/95 shadow-md":
    "absolute inset-[9%] z-20 flex items-center justify-center overflow-hidden rounded-2xl bg-background/95"}
   data-testid="egg-yolk-original-sketch">
    <img src={sketch!.imageUrl} alt="Авторский скетч — визуальная опора Желтка"
     className="h-full w-full object-contain" referrerPolicy="no-referrer"
     onError={()=>{setSketch(null);setMessage("Изображение сейчас недоступно; сохранённый скетч в проекте не удалён.");}}/>
   </div>}
  {(pin||sketch||message)&&<div className="absolute bottom-[5%] left-1/2 z-30 flex max-w-[95%] -translate-x-1/2 flex-col items-center gap-1">
   {sketch&&<div className="flex rounded-full border border-foreground/15 bg-background/95 p-1 shadow-sm"
    role="group" aria-label="Режим изображения Желтка">
    {([["image","Образ"],["form","Форма"],["compare","Сравнить"]] as const).map(([value,label])=>
     <button key={value} type="button" onClick={()=>setMode(value)}
      data-testid={"egg-yolk-view-"+value} aria-pressed={mode===value}
      className={"rounded-full px-3 py-2 text-[11px] "+(mode===value?"bg-foreground text-background":"text-foreground/65")}>
      {label}
     </button>)}
   </div>}
   <span className="max-w-[280px] rounded-md bg-background/90 px-2 py-1 text-center text-[9px] text-foreground/55">
    {message||(pin?"Выбранный скетч · визуальная опора, не утверждённая геометрия":"Скетч по синтезу восьми сфер · гипотеза, не утверждённая форма")}
   </span>
  </div>}
 </div>;
}

import { useEffect, useState } from "react";
import { ArrowLeft, ImagePlus, X } from "lucide-react";
import {createClient} from "@supabase/supabase-js";
import {currentEggFlowCycle} from "../../lib/eggFlowCycle";
import type {EggProject} from "../../lib/eggEngine";
import EggWorkspaceNavigation from "./EggWorkspaceNavigation";
import { makePreview } from "./EggMatterDialogue";
import {useEggUi} from "../../i18n/eggUi";

type ConceptImage={id:string;src:string;name:string};
type ConceptRecord={description:string;images:ConceptImage[]};
type IdeaRecord={intent?:string;savedDraft?:string;constraints?:string};
const readJSON=(key:string):unknown=>{
 try{return JSON.parse(localStorage.getItem(key)??"null");}catch{return null;}
};

/** Concept is a visual workbench; server-approved source is read-only. */
/** Concept is NOT the Author's Idea editor or the level-02 approval gate.
 * It is a separate visual/projection workspace using an unapproved idea
 * snapshot until EGG's authoritative versioned handoff is implemented.
 */
export default function EggConceptWorkspace({projectId,onClose,onOpenIdea,onOpenMatter,onOpenField,onOpenYolk}:{
 projectId:string;onClose:()=>void;onOpenIdea:()=>void;
 onOpenMatter:()=>void;onOpenField:()=>void;onOpenYolk:()=>void;
}){
 const {ui}=useEggUi();
 const key="egg:concept-workspace:v1:"+projectId;
 const [idea,setIdea]=useState<IdeaRecord>({});
 const [serverBasis,setServerBasis]=useState<{idea:string;dna:string;level:number}|null>(null);
 const [description,setDescription]=useState("");
 const [images,setImages]=useState<ConceptImage[]>([]);
 const [loaded,setLoaded]=useState(false);
 const [mobilePane,setMobilePane]=useState<"canvas"|"description">("canvas");
 const [notice,setNotice]=useState("");
 useEffect(()=>{
  let active=true;setServerBasis(null);
  void(async()=>{try{
   const cfg=await fetch("/api/egg-config",{cache:"no-store"});
   if(!cfg.ok)return;
   const options=await cfg.json() as {supabaseUrl:string;publishableKey:string};
   const client=createClient(options.supabaseUrl,options.publishableKey);
   const {data:{session}}=await client.auth.getSession();
   if(!session?.access_token)return;
   const response=await fetch("/api/egg-project-state?project="+encodeURIComponent(projectId),{
    cache:"no-store",headers:{Authorization:"Bearer "+session.access_token},
   });
   if(!response.ok)return;
   const state=await response.json() as {project:EggProject};
   const project=state.project;
   const cycle=project?currentEggFlowCycle(project):null;
   if(active&&project?.level>=2&&project.seed.text&&cycle?.ideaHandoff){
    setServerBasis({idea:cycle.ideaHandoff.intent,dna:project.seed.text,level:project.level});
   }
  }catch{/* Local concept work remains usable but unapproved. */}})();
  return()=>{active=false};
 },[projectId]);
 useEffect(()=>{
  const rawIdea=readJSON("egg:idea-workspace:v1:"+projectId) as IdeaRecord|null;
  setIdea({
   intent:typeof rawIdea?.intent==="string"?rawIdea.intent:"",
   savedDraft:typeof rawIdea?.savedDraft==="string"?rawIdea.savedDraft:"",
   constraints:typeof rawIdea?.constraints==="string"?rawIdea.constraints:"",
  });
  const existing=readJSON(key) as Partial<ConceptRecord>|null;
  setDescription(typeof existing?.description==="string"?existing.description:"");
  setImages(Array.isArray(existing?.images)?
   existing.images.filter((item):item is ConceptImage=>Boolean(
    item&&typeof item.id==="string"&&typeof item.name==="string"&&
    typeof item.src==="string"&&/^data:image\/jpeg;base64,/.test(item.src)
   )).slice(0,8):[]);
  setLoaded(true);
 },[key,projectId]);
 useEffect(()=>{
  if(!loaded)return;
  try{localStorage.setItem(key,JSON.stringify({description,images}));setNotice("");}
  catch{setNotice("Недостаточно места для сохранения. Уменьшите число изображений.");}
 },[key,description,images,loaded]);
 const addImage=async(file:File|undefined)=>{
  if(!file)return;
  if(images.length>=8){setNotice("Максимум восемь изображений в текущем черновике.");return;}
  if(!file.type.startsWith("image/")||file.size>12_000_000){
   setNotice("Выберите изображение до 12 МБ.");return;
  }
  try{
   const raw=await new Promise<string>((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>typeof reader.result==="string"?resolve(reader.result):reject(Error("read_failed"));
    reader.onerror=()=>reject(Error("read_failed"));
    reader.readAsDataURL(file);
   });
   const src=await makePreview({id:"concept-preview",type:"image",text:file.name,src:raw});
   if(!src||src.length>=210000)throw Error("invalid_preview");
   setImages(previous=>[...previous,{id:crypto.randomUUID?.()??String(Date.now()),src,name:file.name}].slice(0,8));
  }catch{setNotice("Не удалось подготовить изображение. Попробуйте JPG или PNG.");}
 };
 return <section data-testid="egg-concept-workspace" aria-label={ui.conceptWorkspace}
  className="fixed inset-0 z-[90] flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-background text-foreground md:flex-row"
  style={{backgroundImage:"radial-gradient(hsl(var(--foreground) / .10) 1px, transparent 1px)",backgroundSize:"25px 25px"}}>
  <div className="shrink-0 border-b border-foreground/10 bg-background/95 px-4 pb-2 pt-[max(.65rem,env(safe-area-inset-top))] md:hidden" data-testid="egg-concept-mobile-tabs">
  <div className="flex items-center justify-between gap-2"><span className="text-sm font-medium">{ui.concept}</span><button type="button" aria-label={ui.conceptClose} onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full border border-foreground/15"><X size={17}/></button></div>
  <div className="mt-1 grid grid-cols-2 gap-2" role="tablist" aria-label={ui.conceptTablist}>
   <button type="button" role="tab" aria-selected={mobilePane==="canvas"} onClick={()=>setMobilePane("canvas")} className={"min-h-10 rounded-full px-3 text-sm "+(mobilePane==="canvas"?"bg-[#607466] text-white":"bg-foreground/5 text-foreground/75")}>{ui.commonCanvas}</button>
   <button type="button" role="tab" aria-selected={mobilePane==="description"} onClick={()=>setMobilePane("description")} className={"min-h-10 rounded-full px-3 text-sm "+(mobilePane==="description"?"bg-[#607466] text-white":"bg-foreground/5 text-foreground/75")}>{ui.commonDescription}</button>
  </div>
 </div>
 <div data-testid="egg-concept-canvas-pane" data-active={mobilePane==="canvas"} className={"min-h-0 min-w-0 w-full flex-1 flex-col border-b border-foreground/10 px-4 py-3 md:w-auto md:border-b-0 md:border-r md:px-8 md:py-5 "+(mobilePane==="canvas"?"flex":"hidden md:flex")}>
   <div className="flex shrink-0 items-center justify-between gap-3">
    <h2 className="text-lg font-light">{ui.concept} <span className="text-xs opacity-50">{ui.conceptImageForm}</span></h2>
    <button type="button" onClick={onOpenIdea} className="flex items-center gap-1 rounded-full bg-background/80 px-3 py-2 text-xs shadow-sm">
     <ArrowLeft size={14}/> {ui.idea}
    </button>
   </div>
   <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain pb-36 md:pb-28">
    <div className="rounded-xl border border-foreground/15 bg-background/65 p-4">
     <p className="text-xs text-foreground/55">{serverBasis?ui.conceptBasisServer:ui.conceptBasisDraft}</p>
     <p className="mt-2 whitespace-pre-wrap text-sm">{serverBasis?.idea||idea.savedDraft||idea.intent||ui.conceptNoIdea}</p>
     {idea.savedDraft&&idea.intent&&!serverBasis&&<p className="mt-3 border-t border-foreground/10 pt-3 text-xs text-foreground/55">Намерение Автора: {idea.intent}</p>}
     {serverBasis&&<details className="mt-3 border-t border-foreground/10 pt-3 text-xs text-foreground/65"><summary className="cursor-pointer">ДНК · утверждённый инвариант</summary><p className="mt-2 whitespace-pre-wrap">{serverBasis.dna}</p></details>}
     <p className="mt-2 text-[10px] text-foreground/45">{serverBasis?ui.conceptSeedFixed:ui.conceptDraftNotDna}</p>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3">
     <span className="text-xs text-foreground/70">{ui.conceptVisualStudy} · {images.length} / 8</span>
     <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-foreground/20 bg-background/90 px-3 py-2 text-xs">
      <ImagePlus size={15}/> {ui.conceptAddImage}
      <input aria-label="Добавить изображение концепта" type="file" accept="image/*" className="sr-only"
       onChange={e=>{void addImage(e.currentTarget.files?.[0]);e.currentTarget.value="";}}/>
     </label>
    </div>
    {images.length?
     <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {images.map(item=><div key={item.id} className="relative rounded-xl border border-foreground/10 bg-background/80 p-2">
       <img src={item.src} alt={item.name} className="h-36 w-full object-contain"/>
       <p className="mt-2 truncate text-[11px] text-foreground/60">{item.name}</p>
       <button type="button" aria-label={"Убрать изображение "+item.name} onClick={()=>setImages(previous=>previous.filter(x=>x.id!==item.id))}
        className="absolute right-2 top-2 rounded-full bg-background/90 p-1.5"><X size={14}/></button>
      </div>)}
     </div>:
     <div className="flex min-h-[120px] items-center justify-end px-3 py-8 text-right text-sm text-foreground/55">
      <p className="ml-auto max-w-[36ch]">{ui.conceptEmptyVisual}</p>
     </div>}
   </div>
  </div>
  <div data-testid="egg-concept-description-pane" data-active={mobilePane==="description"} className={"min-h-0 min-w-0 w-full flex-1 flex-col px-4 py-3 md:w-auto md:max-w-[480px] md:px-6 md:py-5 "+(mobilePane==="description"?"flex":"hidden md:flex")}>
   <div className="flex items-center justify-between gap-3">
    <span className="text-sm">{ui.conceptWorking}</span>
    <button type="button" aria-label={ui.conceptClose} onClick={onClose}
     className="rounded-full bg-background/70 p-2"><X size={17}/></button>
   </div>
   <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pb-36 md:pb-32">
    <p className="text-sm leading-relaxed text-foreground/65">{ui.conceptDescriptionIntro}</p>
    <label className="mt-6 block text-xs text-foreground/60">{ui.conceptDescriptionLabel}
     <textarea aria-label="Описание концепта" value={description} rows={8} maxLength={8000}
      onChange={e=>setDescription(e.target.value)}
      placeholder={ui.conceptDescriptionHint}
      className="mt-2 w-full resize-y rounded-xl border border-foreground/15 bg-background/85 p-3 text-base outline-none focus:border-foreground/40 md:text-sm"/>
    </label>
    <p className="mt-2 text-[11px] text-foreground/50">{ui.conceptDraftReminder}</p>
    {notice&&<p role="status" className="mt-3 text-xs text-foreground/70">{notice}</p>}
   </div>
  </div>
  <EggWorkspaceNavigation active="concept" onOpenField={onOpenField} onOpenMatter={onOpenMatter}
   onOpenIdea={onOpenIdea} onOpenConcept={()=>{}} onOpenYolk={onOpenYolk}/>
 </section>;
}

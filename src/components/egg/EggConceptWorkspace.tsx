import { useEffect, useState } from "react";
import { ArrowLeft, ImagePlus, X } from "lucide-react";
import EggWorkspaceNavigation from "./EggWorkspaceNavigation";
import { makePreview } from "./EggMatterDialogue";

type ConceptImage={id:string;src:string;name:string};
type ConceptRecord={description:string;images:ConceptImage[]};
type IdeaRecord={intent?:string;savedDraft?:string;constraints?:string};
const readJSON=(key:string):unknown=>{
 try{return JSON.parse(localStorage.getItem(key)??"null");}catch{return null;}
};

/** Concept is NOT the Author's Idea editor or the level-02 approval gate.
 * It is a separate visual/projection workspace using an unapproved idea
 * snapshot until EGG's authoritative versioned handoff is implemented.
 */
export default function EggConceptWorkspace({projectId,onClose,onOpenIdea,onOpenMatter,onOpenField,onOpenYolk}:{
 projectId:string;onClose:()=>void;onOpenIdea:()=>void;
 onOpenMatter:()=>void;onOpenField:()=>void;onOpenYolk:()=>void;
}){
 const key="egg:concept-workspace:v1:"+projectId;
 const [idea,setIdea]=useState<IdeaRecord>({});
 const [description,setDescription]=useState("");
 const [images,setImages]=useState<ConceptImage[]>([]);
 const [loaded,setLoaded]=useState(false);
 const [notice,setNotice]=useState("");
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
 return <section data-testid="egg-concept-workspace" aria-label="Сфера Концепт — рабочий холст"
  className="fixed inset-0 z-[90] flex flex-col bg-background text-foreground md:flex-row"
  style={{backgroundImage:"radial-gradient(hsl(var(--foreground) / .10) 1px, transparent 1px)",backgroundSize:"25px 25px"}}>
  <div className="flex min-h-0 min-w-0 flex-1 flex-col border-b border-foreground/10 px-4 py-5 md:border-b-0 md:border-r md:px-8">
   <div className="flex shrink-0 items-center justify-between gap-3">
    <h2 className="text-lg font-light">Концепт <span className="text-xs opacity-50">· образ и форма</span></h2>
    <button type="button" onClick={onOpenIdea} className="flex items-center gap-1 rounded-full bg-background/80 px-3 py-2 text-xs shadow-sm">
     <ArrowLeft size={14}/> Идея
    </button>
   </div>
   <div className="mt-5 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-28">
    <div className="rounded-xl border border-foreground/15 bg-background/65 p-4">
     <p className="text-xs text-foreground/55">Опора · черновик из сферы «Идея»</p>
     <p className="mt-2 whitespace-pre-wrap text-sm">{idea.savedDraft||idea.intent||"В сфере «Идея» пока нет сохранённого замысла."}</p>
     {idea.savedDraft&&idea.intent&&<p className="mt-3 border-t border-foreground/10 pt-3 text-xs text-foreground/55">Намерение Автора: {idea.intent}</p>}
     <p className="mt-2 text-[10px] text-foreground/45">Опора не утверждена как ДНК. Возврат к Идее не изменяет историю проекта.</p>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3">
     <span className="text-xs text-foreground/70">Визуальное исследование · {images.length} / 8</span>
     <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-foreground/20 bg-background/90 px-3 py-2 text-xs">
      <ImagePlus size={15}/> Добавить изображение
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
     <div className="flex min-h-[160px] items-center justify-center rounded-xl border border-dashed border-foreground/20 bg-background/40 px-6 text-center text-sm text-foreground/55">
      Здесь будут формироваться визуальные варианты концепта. Начните с эскиза или изображения, сохраняя исходный аккорд идеи.
     </div>}
   </div>
  </div>
  <div className="flex min-h-0 min-w-0 flex-1 flex-col px-4 py-5 md:max-w-[480px] md:px-6">
   <div className="flex items-center justify-between gap-3">
    <span className="text-sm">Концепт · рабочая версия</span>
    <button type="button" aria-label="Закрыть сферу Концепт" onClick={onClose}
     className="rounded-full bg-background/70 p-2"><X size={17}/></button>
   </div>
   <div className="mt-5 min-h-0 flex-1 overflow-y-auto pb-32">
    <p className="text-sm leading-relaxed text-foreground/65">Здесь замысел переводится в визуальные и функциональные гипотезы. Это отдельная мастерская, не копия Идеи и пока не автоматическое проектирование.</p>
    <label className="mt-6 block text-xs text-foreground/60">Рабочее описание концепта
     <textarea aria-label="Описание концепта" value={description} rows={8} maxLength={8000}
      onChange={e=>setDescription(e.target.value)}
      placeholder="Характер формы, взаимодействие с пространством, предполагаемая функция, открытые вопросы…"
      className="mt-2 w-full resize-y rounded-xl border border-foreground/15 bg-background/85 p-3 text-sm outline-none focus:border-foreground/40"/>
    </label>
    <p className="mt-2 text-[11px] text-foreground/50">Черновик автоматически сохраняется только в этом браузере; не утверждает уровень «Концепт» и не меняет ДНК.</p>
    {notice&&<p role="status" className="mt-3 text-xs text-foreground/70">{notice}</p>}
   </div>
  </div>
  <EggWorkspaceNavigation active="concept" onOpenField={onOpenField} onOpenMatter={onOpenMatter}
   onOpenIdea={onOpenIdea} onOpenConcept={()=>{}} onOpenYolk={onOpenYolk}/>
 </section>;
}

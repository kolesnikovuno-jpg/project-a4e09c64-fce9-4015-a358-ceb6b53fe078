import {useEffect,useMemo,useState} from "react";
import {createClient} from "@supabase/supabase-js";
import {makePreview,type MatterCard} from "./EggMatterDialogue";
import {eggIdeaFormSourceId,normalizeEggIdeaFormSource,type EggIdeaFormSource} from "../../lib/eggIdeaFormSource";
import {EGG_SKETCH_IMAGE_LIMIT,EGG_SKETCH_STYLES,type EggSketchStyleId} from "../../lib/eggSketchStyles";

type FormStudy={id:string;prompt:string;imageUrl:string;model:string;
 sourceKind:string;cycleId:string;synthesisId:string;createdAt:string;
 stylePreset?:EggSketchStyleId|null;referenceStudyId?:string|null;is3d:false;approved:false};
type Material={id?:string;type:string;text:string;src?:string;strokes?:MatterCard["strokes"]};
const errors:Record<string,string>={
 rate_limited:"Лимит OpenAI. Повторите позже.",
 image_request_invalid:"Модель изображений отклонила параметры.",
 image_failed:"OpenAI не создал скетч.",
 model_not_authorized:"Ключ API не имеет доступа к модели изображений.",
 openai_image_key_not_configured:"Ключ OpenAI для изображений не настроен.",
 invalid_image:"Модель не вернула изображение.",
 storage_unavailable:"Хранилище изображений недоступно.",
 database_unavailable:"База EGG недоступна.",
 invalid_idea:"Заполните текущее намерение Автора.",
 invalid_idea_photo:"Фото пространства некорректно.",
 invalid_form_reference:"Эскиз-референс повреждён. Выберите изображение снова.",
 invalid_reference_study:"Предыдущая версия недоступна или принадлежит другому источнику.",
 invalid_style:"Указан неподдерживаемый стиль.",
 study_limit_reached:"Лимит визуальных вариантов для этой версии идеи исчерпан.",
 revision_conflict:"Проект изменился. Обновите страницу.",
 generation_failed:"Генерация не завершилась. Исходная идея сохранена.",
};
export default function EggFormStudyAccess({projectId,intent,constraints,
 savedDraft,materialInsight,materials,spacePhoto}:{
 projectId:string;intent:string;constraints:string;savedDraft:string;
 materialInsight:string;materials:Material[];spacePhoto:string;
}){
 const referenceKey="egg:form-reference:v1:"+projectId;
 const [referenceSketch,setReferenceSketch]=useState(()=>{
  try{return localStorage.getItem(referenceKey)||"";}catch{return "";}
 });
 const [stylePreset,setStylePreset]=useState<EggSketchStyleId>("pencil");
 const [customStyle,setCustomStyle]=useState("");
 const [editInstruction,setEditInstruction]=useState("");
 const [reuseSelected,setReuseSelected]=useState(true);
 const [snapshot,setSnapshot]=useState<{revision:number;token:string}|null>(null);
 const [study,setStudy]=useState<FormStudy|null>(null);
 const [studies,setStudies]=useState<FormStudy[]>([]);
 const [busy,setBusy]=useState(false);
 const [referenceBusy,setReferenceBusy]=useState(false);
 const [notice,setNotice]=useState("");
 useEffect(()=>{try{
  const current=localStorage.getItem(referenceKey);
  setReferenceSketch(current&&/^data:image\/jpeg;base64,/.test(current)&&current.length<210000?current:"");
 }catch{setReferenceSketch("");}},[referenceKey]);
 useEffect(()=>{try{
  if(referenceSketch)localStorage.setItem(referenceKey,referenceSketch);
  else localStorage.removeItem(referenceKey);
 }catch{setNotice("Эскиз виден только здесь: недостаточно памяти для локального сохранения.");}
 },[referenceKey,referenceSketch]);
 const source=useMemo<EggIdeaFormSource>(()=>normalizeEggIdeaFormSource({
  intent,constraints,draft:savedDraft,materialInsight,
  materials:materials.map(m=>({type:m.type,text:m.text})),spacePhoto,formReference:referenceSketch,
 }),[intent,constraints,savedDraft,materialInsight,materials,spacePhoto,referenceSketch]);
 const sourceId=useMemo(()=>eggIdeaFormSourceId(source),[source]);
 const canGenerate=source.intent.length>=8;
 const visualMaterials=materials.filter(m=>(m.type==="image"&&m.src)||(m.type==="sketch"&&m.strokes?.length)).slice(0,12);
 useEffect(()=>{
  if(!projectId)return;
  let active=true;setSnapshot(null);
  void(async()=>{try{
   const response=await fetch("/api/egg-config",{cache:"no-store"});
   if(!response.ok)throw Error("Сервер EGG недоступен");
   const cfg=await response.json() as {supabaseUrl:string;publishableKey:string};
   const client=createClient(cfg.supabaseUrl,cfg.publishableKey);
   const {data}=await client.auth.getSession();
   if(!data.session?.access_token)throw Error("Войдите в EGG");
   const state=await fetch("/api/egg-project-state?project="+encodeURIComponent(projectId),{
    cache:"no-store",headers:{Authorization:"Bearer "+data.session.access_token},
   });
   if(!state.ok)throw Error("Проект EGG недоступен");
   const value=await state.json() as {project:{id:string};revision:number};
   if(active&&value.project?.id===projectId&&Number.isInteger(value.revision))
    setSnapshot({revision:value.revision,token:data.session.access_token});
  }catch(e){if(active)setNotice(e instanceof Error?e.message:"Ошибка доступа к проекту");}})();
  return()=>{active=false};
 },[projectId]);
 useEffect(()=>{
  if(!snapshot||!canGenerate)return;
  let active=true;setStudy(null);setStudies([]);
  const timer=setTimeout(()=>{void(async()=>{try{
   const response=await fetch("/api/egg-flow-ai?op=form-study&projectId="+
    encodeURIComponent(projectId)+"&synthesisId="+encodeURIComponent(sourceId),{
     cache:"no-store",headers:{Authorization:"Bearer "+snapshot.token},
    });
   const data=await response.json() as {ok?:boolean;study?:FormStudy|null;studies?:FormStudy[]};
   if(active&&response.ok&&data.ok){
    const items=data.studies??(data.study?[data.study]:[]);
    setStudies(items);setStudy(items[0]??null);
   }
  }catch{/* The visual study is optional. */}})();},300);
  return()=>{active=false;clearTimeout(timer);};
 },[snapshot,canGenerate,projectId,sourceId]);
 async function useReference(card:Material){
  setReferenceBusy(true);setNotice("");
  try{
   const preview=await makePreview({id:card.id||"selected",text:card.text,
    type:card.type as MatterCard["type"],src:card.src,strokes:card.strokes});
   if(!preview||preview.length>210000)throw Error("preview");
   setReferenceSketch(preview);setReuseSelected(false);
   setNotice("Образ с холста выбран как референс формы. Стиль можно менять отдельно.");
  }catch{setNotice("Не удалось прочитать выбранное изображение с холста.");}
  finally{setReferenceBusy(false);}
 }
 async function uploadReference(file:File|undefined){
  if(!file)return;
  if(!file.type.startsWith("image/")||file.size>12_000_000){
   setNotice("Выберите изображение до 12 МБ.");return;
  }
  setReferenceBusy(true);setNotice("");
  try{
   const data=await new Promise<string>((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>typeof reader.result==="string"?resolve(reader.result):reject(Error("read"));
    reader.onerror=()=>reject(Error("read"));reader.readAsDataURL(file);
   });
   const preview=await makePreview({id:"uploaded-sketch",type:"image",text:"Образ формы",src:data});
   if(!preview||preview.length>210000)throw Error("preview");
   setReferenceSketch(preview);setReuseSelected(false);
   setNotice("Эскиз выбран как исходная форма. Это не утверждение идеи.");
  }catch{setNotice("Не удалось подготовить изображение. Попробуйте JPG или PNG.");}
  finally{setReferenceBusy(false);}
 }
 async function generate(){
  if(!snapshot||!canGenerate||busy||studies.length>=EGG_SKETCH_IMAGE_LIMIT)return;
  setBusy(true);setNotice("");
  try{
   const result=await fetch("/api/egg-flow-ai?op=form-study",{
    method:"POST",headers:{"Content-Type":"application/json",
     Authorization:"Bearer "+snapshot.token},
    body:JSON.stringify({projectId,expectedRevision:snapshot.revision,idea:source,
     stylePreset,customStyle:stylePreset==="custom"?customStyle:"",
     editInstruction,referenceStudyId:reuseSelected&&study?.id?study.id:undefined}),
   });
   const data=await result.json() as {ok?:boolean;error?:string;study?:FormStudy};
   if(!result.ok||!data.ok||!data.study)
    throw Error(errors[data.error??""]??"Не удалось создать скетч");
   setStudy(data.study);
   setStudies(previous=>[data.study!,...previous.filter(v=>v.id!==data.study!.id)].slice(0,EGG_SKETCH_IMAGE_LIMIT));
   setNotice("Новая визуальная гипотеза сохранена в EGG. ДНК и уровень не изменены.");
  }catch(e){setNotice(e instanceof Error?e.message:"Не удалось создать скетч");}
  finally{setBusy(false);}
 }
 return <section className="mb-4 space-y-3 rounded-xl border border-foreground/15 bg-background/80 p-3 sm:p-4"
  data-testid="egg-idea-form-access" aria-label="Визуальная гипотеза текущей идеи">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div>
    <h4 className="text-sm font-medium">Визуальная гипотеза · дизайнерский скетч</h4>
    <p className="mt-1 text-[11px] text-foreground/60">
     Исходная идея → скетч → уточнение → стиль. Не CAD и не утверждение Автора.
    </p>
   </div>
   <button type="button" onClick={()=>void generate()} disabled={!snapshot||!canGenerate||busy||referenceBusy||studies.length>=EGG_SKETCH_IMAGE_LIMIT}
    data-testid="egg-generate-form-image" className="min-h-10 rounded-full border border-foreground/40 px-3 py-2 text-xs disabled:opacity-45">
    {busy?"Создаётся скетч…":studies.length>=EGG_SKETCH_IMAGE_LIMIT?"Лимит вариантов":study?"Новый скетч":"Создать скетч"}
   </button>
  </div>
  <div className="grid gap-2 sm:grid-cols-2">
   <label className="block text-xs text-foreground/65">Стиль подачи
    <select aria-label="Стиль скетча" value={stylePreset} onChange={e=>setStylePreset(e.target.value as EggSketchStyleId)}
     className="mt-1 w-full rounded-lg border border-foreground/20 bg-background p-2 text-sm">
     {EGG_SKETCH_STYLES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
    </select>
   </label>
   <label className="block text-xs text-foreground/65">Уточнение формы · необязательно
    <input aria-label="Уточнение формы" value={editInstruction} maxLength={400}
     onChange={e=>setEditInstruction(e.target.value)}
     placeholder="Например: сохранить отверстие, облегчить опоры"
     className="mt-1 w-full rounded-lg border border-foreground/20 bg-background p-2 text-sm"/>
   </label>
   {stylePreset==="custom"&&<label className="block text-xs text-foreground/65 sm:col-span-2">Свой стиль изображения
    <input aria-label="Свой стиль изображения" value={customStyle} maxLength={200}
     onChange={e=>setCustomStyle(e.target.value)}
     placeholder="Например: тушь и лёгкая тёплая растушёвка"
     className="mt-1 w-full rounded-lg border border-foreground/20 bg-background p-2 text-sm"/>
   </label>}
  </div>
  <div className="space-y-2 rounded-lg bg-foreground/[.025] p-2">
   <p className="text-[11px] text-foreground/65">Референс формы · выбранный автором эскиз или изображение (не фото помещения)</p>
   <div className="flex flex-wrap items-center gap-2">
    <label className="cursor-pointer rounded-full border border-foreground/20 px-3 py-2 text-xs">
     Загрузить эскиз <input aria-label="Загрузить эскиз формы" type="file" accept="image/*" className="hidden"
      onChange={e=>{void uploadReference(e.currentTarget.files?.[0]);e.currentTarget.value="";}}/>
    </label>
    {referenceSketch&&<button type="button" onClick={()=>{setReferenceSketch("");setReuseSelected(false);}} className="rounded-full border border-foreground/15 px-3 py-2 text-xs">Убрать референс</button>}
    {referenceSketch&&<img src={referenceSketch} alt="Референс формы" className="h-16 w-16 rounded border object-contain"/>}
   </div>
   {visualMaterials.length>0&&<div className="flex flex-wrap gap-2">
    {visualMaterials.map((card,i)=><button key={card.id||i} type="button" disabled={referenceBusy}
     onClick={()=>void useReference(card)} className="min-h-9 rounded-full border border-foreground/20 px-3 py-1 text-xs disabled:opacity-50">
     Взять с холста · {card.text.slice(0,20)||"образ "+(i+1)}
    </button>)}
   </div>}
   <p className="text-[10px] text-foreground/55">Референс отправляется модели только по действию Автора. Исходная геометрия — ориентир; точное совпадение не гарантировано.</p>
  </div>
  {study&&<label className="flex items-center gap-2 text-xs text-foreground/70">
   <input type="checkbox" checked={reuseSelected} onChange={e=>setReuseSelected(e.target.checked)} aria-label="Продолжить выбранный скетч"/>
   Продолжить выбранный скетч, сохраняя его форму
  </label>}
  {source.spacePhoto&&<p className="text-[11px] text-foreground/65" data-testid="egg-idea-image-reference-enabled">
   Фото интерьера включено как контекст среды · форма не копируется с фото
  </p>}
  {study&&<div className="space-y-2" data-testid="egg-generated-form-image">
   <img src={study.imageUrl} alt="Пробный образ формы по текущему замыслу Автора"
    className="mx-auto max-h-[480px] w-full max-w-[600px] rounded-xl object-contain" referrerPolicy="no-referrer"/>
   {studies.length>1&&<div className="flex items-center gap-2 overflow-x-auto pb-1" aria-label="Варианты исследования формы">
    {studies.slice().reverse().map((version,i)=><button key={version.id} type="button"
     onClick={()=>setStudy(version)} aria-label={"Показать вариант "+(i+1)}
     aria-pressed={study.id===version.id}
     className={"shrink-0 rounded-lg border p-1 "+(study.id===version.id?"border-foreground/60":"border-foreground/15 opacity-70")}>
     <img src={version.imageUrl} alt={"Вариант "+(i+1)} className="h-14 w-14 rounded object-cover"
      loading="lazy" referrerPolicy="no-referrer"/>
    </button>)}
   </div>}
   <p className="text-[10px] text-foreground/55">
    {study.stylePreset?EGG_SKETCH_STYLES.find(s=>s.id===study.stylePreset)?.label:"Предыдущий образ"}
    {study.referenceStudyId?" · стилизация выбранной версии":""} · черновик
   </p>
   <details className="text-xs text-foreground/65">
    <summary className="cursor-pointer">Как ИИ интерпретировал форму</summary>
    <p className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-foreground/[.035] p-3 font-mono text-[11px]">{study.prompt}</p>
   </details>
  </div>}
  <p className="text-[10px] text-foreground/55">Осталось исследований: {Math.max(0,EGG_SKETCH_IMAGE_LIMIT-studies.length)}. Каждый новый скетч — отдельный платный API-вызов.</p>
  {notice&&<p role="status" className="text-xs text-foreground/70">{notice}</p>}
 </section>;
}

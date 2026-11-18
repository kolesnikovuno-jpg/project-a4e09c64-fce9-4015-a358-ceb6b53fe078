import {useEffect,useState} from "react";
import {createClient} from "@supabase/supabase-js";
import type {EggProject} from "../../lib/eggEngine";
import type {EggFlowCycle} from "../../lib/eggFlowCycle";
import {EGG_SKETCH_IMAGE_LIMIT,EGG_SKETCH_STYLES,type EggSketchStyleId} from "../../lib/eggSketchStyles";
type Study={id:string;prompt:string;imageUrl:string;model:string;
 sourceKind:string;cycleId:string;synthesisId:string;createdAt:string;
 stylePreset?:EggSketchStyleId|null;referenceStudyId?:string|null;is3d:false;approved:false};
async function bearer():Promise<string>{
 const config=await fetch("/api/egg-config",{cache:"no-store"});
 if(!config.ok)throw Error("Сервер EGG недоступен.");
 const cfg=await config.json() as {supabaseUrl:string;publishableKey:string};
 const client=createClient(cfg.supabaseUrl,cfg.publishableKey);
 const {data}=await client.auth.getSession();
 if(!data.session?.access_token)throw Error("Войдите в аккаунт EGG.");
 return data.session.access_token;
}
const errors:Record<string,string>={
 complete_synthesis_required:"Нужен завершённый синтез восьми сфер.",
 openai_image_key_not_configured:"Ключ OpenAI не настроен.",
 study_limit_reached:"Лимит визуальных гипотез исчерпан.",
 rate_limited:"Лимит OpenAI. Попробуйте позже.",
 model_not_authorized:"Ключ API не имеет доступа к модели изображений.",
 image_failed:"Модель не создала скетч.",
 invalid_reference_study:"Выбранное предыдущее изображение не найдено.",
 storage_unavailable:"Хранилище изображений временно недоступно.",
 revision_conflict:"Проект изменился. Обновите состояние.",
 image_request_invalid:"OpenAI отклонил параметры изображения.",
 invalid_image:"Модель не вернула изображение.",
 generation_failed:"Сервер не завершил генерацию.",
};
export default function EggFormStudyPanel({project,cycle,revision,authorControls}:{
 project:EggProject;cycle:EggFlowCycle;revision:number|null;authorControls:boolean;
}){
 const synthesisId=cycle.synthesis?.id??"";
 const [study,setStudy]=useState<Study|null>(null);
 const [studies,setStudies]=useState<Study[]>([]);
 const [stylePreset,setStylePreset]=useState<EggSketchStyleId>("pencil");
 const [customStyle,setCustomStyle]=useState("");
 const [editInstruction,setEditInstruction]=useState("");
 const [reuseSelected,setReuseSelected]=useState(true);
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState("");
 useEffect(()=>{
  if(!synthesisId||cycle.status==="running")return;
  let active=true;setStudy(null);setStudies([]);setNotice("");
  (async()=>{try{
   const token=await bearer();
   const url="/api/egg-flow-ai?op=form-study&projectId="+encodeURIComponent(project.id)+
    "&synthesisId="+encodeURIComponent(synthesisId);
   const response=await fetch(url,{cache:"no-store",headers:{Authorization:"Bearer "+token}});
   const value=await response.json() as {ok?:boolean;study?:Study|null;studies?:Study[]};
   if(active&&response.ok&&value.ok){
    const items=value.studies??(value.study?[value.study]:[]);
    setStudies(items);setStudy(items[0]??null);
   }
  }catch{/* Display no unverified result. */}})();
  return()=>{active=false;};
 },[project.id,synthesisId,cycle.status]);
 async function generate(){
  if(!authorControls||revision===null||!synthesisId||busy||
   studies.length>=EGG_SKETCH_IMAGE_LIMIT)return;
  setBusy(true);setNotice("");
  try{
   const token=await bearer();
   const response=await fetch("/api/egg-flow-ai?op=form-study",{
    method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},
    body:JSON.stringify({projectId:project.id,synthesisId,expectedRevision:revision,
     stylePreset,customStyle:stylePreset==="custom"?customStyle:"",
     editInstruction,referenceStudyId:reuseSelected&&study?.id?study.id:undefined}),
   });
   const data=await response.json() as {ok?:boolean;error?:string;study?:Study};
   if(!response.ok||!data.ok||!data.study)
    throw Error(errors[data.error??""]??"Генерация не завершилась.");
   setStudy(data.study);setStudies(items=>[data.study!,...items].slice(0,EGG_SKETCH_IMAGE_LIMIT));
   setNotice("Скетч по синтезу сохранён без изменения ДНК и уровня.");
  }catch(e){setNotice(e instanceof Error?e.message:"Не удалось получить скетч.");}
  finally{setBusy(false);}
 }
 if(!cycle.synthesis||cycle.status==="running")return null;
 return <section className="mt-4 space-y-3 rounded-xl border border-foreground/15 p-3 sm:p-4"
  data-testid="egg-form-study-panel" aria-label="Исследование формы">
  <div className="flex flex-wrap items-center justify-between gap-2">
   <div><h4 className="text-sm font-medium">Дизайнерский скетч · по синтезу восьми сфер</h4>
    <p className="mt-1 text-[11px] text-foreground/60">Визуальная гипотеза, не 3D и не утверждение Автора</p></div>
   {authorControls&&revision!==null&&<button type="button" disabled={busy||studies.length>=EGG_SKETCH_IMAGE_LIMIT}
    onClick={()=>void generate()} data-testid="egg-generate-form-image"
    className="rounded-full border border-foreground/40 px-3 py-2 text-xs disabled:opacity-50">
    {busy?"Создаётся скетч…":studies.length>=EGG_SKETCH_IMAGE_LIMIT?"Лимит вариантов":study?"Новый скетч":"Создать скетч"}
   </button>}
  </div>
  {authorControls&&<div className="grid gap-2 sm:grid-cols-2">
   <label className="text-xs text-foreground/65">Стиль
    <select aria-label="Стиль скетча" value={stylePreset} onChange={e=>setStylePreset(e.target.value as EggSketchStyleId)}
     className="mt-1 w-full rounded-lg border border-foreground/20 bg-background p-2 text-sm">
     {EGG_SKETCH_STYLES.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}
    </select>
   </label>
   <label className="text-xs text-foreground/65">Уточнение формы
    <input aria-label="Уточнение формы" value={editInstruction} maxLength={400}
     onChange={e=>setEditInstruction(e.target.value)}
     placeholder="Какие элементы следует сохранить или изменить?"
     className="mt-1 w-full rounded-lg border border-foreground/20 bg-background p-2 text-sm"/>
   </label>
   {stylePreset==="custom"&&<label className="text-xs text-foreground/65 sm:col-span-2">Свой стиль изображения
    <input aria-label="Свой стиль изображения" value={customStyle} maxLength={200}
     onChange={e=>setCustomStyle(e.target.value)}
     className="mt-1 w-full rounded-lg border border-foreground/20 bg-background p-2 text-sm"/>
   </label>}
  </div>}
  {study&&<div className="space-y-2" data-testid="egg-generated-form-image">
   <img src={study.imageUrl} alt="Исследовательский образ формы по синтезу EGG"
    className="mx-auto max-h-[480px] w-full max-w-[600px] rounded-xl object-contain" referrerPolicy="no-referrer"/>
   {studies.length>1&&<div className="flex gap-2 overflow-x-auto" aria-label="История скетчей">
    {studies.slice().reverse().map((v,i)=><button type="button" key={v.id} onClick={()=>setStudy(v)}
     aria-label={"Скетч "+(i+1)} aria-pressed={study.id===v.id}
     className={"shrink-0 rounded-lg border p-1 "+(study.id===v.id?"border-foreground/60":"border-foreground/15 opacity-60")}>
     <img src={v.imageUrl} alt={"Вариант "+(i+1)} className="h-14 w-14 object-cover" referrerPolicy="no-referrer"/>
    </button>)}
   </div>}
   {authorControls&&<label className="flex items-center gap-2 text-xs text-foreground/70">
    <input type="checkbox" checked={reuseSelected} onChange={e=>setReuseSelected(e.target.checked)}
     aria-label="Продолжить выбранный скетч"/> Продолжить выбранный скетч
   </label>}
   <details className="text-xs text-foreground/65"><summary className="cursor-pointer">Как ИИ интерпретировал идею</summary>
    <p className="mt-2 whitespace-pre-wrap leading-relaxed">{study.prompt}</p>
    <p className="mt-2">Изображение, не 3D-модель. Авторское утверждение не выполнено.</p>
   </details>
  </div>}
  {notice&&<p role="status" className="text-xs text-foreground/70">{notice}</p>}
  <p className="text-[10px] text-foreground/55">Генерация расходует API-кредиты. Доступно: {Math.max(0,EGG_SKETCH_IMAGE_LIMIT-studies.length)}</p>
 </section>;
}

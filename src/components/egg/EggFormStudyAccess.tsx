import {useEffect,useMemo,useState} from "react";
import {createClient} from "@supabase/supabase-js";
import {eggIdeaFormSourceId,normalizeEggIdeaFormSource,type EggIdeaFormSource}
 from "../../lib/eggIdeaFormSource";

type FormStudy={id:string;prompt:string;imageUrl:string;model:string;
 sourceKind:string;cycleId:string;synthesisId:string;createdAt:string;
 is3d:false;approved:false};
type Source=EggIdeaFormSource;
const errorText:Record<string,string>={
  rate_limited:"Лимит OpenAI. Попробуйте позже.",
  image_request_invalid:"OpenAI отклонил параметры изображения.",
  image_failed:"OpenAI не создал изображение. Проверьте доступ к модели.",
  model_not_authorized:"У этого API-ключа нет доступа к модели изображения.",
  openai_image_key_not_configured:"Ключ OpenAI для генерации не настроен.",
  invalid_image:"Модель не вернула корректное изображение.",
  storage_unavailable:"Хранилище изображений временно недоступно.",
  database_unavailable:"База данных временно недоступна.",
  invalid_idea:"Заполните текущее намерение Автора.",
  invalid_idea_photo:"Фото пространства некорректно. Загрузите его повторно.",
  study_limit_reached:"Для этой версии идеи доступны три исследования формы.",
  revision_conflict:"Проект изменился. Откройте страницу заново.",
  generation_failed:"Не удалось завершить генерацию. Причина записана в журнале EGG.",
};
/** Visualize this exact local Idea; old EGG cycles can belong to other ideas.
 * A different draft gets a different source ID and must never inherit
 * the image or the eight-sphere synthesis of a historical project.
 */
export default function EggFormStudyAccess({projectId,intent,constraints,
 savedDraft,materialInsight,materials,spacePhoto}:{
 projectId:string;intent:string;constraints:string;savedDraft:string;
 materialInsight:string;materials:{type:string;text:string}[];spacePhoto:string;
}){
 const [snapshot,setSnapshot]=useState<{revision:number;token:string}|null>(null);
 const [study,setStudy]=useState<FormStudy|null>(null);
 const [studies,setStudies]=useState<FormStudy[]>([]);
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState("");
 const source=useMemo<Source>(()=>normalizeEggIdeaFormSource({
  intent,constraints,draft:savedDraft,materialInsight,
  materials:materials.map(m=>({type:m.type,text:m.text})),spacePhoto,
 }),[intent,constraints,savedDraft,materialInsight,materials,spacePhoto]);
 const sourceId=useMemo(()=>eggIdeaFormSourceId(source),[source]);
 const canGenerate=source.intent.length>=8;
 useEffect(()=>{
  if(!projectId)return;
  let active=true;
  setSnapshot(null);
  void (async()=>{
   try{
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
    const result=await state.json() as {project:{id:string};revision:number};
    if(active&&result.project?.id===projectId&&Number.isInteger(result.revision))
      setSnapshot({revision:result.revision,token:data.session.access_token});
   }catch(e){
    if(active)setNotice(e instanceof Error?e.message:"Не удалось загрузить проект");
   }
  })();
  return()=>{active=false};
 },[projectId]);
 useEffect(()=>{
  if(!snapshot||!canGenerate)return;
  let active=true;
  setStudy(null);setStudies([]);
  const timer=setTimeout(()=>{void (async()=>{
   try{
    const response=await fetch("/api/egg-flow-ai?op=form-study&projectId="+
      encodeURIComponent(projectId)+"&synthesisId="+encodeURIComponent(sourceId),{
      cache:"no-store",headers:{Authorization:"Bearer "+snapshot.token},
    });
    const data=await response.json() as {ok?:boolean;study?:FormStudy|null;studies?:FormStudy[]};
    if(active&&response.ok&&data.ok){
     const available=data.studies??(data.study?[data.study]:[]);
     setStudies(available);setStudy(available[0]??null);
    }
   }catch{/* Image is optional; no fake local fallback. */}
  })();},300);
  return()=>{active=false;clearTimeout(timer);};
 },[snapshot,canGenerate,projectId,sourceId]);
 async function generate(){
  if(!snapshot||!canGenerate||busy)return;
  setBusy(true);setNotice("");
  try{
   const result=await fetch("/api/egg-flow-ai?op=form-study",{
    method:"POST",headers:{"Content-Type":"application/json",
      Authorization:"Bearer "+snapshot.token},
    body:JSON.stringify({projectId,expectedRevision:snapshot.revision,idea:source}),
   });
   const data=await result.json() as {ok?:boolean;error?:string;study?:FormStudy};
   if(!result.ok||!data.ok||!data.study)
    throw Error(errorText[data.error??""]??"Ошибка генерации образа");
   setStudy(data.study);
   setStudies(previous=>[data.study!,...previous.filter(v=>v.id!==data.study!.id)].slice(0,3));
   setNotice("Образ сохранён в проекте.");
  }catch(e){setNotice(e instanceof Error?e.message:"Не удалось создать образ");}
  finally{setBusy(false);}
 }
 return <section className="mb-4 space-y-3 rounded-xl border border-foreground/15 bg-background/60 p-3 sm:p-4"
   data-testid="egg-idea-form-access" aria-label="Проявление текущей идеи">
   <div className="flex flex-wrap items-center justify-between gap-2">
    <div>
     <h4 className="text-sm font-medium">Проявление формы · ИИ</h4>
     <p className="mt-1 text-[11px] leading-relaxed text-foreground/60">
      По текущей идее · {source.spacePhoto?"с фото реального пространства":"без фото пространства"} · не 3D
     </p>
    </div>
    <button type="button" onClick={()=>void generate()}
     disabled={!snapshot||!canGenerate||busy||studies.length>=3}
     data-testid="egg-generate-form-image"
     className="min-h-10 rounded-full border border-foreground/40 px-3 py-2 text-xs disabled:opacity-45">
     {busy?"Создаётся образ…":studies.length>=3?"3 варианта":study?"Новый вариант":"Создать образ"}
    </button>
   </div>
   {source.spacePhoto&&<p className="text-[11px] text-foreground/65" data-testid="egg-idea-image-reference-enabled">Фото интерьера включено как контекст среды · форма не копируется с фото</p>}
   {study&&<div className="space-y-2" data-testid="egg-generated-form-image">
    <img src={study.imageUrl} alt="Пробный образ формы по текущему замыслу Автора"
     className="mx-auto max-h-[480px] w-full max-w-[600px] rounded-xl object-contain"
     referrerPolicy="no-referrer"/>
    {studies.length>1&&<div className="flex items-center gap-2 overflow-x-auto pb-1" aria-label="Варианты исследования формы">
      {studies.slice().reverse().map((version,i)=><button key={version.id}
        type="button" onClick={()=>setStudy(version)}
        aria-label={"Показать вариант "+(i+1)}
        aria-pressed={study.id===version.id}
        className={"shrink-0 rounded-lg border p-1 transition-opacity "+
          (study.id===version.id?"border-foreground/60":"border-foreground/15 opacity-70")}>
        <img src={version.imageUrl} alt={"Вариант "+(i+1)}
          className="h-14 w-14 rounded object-cover" loading="lazy" referrerPolicy="no-referrer"/>
      </button>)}
     </div>}
    <details className="text-xs text-foreground/65">
     <summary className="cursor-pointer">Показать запрос к ИИ</summary>
     <p className="mt-2 max-h-36 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-foreground/[.035] p-3 font-mono text-[11px] leading-relaxed">{study.prompt}</p>
    </details>
   </div>}
   {notice&&<p role="status" className="text-xs text-foreground/70">{notice}</p>}
 </section>;
}

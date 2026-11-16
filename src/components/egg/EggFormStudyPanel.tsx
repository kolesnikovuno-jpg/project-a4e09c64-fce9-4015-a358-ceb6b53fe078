import {useEffect,useState} from "react";
import {createClient} from "@supabase/supabase-js";
import type {EggProject} from "../../lib/eggEngine";
import type {EggFlowCycle} from "../../lib/eggFlowCycle";

type Study={id:string;prompt:string;imageUrl:string;model:string;
  sourceKind:string;cycleId:string;synthesisId:string;createdAt:string;
  is3d:false;approved:false;};
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
  openai_image_key_not_configured:"На сервере не настроен ключ OpenAI для изображений.",
  study_limit_reached:"Лимит: три исследования формы для одного синтеза.",
  rate_limited:"Лимит API. Попробуйте позже.",
  model_not_authorized:"Текущий ключ API не имеет доступа к модели изображений.",
  image_failed:"Не удалось создать изображение. Списания/ошибку проверьте в OpenAI.",
  storage_unavailable:"Хранилище изображений временно недоступно.",
  revision_conflict:"Проект изменился. Обновите его состояние.",
};
export default function EggFormStudyPanel({project,cycle,revision,authorControls}:{
  project:EggProject;cycle:EggFlowCycle;revision:number|null;authorControls:boolean;
}){
  const synthesisId=cycle.synthesis?.id??"";
  const [study,setStudy]=useState<Study|null>(null);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");
  useEffect(()=>{
    if(!synthesisId||cycle.status==="running")return;
    let alive=true;
    setStudy(null);setNotice("");
    (async()=>{
      try{
        const token=await bearer();
        const url="/api/egg-form?projectId="+encodeURIComponent(project.id)+
          "&synthesisId="+encodeURIComponent(synthesisId);
        const response=await fetch(url,{cache:"no-store",headers:{Authorization:"Bearer "+token}});
        const value=await response.json() as {ok?:boolean;study?:Study|null};
        if(alive&&response.ok&&value.ok&&value.study)setStudy(value.study);
      }catch{/* The image is optional; no false generation result shown. */}
    })();
    return()=>{alive=false;};
  },[project.id,synthesisId,cycle.status]);
  async function generate(){
    if(!authorControls||revision===null||!synthesisId||busy)return;
    setBusy(true);setNotice("");
    try{
      const token=await bearer();
      const response=await fetch("/api/egg-form",{method:"POST",headers:{
        "Content-Type":"application/json",Authorization:"Bearer "+token,
      },body:JSON.stringify({
        projectId:project.id,synthesisId,expectedRevision:revision,
      })});
      const data=await response.json() as {ok?:boolean;error?:string;study?:Study};
      if(!response.ok||!data.ok||!data.study)
        throw Error(errors[data.error??""]??"Генерация недоступна. Проверьте подключение OpenAI.");
      setStudy(data.study);
      setNotice("Исследовательский образ сохранён в проекте.");
    }catch(e){setNotice(e instanceof Error?e.message:"Не удалось получить изображение.");}
    finally{setBusy(false);}
  }
  if(!cycle.synthesis||cycle.status==="running")return null;
  return <section className="mt-4 space-y-3 rounded-xl border border-foreground/15 p-3 sm:p-4"
    data-testid="egg-form-study-panel" aria-label="Исследование формы">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h4 className="text-sm font-medium">Проявление формы · ИИ</h4>
        <p className="mt-1 text-[11px] text-foreground/60">
          По синтезу восьми сфер · визуальная гипотеза, не 3D-модель
        </p>
      </div>
      {authorControls&&revision!==null&&<button type="button" disabled={busy}
        onClick={()=>void generate()} data-testid="egg-generate-form-image"
        className="rounded-full border border-foreground/40 px-3 py-2 text-xs disabled:opacity-50">
        {busy?"Создаётся образ…":study?"Новый вариант":"Создать образ"}
      </button>}
    </div>
    {study&&<div className="space-y-2" data-testid="egg-generated-form-image">
      <img src={study.imageUrl} alt="Исследовательский образ формы по синтезу EGG"
        className="mx-auto max-h-[480px] w-full max-w-[600px] rounded-xl object-contain"
        referrerPolicy="no-referrer"/>
      <details className="text-xs text-foreground/65">
        <summary className="cursor-pointer">Как ИИ интерпретировал идею</summary>
        <p className="mt-2 whitespace-pre-wrap leading-relaxed">{study.prompt}</p>
        <p className="mt-2 text-[11px]">Это изображение, не вращаемая 3D-модель. Авторское утверждение не выполнено.</p>
      </details>
    </div>}
    {notice&&<p role="status" className="text-xs text-foreground/70">{notice}</p>}
  </section>;
}

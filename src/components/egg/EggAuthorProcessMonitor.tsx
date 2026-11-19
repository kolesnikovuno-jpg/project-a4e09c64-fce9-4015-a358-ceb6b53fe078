import {useEffect,useState} from "react";
import {createClient} from "@supabase/supabase-js";
import {currentEggFlowCycle,EGG_FIXED_ROUTE} from "../../lib/eggFlowCycle";
import type {EggProject, SphereId} from "../../lib/eggEngine";

const levels=["Идея","Концепт","Прототип","Образец","Продукт"] as const;
const spheres:Record<SphereId,string>={
  marketing:"Маркетинг",design:"Дизайн",testDrive:"Тестдрайв",commerce:"Коммерция",
  legal:"Право",production:"Производство",procurement:"Комплектация",retail:"Ритейл",
};
const statuses:Record<string,string>={
  pending:"Ожидает",awaiting_result:"В работе",completed:"Готово",transited:"Пройдено",
};
export default function EggAuthorProcessMonitor({projectId,onOpenConcept,onOpenYolk}:{
  projectId:string;onOpenConcept?:()=>void;onOpenYolk?:()=>void;
}){
  const [project,setProject]=useState<EggProject|null>(null);
  const [revision,setRevision]=useState<number|null>(null);
  const [refresh,setRefresh]=useState(0);
  const [error,setError]=useState("");
  const [hint,setHint]=useState("");
  const [expanded,setExpanded]=useState(false);

  useEffect(()=>{
    let active=true;
    void(async()=>{try{
      const cfg=await fetch("/api/egg-config",{cache:"no-store"});
      if(!cfg.ok)throw Error("Нет связи с EGG");
      const c=await cfg.json() as {supabaseUrl:string;publishableKey:string};
      const client=createClient(c.supabaseUrl,c.publishableKey);
      const {data:{session}}=await client.auth.getSession();
      if(!session?.access_token)throw Error("Войдите в аккаунт EGG");
      const response=await fetch("/api/egg-project-state?project="+encodeURIComponent(projectId),{
        cache:"no-store",headers:{Authorization:"Bearer "+session.access_token},
      });
      if(!response.ok)throw Error("Не удалось загрузить состояние проекта");
      const state=await response.json() as {project:EggProject;revision:number};
      if(active){setProject(state.project);setRevision(state.revision);setError("");}
    }catch(e){if(active)setError(e instanceof Error?e.message:"Нет состояния");}})();
    return()=>{active=false;};
  },[projectId,refresh]);
  useEffect(()=>{
    const sync=()=>setRefresh(value=>value+1);
    window.addEventListener("egg:author-state-updated",sync);
    return()=>window.removeEventListener("egg:author-state-updated",sync);
  },[]);
  const cycle=project?currentEggFlowCycle(project):null;
  const canOpenConcept=Boolean(project&&project.level>=2&&onOpenConcept);
  function levelClick(index:number){
    if(index===1&&canOpenConcept){onOpenConcept?.();return;}
    if(index===0){setHint("Уровень Идея открыт. Переходы не меняют серверную ДНК.");return;}
    setHint(index+1>(project?.level??1)?
      "Уровень ещё не утверждён Автором. Открыть его без решения нельзя.":
      "История предыдущих уровней доступна в журнале цикла. Переключение не откатывает проект.");
  }
  return <section className="rounded-xl border border-foreground/15 bg-background/85 p-3 space-y-3"
    data-testid="egg-author-monitor" aria-label="Пульт Автора и уровни">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h3 className="text-sm font-medium">Пульт Автора</h3>
        <p className="text-[11px] text-foreground/60">
          {project?"Уровень "+project.level+"/5 · итерация "+project.iteration+
            (cycle?" · цикл "+cycle.status:" · без цикла"):"Загружаем уровень и восемь сфер"}
        </p>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={()=>setRefresh(v=>v+1)} className="rounded-full border border-foreground/20 px-3 py-2 text-xs">Обновить</button>
        <button type="button" onClick={onOpenYolk} disabled={!onOpenYolk}
          className="rounded-full border border-foreground/30 px-3 py-2 text-xs disabled:opacity-40"
          data-testid="egg-author-yolk-link">Желток · просмотр</button>
      </div>
    </div>
    <div role="group" aria-label="Уровни зрелости проекта" className="grid grid-cols-5 gap-1.5">
      {levels.map((title,i)=><button key={title} type="button"
        onClick={()=>levelClick(i)} aria-current={project?.level===i+1?"step":undefined}
        className={"min-w-0 rounded-lg border px-1 py-2 text-center text-[10px] leading-tight "+
          (project?.level===i+1?"border-[#607466] bg-[#607466]/10 text-foreground":
           "border-foreground/10 text-foreground/50")}
        data-testid={"egg-maturity-level-"+(i+1)}>
        <span className="mb-1 block text-[11px] font-medium">{i+1}</span>
        <span className="break-words">{title}</span>
      </button>)}
    </div>
    <div>
      <button type="button" className="w-full text-left text-xs font-medium"
        aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)}
        data-testid="egg-author-sphere-monitor">
        Восемь сфер · {cycle?"состояние текущего цикла":"исследовательский контур"} {expanded?"−":"+"}
      </button>
      <div className="mt-2 grid grid-cols-8 gap-1">
        {EGG_FIXED_ROUTE.map(id=>{
          const visit=cycle?[...cycle.first,...cycle.second].find(v=>v.sphere===id):null;
          return <span key={id} title={spheres[id]+": "+(visit?statuses[visit.status]:"не запущена")}
            className={"h-1.5 rounded-full "+(visit?.status==="completed"||visit?.status==="transited"?
              "bg-[#607466]":visit?.status==="awaiting_result"?"bg-[#ba9c62]":"bg-foreground/15")}/>;
        })}
      </div>
      {expanded&&<div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {EGG_FIXED_ROUTE.map(id=>{
          const visit=cycle?[...cycle.first,...cycle.second].find(v=>v.sphere===id):null;
          return <div key={id} className="rounded-lg border border-foreground/10 p-2">
            <p className="text-xs">{spheres[id]}</p>
            <p className="mt-1 text-[10px] text-foreground/55">
              {visit?statuses[visit.status]:"Исследование Идеи"}
            </p>
          </div>;
        })}
      </div>}
      {!cycle&&<p className="mt-2 text-[11px] leading-relaxed text-foreground/55">
        До утверждения ДНК — внешнее исследование намерения и Материального.
        Автоматический восьмисферный цикл ещё не запускался.
      </p>}
    </div>
    {project?.seed.text&&<p className="text-[11px] text-foreground/65">
      Исходная ДНК сохранена на сервере · версия проекта {revision}.
    </p>}
    {error&&<p role="status" className="text-[11px] text-foreground/60">{error}</p>}
    {hint&&<p role="status" className="text-xs text-foreground/70">{hint}</p>}
  </section>;
}

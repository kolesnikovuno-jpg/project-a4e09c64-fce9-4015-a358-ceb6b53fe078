import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft } from "lucide-react";
import EggYolkViewer from "./EggYolkViewer";
import { EGG_SPHERES, type SphereId } from "../../lib/eggEngine";

type Finding={id:string;text:string;evidence:string;sourceRefs?:string[];submittedAt?:string};
type Decision={id:string;outcome:string;reason:string};
type Task={id:string;sphere:string;status:string;question:string;findings:Finding[];decisions:Decision[];sourceConceptId?:string};
type Concept={id:string;status:string;text:string;visualUrl?:string;questions?:Array<{sphere:string;question:string}>;createdAt:string};
type Artifact={id:string;title:string;mimeType:string;webUrl?:string;sphere?:string;collectionKey:string;status:string};
type Project={id:string;title?:string;seed:{text:string};level:number;iteration:number;tasks:Task[];concepts?:Concept[];artifacts?:Artifact[]};
type SphereMeta={id:SphereId;name:string;tag:string;detail:string;angle:number;accent:string};

export const YOLK_SPHERES:SphereMeta[]=[
  {id:"marketing",name:"Маркетинг",tag:"Рынок и ценность",detail:"Потребности, сегменты, контекст, гипотезы ценности",angle:-90,accent:"#9a986e"},
  {id:"legal",name:"Право",tag:"Границы",detail:"Права, авторство, условия, ограничения",angle:-45,accent:"#a17c70"},
  {id:"production",name:"Производство",tag:"Технология",detail:"Узлы, сборка, возможности изготовления",angle:0,accent:"#8b876e"},
  {id:"procurement",name:"Материя",tag:"Ресурсы",detail:"Материалы, комплектующие, источники, доступность",angle:45,accent:"#958b72"},
  {id:"retail",name:"Ритейл",tag:"Доступ",detail:"Предложение, каналы, передача пользователю",angle:90,accent:"#8a958c"},
  {id:"commerce",name:"Коммерция",tag:"Экономика",detail:"Затраты, цена, модели обмена",angle:135,accent:"#8d869c"},
  {id:"testDrive",name:"Тестдрайв",tag:"Проверка",detail:"Пользовательский опыт, свойства, испытания",angle:180,accent:"#7c9994"},
  {id:"design",name:"Дизайн",tag:"Форма",detail:"Образ, функция, пластика, пропорции",angle:225,accent:"#9b8e79"},
];

const stateLabels:Record<string,string>={
  question:"Вопрос поставлен", working:"В работе", returned:"Ждёт решения Автора",
  accepted:"Принято Автором", revision_requested:"На доработке",
  rejected:"Отклонено",none:"Нет заданий",
};
function summarize(tasks:Task[]){
  if(!tasks.length)return {code:"none",label:"Нет заданий"};
  for(const code of ["returned","revision_requested","working","question","accepted","rejected"]){
    if(tasks.some(t=>t.status===code))return {code,label:stateLabels[code]};
  }
  return {code:"none",label:"Без статуса"};
}
function brief(value:string,limit=195){
  const cleaned=value.replace(/\s+/g," ").trim();
  return cleaned.length<=limit?cleaned:cleaned.slice(0,limit).trimEnd()+"…";
}
function conception(project:Project|null){
  if(!project)return null;
  return [...(project.concepts??[])].reverse().find(c=>c.status==="accepted")
    ?? [...(project.concepts??[])].reverse().find(c=>c.status==="proposed")
    ?? [...(project.concepts??[])].reverse()[0]??null;
}
const demoSeed="Лёгкое кресло для отдыха, расслабления и медитации. Дерево, фанера, натуральный лён; воздушная форма, мягкий контур, низкая посадка.";
const demoConcept="Кресло A «Объятие». Полулежачая низкая посадка, мягкая поддержка тела, открытый пространственный контур. Покой и уединение — смысловое ядро. Конструкция и точные пропорции требуют исследования.";


/** Reuses the same 26 ms character-by-character reveal as the original Egg page. */
function YolkTypewriter({title,description,number,side}:{title:string;description:string;number:string;side:"left"|"right"}){
  const full=title+"\n"+description;
  const [length,setLength]=useState(0);
  useEffect(()=>{
    if(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches){setLength(full.length);return;}
    setLength(0);
    let i=0;
    const timer=window.setInterval(()=>{
      i=Math.min(full.length,i+1);
      setLength(i);
      if(i===full.length)window.clearInterval(timer);
    },26);
    return()=>window.clearInterval(timer);
  },[full]);
  return <div className="w-full min-w-0 text-left" data-testid={"yolk-"+side+"-typing"}>
    <p className="mb-3 text-[10px] font-light uppercase tracking-[0.16em] text-foreground/40">{number}</p>
    <h2 className="min-h-[32px] text-[24px] font-extralight leading-tight tracking-[-0.03em] text-foreground/85" aria-hidden="true">{full.slice(0,Math.min(length,title.length))}</h2>
    <p className="mt-2 min-h-[70px] text-[13px] font-light leading-[1.8] tracking-[0.01em] text-foreground/65" aria-hidden="true">
      {full.slice(title.length+1,length)}
      {length>title.length&&length<full.length&&<span className="unocalc-type-caret" aria-hidden="true">▍</span>}
    </p>
    <span className="sr-only" role="status">{title}. {description}</span>
  </div>;
}

export default function EggYolkExperience(){
  const [params]=useSearchParams();
  const id=params.get("project");
  const [project,setProject]=useState<Project|null>(null);
  const [revision,setRevision]=useState<number|null>(null);
  const [selected,setSelected]=useState<SphereId|null>(null);
  const [expanded,setExpanded]=useState(false);
  const [loading,setLoading]=useState(Boolean(id));
  const [notice,setNotice]=useState("");
  const [local3d,setLocal3d]=useState<string|null>(null);
  const [showDna,setShowDna]=useState(false);
  const [refresh,setRefresh]=useState(0);
  useEffect(()=>{
    if(!id){setProject(null);setRevision(null);setLoading(false);return;}
    let active=true;
    setLoading(true);setNotice("");
    (async()=>{
      try{
        const res=await fetch("/api/egg-config",{cache:"no-store"});
        if(!res.ok)throw Error("Сервер EGG недоступен.");
        const cfg=await res.json() as {supabaseUrl:string;publishableKey:string};
        const client=createClient(cfg.supabaseUrl,cfg.publishableKey);
        const {data}=await client.auth.getSession();
        if(!data.session?.access_token)throw Error("Для просмотра данных этого проекта войдите в аккаунт EGG.");
        const response=await fetch("/api/egg-project-state?project="+encodeURIComponent(id),{
          cache:"no-store",headers:{Authorization:"Bearer "+data.session.access_token}
        });
        if(!response.ok)throw Error(response.status===404?"Проект не найден или нет доступа.":"Не удалось получить данные проекта.");
        const dataState=await response.json() as {revision:number;project:Project};
        if(active){setProject(dataState.project);setRevision(dataState.revision);setNotice("");}
      }catch(e){
        if(active){setProject(null);setRevision(null);setNotice(e instanceof Error?e.message:"Ошибка подключения к EGG.")}
      }finally{if(active)setLoading(false);}
    })();
    return()=>{active=false};
  },[id,refresh]);
  const concept=useMemo(()=>conception(project),[project]);
  const approved=concept?.status==="accepted";
  const currentText=concept?.text??project?.seed.text??demoConcept;
  const candidateText=concept?.status==="proposed";
  const dna=project?.seed.text??demoSeed;
  const selectedMeta=YOLK_SPHERES.find(s=>s.id===selected)??null;
  const sphereTasks=(project?.tasks??[]).filter(t=>t.sphere===selected);
  const sphereArtifacts=(project?.artifacts??[]).filter(a=>a.sphere===selected);
  const sphereStatus=summarize(sphereTasks);
  useEffect(()=>{
    if(!expanded)return;
    const before=document.body.style.overflow;
    document.body.style.overflow="hidden";
    const key=(event:KeyboardEvent)=>{if(event.key==="Escape")setExpanded(false);};
    window.addEventListener("keydown",key);
    return()=>{document.body.style.overflow=before;window.removeEventListener("keydown",key);};
  },[expanded]);
  const approvedWork=(project?.tasks??[]).filter(t=>t.status==="accepted").length;
  const pendingWork=(project?.tasks??[]).filter(t=>t.status==="returned").length;

  const leftCopy=selectedMeta
    ? brief(EGG_SPHERES[selectedMeta.id].purpose,165)
    : "Исходная идея Автора остаётся основой всех изменений. Форму развивают восемь взаимосвязанных сфер.";
  const lastTask=sphereTasks[sphereTasks.length-1];
  const lastFinding=lastTask?.findings?.[lastTask.findings.length-1]?.text;
  const rightCopy=selectedMeta
    ? (sphereTasks.length
        ? brief(lastFinding??lastTask.question,185)
        : project ? "В этой сфере пока нет зарегистрированных результатов." : "Это ознакомительный режим. Данные реального проекта здесь не показаны.")
    : brief(currentText,185);
  const selectSphere=(sphere:SphereId)=>{
    setSelected(current=>current===sphere?null:sphere);
    setExpanded(false);
    setShowDna(false);
  };
  return (
    <div className="min-h-screen bg-background font-body text-foreground" data-testid="yolk-experience">
      <main className="mx-auto w-full max-w-[1580px] px-5 pb-10 pt-6 sm:px-7 lg:px-10">
        <header className="flex flex-wrap items-center justify-between gap-4 pb-5">
          <div className="flex items-center gap-5">
            <Link to={id?"/egg?project="+encodeURIComponent(id):"/egg/demo"} className="text-[12px] font-light text-foreground/65 underline-offset-4 hover:underline"><ArrowLeft size={14} className="mr-1 inline"/> К Яйцу</Link>
            <h1 className="text-[26px] font-extralight leading-none tracking-[-0.04em] text-foreground/85">EGG <span className="text-foreground/30">/</span> YOLK</h1>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[11px] font-light text-foreground/50">
            <span>{project?"Проект EGG · "+(project.title??"без названия"):"Демонстрация · кресло"}</span>
            {project&&<button type="button" onClick={()=>setRefresh(v=>v+1)} className="border-b border-foreground/25 pb-1 hover:text-foreground">Обновить</button>}
          </div>
        </header>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-foreground/10 pt-4 text-[10px] font-light uppercase tracking-[0.16em] text-foreground/40">
          <span>Формирующийся объект / 08 сфер</span>
          <span>Уровень {project?.level??"—"} · Цикл {project?.iteration??"—"}{revision!==null?" · Rev. "+revision:""}</span>
        </div>

        <div className="mx-auto mt-4 grid w-full items-center gap-x-4 gap-y-6 lg:grid-cols-[minmax(165px,1fr)_minmax(440px,720px)_minmax(165px,1fr)] xl:gap-x-8">
          <aside className="order-2 min-w-0 self-center pb-1 lg:order-1" aria-label="Название и назначение">
            <YolkTypewriter key={"left-"+(selected??"dna")} side="left"
              number={selectedMeta?"Сфера / "+String(YOLK_SPHERES.indexOf(selectedMeta)+1).padStart(2,"0"):"ДНК / исходный замысел"}
              title={selectedMeta?selectedMeta.name:"ДНК продукта"}
              description={leftCopy}/>
            <p className="mt-4 text-[11px] font-light text-foreground/45">{selectedMeta?selectedMeta.tag:"Концепция — постоянный ориентир"}</p>
          </aside>

          <section className="relative order-1 min-w-0 lg:order-2" aria-label="Крупная пространственная модель и восемь сфер">
            <div className="relative mx-auto aspect-[760/700] w-full max-w-[720px]" data-testid="yolk-orbit-stage">
              <div className="absolute inset-[1%] z-0" data-testid="yolk-central-object">
                <EggYolkViewer onFileChange={setLocal3d} level={project?.level??1} iteration={project?.iteration??1} projectId={project?.id}/>
              </div>
              <svg viewBox="0 0 760 700" className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible" aria-label="Восемь интерактивных функциональных сфер">
                <ellipse cx="380" cy="350" rx="290" ry="265" fill="none" stroke="currentColor" strokeOpacity=".16" strokeWidth=".9" vectorEffect="non-scaling-stroke"/>
                <line x1="380" y1="75" x2="380" y2="625" stroke="currentColor" strokeOpacity=".11" strokeDasharray="4 9" strokeWidth=".7" vectorEffect="non-scaling-stroke"/>
                {YOLK_SPHERES.map(s=>{
                  const angle=s.angle*Math.PI/180;
                  const x=380+290*Math.cos(angle);
                  const y=350+265*Math.sin(angle);
                  const active=selected===s.id;
                  const sphereState=summarize((project?.tasks??[]).filter(t=>t.sphere===s.id));
                  return <g key={s.id}>
                    {active&&<line x1="380" y1="350" x2={x} y2={y} stroke="hsl(var(--primary))" strokeOpacity=".23" strokeWidth=".9" strokeDasharray="3 8" vectorEffect="non-scaling-stroke"/>}
                    <circle cx={x} cy={y} r="10.5"
                      fill={active?"hsl(var(--primary) / 0.16)":"hsl(var(--background))"}
                      stroke={active?"hsl(var(--primary))":"currentColor"}
                      strokeOpacity={active?".95":".72"}
                      strokeWidth="1.1" vectorEffect="non-scaling-stroke"/>
                    {project&&sphereState.code!=="none"&&<circle cx={x+9} cy={y-9} r="2.5" fill={sphereState.code==="returned"?"#c49d65":sphereState.code==="accepted"?"hsl(var(--primary))":"currentColor"} opacity=".65"/>}
                    <circle data-testid={"yolk-orbit-"+s.id} cx={x} cy={y} r="25"
                      fill="transparent" stroke="none" pointerEvents="all" role="button" tabIndex={0}
                      aria-label={"Открыть сферу "+s.name} aria-pressed={active}
                      className="cursor-pointer focus-visible:stroke-primary focus-visible:stroke-[1.5px]"
                      onClick={()=>selectSphere(s.id)}
                      onKeyDown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();selectSphere(s.id);}}}>
                      <title>{s.name}</title>
                    </circle>
                  </g>;
                })}
              </svg>
              <button type="button" onClick={()=>{setSelected(null);setShowDna(false);setExpanded(false);}}
                className="absolute right-[5%] top-[12%] z-20 border-b border-foreground/30 pb-1 text-[11px] font-light tracking-[0.03em] text-foreground/65 hover:text-foreground">
                ДНК / концепт
              </button>
            </div>
          </section>

          <aside className="order-3 min-w-0 self-center pb-1" aria-label="Краткий вывод и развернутая информация" aria-live="polite">
            <YolkTypewriter key={"right-"+(selected??"dna")} side="right"
              number={selectedMeta?(project?sphereStatus.label:"Вклад сферы"):"Формирование / концепция"}
              title={selectedMeta?"Текущий вклад":approved?"Концепция принята":"Концепция"}
              description={rightCopy}/>
            <button type="button" data-testid="yolk-expand" onClick={()=>setExpanded(true)}
              className="mt-3 border-b border-foreground/35 pb-1 text-left text-[11px] font-light text-foreground/75 hover:text-foreground">Развернуть →</button>
            {loading&&<p className="mt-4 text-[11px] text-foreground/45" role="status">Читаем проект…</p>}
            {notice&&<p className="mt-4 text-[11px] leading-relaxed text-foreground/65" role="status">{notice} <Link to="/egg/connect" className="underline underline-offset-4">Войти</Link></p>}
          </aside>
        </div>

        <footer className="mt-7 flex flex-wrap justify-between gap-3 border-t border-foreground/10 pt-4 text-[11px] font-light text-foreground/45">
          <span>Вращение модели — мышь / жест · Масштаб — колесо</span>
          <span>{local3d?"GLB открыт локально; не сохранён в проекте":"Параметрический эскиз · GLB создаётся локально"} · {project?"Чтение данных EGG":"Без изменения проектов"}</span>
        </footer>
      </main>

      {expanded&&<div className="fixed inset-0 z-[110] flex items-end justify-end bg-black/30 backdrop-blur-[2px] sm:items-stretch" onMouseDown={event=>{if(event.target===event.currentTarget)setExpanded(false);}}>
        <section role="dialog" aria-modal="true" aria-label={selectedMeta?"Подробнее о сфере "+selectedMeta.name:"ДНК продукта"}
          data-testid="yolk-expanded" className="flex max-h-[95dvh] w-full max-w-[640px] flex-col overflow-hidden rounded-t-2xl border-l border-foreground/15 bg-background text-foreground shadow-xl sm:max-h-[100dvh] sm:rounded-none">
          <header className="flex shrink-0 items-center justify-between border-b border-foreground/10 px-6 py-5">
            <div>
              <p className="text-[10px] font-light uppercase tracking-[0.16em] text-foreground/45">EGG / YOLK · полная информация</p>
              <h2 className="mt-2 text-[26px] font-extralight tracking-[-0.03em]">{selectedMeta?selectedMeta.name:"ДНК продукта"}</h2>
            </div>
            <button type="button" autoFocus aria-label="Закрыть" onClick={()=>setExpanded(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-foreground/20 text-[22px] font-light">×</button>
          </header>
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-7 text-[13px] font-light leading-relaxed">
            {selectedMeta?<>
              <div><p className="text-[10px] uppercase tracking-[0.12em] text-foreground/40">Назначение сферы</p>
                <p className="mt-2">{EGG_SPHERES[selectedMeta.id].purpose}</p>
                <p className="mt-2 text-foreground/60">{EGG_SPHERES[selectedMeta.id].boundary}</p>
              </div>
              <div><p className="text-[10px] uppercase tracking-[0.12em] text-foreground/40">Основной вопрос</p>
                <p className="mt-2">{EGG_SPHERES[selectedMeta.id].question}</p></div>
              <div><p className="text-[10px] uppercase tracking-[0.12em] text-foreground/40">Задачи и выводы · {sphereTasks.length}</p>
                {sphereTasks.length?sphereTasks.map(t=><article key={t.id} className="mt-3 border-t border-foreground/10 pt-3">
                  <p className="text-[11px] text-foreground/50">{t.id} · {stateLabels[t.status]??t.status}</p>
                  <p className="mt-2 whitespace-pre-wrap">{t.question}</p>
                  {t.findings?.map(f=><div key={f.id} className="mt-3 border-l border-foreground/20 pl-3">
                    <p className="text-[10px] text-foreground/50">{f.evidence==="hypothesis"?"Гипотеза":f.evidence==="observation"?"Наблюдение":"Вопрос"} · {f.id}</p>
                    <p className="mt-1 whitespace-pre-wrap">{f.text}</p>
                    {Boolean(f.sourceRefs?.length)&&<p className="mt-2 break-all text-[10px] text-foreground/50">Источники: {f.sourceRefs?.join(", ")}</p>}
                  </div>)}
                  {Boolean(t.decisions?.length)&&<p className="mt-3 text-[11px] text-foreground/60">Решения: {t.decisions.map(d=>d.outcome).join(", ")}</p>}
                </article>):<p className="mt-3 text-foreground/55">Результатов пока нет.</p>}
              </div>
              <div><p className="text-[10px] uppercase tracking-[0.12em] text-foreground/40">Материалы · {sphereArtifacts.length}</p>
                {sphereArtifacts.length?sphereArtifacts.map(a=><p key={a.id} className="mt-3">
                  <span className="text-foreground/50">{a.status==="author_confirmed"?"Подтверждено":"Ожидает подтверждения"} · </span>
                  {a.webUrl?<a href={a.webUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{a.title}</a>:a.title}
                </p>):<p className="mt-3 text-foreground/55">Нет зарегистрированных файлов.</p>}
              </div>
              {project&&<Link to={"/egg?project="+encodeURIComponent(project.id)+"&start="+selectedMeta.id} className="inline-block border-b border-foreground/35 pb-1">Открыть рабочее пространство сферы ↗</Link>}
            </>:<>
              <div><p className="text-[10px] uppercase tracking-[0.12em] text-foreground/40">Концепция / {project?(approved?"утверждена":candidateText?"на рассмотрении":"не утверждена"):"демонстрация"}</p>
                <p className="mt-3 whitespace-pre-wrap">{currentText}</p></div>
              <button type="button" onClick={()=>setShowDna(value=>!value)} className="border-b border-foreground/35 pb-1 text-[11px]">{showDna?"Свернуть исходную идею":"Показать исходную идею"}</button>
              {showDna&&<p className="whitespace-pre-wrap border-l border-foreground/20 pl-4">{dna}</p>}
              <div className="grid grid-cols-2 gap-3 border-t border-foreground/10 pt-4 text-[11px]">
                <p>Принято задач: {project?approvedWork:"—"}</p><p>Ждут Автора: {project?pendingWork:"—"}</p>
              </div>
              {project&&<Link to={"/egg?project="+encodeURIComponent(project.id)+"&start=idea"} className="inline-block border-b border-foreground/35 pb-1">Перейти к концепции Автора ↗</Link>}
            </>}
          </div>
        </section>
      </div>}
    </div>
  );
}

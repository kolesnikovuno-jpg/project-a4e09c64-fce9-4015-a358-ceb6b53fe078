import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, ArrowUpRight, BookOpenText, ChevronDown, CircleDot, Fingerprint, Layers3, Maximize2, Rotate3D, X } from "lucide-react";
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
  const isDemo=!project;
  const projectName=project?.title?(project.title.length>90?"Проект EGG · "+brief(project.title,58):project.title):"Кресло A «Объятие»";
  const mainTitle=project?(project.title?.includes("кресл")?"Кресло · рабочая форма":"Формирующийся продукт"):"Кресло · Объятие";
  const currentText=concept?.text??project?.seed.text??demoConcept;
  const candidateText=concept?.status==="proposed";
  const dna=project?.seed.text??demoSeed;
  const selectedMeta=YOLK_SPHERES.find(s=>s.id===selected)??null;
  const sphereTasks=(project?.tasks??[]).filter(t=>t.sphere===selected);
  const sphereArtifacts=(project?.artifacts??[]).filter(a=>a.sphere===selected);
  const sphereStatus=summarize(sphereTasks);
  const approvedWork=(project?.tasks??[]).filter(t=>t.status==="accepted").length;
  const pendingWork=(project?.tasks??[]).filter(t=>t.status==="returned").length;
  return <div className="min-h-screen bg-[#f4f3ee] text-[#3b403d] dark:bg-[#101615] dark:text-[#e0e3db]" data-testid="yolk-experience">
    <div className="mx-auto max-w-[1580px] px-3 pb-12 pt-4 sm:px-7 sm:pt-7">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#7c8580]/20 pb-5">
        <div className="flex items-center gap-4 sm:gap-7">
          <Link to={id?"/egg?project="+encodeURIComponent(id):"/egg/demo"} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-current/15 px-3 text-[11px] opacity-70 hover:opacity-100"><ArrowLeft size={14}/> К яйцу</Link>
          <span className="font-light text-xl tracking-[-.075em] sm:text-[27px]">EGG <span className="font-normal text-[#b39260]">/</span> YOLK</span>
          <span className="hidden border-l border-current/15 pl-5 text-[10px] uppercase tracking-[.22em] opacity-50 sm:block">Product formation / 09</span>
        </div>
        <div className="flex items-center gap-3">
          {project&&<button type="button" onClick={()=>setRefresh(v=>v+1)} className="rounded-full border border-current/15 px-3 py-2 text-xs opacity-70 hover:opacity-100">Обновить состояние</button>}
          <span className="rounded-full border border-[#b99c6e]/45 bg-[#b99c6e]/10 px-3 py-2 text-[10px] tracking-[.08em]">{project?"ДАННЫЕ EGG":"ДЕМОНСТРАЦИЯ"}</span>
        </div>
      </header>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4 px-1">
        <div>
          <p className="mb-2 text-[10px] uppercase tracking-[.25em] text-[#9b8b72]">09 / Интеграционное ядро</p>
          <h1 className="font-light text-[34px] leading-[1.1] tracking-[-.045em] sm:text-[48px]">Желток <span className="font-thin text-[#b6aa98]">/</span> форма</h1>
          <p className="mt-2 max-w-[680px] text-[12px] leading-relaxed opacity-65">Продукт в центре. Восемь сфер по периметру. Выберите сферу, чтобы увидеть её текущий вклад.</p>
        </div>
        <div className="flex items-center gap-3 text-[11px] opacity-70">
          <span>Уровень {project?.level??"—"}</span><span className="h-3 w-px bg-current/20"/><span>Цикл {project?.iteration??"—"}</span>
          {revision!==null&&<><span className="h-3 w-px bg-current/20"/><span>Rev. {revision}</span></>}
        </div>
      </div>
      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_340px] xl:gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section aria-label="Центральная модель продукта и восемь сфер" className="relative isolate overflow-hidden rounded-[28px] border border-[#8d9085]/20 bg-[radial-gradient(ellipse_at_50%_36%,#fffef9_0%,#f5f1e8_51%,#ebe9e0_100%)] shadow-[0_20px_90px_rgba(74,67,54,.055)] dark:bg-[radial-gradient(ellipse_at_50%_34%,#333a36_0%,#1c2421_55%,#111a17_100%)]">
          <div className="pointer-events-none absolute left-6 top-6 z-10 flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-[.23em] opacity-50">Current object / {project?.iteration??"01"}</span>
            <span className="max-w-[240px] text-xs font-medium leading-snug sm:max-w-[350px] sm:text-sm">{mainTitle}</span>
            <span className="text-[10px] text-[#99856b]">{project?(approved?"Концепция принята":candidateText?"Концепция предложена":"Концепция не утверждена"):"Эскизное направление A"}</span>
          </div>
          <div className="pointer-events-none absolute right-6 top-6 z-10 text-[10px] uppercase tracking-[.18em] opacity-40">08 / spheres</div>
          <div className="relative mx-auto aspect-[1/1.04] w-full max-w-[920px] min-h-[430px] sm:aspect-[1.18/1] sm:min-h-[590px]">
            <div className="pointer-events-none absolute inset-[6%] rounded-full border border-[#b4a68e]/20 sm:inset-[8%]" />
            <div className="pointer-events-none absolute inset-[16%] rounded-full border border-[#b4a68e]/15 sm:inset-[20%]" />
            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
              {YOLK_SPHERES.map(s=>{const a=s.angle*Math.PI/180,x=500+410*Math.cos(a),y=500+410*Math.sin(a);return <line key={s.id} x1="500" y1="500" x2={x} y2={y} stroke={s.accent} strokeWidth={selected===s.id?1.8:.8} strokeOpacity={selected===s.id?.26:.10} strokeDasharray={selected===s.id?"":"4 8"}/>})}
            </svg>
            <div className="absolute inset-[20%] sm:inset-[17%]">
              <EggYolkViewer onFileChange={setLocal3d}/>
            </div>
            {YOLK_SPHERES.map((s,index)=>{
              const a=s.angle*Math.PI/180;
              const x=50+41*Math.cos(a),y=50+41*Math.sin(a);
              const status=summarize((project?.tasks??[]).filter(t=>t.sphere===s.id));
              const active=selected===s.id;
              return <button key={s.id} type="button" onClick={()=>{setSelected(s.id);setExpanded(false);setShowDna(false)}} aria-label={"Показать вклад сферы "+s.name} aria-pressed={active}
                data-testid={"yolk-orbit-"+s.id}
                style={{left:x+"%",top:y+"%",borderColor:active?s.accent:undefined}}
                className={"absolute z-20 flex h-[65px] w-[76px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-2xl border bg-[#f8f6ef]/95 px-1 shadow-[0_5px_24px_rgba(60,57,50,.065)] backdrop-blur-sm transition-all hover:scale-[1.05] hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9ab7a] dark:bg-[#202b26]/95 sm:h-[78px] sm:w-[98px] "+(active?"border-2 shadow-[0_7px_28px_rgba(176,144,91,.18)]":"border-[#79786e]/20")} >
                <span className="flex items-center gap-1 text-[10px] opacity-45"><span className="font-mono">{String(index+1).padStart(2,"0")}</span><span className="h-1.5 w-1.5 rounded-full" style={{background:status.code==="returned"?"#b67f50":status.code==="accepted"?"#7b997b":status.code==="working"?"#b9a96b":"#bdbab0"}}/></span>
                <span className="max-w-full break-words text-center text-[10px] font-medium leading-[1.15] tracking-[-.025em] sm:text-[12px]">{s.name}</span>
              </button>;
            })}
            <button type="button" onClick={()=>{setSelected(null);setExpanded(false);setShowDna(v=>!v)}} className="absolute bottom-[11%] left-1/2 z-20 -translate-x-1/2 rounded-full border border-[#9e8b6d]/30 bg-[#f9f7f0]/90 px-4 py-2 text-[11px] text-[#796649] shadow-sm hover:border-[#9e8b6d] dark:bg-[#28312b]/90 dark:text-[#e9d8b3]">
              <Fingerprint size={14} className="mr-1.5 inline"/> ДНК / концепт
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#7c8580]/15 px-5 py-3 text-[10px] opacity-60 sm:px-7">
            <span><Rotate3D size={13} className="mr-1.5 inline"/> Вращение: жест / мышь · Масштаб: колесо</span>
            <span>{local3d?"GLB только в этом браузере":"Форма условная · геометрия не утверждена"}</span>
          </div>
        </section>
        <aside aria-live="polite" className="min-h-[330px] overflow-hidden rounded-[28px] border border-[#8d9085]/20 bg-white/70 shadow-[0_10px_50px_rgba(74,67,54,.035)] dark:bg-white/[.04] lg:sticky lg:top-5" data-testid="yolk-information-panel">
          <div className="border-b border-current/10 px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] uppercase tracking-[.20em] opacity-50">{selectedMeta?"Сфера / "+String(YOLK_SPHERES.indexOf(selectedMeta)+1).padStart(2,"0"):"Паспорт формы / DNA"}</p>
              {selected&&<button type="button" onClick={()=>{setSelected(null);setExpanded(false)}} aria-label="Вернуться к ДНК" className="rounded-full p-1 opacity-50 hover:opacity-100"><X size={16}/></button>}
            </div>
            <h2 className="mt-2 text-[25px] font-light tracking-[-.04em]">{selectedMeta?selectedMeta.name:"ДНК продукта"}</h2>
            <p className="mt-1 text-[11px] opacity-60">{selectedMeta?selectedMeta.detail:"Замысел, на который ориентируется формирующаяся форма"}</p>
          </div>
          {selectedMeta ? <div className="space-y-4 px-5 py-5 sm:px-6">
            <div className="flex items-center justify-between gap-2 rounded-xl border border-current/10 px-3 py-3">
              <div><p className="text-[10px] uppercase tracking-[.13em] opacity-45">Состояние</p><p className="mt-1 text-[12px] font-medium">{project?sphereStatus.label:"Нет серверных данных"}</p></div>
              <CircleDot size={19} style={{color:selectedMeta.accent}}/>
            </div>
            <div>
              <h3 className="text-[10px] uppercase tracking-[.15em] opacity-45">Задача ядра</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed">{EGG_SPHERES[selectedMeta.id].question}</p>
            </div>
            <div>
              <h3 className="text-[10px] uppercase tracking-[.15em] opacity-45">Текущий вклад</h3>
              {sphereTasks.length ? <>
                <p className="mt-1.5 text-[12px] leading-relaxed opacity-80">{brief(sphereTasks[sphereTasks.length-1].findings?.slice(-1)[0]?.text??sphereTasks[sphereTasks.length-1].question,240)}</p>
                <p className="mt-2 text-[10px] opacity-45">Задач: {sphereTasks.length} · Принято: {sphereTasks.filter(t=>t.status==="accepted").length}</p>
              </> : <p className="mt-1.5 text-[12px] leading-relaxed opacity-55">{project?"Результаты пока не зарегистрированы. Это не означает, что сфера завершена.":"В демонстрации нет вымышленных результатов. При входе в проект здесь появятся реальные данные."}</p>}
            </div>
            {sphereTasks.some(t=>t.status==="returned")&&<div className="rounded-lg border border-[#b48c54]/25 bg-[#c1a06b]/[.09] p-3 text-[11px]">Есть результат, ожидающий решения Автора.</div>}
            <button type="button" onClick={()=>setExpanded(v=>!v)} aria-expanded={expanded} className="flex w-full items-center justify-between rounded-xl border border-current/15 px-4 py-3 text-[12px] hover:border-current/35">
              {expanded?"Свернуть":"Развернуть информацию"} <ChevronDown size={15} className={expanded?"rotate-180 transition-transform":"transition-transform"}/>
            </button>
            {expanded&&<div className="space-y-4 border-t border-current/10 pt-4" data-testid="yolk-expanded">
              <div><h3 className="mb-2 text-[11px] font-medium">Назначение</h3><p className="text-[12px] leading-relaxed opacity-75">{EGG_SPHERES[selectedMeta.id].purpose}</p><p className="mt-2 text-[12px] leading-relaxed opacity-55">{EGG_SPHERES[selectedMeta.id].boundary}</p></div>
              <div><h3 className="mb-2 text-[11px] font-medium">Задачи и результаты</h3>{sphereTasks.length?sphereTasks.map(t=><div key={t.id} className="mb-3 rounded-lg border border-current/10 p-3">
                <p className="text-[10px] uppercase tracking-[.12em] opacity-45">{t.id} · {stateLabels[t.status]??t.status}</p>
                <p className="mt-2 whitespace-pre-wrap text-[12px] leading-relaxed">{t.question}</p>
                {t.findings?.map(f=><div key={f.id} className="mt-3 border-l-2 border-[#bda27a]/40 pl-3">
                  <p className="text-[10px] opacity-50">{f.evidence==="hypothesis"?"Гипотеза":f.evidence==="observation"?"Наблюдение":"Вопрос"} · {f.id}</p>
                  <p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed opacity-85">{f.text}</p>
                  {(f.sourceRefs??[]).length>0&&<p className="mt-1 break-all text-[10px] opacity-50">Источники: {f.sourceRefs?.join(", ")}</p>}
                </div>)}
                {t.decisions?.length>0&&<p className="mt-2 text-[11px] opacity-65">Решения: {t.decisions.map(d=>d.outcome).join(", ")}</p>}
              </div>):<p className="text-[12px] opacity-55">Нет записанных заданий.</p>}</div>
              <div><h3 className="mb-2 text-[11px] font-medium">Материалы</h3>{sphereArtifacts.length?sphereArtifacts.map(a=><p key={a.id} className="mb-2 text-[12px]"><span className="opacity-50">{a.status==="author_confirmed"?"Подтверждено":"Ожидает подтверждения"}</span>{" · "}{a.webUrl?<a className="underline underline-offset-4" target="_blank" rel="noopener noreferrer" href={a.webUrl}>{a.title}</a>:a.title}</p>):<p className="text-[12px] opacity-55">Нет привязанных файлов этой сферы.</p>}</div>
            </div>}
            {project&&<Link to={"/egg?project="+encodeURIComponent(project.id)+"&start="+selectedMeta.id} className="inline-flex items-center gap-1.5 text-[12px] text-[#9d7b4d] underline underline-offset-4">Открыть рабочую сферу <ArrowUpRight size={13}/></Link>}
          </div> : <div className="space-y-4 px-5 py-5 sm:px-6">
            {notice&&<p role="status" className="rounded-lg border border-[#b69664]/30 bg-[#c4a976]/10 p-3 text-[11px] leading-relaxed">{notice} <Link to="/egg/connect" className="underline underline-offset-4">Войти</Link></p>}
            {loading&&<p role="status" className="text-xs opacity-60">Читаем проект…</p>}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase tracking-[.14em] opacity-45">Концепция</span>
              <span className="rounded-full border border-current/15 px-2.5 py-1 text-[10px]">{project?(approved?"Утверждена":candidateText?"На рассмотрении":"Нет принятой"):"Пример"}</span>
            </div>
            <p className="text-[13px] leading-[1.8]">{brief(currentText,showDna?10000:245)}</p>
            {project&&concept&&<p className="text-[10px] opacity-50">{concept.id} · {concept.status}</p>}
            <button type="button" onClick={()=>setShowDna(v=>!v)} aria-expanded={showDna} className="inline-flex items-center gap-1.5 text-[11px] text-[#977c58] underline underline-offset-4">
              <BookOpenText size={13}/> {showDna?"Скрыть исходную идею":"Показать исходную идею"}
            </button>
            {showDna&&<div className="rounded-xl border border-current/10 bg-current/[.025] p-3">
              <p className="mb-2 text-[10px] uppercase tracking-[.13em] opacity-50">Первичное зерно</p>
              <p className="whitespace-pre-wrap text-[12px] leading-relaxed opacity-75">{dna}</p>
            </div>}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="rounded-xl border border-current/10 p-3"><p className="text-[24px] font-light tabular-nums">{project?approvedWork:"—"}</p><p className="text-[10px] opacity-50">Принято задач</p></div>
              <div className="rounded-xl border border-current/10 p-3"><p className="text-[24px] font-light tabular-nums">{project?pendingWork:"—"}</p><p className="text-[10px] opacity-50">На рассмотрении</p></div>
            </div>
            <p className="text-[11px] leading-relaxed opacity-50">Центральная форма — условная пространственная схема, пока не загружен реальный GLB. ДНК задаёт направление, но не определяет конструкцию автоматически.</p>
            {project&&<Link to={"/egg?project="+encodeURIComponent(project.id)+"&start=idea"} className="inline-flex items-center gap-1.5 text-[12px] text-[#9d7b4d] underline underline-offset-4">К концепции Автора <ArrowUpRight size={13}/></Link>}
          </div>}
        </aside>
      </div>
      <footer className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-current/10 pt-4 text-[10px] opacity-55">
        <span>EGG / YOLK · Предварительный интерфейс v0.1</span>
        <span>{isDemo?"Ознакомительный режим · реальные решения не изменяются":"Данные читаются из EGG · эта вкладка ничего не утверждает"}</span>
      </footer>
    </div>
  </div>;
}

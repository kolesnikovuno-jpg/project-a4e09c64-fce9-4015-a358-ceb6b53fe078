import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, Dna, History, MessageCircle, FileText, Layers3, Info, X } from "lucide-react";
import EggYolkViewer from "./EggYolkViewer";
import EggSpherePanel from "./EggSpherePanel";
import EggDocumentationPanel from "./EggDocumentationPanel";
import EggFlowCyclePanel from "./EggFlowCyclePanel";
import type { VisualDraft } from "../../lib/eggDocumentation";
import { EGG_SPHERES, type SphereId, type EggProject } from "../../lib/eggEngine";
import {buildEggYolkProductProjection} from "../../lib/eggYolkState";
import {buildEggYolkTimeSnapshot,eggYolkTimeOptions,EGG_YOLK_BASELINE} from "../../lib/eggYolkTimeline";

type Project=EggProject;
type Task=EggProject["tasks"][number];
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

export default function EggYolkExperience({view="yolk"}:{view?:"egg"|"yolk"}){
  const [params]=useSearchParams();
  const id=params.get("project");
  const [project,setProject]=useState<Project|null>(null);
  const [revision,setRevision]=useState<number|null>(null);
  const [selected,setSelected]=useState<SphereId|null>(null);
  const [utilityPanel,setUtilityPanel]=useState<"author"|"history"|"work"|null>(null);
  const [selectedCycleKey,setSelectedCycleKey]=useState<string|null>(null);
  const [expanded,setExpanded]=useState(false);
  const [loading,setLoading]=useState(Boolean(id));
  const [notice,setNotice]=useState("");
  const [local3d,setLocal3d]=useState<string|null>(null);
  const [spatialStudy,setSpatialStudy]=useState<VisualDraft|null>(null);
  const onSpatialChange=useCallback((next:VisualDraft)=>{
    setSpatialStudy(prev=>prev&&prev.stage===next.stage&&prev.variant===next.variant&&prev.iteration===next.iteration?prev:next);
  },[]);
  const [showDna,setShowDna]=useState(false);
  const [refresh,setRefresh]=useState(0);
  const [authorDraft,setAuthorDraft]=useState("");
  const [authorSending,setAuthorSending]=useState(false);
  const [authorFeedback,setAuthorFeedback]=useState("");
  const [spherePopup,setSpherePopup]=useState(false);
  const [showLayers,setShowLayers]=useState(false);
  const [showInfo,setShowInfo]=useState(false);
  const [ideaBrief,setIdeaBrief]=useState("");
  const [ideaTargets,setIdeaTargets]=useState<SphereId[]>([]);
  const [ideaReady,setIdeaReady]=useState(false);
  const [ideaBusy,setIdeaBusy]=useState(false);
  const [ideaRationale,setIdeaRationale]=useState("");
  const [ideaConflict,setIdeaConflict]=useState("");
  const [ideaClarification,setIdeaClarification]=useState(false);
  async function copyIdeaForChatGPT(){
    if(!project||!ideaBrief.trim())return;
    const instruction = [
      "Работай через подключённый EGG v4.0, без отдельного AI API.",
      "Прочитай состояние проекта "+project.id+" перед любым изменением.",
      "Исходную ДНК не изменяй. Не утверждай решения за Автора.",
      "Задание Автора: "+ideaBrief.trim(),
      "Предложи обоснованный выбор сфер и следующий шаг; отдели факты от гипотез.",
      "Записывай результаты в EGG только как предложения для проверки Автором."
    ].join("\\n");
    try{
      await navigator.clipboard.writeText(instruction);
      setAuthorFeedback("Задание скопировано. Вставьте его в диалог ChatGPT с подключённым EGG v4.0. Передача на сайт автоматически не происходит.");
    }catch{
      setAuthorFeedback("Не удалось скопировать автоматически. Скопируйте задание вручную и отправьте в ChatGPT с EGG v4.0.");
    }
  }
  async function sendIdeaToWork(){
    if(!project||revision===null||!ideaReady||!ideaBrief.trim()||!ideaTargets.length||ideaBusy)return;
    setIdeaBusy(true);setAuthorFeedback("");
    try{
      const cfgResponse=await fetch("/api/egg-config",{cache:"no-store"});
      if(!cfgResponse.ok)throw Error("Сервер EGG недоступен");
      const cfg=await cfgResponse.json() as {supabaseUrl:string;publishableKey:string};
      const client=createClient(cfg.supabaseUrl,cfg.publishableKey);
      const {data}=await client.auth.getSession();
      if(!data.session?.access_token)throw Error("Войдите в аккаунт EGG");
      const response=await fetch("/api/egg",{method:"POST",headers:{
        "Content-Type":"application/json",Authorization:"Bearer "+data.session.access_token,
      },body:JSON.stringify({command:"start_flow_cycle",projectId:project.id,
        expectedRevision:revision,brief:ideaBrief.trim().slice(0,3000),activeSpheres:ideaTargets})});
      if(!response.ok)throw Error(response.status===409?"Проект изменился. Обновите состояние.":"Нельзя запустить цикл: проверьте текущий статус проекта.");
      setIdeaReady(false);setIdeaBrief("");setAuthorFeedback("Задание передано в цикл EGG. Выбранные сферы работают по существующим правилам маршрутизации; Результаты ChatGPT поступают через подключённый EGG v4.0, не через сайт.");
      setRefresh(value=>value+1);
    }catch(error){setAuthorFeedback(error instanceof Error?error.message:"Не удалось начать цикл");}
    finally{setIdeaBusy(false);}
  }
  async function submitAuthorMessage(){
    if(!project||!authorDraft.trim()||authorSending)return;
    setAuthorSending(true);setAuthorFeedback("");
    try{
      const cfgResponse=await fetch("/api/egg-config",{cache:"no-store"});
      if(!cfgResponse.ok)throw Error("Сервер EGG недоступен");
      const cfg=await cfgResponse.json() as {supabaseUrl:string;publishableKey:string};
      const client=createClient(cfg.supabaseUrl,cfg.publishableKey);
      const {data:{user},error:authError}=await client.auth.getUser();
      if(authError||!user)throw Error("Войдите в аккаунт EGG");
      const {data:sessionData}=await client.auth.getSession();
      if(!sessionData.session?.access_token)throw Error("Войдите в аккаунт EGG");
      const channelReady=await fetch("/api/egg",{
        method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+sessionData.session.access_token},
        body:JSON.stringify({command:"ensure_author_channel",projectId:project.id}),
      });
      if(!channelReady.ok)throw Error("Не удалось подготовить общий канал проекта");
      const {data:channel,error:channelError}=await client.from("egg_chat_channels")
        .select("id").eq("project_id",project.id).eq("kind","general").limit(1).maybeSingle();
      if(channelError||!channel)throw Error("Общий канал проекта недоступен");
      const {error}=await client.from("egg_chat_messages").insert({
        channel_id:channel.id,sender_id:user.id,body:authorDraft.trim(),
      });
      if(error)throw Error("Не удалось сохранить сообщение");
      setIdeaBrief(authorDraft.trim());setIdeaTargets(["design","production"]);setIdeaRationale("");setIdeaConflict("");setIdeaClarification(false);setIdeaReady(true);
      setAuthorDraft("");setAuthorFeedback("Указание сохранено. Сфера Идея подготовила входное задание для проверки Автором; автоматический смысловой синтез пока не выполнялся.");
    }catch(error){
      setIdeaBrief(authorDraft.trim());setIdeaTargets(["design","production"]);setIdeaReady(true);
      setAuthorFeedback("Сообщение не сохранено в общем канале: "+(error instanceof Error?error.message:"ошибка отправки")+". Задание подготовлено только в текущей вкладке. Скопируйте его для ChatGPT перед закрытием страницы.");
    }
    finally{setAuthorSending(false);}
  }
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
  const productState=useMemo(()=>project?buildEggYolkProductProjection(project):null,[project]);
  const cycleOptions=useMemo(()=>project?eggYolkTimeOptions(project):[],[project]);
  const activeCycleKey=selectedCycleKey&&cycleOptions.some(c=>c.key===selectedCycleKey)
    ?selectedCycleKey:cycleOptions.at(-1)?.key??EGG_YOLK_BASELINE;
  const timeline=useMemo(()=>project?buildEggYolkTimeSnapshot(project,activeCycleKey):null,
    [project,activeCycleKey]);
  const approved=concept?.status==="accepted";
  const currentText=concept?.text??project?.seed.text??demoConcept;
  const candidateText=concept?.status==="proposed";
  const dna=project?.seed.text??demoSeed;
  const selectedMeta=YOLK_SPHERES.find(s=>s.id===selected)??null;
  const sphereTasks=(project?.tasks??[]).filter(t=>t.sphere===selected);
  const sphereArtifacts=(project?.artifacts??[]).filter(a=>a.sphere===selected);
  const sphereStatus=summarize(sphereTasks);
  const stateCard=timeline?.spheres.find(c=>c.sphere===selected);
  const timelineStatus:Record<string,string>={
    new:"Новый вывод этой итерации",
    inherited:"Унаследован из предыдущего цикла",
    historical:"Исторический вывод (до потоков)",
    pending_work:"Ожидается работа сферы",
    pending_transit:"Ожидается транзит по маршруту",
    missing:"Результат отсутствует",
  };
  const sphereVisibleStatus=stateCard?timelineStatus[stateCard.status]:sphereStatus.label;
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
    ? (view==="egg"?selectedMeta.detail:project
        ?stateCard?.summary?brief(stateCard.summary,185):
          "Для выбранного состояния нет зарегистрированного вывода этой сферы."
        :sphereTasks.length
          ?brief(lastFinding??lastTask.question,185)
          :"Это ознакомительный режим. Данные реального проекта здесь не показаны.")
    : brief(currentText,185);
  const selectSphere=(sphere:SphereId)=>{
    setSelected(current=>current===sphere?null:sphere);
    setExpanded(false);
    setSpherePopup(true);
    setShowDna(false);
  };
  return (
    <div className="min-h-screen bg-background font-body text-foreground" data-testid="yolk-experience">
      <main className="mx-auto flex min-h-screen w-full max-w-[1580px] flex-col px-4 pb-4 pt-3 sm:px-6">
        <div className="flex items-center gap-3 text-[11px] font-light text-foreground/60">
          <Link to={view==="yolk"?"/egg/workspace"+(id?"?project="+encodeURIComponent(id):""):"/egg/connect"} className="inline-flex items-center gap-1 underline-offset-4 hover:underline"><ArrowLeft size={13}/> Назад</Link>
          <h1 className="text-[13px] font-light tracking-[0.04em] text-foreground/65">{view==="egg"?"EGG / ЯЙЦО":"EGG / ЖЕЛТОК"}</h1>
          {view==="egg"&&<Link to={"/egg/yolk"+(id?"?project="+encodeURIComponent(id):"")} className="rounded-full border border-foreground/20 px-3 py-1 text-[11px]">Желток · 3D →</Link>}
          <Link to={"/egg/author"+(id?"?project="+encodeURIComponent(id):"")} className="ml-auto rounded-full border border-foreground/20 px-3 py-1 text-[11px] text-foreground/75" data-testid="yolk-open-author">Автор</Link>
        </div>
        {id&&!project&&!loading&&<div role="alert" className="mt-5 rounded-xl border border-amber-600/35 bg-amber-500/5 p-4 text-sm text-foreground/85"><p className="font-medium">Данные проекта не загружены</p><p className="mt-2">{notice||"Не удалось получить состояние проекта."} Демонстрационная форма ниже не является состоянием вашего проекта.</p><div className="mt-3 flex flex-wrap gap-4"><Link to="/egg/connect" className="underline underline-offset-4">Войти в EGG на этом адресе</Link><button type="button" onClick={()=>setRefresh(v=>v+1)} className="underline underline-offset-4">Повторить загрузку</button></div></div>}

        {project&&timeline&&<div className={(utilityPanel==="history"?"flex":"hidden")+" mt-4 flex-wrap items-center justify-between gap-3 rounded-xl border border-foreground/15 p-3 text-xs"}
          data-testid="yolk-timeline-controls">
          <label className="flex min-w-[225px] flex-1 flex-col gap-1.5 text-[11px] text-foreground/65">
            Состояние продукта · история итераций
            <select value={activeCycleKey} data-testid="yolk-timeline-select"
              onChange={e=>{setSelectedCycleKey(e.target.value);setExpanded(false);}}
              className="min-h-9 w-full rounded-lg border border-foreground/25 bg-background px-3 text-xs text-foreground">
              {cycleOptions.map(option=><option key={option.key} value={option.key}>
                {option.label}</option>)}
            </select>
          </label>
          <p className="max-w-[260px] text-[11px] leading-relaxed text-foreground/55" data-testid="yolk-timeline-stage-status">
            {timeline.status==="baseline"?"Исходное состояние · без завершённых потоковых циклов":
             timeline.status==="running"?"Цикл идёт · часть выводов ожидается":
             timeline.status==="awaiting_author"?"Синтез готов · ожидается решение Автора":
             timeline.status==="accepted"?"Решение Автора: принято":
             "Решение Автора: направлено на доработку"}
          </p>
        </div>}

        <div className="mx-auto flex w-full flex-1 flex-col items-center justify-center lg:flex-row">
          <aside className="hidden order-2 min-w-0 self-center pb-1 lg:order-1" aria-label="Название и назначение">
            <YolkTypewriter key={"left-"+(selected??"dna")+"-"+activeCycleKey} side="left"
              number={selectedMeta?"Сфера / "+String(YOLK_SPHERES.indexOf(selectedMeta)+1).padStart(2,"0"):"ДНК / исходный замысел"}
              title={selectedMeta?selectedMeta.name:"ДНК продукта"}
              description={leftCopy}/>
            <p className="mt-4 text-[11px] font-light text-foreground/45">{selectedMeta?selectedMeta.tag:"Концепция — постоянный ориентир"}</p>
          </aside>

          <section className="relative mx-auto w-full max-w-[min(88vw,78vh,900px)] min-w-0" aria-label="Крупная пространственная модель и восемь сфер">
            <div className="relative mx-auto aspect-square w-full" data-testid="yolk-orbit-stage">
              <div className="absolute inset-[1%] z-0" data-testid="yolk-central-object">
                <EggYolkViewer onFileChange={setLocal3d} onSketchChange={onSpatialChange}
                  level={timeline?.level??project?.level??1}
                  iteration={timeline?.iteration??project?.iteration??1}
                  projectId={project?.id} visualVersion={timeline?.visual??null} minimalControls/>
              </div>
              <div className={(view==="egg"?"":"hidden")+" pointer-events-none absolute inset-[7%] rounded-[50%] border border-foreground/10"} aria-hidden="true"/>
              <div className={(view==="egg"?"":"hidden")+" pointer-events-none absolute inset-[18%] rounded-[50%] border border-foreground/[.06]"} aria-hidden="true"/>
              {view==="egg"&&YOLK_SPHERES.map(s=>{
                const radians=s.angle*Math.PI/180;
                const x=50+43*Math.cos(radians),y=50+43*Math.sin(radians);
                return <button key={s.id} type="button"
                  data-testid={"egg-orbit-"+s.id}
                  aria-label={"Открыть сферу "+s.name}
                  onClick={()=>selectSphere(s.id)}
                  style={{left:x+"%",top:y+"%",borderColor:s.accent}}
                  className={"pointer-events-auto absolute z-20 flex h-[54px] w-[54px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border bg-background/95 text-[9px] shadow-sm backdrop-blur-sm transition-transform hover:scale-110 sm:h-[78px] sm:w-[78px] sm:text-[11px] "+(selected===s.id?"ring-2 ring-foreground/35":"")}>
                  <span className="max-w-full px-1 text-center leading-tight">{s.name}</span>
                </button>;
              })}
              {view==="egg"&&<span className="pointer-events-none absolute left-1/2 top-[4%] -translate-x-1/2 text-[10px] tracking-[.15em] text-foreground/50">ИДЕЯ</span>}
              {view==="egg"&&<span className="pointer-events-none absolute bottom-[3%] left-1/2 -translate-x-1/2 text-[10px] tracking-[.15em] text-foreground/50">МАТЕРИЯ</span>}
            </div>
          </section>

          <aside className={(view==="egg"?"block":"hidden")+" order-3 w-full max-w-[340px] min-w-0 self-center pb-1 px-4"} aria-label="Краткий вывод и развернутая информация" aria-live="polite">
            <YolkTypewriter key={"right-"+(selected??"dna")+"-"+activeCycleKey} side="right"
              number={selectedMeta?(project?sphereVisibleStatus:"Вклад сферы"):"Формирование / концепция"}
              title={selectedMeta?"Текущий вклад":approved?"Концепция принята":"Концепция"}
              description={rightCopy}/>
            <button type="button" data-testid="yolk-expand" onClick={()=>{if(selectedMeta){setSpherePopup(true);}else{setExpanded(true);}}}
              className="mt-3 border-b border-foreground/35 pb-1 text-left text-[11px] font-light text-foreground/75 hover:text-foreground">Развернуть →</button>
            {loading&&<p className="mt-4 text-[11px] text-foreground/45" role="status">Читаем проект…</p>}
            {notice&&<p className="mt-4 text-[11px] leading-relaxed text-foreground/65" role="status">{notice} <Link to="/egg/connect" className="underline underline-offset-4">Войти</Link></p>}
          </aside>
        </div>

        {view==="egg"&&<nav className="fixed bottom-5 left-4 right-4 z-30 flex items-end justify-between gap-3 pointer-events-none sm:bottom-7 sm:left-7 sm:right-7" aria-label="Управление Желтком">
          <button type="button" aria-label="Слои" aria-expanded={showLayers} data-testid="yolk-layers-toggle"
            onClick={()=>{setShowLayers(v=>!v);setShowInfo(false);setSpherePopup(false);}}
            className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-foreground/15 bg-background/85 text-foreground/70 shadow-sm backdrop-blur-md"><Layers3 size={19}/></button>
          <button type="button" aria-label="Информация" aria-expanded={showInfo} data-testid="yolk-info-toggle"
            onClick={()=>{setShowInfo(v=>!v);setShowLayers(false);setSpherePopup(false);}}
            className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-foreground/15 bg-background/85 text-foreground/70 shadow-sm backdrop-blur-md"><Info size={19}/></button>
        </nav>}
        {view==="yolk"&&<Link to={"/egg/workspace"+(id?"?project="+encodeURIComponent(id):"")} className="fixed bottom-6 left-6 z-30 rounded-full border border-foreground/25 bg-background/90 px-4 py-2 text-xs">Яйцо →</Link>}
        {showLayers&&view==="egg"&&<section className="fixed bottom-20 left-4 z-40 w-[min(330px,calc(100vw-32px))] rounded-2xl border border-foreground/15 bg-background/95 p-4 shadow-lg backdrop-blur-md sm:bottom-24 sm:left-7" aria-label="Слои Желтка" data-testid="yolk-layers-panel">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-medium">Восемь сфер</h2><button type="button" aria-label="Закрыть слои" onClick={()=>setShowLayers(false)}><X size={16}/></button></div>
          <div className="grid grid-cols-2 gap-2">
            {YOLK_SPHERES.map(s=><button key={s.id} type="button" data-testid={"yolk-layer-"+s.id}
              onClick={()=>{selectSphere(s.id);setShowLayers(false);}}
              className="rounded-xl border border-foreground/15 px-3 py-3 text-left text-xs text-foreground/75 hover:border-foreground/40">
              <span className="block">{s.name}</span><span className="mt-1 block text-[10px] text-foreground/45">{s.tag}</span>
            </button>)}
          </div>
        </section>}
        {showInfo&&<section className="fixed bottom-20 right-4 z-40 w-[min(360px,calc(100vw-32px))] rounded-2xl border border-foreground/15 bg-background/95 p-4 shadow-lg backdrop-blur-md sm:bottom-24 sm:right-7" aria-label="Информация об объекте" data-testid="yolk-info-panel">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-medium">Концепция</h2><button type="button" aria-label="Закрыть информацию" onClick={()=>setShowInfo(false)}><X size={16}/></button></div>
          <p className="text-xs leading-relaxed text-foreground/75">{brief(currentText,300)}</p>
          <p className="mt-3 text-[11px] text-foreground/50">{approved?"Принято Автором":candidateText?"Предложено, ожидает решения":"Исследовательская форма · не утверждена"}</p>
          <button type="button" onClick={()=>{setShowInfo(false);setSelected(null);setExpanded(true)}} className="mt-3 border-b border-foreground/35 text-xs">Подробнее →</button>
        </section>}
        {view==="egg"&&selectedMeta&&spherePopup&&<EggSpherePanel key={selectedMeta.id} sphere={selectedMeta.id} name={selectedMeta.name} summary={selectedMeta.detail} status={sphereVisibleStatus} projectId={id} onClose={()=>setSpherePopup(false)}/>}
        <section className={(utilityPanel==="author"?"block":"hidden")+" mx-auto mt-5 max-w-[700px] rounded-2xl border border-foreground/15 bg-background/90 p-3 sm:p-4"} aria-label="Диалог Автора" data-testid="yolk-author-dialog">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h2 className="text-xs font-medium">Автор → EGG</h2><Link to={"/egg/author"+(id?"?project="+encodeURIComponent(id):"")} className="rounded-lg border border-foreground/30 px-3 py-2 text-xs font-medium" data-testid="yolk-author-workspace-link">Открыть единый холст Автора</Link></div><p className="mb-3 text-xs text-foreground/60">Основное рабочее пространство Автора теперь находится на холсте. Этот диалоговый блок сохранён временно для совместимости.</p>
          <form onSubmit={event=>{event.preventDefault();void submitAuthorMessage()}} className="flex items-end gap-2">
            <textarea value={authorDraft} onChange={event=>setAuthorDraft(event.target.value)} rows={2} maxLength={4000} disabled={!project||authorSending} placeholder={project?"Что изменить, исследовать или сохранить в форме?":"Откройте проект, чтобы отправить сообщение"} aria-label="Указание Автора" className="min-h-[64px] min-w-0 flex-1 resize-y rounded-xl border border-foreground/20 bg-background px-3 py-2 text-sm outline-none focus:border-foreground/50"/>
            <button type="submit" disabled={!project||!authorDraft.trim()||authorSending} className="rounded-xl border border-foreground/35 px-4 py-3 text-xs disabled:opacity-40">{authorSending?"Отправка…":"Отправить"}</button>
          </form>
          {ideaReady&&<div className="mt-3 rounded-xl border border-foreground/20 p-3" data-testid="yolk-idea-gate">
            <p className="text-xs font-medium">Идея · входной синтез</p>
            <p className="mt-1 text-[11px] text-foreground/60">Исходная ДНК сохраняется. Уточните формулировку задания перед передачей в работу. Для анализа через ChatGPT скопируйте задание и отправьте его в диалог с подключённым EGG v4.0. Автоматический вызов отдельного ИИ отключён; решение остаётся за Автором.</p>
            <textarea value={ideaBrief} onChange={event=>{setIdeaBrief(event.target.value);setIdeaClarification(false);setIdeaRationale("");setIdeaConflict("");}} maxLength={3000} rows={3} aria-label="Задание сферы Идея" className="mt-2 w-full rounded-lg border border-foreground/20 bg-background p-2 text-sm"/>
            <button type="button" onClick={()=>void copyIdeaForChatGPT()} disabled={!ideaBrief.trim()} className="mt-2 rounded-lg border border-foreground/30 px-3 py-2 text-xs disabled:opacity-40">Скопировать задание для ChatGPT</button>
            {ideaRationale&&<p className="mt-2 text-xs">Основание выбора: {ideaRationale}</p>}
            {ideaConflict&&<p className="mt-2 text-xs">Конфликт с ДНК: {ideaConflict}</p>}
            {ideaClarification&&<p className="mt-2 text-xs font-medium">Требуется уточнение Автора перед запуском.</p>}
            <p className="mt-3 text-[11px] text-foreground/60">Выберите сферы для работы. Дизайн и Производство отмечены как исходные варианты. Измените выбор вручную или после анализа в ChatGPT.</p>
            <div className="mt-2 flex flex-wrap gap-2">{YOLK_SPHERES.map(s=><label key={s.id} className="flex items-center gap-1.5 rounded-full border border-foreground/20 px-2.5 py-1.5 text-[11px]"><input type="checkbox" checked={ideaTargets.includes(s.id)} onChange={e=>setIdeaTargets(prev=>e.target.checked?[...prev,s.id]:prev.filter(v=>v!==s.id))}/>{s.name}</label>)}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={()=>void sendIdeaToWork()} disabled={!ideaBrief.trim()||!ideaTargets.length||ideaBusy||revision===null||ideaClarification} className="rounded-lg border border-foreground/40 px-3 py-2 text-xs disabled:opacity-40">{ideaBusy?"Передача…":"Подтвердить → в работу"}</button>
              <button type="button" onClick={()=>setIdeaReady(false)} className="rounded-lg border border-foreground/20 px-3 py-2 text-xs">Отложить</button>
            </div>
          </div>}
          {authorFeedback&&<p className="mt-2 text-xs text-foreground/65" role="status">{authorFeedback}</p>}
          <p className="mt-2 text-[11px] leading-relaxed text-foreground/50">Указание поступает в сферу Идея для проверки Автором, затем в цикл EGG. ChatGPT анализирует проект через EGG v4.0 в отдельном диалоге; сайт не вызывает ИИ самостоятельно. Окончательное подтверждение остаётся за Автором.</p>
        </section>
        <div className={(utilityPanel==="work"?"block":"hidden")+" mx-auto mt-7 max-w-[1040px] space-y-5"}>
          {project&&timeline&&<div className="space-y-2 rounded-lg border border-foreground/15 p-3 text-[11px] leading-relaxed text-foreground/65"
            data-testid="yolk-visual-source">
            <p>{timeline.visualNote}</p>
            {timeline.visual&&<p>Источник: {timeline.visual.id} · {timeline.visual.sourceRef} · {timeline.visual.sourceStatus}.
              Привязка к итерации не означает утверждения конструкции.</p>}
            <p>Орбита и центральная версия относятся к выбранному состоянию: {timeline.label}.
              Нижние рабочие панели показывают текущий проект и могут содержать более поздние записи.</p>
            <div className="grid gap-2 sm:grid-cols-2" data-testid="yolk-timeline-audit">
              <div className="rounded border border-foreground/10 p-2">
                <p className="font-medium">Напряжения на этом этапе · {timeline.tensions.length}</p>
                {timeline.tensions.length
                  ?timeline.tensions.map(t=><p key={t.id} className="mt-1">
                    {t.title} · {t.status} · {t.lastActionAt.slice(0,10)}</p>)
                  :<p className="mt-1">Зарегистрированных решений по напряжениям пока нет.</p>}
              </div>
              <div className="rounded border border-foreground/10 p-2">
                <p className="font-medium">Решение Автора</p>
                <p className="mt-1">{timeline.authorDecision
                  ?(timeline.authorDecision.outcome==="accept"?"Принято: ":"На доработку: ")+
                    timeline.authorDecision.reason
                  :"Для выбранного состояния решение не зарегистрировано."}</p>
                {timeline.semanticReviewStatus==="unverified"&&
                  <p className="mt-1">Есть смысловой черновик ИИ · без утверждения.</p>}
              </div>
            </div>
          </div>}
          {project&&<EggFlowCyclePanel project={project} revision={revision} authorControls onSaved={()=>setRefresh(v=>v+1)}/>}
          <EggDocumentationPanel project={project} revision={revision} origin="yolk"
            visual={spatialStudy} externalPreviewOpen={Boolean(local3d)}/>
        </div>

        <footer className="mt-7 flex flex-wrap justify-between gap-3 border-t border-foreground/10 pt-4 text-[11px] font-light text-foreground/45">
          <span>Вращение модели — мышь / жест · Масштаб — колесо</span>
          <span>{timeline?.visual?"Связанный источник из журнала · "+timeline.visual.id:
            local3d?"GLB открыт локально; не сохранён в проекте":"Параметрический эскиз · GLB создаётся локально"} · {project?"Чтение данных EGG":"Без изменения проектов"}</span>
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
              {stateCard?.resultId&&<div data-testid="yolk-sphere-versioned-result">
                <p className="text-[10px] uppercase tracking-[0.12em] text-foreground/40">
                  Вывод выбранного состояния · {timelineStatus[stateCard.status]??"Исторический"}
                </p>
                <p className="mt-2 whitespace-pre-wrap">{stateCard.summary}</p>
                <p className="mt-1 text-[11px] text-foreground/55">
                  Источник: {stateCard.resultId} · {stateCard.sourceCycleId}
                  {stateCard.requiresRecheck?" · требует проверки":""}
                </p>
              </div>}
              {!stateCard?.resultId&&project&&<p className="text-[11px] text-foreground/55">
                 В выбранном состоянии вывод этой сферы не зарегистрирован.</p>}
              <div><p className="text-[10px] uppercase tracking-[0.12em] text-foreground/40">
                Все исторические задачи (не срез выбранной итерации) · {sphereTasks.length}</p>
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
              {project&&<Link to={"/ru/egg?project="+encodeURIComponent(project.id)+"&start="+selectedMeta.id} className="inline-block border-b border-foreground/35 pb-1">Открыть рабочее пространство сферы ↗</Link>}
            </>:<>
              <div><p className="text-[10px] uppercase tracking-[0.12em] text-foreground/40">Концепция / {project?(approved?"утверждена":candidateText?"на рассмотрении":"не утверждена"):"демонстрация"}</p>
                <p className="mt-3 whitespace-pre-wrap">{currentText}</p></div>
              <button type="button" onClick={()=>setShowDna(value=>!value)} className="border-b border-foreground/35 pb-1 text-[11px]">{showDna?"Свернуть исходную идею":"Показать исходную идею"}</button>
              {showDna&&<p className="whitespace-pre-wrap border-l border-foreground/20 pl-4">{dna}</p>}
              <div className="grid grid-cols-2 gap-3 border-t border-foreground/10 pt-4 text-[11px]">
                <p>Принято задач: {project?approvedWork:"—"}</p><p>Ждут Автора: {project?pendingWork:"—"}</p>
              </div>
              {project&&<Link to={"/ru/egg?project="+encodeURIComponent(project.id)+"&start=idea"} className="inline-block border-b border-foreground/35 pb-1">Перейти к концепции Автора ↗</Link>}
            </>}
          </div>
        </section>
      </div>}
    </div>
  );
}

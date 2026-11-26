import {useEffect,useMemo,useState} from "react";
import {Link} from "react-router-dom";
import {createClient} from "@supabase/supabase-js";
import type {EggProject,SphereId,EggEvidence} from "../../lib/eggEngine";
import {EGG_FLOW_ROUTES,currentEggFlowCycle,type EggSphereVisit} from "../../lib/eggFlowCycle";
import {EGG_SPHERE_MANIFESTS} from "../../lib/eggSphereProtocol";
import {EGG_SPHERE_GENOMES} from "../../lib/eggSphereReplication";
import {buildEggSphereBrief} from "../../lib/eggSphereIntelligence";
import {waitForEggAiRequest,postponeEggAiRequests} from "../../lib/eggAiPacing";
import {EggAiSlider,useEggAiBalance} from "./EggAiBalance";
import {nextEggAutomationStep} from "../../lib/eggFlowAutomation";

type Mode="auto"|"symbiosis"|"manual";
const nameOf:Record<SphereId,string>={
 marketing:"Маркетинг",design:"Дизайн",testDrive:"Тестдрайв",commerce:"Коммерция",
 legal:"Право",production:"Производство",procurement:"Комплектация",retail:"Ритейл",
};
const statusOf:Record<EggSphereVisit["status"],string>={
 pending:"Ожидает своей очереди",awaiting_result:"Готова к работе",
 completed:"Результат сохранён",transited:"Транзит без повторной обработки",
};

export default function EggSpherePanel({sphere,name,summary,status,projectId,guest=false,onClose}:{
 sphere:SphereId;name:string;summary:string;status:string;
 projectId:string|null;guest?:boolean;onClose:()=>void;
}){
 const {balance}=useEggAiBalance(projectId??"");
 const aiShare=balance[sphere];
 const [project,setProject]=useState<EggProject|null>(null);
 const [revision,setRevision]=useState<number|null>(null);
 const [token,setToken]=useState("");
 const [refresh,setRefresh]=useState(0);
 const [loading,setLoading]=useState(Boolean(projectId));
 const [busy,setBusy]=useState(false);
 const [expanded,setExpanded]=useState(false);
 const [mode,setMode]=useState<Mode>("symbiosis");
 const [draft,setDraft]=useState("");
 const [evidence,setEvidence]=useState<EggEvidence>("hypothesis");
 const [notice,setNotice]=useState("");
 const role=EGG_SPHERE_MANIFESTS[sphere];
 const genome=EGG_SPHERE_GENOMES[sphere];
 useEffect(()=>{
  if(!projectId||guest){setProject(null);setRevision(null);setLoading(false);return;}
  let alive=true;setLoading(true);setNotice("");
  void (async()=>{
   try{
    const cfgResponse=await fetch("/api/egg-config",{cache:"no-store"});
    if(!cfgResponse.ok)throw Error("Конфигурация EGG недоступна.");
    const cfg=await cfgResponse.json() as {supabaseUrl:string;publishableKey:string};
    const auth=createClient(cfg.supabaseUrl,cfg.publishableKey);
    const {data:{session}}=await auth.auth.getSession();
    if(!session?.access_token)throw Error("Для работы сферы войдите в EGG.");
    const response=await fetch("/api/egg-project-state?project="+encodeURIComponent(projectId),{
     cache:"no-store",headers:{Authorization:"Bearer "+session.access_token},
    });
    if(!response.ok)throw Error(response.status===404?"Проект не найден в аккаунте.":"Не удалось прочитать состояние сферы.");
    const state=await response.json() as {project:EggProject;revision:number};
    if(!Number.isSafeInteger(state.revision)||!state.project)throw Error("Неполное состояние проекта.");
    if(alive){setProject(state.project);setRevision(state.revision);setToken(session.access_token);}
   }catch(error){
    if(alive){setProject(null);setRevision(null);setToken("");setNotice(error instanceof Error?error.message:"Ошибка подключения к EGG.");}
   }finally{if(alive)setLoading(false);}
  })();
  return()=>{alive=false};
 },[projectId,guest,sphere,refresh]);
 const cycle=project?currentEggFlowCycle(project):null;
 const branch=EGG_FLOW_ROUTES.first.includes(sphere as never)?"first":"second";
 const route:readonly SphereId[]=EGG_FLOW_ROUTES[branch];
 const visit=cycle?.[branch].find(item=>item.sphere===sphere);
 const nextInBranch=route[route.indexOf(sphere)+1]??null;
 const isWorking=cycle?.status==="running"&&visit?.mode==="work"&&visit.status==="awaiting_result";
 const nextAuto=useMemo(()=>{
  if(!project)return null;
  try{const step=nextEggAutomationStep(project);return step.kind==="sphere"?step.sphere:null;}
  catch{return null;}
 },[project]);
 const mayRunAuto=Boolean(isWorking&&nextAuto===sphere&&token&&revision!==null&&aiShare>0);
 const brief=useMemo(()=>{
  if(!project||!isWorking)return null;
  try{return buildEggSphereBrief(project,sphere);}catch{return null;}
 },[project,isWorking,sphere]);
 const previous=brief?.sameBranchContext??[];
 const runAI=async(draftOnly:boolean)=>{
  if(!mayRunAuto||!projectId||busy||revision===null||aiShare===0)return;
  setBusy(true);setNotice("");
  try{
   await waitForEggAiRequest({onWaiting:seconds=>setNotice("Ограничение Gemini: запрос через "+seconds+" с…")});
   const response=await fetch("/api/egg-flow-ai",{method:"POST",headers:{
    "Content-Type":"application/json",Authorization:"Bearer "+token,
   },body:JSON.stringify({projectId,expectedRevision:revision,mode:draftOnly?"draft":"step"})});
   const value=await response.json() as {ok?:boolean;error?:string;sphere?:SphereId;
    draft?:{text:string;evidence:"hypothesis"|"question"};completed?:{sphere?:SphereId};
    retryAfterSeconds?:number;rateLimitScope?:"minute"|"daily"|"unknown"};
   if(!response.ok||!value.ok){
    if(response.status===429){
     if(value.rateLimitScope!=="daily")postponeEggAiRequests((value.retryAfterSeconds??70)*1000);
     throw Error(value.rateLimitScope==="daily"?"ai_daily_limited":"ai_rate_limited");
    }
    throw Error(value.error??"ai_request_failed");
   }
   if(draftOnly){
    if(value.sphere!==sphere||!value.draft?.text)throw Error("Неверный ответ ИИ для выбранной сферы.");
    setDraft(value.draft.text);setEvidence(value.draft.evidence);
    setNotice("Черновик ИИ получен, но не записан в проект. Уточните его и подтвердите как Автор.");
   }else{
    if(value.completed?.sphere!==sphere)throw Error("Другой шаг выполнен. Обновите состояние.");
    setNotice("Результат сохранён. Поток и Желток получили вклад.");
    setRefresh(v=>v+1);
   }
  }catch(error){
   const key=error instanceof Error?error.message:"ai_request_failed";
   const known:Record<string,string>={
    revision_conflict:"Проект изменился. Обновите состояние.",
    ai_provider_not_configured:"ИИ-провайдер EGG не настроен.",
    ai_budget_exhausted:"Бюджет ИИ исчерпан; результат не записан.",
    ai_rate_limited:"Gemini ограничил частоту запросов. Сфера сохранена; повторите позднее.",
    ai_daily_limited:"Gemini сообщил о суточной квоте. Сфера сохранена; проверьте лимиты в AI Studio.",
    ai_model_not_authorized:"Модель ИИ недоступна для этого проекта.",
    provider_timeout:"Модель не ответила в пределах времени.",
    model_incomplete:"Ответ модели не завершён. Результат не записан.",
    invalid_ai_output:"Неверная структура ответа ИИ. Результат не записан.",
   };
   setNotice(known[key]??key);
  }finally{setBusy(false);}
 };
 const syncMemory=async()=>{
  if(!projectId||!token||busy)return;
  setBusy(true);setNotice("");
  try{
   const response=await fetch("/api/egg-memory-sync?project="+encodeURIComponent(projectId),{
    method:"POST",headers:{Authorization:"Bearer "+token},
   });
   const data=await response.json() as {ok?:boolean;error?:string;name?:string};
   if(!response.ok||!data.ok)throw Error(data.error??"drive_sync_failed");
   setNotice("Архив памяти сохранён на Google Drive: "+(data.name??"EGG"));
  }catch(error){setNotice(error instanceof Error?error.message:"Ошибка синхронизации");}
  finally{setBusy(false);}
 };
 const submitAuthor=async()=>{
  if(!isWorking||!projectId||!token||revision===null||busy||!draft.trim())return;
  setBusy(true);setNotice("");
  try{
   const response=await fetch("/api/egg",{method:"POST",headers:{
    "Content-Type":"application/json",Authorization:"Bearer "+token,
   },body:JSON.stringify({command:"complete_flow_sphere",projectId,
    expectedRevision:revision,sphere,text:draft.trim().slice(0,10000),evidence,
    mode:mode==="manual"?"manual":"symbiosis",sourceRefs:[]})});
   const data=await response.json() as {ok?:boolean;error?:string};
   if(!response.ok||!data.ok)throw Error(response.status===409?"Проект изменился. Обновите состояние.":data.error??"Не удалось записать вклад.");
   setDraft("");setNotice("Авторский результат сохранён, передан следующей сфере и в Желток.");
   setRefresh(v=>v+1);
  }catch(error){setNotice(error instanceof Error?error.message:"Ошибка сохранения.");}
  finally{setBusy(false);}
 };
 return <section className="fixed inset-y-0 right-0 z-[110] w-full max-w-[min(100vw,540px)] overflow-y-auto overscroll-contain border-l border-foreground/20 bg-background px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] shadow-xl sm:px-7"
  role="dialog" aria-label={"Панель сферы "+name} data-testid="egg-sphere-panel">
  <div className="flex items-start justify-between gap-4">
   <div><p className="text-[10px] uppercase tracking-[.17em] text-foreground/45">EGG / ФУНКЦИОНАЛЬНАЯ СФЕРА</p>
    <h2 className="mt-1 text-lg font-light">{nameOf[sphere]}</h2></div>
   <button type="button" onClick={onClose} aria-label="Закрыть панель"
    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-foreground/20">×</button>
  </div>
  <p className="mt-3 text-sm leading-relaxed text-foreground/75">{role.mission}</p>
  {projectId&&!guest&&<div className="mt-3"><EggAiSlider projectId={projectId} sphere={sphere}/></div>}
  <button type="button" onClick={()=>setExpanded(v=>!v)} aria-expanded={expanded}
   className="mt-3 border-b border-foreground/30 pb-1 text-xs text-foreground/65">
   {expanded?"Свернуть протокол":"Роль, границы и ожидаемый результат"}
  </button>
  {expanded&&<div className="mt-3 space-y-2 border border-foreground/10 p-3 text-xs">
   <p><strong>Геном сферы:</strong> v{genome.version} · наследуемая роль и правила · изменения только после проверки и утверждения Автором.</p><p><strong>Потоки:</strong> {genome.sequentialTarget} + {genome.radialTarget} (один результат).</p>
   <p><strong>Роль:</strong> {role.role}</p><p><strong>Вопрос:</strong> {role.objective}</p>
   <p><strong>Выход:</strong> {role.expectedContribution}</p>
   <p><strong>Граница:</strong> {role.hardBoundary}</p>
  </div>}
  {!guest&&projectId&&<button type="button" disabled={busy||!token} onClick={()=>void syncMemory()}
   className="mt-3 rounded-lg border border-foreground/20 px-3 py-2 text-xs disabled:opacity-40">
   Сохранить память EGG на Google Drive
  </button>}
  {guest||!projectId?
   <div className="mt-5 text-sm">Ознакомительный режим. <Link to="/egg/connect" className="underline">Войти в EGG</Link></div>:
   <div className="mt-5 space-y-4">
    {loading&&<p role="status" className="text-xs">Читаем актуальный цикл EGG…</p>}
    {project&&!cycle&&<p className="rounded-xl border border-foreground/15 p-3 text-xs">Первый круг ещё не запущен. Перейдите в сферу «Идея», утвердите рабочую ДНК и входной пакет. Отдельный «Старт» сферы не создаёт цикл.</p>}
    {cycle&&<>
     <div className="rounded-xl border border-foreground/15 p-3 text-xs" data-testid="egg-sphere-real-status">
      <p className="font-medium">Уровень {cycle.level} / 5 · итерация {cycle.iteration}</p>
      <p className="mt-1">Поток {branch==="first"?"1":"2"} · {route.map(name=>nameOf[name]).join(" → ")}</p>
      <p className="mt-2">Статус: <strong>{visit?statusOf[visit.status]:"Нет визита"}</strong></p>
      {visit?.requiresRecheck&&<p className="mt-2">Нужно проверить актуальность унаследованного результата.</p>}
      <p className="mt-2">Последовательная передача: {nextInBranch?nameOf[nextInBranch]:"конец потока"}.</p>
      <p>Радиальная передача: Желток, тот же результат без второй AI-обработки.</p>
     </div>
     {cycle.ideaHandoff&&<details className="rounded-lg border border-foreground/10 p-3 text-xs">
      <summary className="cursor-pointer">Опорная ДНК и источники этого круга</summary>
      <p className="mt-2 text-foreground/55">Исходное зерно (не меняется)</p>
      <p className="whitespace-pre-wrap">{project.seed.text}</p>
      <p className="mt-2 text-foreground/55">Рабочая ДНК, утверждённая Автором</p>
      <p className="whitespace-pre-wrap">{cycle.ideaHandoff.workingDna}</p>
      <p className="mt-2">Намерение: {cycle.ideaHandoff.intent}</p>
      {cycle.ideaHandoff.constraints&&<p>Рамки: {cycle.ideaHandoff.constraints}</p>}
      <p>Материалы: {cycle.ideaHandoff.materials.length}. Визуальные карточки без фактической передачи изображений отмечены как метаданные.</p>
      <p>Фото пространства: {cycle.ideaHandoff.spatialContext?"приложено для пространственных сфер":"не передано"}.</p>
     </details>}
     {visit?.result?<article className="rounded-xl border border-foreground/15 bg-foreground/[.025] p-3 text-xs" data-testid="egg-sphere-real-result">
      <p className="font-medium">Вклад сферы · {visit.result.inputMode==="manual"?"Автор":visit.result.inputMode==="symbiosis"?"Автор + ИИ":"ИИ"}</p>
      <p className="mt-2 whitespace-pre-wrap leading-relaxed">{visit.result.text}</p>
      <p className="mt-2 text-foreground/60">Статус достоверности: {visit.result.evidence} · источник результата {visit.result.id}</p>
      {visit.result.discoveredQuestions?.map(q=><p key={q.id} className="mt-2 text-foreground/60">Вопрос: {q.question} · не подтверждён</p>)}
     </article>:null}
     {visit?.status==="transited"&&<p className="text-xs text-foreground/60">Сфера прошла транзитом по решению Автора, без новой обработки. Исторические выводы требуют перепроверки.</p>}
     {isWorking&&<>
      {previous.length>0&&<details className="rounded-xl border border-foreground/10 p-3 text-xs">
       <summary className="cursor-pointer">Контекст предыдущих сфер этой ветви</summary>
       {previous.map(item=><div key={item.sphere} className="mt-2 border-t border-foreground/10 pt-2">
        <p className="font-medium">{nameOf[item.sphere]}</p>
        <p className="mt-1 whitespace-pre-wrap">{item.summary??"Нет доступного вывода"}</p>
       </div>)}
      </details>}
      <div className="rounded-xl border border-foreground/15 p-3">
       <p className="text-sm font-medium">Режим обработки</p>
       <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-foreground/5 p-1" role="group" aria-label="Режим обработки">
        {([["auto","Авто"],["symbiosis","Симбиоз"],["manual","Ручной"]] as const).map(([value,label])=>
         <button type="button" key={value} onClick={()=>{setMode(value);setNotice("");}} aria-pressed={mode===value}
          className={"min-h-10 rounded-lg px-2 text-xs "+(mode===value?"bg-background shadow-sm":"text-foreground/55")}>{label}</button>)}
       </div>
       {mode==="auto"?<div className="mt-3">
        <p className="text-xs text-foreground/65">Один реальный AI-шаг → проверка схемы → сохранение результата → оба назначения.</p>
        {!mayRunAuto&&nextAuto&&<p className="mt-1 text-xs text-foreground/55">Автоматическая очередь сейчас у сферы «{nameOf[nextAuto]}».</p>}
        <button type="button" disabled={!mayRunAuto||busy} onClick={()=>void runAI(false)}
         className="mt-3 w-full rounded-xl bg-foreground px-4 py-3 text-sm text-background disabled:opacity-35"
         data-testid="egg-sphere-run-auto">{busy?"Выполняется…":"Выполнить AI-шаг этой сферы"}</button>
       </div>:<div className="mt-3">
        {mode==="symbiosis"&&<>
         <p className="text-xs text-foreground/65">ИИ готовит черновик. Он не попадёт в поток до вашей правки и подтверждения.</p>
         <button type="button" onClick={()=>void runAI(true)} disabled={!mayRunAuto||busy}
          className="mt-3 rounded-xl border border-foreground/25 px-3 py-2 text-xs disabled:opacity-35"
          data-testid="egg-sphere-ai-draft">{busy?"ИИ работает…":"Предложить черновик ИИ"}</button>
        </>}
        {mode==="manual"&&<p className="text-xs text-foreground/65">Вклад формирует Автор, без AI-запроса.</p>}
        <label className="mt-3 block text-xs font-medium">Вклад сферы
         <textarea value={draft} onChange={e=>setDraft(e.target.value)} rows={7} maxLength={10000}
          aria-label="Авторский вклад сферы" placeholder="Один конкретный результат, основания, гипотезы и открытые вопросы…"
          className="mt-2 w-full resize-y rounded-xl border border-foreground/20 bg-background p-3 text-base font-normal outline-none md:text-sm"/>
        </label>
        <label className="mt-2 block text-xs">Достоверность
         <select value={evidence} onChange={e=>setEvidence(e.target.value as EggEvidence)}
          className="ml-2 rounded-lg border border-foreground/20 bg-background p-2 text-xs">
          <option value="hypothesis">Гипотеза</option><option value="observation">Наблюдение</option><option value="question">Вопрос</option>
         </select>
        </label>
        <button type="button" disabled={busy||!draft.trim()} onClick={()=>void submitAuthor()}
         className="mt-3 w-full rounded-xl bg-foreground px-4 py-3 text-sm text-background disabled:opacity-35"
         data-testid="egg-sphere-author-submit">{busy?"Сохраняем…":"Утвердить вклад и передать в оба потока"}</button>
       </div>}
      </div>
     </>}
     {cycle.status==="awaiting_author"&&<p className="text-xs text-foreground/65">Оба потока завершены. Общий синтез в Желтке ожидает одного решения Автора.</p>}
    </>}
    {!isWorking&&cycle?.status==="running"&&visit?.status==="pending"&&<p className="text-xs text-foreground/60">Сначала должен завершиться предыдущий узел этой ветви.</p>}
    {notice&&<p className="rounded-lg border border-foreground/10 p-3 text-xs" role="status">{notice}</p>}
    {notice&&<button type="button" onClick={()=>setRefresh(v=>v+1)} className="text-xs underline">Обновить состояние</button>}
   </div>}
 </section>;
}

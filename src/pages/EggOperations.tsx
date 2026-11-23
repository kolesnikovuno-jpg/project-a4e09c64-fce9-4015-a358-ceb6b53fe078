import {useEffect,useState} from "react";
import {Link} from "react-router-dom";
import {createClient} from "@supabase/supabase-js";

type OperationalProject = {
  id:string;slug:string;title:string;goal_metric:string;goal_target:number;
  ads_daily_limit_uah:number;ads_rolling_30d_limit_uah:number;
  ads_operation_allowed:boolean;ads_author_approved_at:string;
  auto_research_enabled:boolean;auto_research_daily_limit:number;
};
type OperationalEvent = {
  id:string;kind:string;source:string;summary:string;
  evidence_status:"verified_source"|"hypothesis"|"incomplete";
  observed_at:string;facts:Record<string,unknown>;
};
type AutoRun={
  run_day:string;slot:number;status:"claimed"|"proposed"|"blocked";
  attempted_at:string;outcome_code:string|null;
};
type AutoFollowup={
  status:"waiting"|"completed";baseline_day:string;resolved_day:string|null;
  action_type:string;created_at:string;
};
type SourceCheck={
  source_day:string;status:"ok"|"no_activity"|"error";checked_at:string;
  website_events:number;inquiries:number;error_code:string|null;
};
type OperationalActivation = {
  id:string;event_id:string;sphere:string;task:string;
  status:"pending"|"researching"|"proposed"|"verified"|"blocked";
  created_at:string;
  retry_count:number;
  finding?:{kind?:string;observation?:string;hypothesis?:string;nextStep?:string;confidence?:string;limitations?:string[];code?:string;stage?:string;canRetry?:boolean}|null;
};
const sphereNames:Record<string,string>={
  marketing:"Маркетинг",design:"Дизайн",testDrive:"Тестдрайв",commerce:"Коммерция",
  legal:"Право",production:"Производство",procurement:"Комплектация",retail:"Ритейл",
};
const readableDate=(value:string)=>new Date(value).toLocaleString("ru-UA",{dateStyle:"medium",timeStyle:"short"});

/** Read-only, author-owned operational view. This is NOT an advertising control. */
export default function EggOperations(){
  const [busy,setBusy]=useState(true);
  const [revision,setRevision]=useState(0);
  const [running,setRunning]=useState<string|null>(null);
  const [researchError,setResearchError]=useState("");
  const [syncing,setSyncing]=useState(false);
  const [syncMessage,setSyncMessage]=useState("");
  const [error,setError]=useState("");
  const [project,setProject]=useState<OperationalProject|null>(null);
  const [events,setEvents]=useState<OperationalEvent[]>([]);
  const [activations,setActivations]=useState<OperationalActivation[]>([]);
  const [sourceChecks,setSourceChecks]=useState<SourceCheck[]>([]);
  const [autoRuns,setAutoRuns]=useState<AutoRun[]>([]);
  const [followups,setFollowups]=useState<AutoFollowup[]>([]);
  useEffect(()=>{
    let live=true;
    void (async()=>{
      if(live){setBusy(true);setError("");}
      try{
        const configResponse=await fetch("/api/egg-config",{cache:"no-store"});
        if(!configResponse.ok)throw Error("Настройки EGG недоступны.");
        const config=await configResponse.json() as {supabaseUrl:string;publishableKey:string};
        const auth=createClient(config.supabaseUrl,config.publishableKey);
        const {data:{session}}=await auth.auth.getSession();
        if(!session)throw Error("Для доступа к данным войдите в аккаунт EGG.");
        const {data:projectRow,error:projectError}=await auth
          .from("egg_operational_projects")
          .select("id,slug,title,goal_metric,goal_target,ads_daily_limit_uah,ads_rolling_30d_limit_uah,ads_operation_allowed,ads_author_approved_at,auto_research_enabled,auto_research_daily_limit")
          .eq("slug","lyra").maybeSingle();
        if(projectError)throw Error("Не удалось загрузить операционный проект.");
        if(!projectRow)throw Error("Операционный проект Lyra не найден в вашем аккаунте.");
        const {data:sourceRows,error:eventsError}=await auth
          .from("egg_operational_events")
          .select("id,kind,source,summary,evidence_status,observed_at,facts")
          .eq("operational_project_id",projectRow.id)
          .order("observed_at",{ascending:false}).limit(30);
        if(eventsError)throw Error("Не удалось прочитать события Lyra.");
        const rows=(sourceRows??[]) as OperationalEvent[];
        let tasks:OperationalActivation[]=[];
        if(rows.length){
          const {data:taskRows,error:taskError}=await auth
            .from("egg_operational_activations")
            .select("id,event_id,sphere,task,status,created_at,retry_count,finding")
            .in("event_id",rows.map(row=>row.id))
            .order("created_at",{ascending:false}).limit(120);
          if(taskError)throw Error("Не удалось прочитать задачи сфер.");
          tasks=(taskRows??[]) as OperationalActivation[];
        }
        const {data:checkRows,error:checksError}=await auth
          .from("egg_operational_source_checks")
          .select("source_day,status,checked_at,website_events,inquiries,error_code")
          .eq("operational_project_id",projectRow.id)
          .order("source_day",{ascending:false}).limit(14);
        if(checksError)throw Error("Не удалось прочитать состояние синхронизации.");
        const [{data:runRows,error:runError},{data:followupRows,error:followupError}]=await Promise.all([
          auth.from("egg_operational_auto_runs")
            .select("run_day,slot,status,attempted_at,outcome_code")
            .eq("operational_project_id",projectRow.id)
            .order("attempted_at",{ascending:false}).limit(10),
          auth.from("egg_operational_followups")
            .select("status,baseline_day,resolved_day,action_type,created_at")
            .eq("operational_project_id",projectRow.id)
            .order("created_at",{ascending:false}).limit(10),
        ]);
        if(runError||followupError)throw Error("Не удалось загрузить историю автономной работы.");
        if(live){
          setProject(projectRow as OperationalProject);
          setEvents(rows);setActivations(tasks);setSourceChecks((checkRows??[]) as SourceCheck[]);
          setAutoRuns((runRows??[]) as AutoRun[]);
          setFollowups((followupRows??[]) as AutoFollowup[]);
        }
      }catch(e){if(live)setError(e instanceof Error?e.message:"Неизвестная ошибка");}
      finally{if(live)setBusy(false);}
    })();
    return ()=>{live=false};
  },[revision]);
  const researchOne=async(id:string)=>{
    if(running)return;
    setRunning(id);setResearchError("");
    try{
      const cfgResponse=await fetch("/api/egg-config",{cache:"no-store"});
      if(!cfgResponse.ok)throw Error("Нет конфигурации EGG");
      const cfg=await cfgResponse.json() as {supabaseUrl:string;publishableKey:string};
      const auth=createClient(cfg.supabaseUrl,cfg.publishableKey);
      const {data:{session}}=await auth.auth.getSession();
      if(!session)throw Error("Войдите в EGG для запуска исследования");
      const response=await fetch("/api/egg-operational-research",{
        method:"POST",
        headers:{"Content-Type":"application/json","Authorization":"Bearer "+session.access_token},
        body:JSON.stringify({activationId:id}),
      });
      if(!response.ok){
        const reason=await response.json().catch(()=>null) as {error?:string;stage?:string}|null;
        const descriptions:Record<string,string>={
          ai_model_not_authorized:"Нет доступа к модели ИИ — требуется проверить API-ключ.",
          ai_budget_exhausted:"У провайдера ИИ исчерпан бюджет.",
          ai_rate_limited:"Провайдер ограничил частоту запросов.",
          ai_provider_bad_request:"Модель отклонила формат запроса.",
          model_incomplete:"Модель не завершила формирование ответа.",
          invalid_ai_response:"Ответ ИИ не прошёл проверку формата.",
          provider_timeout:"Модель не ответила в пределах времени.",
          model_request_failed:"Ошибка запроса к провайдеру ИИ.",
          pilot_daily_ai_call_limit:"Лимит вызовов ИИ пилота за 24 часа исчерпан.",
          retry_limit_reached:"Повторный запуск этой задачи уже был использован.",
        };
        throw Error(descriptions[reason?.error??""]??"Исследование завершилось ошибкой. Данные проекта не изменены.");
      }
      setRevision(v=>v+1);
    }catch(e){setResearchError(e instanceof Error?e.message:"Ошибка исследования");setRevision(v=>v+1);}
    finally{setRunning(null);}
  };
  const syncLyra=async()=>{
    if(syncing)return;
    setSyncing(true);setSyncMessage("");
    try{
      const cfgResponse=await fetch("/api/egg-config",{cache:"no-store"});
      if(!cfgResponse.ok)throw Error("Нет конфигурации EGG");
      const cfg=await cfgResponse.json() as {supabaseUrl:string;publishableKey:string};
      const auth=createClient(cfg.supabaseUrl,cfg.publishableKey);
      const {data:{session}}=await auth.auth.getSession();
      if(!session)throw Error("Необходимо войти в аккаунт EGG");
      const response=await fetch("/api/egg-operational-research?mode=sync",{
        method:"POST",
        headers:{"content-type":"application/json","authorization":"Bearer "+session.access_token},
        body:JSON.stringify({days:7}),
      });
      const data=await response.json().catch(()=>null) as
        {ok?:boolean;error?:string;days?:Array<{day:string;status:string}>}|null;
      if(!response.ok||!data?.ok)
        throw Error("Источник Lyra временно недоступен ("+(data?.error??"unknown")+").");
      setSyncMessage("Проверено дней: "+(data.days?.length??0)+". Новые наблюдения сохранены без изменения рекламы.");
      setRevision(v=>v+1);
    }catch(e){setSyncMessage(e instanceof Error?e.message:"Не удалось обновить источник Lyra");}
    finally{setSyncing(false);}
  };
  const recordedOrders=events.filter(item=>item.kind==="order_confirmed").length;
  const openTasks=activations.filter(item=>item.status==="pending").length;
  return <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:mx-auto sm:max-w-3xl">
    <header className="mb-7 flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs text-muted-foreground">EGG · функционирование · пилот</p>
        <h1 className="mt-2 text-3xl font-medium">Lyra</h1>
        <p className="mt-1 text-sm text-muted-foreground">Операционное состояние проекта. Не является пультом Google Ads.</p>
      </div>
      <div className="flex items-center gap-2">
        <Link to="/egg/connect" className="rounded-lg border border-border px-3 py-2 text-sm">Аккаунт</Link>
        <button type="button" onClick={()=>setRevision(n=>n+1)} disabled={busy}
          className="rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50">
          {busy?"Загрузка…":"Обновить"}
        </button>
      </div>
    </header>
    {error&&<section role="alert" className="rounded-xl border border-border p-4 text-sm">
      {error} <Link className="underline" to="/egg/connect">Перейти ко входу</Link>
    </section>}
    {!error&&busy&&!project&&<p role="status" className="text-sm text-muted-foreground">Читаем состояние EGG…</p>}
    {project&&<div className="space-y-5">
      <section aria-label="Цель и ограничения" className="rounded-xl border border-border p-4 sm:p-5">
        <h2 className="mb-4 text-sm font-semibold">Цель Автора и коммерческий коридор</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div><p className="text-xs text-muted-foreground">Цель</p><p className="mt-1 text-2xl font-medium">{project.goal_target}</p>
            <p className="text-xs text-muted-foreground">подтверждённых заказа в месяц</p></div>
          <div><p className="text-xs text-muted-foreground">День</p><p className="mt-1 text-2xl font-medium">{project.ads_daily_limit_uah} грн</p><p className="text-xs text-muted-foreground">предел</p></div>
          <div><p className="text-xs text-muted-foreground">Любые 30 дней</p><p className="mt-1 text-2xl font-medium">{project.ads_rolling_30d_limit_uah} грн</p><p className="text-xs text-muted-foreground">предел</p></div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Подтверждённых заказов, зарегистрированных непосредственно в EGG: {recordedOrders}. Это не утверждение, что фактических продаж не было.</p>
        <p className="mt-2 text-sm">
          {project.ads_operation_allowed?"Для расходов требуется отдельный подтверждённый механизм исполнения.":"Изменение рекламы и расходование средств движком отключены."}
        </p>
      </section>
      <section aria-label="Автономное исследование" className="rounded-xl border border-border p-4 sm:p-5">
        <h2 className="mb-2 text-sm font-semibold">Автономная работа сфер</h2>
        <p className="text-sm">{project.auto_research_enabled?"Включена":"Выключена"} · до {project.auto_research_daily_limit} платных исследований ИИ в сутки</p>
        <p className="mt-1 text-xs text-muted-foreground">Автоматические исследования по событиям Lyra. Внешние операции, реклама, расходы и изменения авторской цели запрещены. Единственное автоматическое действие — запросить проверку следующего закрытого дня.</p>
        {autoRuns.length>0&&<div className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
          <p className="font-medium">Последний запуск: {readableDate(autoRuns[0].attempted_at)}</p>
          <p className="text-muted-foreground">Статус: {autoRuns[0].status==="proposed"?"исследование сохранено":autoRuns[0].status==="blocked"?"исследование не завершено":"выполняется"}</p>
          {autoRuns[0].status==="blocked"&&<p className="text-xs text-destructive">Код: {autoRuns[0].outcome_code??"unknown"}</p>}
        </div>}
        {followups.length>0&&<div className="mt-3 border-t border-border pt-3 text-sm">
          <p className="font-medium">Внутренний следующий шаг</p>
          <p className="text-muted-foreground">{followups[0].status==="waiting"?
            "Ожидается проверенный следующий день после "+followups[0].baseline_day:
            "Данные следующего дня получены: "+followups[0].resolved_day}</p>
        </div>}
        {!autoRuns.length&&<p className="mt-3 text-xs text-muted-foreground">Автоматических исследований ещё нет.</p>}
      </section>
      <section aria-label="Синхронизация источника" className="rounded-xl border border-border p-4 sm:p-5">
        <h2 className="mb-2 text-sm font-semibold">Источник Lyra · ежедневные агрегаты</h2>
        <p className="mb-3 text-sm text-muted-foreground">Передаются только количества событий и заявок за закрытые дни по Киеву. Контакты клиентов не копируются. Google Ads — отдельный пока не подключённый источник.</p>
        <p className="mb-3 text-xs text-muted-foreground">Автопроверка: ежедневно в 07:20 зимой / 08:20 летом (Киев). Записи с нулевой активностью также учитываются.</p>
        {sourceChecks.length>0&&<div className="mb-3 rounded-lg border border-border p-3 text-sm">
          <p className="font-medium">Последняя проверенная дата: {sourceChecks[0].source_day}</p>
          <p className="text-muted-foreground">
            Статус: {sourceChecks[0].status==="ok"?"данные получены":
              sourceChecks[0].status==="no_activity"?"новых событий не было":"ошибка источника"}
            {" · "}Проверено: {readableDate(sourceChecks[0].checked_at)}
          </p>
          {sourceChecks[0].status==="error"&&<p className="text-xs text-destructive">
            Код: {sourceChecks[0].error_code??"unknown"}
          </p>}
        </div>}
        {!sourceChecks.length&&<p className="mb-3 text-sm text-muted-foreground">Ещё нет записи о завершённой автоматической проверке.</p>}
        <button type="button" onClick={()=>void syncLyra()} disabled={syncing||busy}
          className="rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50">
          {syncing?"Получаем данные…":"Синхронизировать 7 дней"}
        </button>
        {syncMessage&&<p role="status" className="mt-3 text-sm">{syncMessage}</p>}
        <p className="mt-2 text-xs text-muted-foreground">Этот запуск только читает Lyra и обновляет общее поле. Исследование ИИ и реклама не запускаются.</p>
      </section>
      <section aria-label="События общего поля" className="rounded-xl border border-border p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">Общее поле · наблюдения</h2><span className="text-xs text-muted-foreground">{events.length} записей</span></div>
        {!events.length&&<p className="text-sm text-muted-foreground">События ещё не поступили.</p>}
        {events.map(event=><article key={event.id} className="border-t border-border py-3">
          <p className="text-xs text-muted-foreground">{readableDate(event.observed_at)} · {event.source} · {event.evidence_status==="verified_source"?"данные источника":event.evidence_status==="hypothesis"?"гипотеза":"неполные данные"}</p>
          <p className="mt-1 text-sm">{event.summary}</p>
        </article>)}
        <p className="mt-2 text-xs text-muted-foreground">Первый исторический снимок получен вручную. Ежедневные записи из Lyra имеют источник lyra_supabase_daily_v1. Google Ads API не подключён.</p>
      </section>
      <section aria-label="Активность сфер" className="rounded-xl border border-border p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">Событийная активация сфер</h2><span className="text-xs text-muted-foreground">{openTasks} ожидают обработки</span></div>
        {!activations.length&&<p className="text-sm text-muted-foreground">Задачи пока не активированы.</p>}
        {researchError&&<p role="alert" className="mb-3 text-sm text-destructive">{researchError}</p>}
        {activations.map(a=><div key={a.id} className="border-t border-border py-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium">{sphereNames[a.sphere]??a.sphere}</p><span className="text-xs text-muted-foreground">{a.status==="pending"?"Ожидает обработки":a.status}</span></div>
          <p className="mt-1 text-sm text-muted-foreground">{a.task}</p>
          {a.finding?.kind==="ai_research_proposal"&&<div className="mt-3 space-y-2 rounded-lg border border-border p-3 text-sm">
            <p><strong>Наблюдение:</strong> {a.finding.observation}</p>
            <p><strong>Гипотеза:</strong> {a.finding.hypothesis}</p>
            <p><strong>Следующий шаг:</strong> {a.finding.nextStep}</p>
            <p className="text-xs text-muted-foreground">Вывод ИИ — исследовательское предложение. Внешние действия не выполнялись; внутренний шаг при автономном режиме фиксируется отдельно.</p>
          </div>}
          {a.finding?.kind==="worker_error"&&<p className="mt-2 text-xs text-destructive">
            {a.finding.code==="ai_model_not_authorized"?"ИИ не авторизован у провайдера.":
            a.finding.code==="invalid_ai_response"?"ИИ вернул ответ, не соответствующий формату.":
            a.finding.code==="model_incomplete"?"ИИ не успел закончить ответ.":
            a.finding.code==="ai_provider_bad_request"?"Провайдер отклонил формат запроса.":
            a.finding.code==="ai_rate_limited"?"Временное ограничение провайдера ИИ.":
            a.finding.code==="ai_budget_exhausted"?"Лимит оплаты ИИ исчерпан.":
            "Исследование завершилось ошибкой; точная причина предыдущей попытки не определена."}
            {" "}Реклама и данные проекта не изменены.
          </p>}
          {(a.status==="pending"||(a.status==="blocked"&&a.retry_count<1))&&<button type="button" disabled={running!==null}
            onClick={()=>void researchOne(a.id)}
            className="mt-3 rounded border border-border px-3 py-2 text-xs disabled:opacity-50">
            {running===a.id?"ИИ исследует…":a.status==="blocked"?"Повторить исследование":"Исследовать через ИИ"}
          </button>}
        </div>)}
        <p className="mt-2 text-xs text-muted-foreground">Каждая кнопка исследования запускает один отдельный платный запрос подключённой модели. Вывод сохраняется в EGG; внешние действия, траты и авторские утверждения не выполняются. Автономные исследования выполняются по расписанию только при активном режиме, без расходов на рекламу.</p>
      </section>
    </div>}
  </main>;
}

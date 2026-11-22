import {useEffect,useState} from "react";
import {Link} from "react-router-dom";
import {createClient} from "@supabase/supabase-js";

type OperationalProject = {
  id:string;slug:string;title:string;goal_metric:string;goal_target:number;
  ads_daily_limit_uah:number;ads_rolling_30d_limit_uah:number;
  ads_operation_allowed:boolean;ads_author_approved_at:string;
};
type OperationalEvent = {
  id:string;kind:string;source:string;summary:string;
  evidence_status:"verified_source"|"hypothesis"|"incomplete";
  observed_at:string;facts:Record<string,unknown>;
};
type OperationalActivation = {
  id:string;event_id:string;sphere:string;task:string;
  status:"pending"|"researching"|"proposed"|"verified"|"blocked";
  created_at:string;
  finding?:{kind?:string;observation?:string;hypothesis?:string;nextStep?:string;confidence?:string;limitations?:string[];code?:string}|null;
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
  const [error,setError]=useState("");
  const [project,setProject]=useState<OperationalProject|null>(null);
  const [events,setEvents]=useState<OperationalEvent[]>([]);
  const [activations,setActivations]=useState<OperationalActivation[]>([]);
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
          .select("id,slug,title,goal_metric,goal_target,ads_daily_limit_uah,ads_rolling_30d_limit_uah,ads_operation_allowed,ads_author_approved_at")
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
            .select("id,event_id,sphere,task,status,created_at,finding")
            .in("event_id",rows.map(row=>row.id))
            .order("created_at",{ascending:false}).limit(120);
          if(taskError)throw Error("Не удалось прочитать задачи сфер.");
          tasks=(taskRows??[]) as OperationalActivation[];
        }
        if(live){setProject(projectRow as OperationalProject);setEvents(rows);setActivations(tasks);}
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
      if(!response.ok)throw Error(response.status===429
        ?"Лимит вызовов ИИ пилота за сутки исчерпан."
        :"ИИ не завершил исследование. Проверьте состояние задачи после обновления.");
      setRevision(v=>v+1);
    }catch(e){setResearchError(e instanceof Error?e.message:"Ошибка исследования");setRevision(v=>v+1);}
    finally{setRunning(null);}
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
      <section aria-label="События общего поля" className="rounded-xl border border-border p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">Общее поле · наблюдения</h2><span className="text-xs text-muted-foreground">{events.length} записей</span></div>
        {!events.length&&<p className="text-sm text-muted-foreground">События ещё не поступили.</p>}
        {events.map(event=><article key={event.id} className="border-t border-border py-3">
          <p className="text-xs text-muted-foreground">{readableDate(event.observed_at)} · {event.source} · {event.evidence_status==="verified_source"?"данные источника":event.evidence_status==="hypothesis"?"гипотеза":"неполные данные"}</p>
          <p className="mt-1 text-sm">{event.summary}</p>
        </article>)}
        <p className="mt-2 text-xs text-muted-foreground">Первый снимок Lyra получен вручную через подключённую базу. Автоматическая синхронизация Google Ads и сайта ещё не включена.</p>
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
            <p className="text-xs text-muted-foreground">Вывод ИИ — предложение, не выполненное действие. Требует проверки.</p>
          </div>}
          {a.finding?.kind==="worker_error"&&<p className="mt-2 text-xs text-destructive">Запрос завершился ошибкой. Реклама и данные проекта не изменены.</p>}
          {a.status==="pending"&&<button type="button" disabled={running!==null}
            onClick={()=>void researchOne(a.id)}
            className="mt-3 rounded border border-border px-3 py-2 text-xs disabled:opacity-50">
            {running===a.id?"ИИ исследует…":"Исследовать через ИИ"}
          </button>}
        </div>)}
        <p className="mt-2 text-xs text-muted-foreground">Каждая кнопка исследования запускает один отдельный платный запрос подключённой модели. Вывод сохраняется в EGG; внешние действия, траты и авторские утверждения не выполняются. Автоматический исполнитель пока не включён.</p>
      </section>
    </div>}
  </main>;
}

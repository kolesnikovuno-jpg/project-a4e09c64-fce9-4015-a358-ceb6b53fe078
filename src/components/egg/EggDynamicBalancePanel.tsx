import {useState} from "react";
import {createClient} from "@supabase/supabase-js";
import type {EggProject,SphereId} from "../../lib/eggEngine";
import {
  buildEggBalanceOverview,eligibleEggBalanceVerificationSources,
  type EggBalanceCandidate,type EggBalanceSeverity,
  type EggBalanceTension,
} from "../../lib/eggDynamicBalance";

const names:Record<SphereId,string>={
  marketing:"Маркетинг",design:"Дизайн",testDrive:"Тестдрайв",
  commerce:"Коммерция",legal:"Право",production:"Производство",
  procurement:"Комплектация",retail:"Ритейл",
};
const labels:Record<EggBalanceTension["status"],string>={
  proposed:"Записана · не подтверждена",
  tracked:"Автор назначил проверку",
  resolved:"Автор закрыл после рассмотрения",
  dismissed:"Автор отклонил",
};
const priorities:Record<EggBalanceSeverity,string>={
  unassessed:"Критичность не оценена",low:"Низкая",medium:"Средняя",high:"Высокая",
};

export default function EggDynamicBalancePanel({project,revision,authorControls=false,
  onSaved,onSuggestRoute}:{
  project:EggProject;revision:number|null;authorControls?:boolean;
  onSaved?:()=>void;onSuggestRoute?:(spheres:SphereId[])=>void;
}){
  const balance=buildEggBalanceOverview(project);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");
  const [editing,setEditing]=useState<string|null>(null);
  const [reason,setReason]=useState("");
  const [severity,setSeverity]=useState<EggBalanceSeverity>("unassessed");
  const [verificationRef,setVerificationRef]=useState("");
  const [showClosed,setShowClosed]=useState(false);

  const lastCycle=project.flowCycles?.slice(-1)[0];

  async function mutate(command:Record<string,unknown>){
    if(saving||!authorControls||revision===null)return;
    setSaving(true);setMessage("");
    try{
      const config=await fetch("/api/egg-config",{cache:"no-store"});
      if(!config.ok)throw Error("Сервис EGG недоступен.");
      const cfg=await config.json() as {supabaseUrl:string;publishableKey:string};
      const client=createClient(cfg.supabaseUrl,cfg.publishableKey);
      const {data}=await client.auth.getSession();
      if(!data.session?.access_token)throw Error("Войдите в аккаунт EGG.");
      const response=await fetch("/api/egg",{method:"POST",headers:{
        "Content-Type":"application/json",Authorization:"Bearer "+data.session.access_token,
      },body:JSON.stringify({projectId:project.id,expectedRevision:revision,...command})});
      let result:{error?:string}={};
      try{result=await response.json() as typeof result}catch{/* response may be empty */}
      if(!response.ok)throw Error(response.status===409
        ?"Проект изменился. Обновите страницу и повторите.":result.error??"Не удалось сохранить напряжение.");
      setMessage("Изменение сохранено в истории EGG.");
      setEditing(null);setReason("");setVerificationRef("");
      onSaved?.();
    }catch(error){
      setMessage(error instanceof Error?error.message:"Не удалось сохранить решение.");
    }finally{setSaving(false);}
  }
  const startDecision=(t:EggBalanceTension)=>{
    setEditing(t.id);setReason("");setSeverity(t.severity);setVerificationRef("");
  };
  function renderCard(item:EggBalanceCandidate,tension?:EggBalanceTension){
    const name=tension?.status?"Журнал · "+labels[tension.status]:
      "Предварительная гипотеза · не сохранена";
    const independent=tension?eligibleEggBalanceVerificationSources(project,tension):[];
    return <article key={item.key} className="rounded-lg border border-foreground/15 p-3 space-y-2"
      data-testid={"egg-balance-"+item.key}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h6 className="text-xs font-medium">{item.title}</h6>
        <span className="text-[10px] text-foreground/55">{name}</span>
      </div>
      <p className="text-xs leading-relaxed text-foreground/70">{item.hypothesis}</p>
      <div className="text-[11px] leading-relaxed text-foreground/60 space-y-1">
        <p>Сферы: {item.relatedSpheres.map(s=>names[s]).join(" ↔ ")}</p>
        <p>Источники: {item.sourceRefs.join(", ")} · {item.source==="semantic_review"
          ?"интерпретация ИИ":"текстовые признаки существующих материалов"}</p>
        <p>Проверка: {item.verification}</p>
        <p>Предлагаемый маршрут: {item.suggestedTargets.map(s=>names[s]).join(" → ")}</p>
        {tension&&<p>Приоритет: {priorities[tension.severity]}</p>}
        <p className="text-[10px]">Сохранение ДНК не подтверждено автоматически.</p>
      </div>
      {tension&&<details className="rounded border border-foreground/10 p-2"
        data-testid={"egg-balance-history-"+item.key}>
        <summary className="cursor-pointer text-[11px]">История ({tension.history.length})</summary>
        <ul className="mt-2 space-y-2">
          {tension.history.map((h,i)=><li className="text-[11px] text-foreground/60" key={i}>
            <strong>{h.action}</strong> · {h.at.slice(0,16)} · {h.actor}
            <p className="mt-1">{h.reason}</p>
            {!!h.verificationRefs.length&&<p>Новые основания: {h.verificationRefs.join(", ")}</p>}
          </li>)}
        </ul>
      </details>}
      {authorControls&&revision!==null&&!tension&&<button type="button" disabled={saving}
        onClick={()=>void mutate({command:"record_balance_tension",key:item.key})}
        className="rounded-full border border-foreground/40 px-3 py-2 text-xs disabled:opacity-40"
        data-testid={"egg-balance-register-"+item.key}>Добавить гипотезу в журнал</button>}
      {tension&&authorControls&&revision!==null&&
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <button type="button" className="rounded border border-foreground/20 px-2 py-1 text-[11px]"
              onClick={()=>startDecision(tension)}
              data-testid={"egg-balance-author-"+item.key}>
              {editing===tension.id?"Скрыть решение":"Решение Автора"}
            </button>
            {onSuggestRoute&&lastCycle?.status==="awaiting_author"&&
              item.suggestedTargets.length>0&&<button type="button"
                onClick={()=>onSuggestRoute(item.suggestedTargets)}
                className="rounded border border-foreground/20 px-2 py-1 text-[11px]"
                data-testid={"egg-balance-route-"+item.key}>
                Подставить сферы в решение по циклу
              </button>}
          </div>
          {editing===tension.id&&<div className="space-y-2 rounded border border-foreground/10 p-3">
            <label className="block text-[11px]">Критичность (оценка Автора)
              <select className="mt-1 w-full rounded border border-foreground/20 bg-background p-2"
                value={severity} onChange={e=>setSeverity(e.target.value as EggBalanceSeverity)}>
                {Object.entries(priorities).map(([value,label])=>
                  <option value={value} key={value}>{label}</option>)}
              </select>
            </label>
            <label className="block text-[11px]">Основание решения
              <textarea className="mt-1 w-full rounded border border-foreground/20 bg-background p-2"
                rows={3} value={reason} onChange={e=>setReason(e.target.value)}
                placeholder="Почему нужна проверка, отклонение или закрытие?" maxLength={2000}/>
            </label>
            {tension.status==="tracked"&&<label className="block text-[11px]">
              Результат проверки (новое наблюдение или подтверждённый файл)
              <select className="mt-1 w-full rounded border border-foreground/20 bg-background p-2"
                value={verificationRef} onChange={e=>setVerificationRef(e.target.value)}>
                <option value="">Не выбран — закрытие недоступно</option>
                {independent.map(src=><option value={src.id} key={src.id}>
                  {src.label} · {src.id}</option>)}
              </select>
            </label>}
            <div className="flex flex-wrap gap-2">
              {tension.status==="proposed"&&<button type="button"
                disabled={saving||reason.trim().length<8}
                onClick={()=>void mutate({command:"decide_balance_tension",tensionId:tension.id,
                  outcome:"track",severity,reason:reason.trim()})}
                className="rounded border border-foreground/35 px-3 py-2 text-xs disabled:opacity-40">
                Взять на проверку</button>}
              {tension.status==="tracked"&&<button type="button"
                disabled={saving||reason.trim().length<8||!verificationRef}
                onClick={()=>void mutate({command:"decide_balance_tension",tensionId:tension.id,
                  outcome:"resolve",severity,reason:reason.trim(),verificationRefs:[verificationRef]})}
                className="rounded border border-foreground/35 px-3 py-2 text-xs disabled:opacity-40">
                Закрыть после проверки</button>}
              {["proposed","tracked"].includes(tension.status)&&<button type="button"
                disabled={saving||reason.trim().length<8}
                onClick={()=>void mutate({command:"decide_balance_tension",tensionId:tension.id,
                  outcome:"dismiss",severity,reason:reason.trim()})}
                className="rounded border border-foreground/35 px-3 py-2 text-xs disabled:opacity-40">
                Отклонить гипотезу</button>}
              {["resolved","dismissed"].includes(tension.status)&&<button type="button"
                disabled={saving||reason.trim().length<8}
                onClick={()=>void mutate({command:"decide_balance_tension",tensionId:tension.id,
                  outcome:"reopen",severity,reason:reason.trim()})}
                className="rounded border border-foreground/35 px-3 py-2 text-xs disabled:opacity-40">
                Возобновить проверку</button>}
            </div>
            <p className="text-[10px] text-foreground/55">
              Закрытие Автором не является сертификатом прочности, безопасности или комфорта.
            </p>
          </div>}
        </div>}
    </article>;
  }
  const open=balance.recorded.filter(t=>t.status==="proposed"||t.status==="tracked");
  const closed=balance.recorded.filter(t=>t.status==="resolved"||t.status==="dismissed");
  return <section className="rounded-lg border border-foreground/15 p-3 sm:p-4 space-y-3"
    data-testid="egg-dynamic-balance" aria-label="Динамическое равновесие EGG">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h5 className="text-sm font-medium">Dynamic Balance · карта напряжений</h5>
      <span className="text-[10px] text-foreground/55">Исследовательский слой v1</span>
    </div>
    <p className="text-[11px] leading-relaxed text-foreground/60">
      Равновесие — свойство всей модели, не девятая сфера. Здесь отмечены
      предположения и вопросы, а не доказанные дефекты или числовой рейтинг гармонии.
    </p>
    <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
      <div className="rounded border border-foreground/10 p-2"><strong className="block text-base">{balance.counts.potential}</strong>
        Не проверено</div>
      <div className="rounded border border-foreground/10 p-2"><strong className="block text-base">{balance.counts.tracked}</strong>
        На проверке</div>
      <div className="rounded border border-foreground/10 p-2"><strong className="block text-base">{balance.counts.resolved}</strong>
        Закрыто Автором</div>
    </div>
    <details className="rounded border border-foreground/10 p-2" data-testid="egg-balance-core">
      <summary className="cursor-pointer text-xs font-medium">Память ядра · инварианты</summary>
      <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-foreground/75">
        {balance.core.originalSeed}</p>
      <p className="mt-2 text-[11px] text-foreground/60">
        {balance.core.approvedConceptId
          ?"Утверждённая версия: "+balance.core.approvedConceptId
          :balance.core.workingConceptId
            ?"Рабочая концепция "+balance.core.workingConceptId+" ещё НЕ утверждена в Core."
            :"Утверждённой концепции пока нет."}
      </p>
      <p className="mt-1 text-[11px] text-foreground/55">
        Система показывает авторскую ДНК и источники, но смысловое соответствие
        каждой предлагаемой доработки ещё требует решения Автора.
      </p>
    </details>
    {balance.candidates.length+open.length===0
      ?<p className="text-xs text-foreground/60">
        Сейчас нет открытых кандидатов. Это не означает доказанное равновесие.
      </p>
      :<div className="space-y-2" data-testid="egg-balance-open">
        {balance.candidates.map(c=>renderCard(c))}
        {open.map(t=>renderCard(t,t))}
      </div>}
    {!!closed.length&&<details className="rounded border border-foreground/10 p-2"
      open={showClosed} onToggle={e=>setShowClosed(e.currentTarget.open)}>
      <summary className="cursor-pointer text-xs">Закрытые и отклонённые ({closed.length})</summary>
      <div className="mt-2 space-y-2">{closed.map(t=>renderCard(t,t))}</div>
    </details>}
    {message&&<p role="status" className="text-xs text-foreground/70">{message}</p>}
    <p className="text-[11px] leading-relaxed text-foreground/55">
      Маршруты проверок — предложения сфер следующей итерации; между потоками
      не создано новых связей. Перезапуск возможен только через решение Автора.
    </p>
  </section>;
}

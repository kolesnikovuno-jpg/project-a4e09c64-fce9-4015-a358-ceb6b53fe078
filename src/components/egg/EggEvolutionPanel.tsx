import {useState} from "react";
import {createClient} from "@supabase/supabase-js";
import type {EggProject} from "../../lib/eggEngine";
import {
  buildEggEvolutionOverview,type EggEvolutionComparison,
  type EggEvolutionDeltaStatus,type EggEvolutionAssessment,
} from "../../lib/eggEvolution";

const labels:Record<EggEvolutionDeltaStatus,string>={
  awaiting_result:"Ожидается новая работа",
  pending_transit:"Ожидает транзита по своей ветви",
  new_result:"Новый источник",
  text_changed:"Изменён текст вывода",
  resubmitted_same_text:"Новый источник, тот же текст",
  inherited:"Унаследовано без нового исследования",
  same_source:"Тот же источник",
  no_result:"Нет подтверждённого результата",
};
const outcomeLabels:Record<EggEvolutionAssessment["outcome"],string>={
  improved:"Улучшение по оценке Автора",
  worsened:"Ухудшение по оценке Автора",
  compromise:"Компромисс по оценке Автора",
  no_change:"Существенных изменений не установлено Автором",
  inconclusive:"Недостаточно данных для оценки",
};
const dnaLabels:Record<EggEvolutionAssessment["dnaImpact"],string>={
  preserved_by_author:"Смысл ДНК сохранён по оценке Автора",
  at_risk:"Риск потери авторского смысла",
  not_assessed:"Сохранность смысла не оценена",
};
const shorten=(value:string,max=195)=>
  value.trim().replace(/\s+/g," ").slice(0,max)+(value.trim().length>max?"…":"");

export default function EggEvolutionPanel({
  project,revision,authorControls=false,onSaved,
}:{
  project:EggProject;revision:number|null;authorControls?:boolean;onSaved?:()=>void;
}){
  const overview=buildEggEvolutionOverview(project);
  const [showCycle,setShowCycle]=useState<string|null>(null);
  const [outcome,setOutcome]=useState<EggEvolutionAssessment["outcome"]>("inconclusive");
  const [dnaImpact,setDnaImpact]=useState<EggEvolutionAssessment["dnaImpact"]>("not_assessed");
  const [reason,setReason]=useState("");
  const [evidence,setEvidence]=useState<string[]>([]);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const comparison=overview.comparisons.find(c=>c.toCycleId===showCycle)
    ??overview.current;
  const availableSources=comparison
    ?[...new Map(comparison.deltas.flatMap(d=>[d.before,d.after])
      .filter((x):x is NonNullable<typeof x>=>Boolean(x))
      .map(x=>[x.id,x] as const)).values()]:[];
  const selectedHasNewSource=comparison?.deltas.some(d=>
    d.after&&evidence.includes(d.after.id)&&
    ["new_result","resubmitted_same_text","text_changed"].includes(d.status));

  async function recordAssessment(){
    if(!authorControls||revision===null||busy||!comparison||comparison.assessment||
      comparison.toStatus==="running"||reason.trim().length<12)return;
    if(["improved","worsened"].includes(outcome)&&!selectedHasNewSource)return;
    setBusy(true);setMessage("");
    try{
      const config=await fetch("/api/egg-config",{cache:"no-store"});
      if(!config.ok)throw Error("Сервис EGG недоступен.");
      const cfg=await config.json() as {supabaseUrl:string;publishableKey:string};
      const client=createClient(cfg.supabaseUrl,cfg.publishableKey);
      const {data}=await client.auth.getSession();
      if(!data.session?.access_token)throw Error("Необходимо войти в EGG.");
      const response=await fetch("/api/egg",{method:"POST",headers:{
        "Content-Type":"application/json",Authorization:"Bearer "+data.session.access_token,
      },body:JSON.stringify({
        command:"assess_evolution",projectId:project.id,expectedRevision:revision,
        fromCycleId:comparison.fromCycleId,toCycleId:comparison.toCycleId,
        outcome,dnaImpact,reason:reason.trim(),evidenceResultIds:evidence,
      })});
      let output:{error?:string}={};
      try{output=await response.json() as typeof output}catch{/* optional */}
      if(!response.ok)throw Error(response.status===409?"Проект изменился. Обновите данные.":
        output.error??"Не удалось сохранить оценку.");
      setMessage("Оценка Автора сохранена в истории EGG.");
      setReason("");setEvidence([]);onSaved?.();
    }catch(e){setMessage(e instanceof Error?e.message:"Ошибка сохранения.");}
    finally{setBusy(false);}
  }
  const resetSelected=(id:string)=>{
    setShowCycle(id);setOutcome("inconclusive");setDnaImpact("not_assessed");
    setReason("");setEvidence([]);setMessage("");
  };
  return <section className="space-y-3 rounded-lg border border-foreground/15 p-3 sm:p-4"
    aria-label="Карта изменений между итерациями" data-testid="egg-evolution-map">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h5 className="text-sm font-medium">Карта изменений · ритм итераций</h5>
      <span className="text-[10px] text-foreground/55">Dynamic Balance · этап 2</span>
    </div>
    {!comparison?<div className="space-y-2 text-xs" data-testid="egg-evolution-baseline">
      <p className="text-foreground/70">Сейчас зафиксирована исходная точка: ДНК Автора и исторические выводы сфер.
        Сравнение появится после начала первого потокового цикла.</p>
      <p className="text-foreground/60">Исходная идея: {shorten(overview.baseline.seed,280)}</p>
      <p className="text-foreground/60">Рабочая концепция: {
        overview.baseline.approvedConceptId
          ?overview.baseline.approvedConceptId+" · утверждена Автором"
          :overview.baseline.workingConceptId
            ?overview.baseline.workingConceptId+" · не утверждена"
            :"не зарегистрирована"
      }</p>
      <p className="text-foreground/55">Исторических источников сфер: {overview.baseline.legacySources.length}.
        Их наличие не подтверждает правильность решений.</p>
    </div>:<>
      {overview.comparisons.length>1&&<label className="block text-[11px]">
        Выбрать сравнение
        <select data-testid="egg-evolution-select" value={comparison.toCycleId}
          className="mt-1 w-full rounded border border-foreground/20 bg-background p-2"
          onChange={e=>resetSelected(e.target.value)}>
          {overview.comparisons.map(c=><option value={c.toCycleId} key={c.toCycleId}>
            {c.fromLabel} → {c.toLabel} · {c.toCycleId}
          </option>)}
        </select>
      </label>}
      <div className="rounded border border-foreground/10 p-3 text-xs"
        data-testid="egg-evolution-provenance">
        <p className="font-medium">{comparison.fromLabel} → {comparison.toLabel}</p>
        <p className="mt-1 text-foreground/65">Причина: {comparison.reason??"Первая итерация; конкретная причина не записана."}</p>
        <p className="mt-1 text-foreground/55">
          {comparison.requestedTargets.length
            ?"Автор направил на доработку: "+comparison.requestedTargets.join(", ")+"."
            :"Адресная авторская доработка в предыдущем цикле не указана."}
        </p>
        <p className="mt-1 text-foreground/55">
          Исходная ДНК сохранена как запись; сохранение её смысла автоматически не определено.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px] text-center sm:grid-cols-4">
        <div className="rounded border border-foreground/10 p-2">
          <strong className="block text-base">{comparison.counts.changedText}</strong>
          Изменён текст
        </div>
        <div className="rounded border border-foreground/10 p-2">
          <strong className="block text-base">{comparison.counts.inherited}</strong>
          Без новой работы
        </div>
        <div className="rounded border border-foreground/10 p-2">
          <strong className="block text-base">{comparison.counts.awaiting}</strong>
          Ожидает работы
        </div>
        <div className="rounded border border-foreground/10 p-2">
          <strong className="block text-base">{comparison.counts.pendingTransit}</strong>
          Ожидает транзита
        </div>
      </div>
      <details className="rounded border border-foreground/10 p-3" open={overview.comparisons.length<2}
        data-testid="egg-evolution-sphere-deltas">
        <summary className="cursor-pointer text-xs font-medium">
          Изменения по восьми сферам · источники и версии
        </summary>
        <div className="mt-2 space-y-2">
          {comparison.deltas.map(d=><div key={d.sphere} className="rounded border border-foreground/10 p-2 text-[11px]"
            data-testid={"egg-evolution-"+d.sphere}>
            <div className="flex flex-wrap justify-between gap-1">
              <strong>{d.label}</strong>
              <span className="text-foreground/60">{labels[d.status]}</span>
            </div>
            {d.authorRequested&&<p className="mt-1 text-foreground/65">
              Адресно назначена Автором</p>}
            {d.before&&<p className="mt-1 text-foreground/55">
              Было · {d.before.id} ({d.before.cycleId??"исторический вывод"}):
              {" "}{shorten(d.before.text)}
            </p>}
            {d.after&&<p className="mt-1 text-foreground/70">
              Стало · {d.after.id} ({d.after.cycleId??"история"}):
              {" "}{shorten(d.after.text)}
            </p>}
            {!d.after&&<p className="mt-1 text-foreground/55">Нового зарегистрированного результата нет.</p>}
            <p className="mt-1 text-[10px] text-foreground/50">
              Не означает доказанное улучшение или ухудшение.
            </p>
          </div>)}
        </div>
      </details>
      {!!comparison.linkedTensions.length&&<details className="rounded border border-foreground/10 p-3"
        data-testid="egg-evolution-tensions">
        <summary className="cursor-pointer text-xs font-medium">
          События карты напряжений в этом цикле ({comparison.linkedTensions.length})
        </summary>
        {comparison.linkedTensions.map(t=><div key={t.id} className="mt-2 text-[11px]">
          <p className="font-medium">{t.title} · {t.status}</p>
          {t.events.map((e,i)=><p key={i} className="text-foreground/60">
            {e.action}: {e.reason}</p>)}
        </div>)}
      </details>}
      {comparison.assessment?<div className="space-y-1 rounded border border-foreground/15 p-3"
        data-testid="egg-evolution-author-assessment">
        <p className="text-xs font-medium">Оценка Автора · {outcomeLabels[comparison.assessment.outcome]}</p>
        <p className="text-[11px] text-foreground/65">{dnaLabels[comparison.assessment.dnaImpact]}</p>
        <p className="text-xs text-foreground/75">{comparison.assessment.reason}</p>
        <p className="text-[11px] text-foreground/55">
          Основания: {comparison.assessment.evidenceResultIds.join(", ")||"не указаны"}.
          Это оценка Автора, а не независимая техническая экспертиза.
        </p>
      </div>:authorControls&&revision!==null&&comparison.toStatus!=="running"&&
        <div className="space-y-2 rounded border border-foreground/15 p-3"
          data-testid="egg-evolution-assessment-form">
          <p className="text-xs font-medium">Авторская оценка изменений (не обязательна)</p>
          <label className="block text-[11px]">Состояние результата
            <select className="mt-1 w-full rounded border border-foreground/20 bg-background p-2"
              value={outcome} onChange={e=>setOutcome(e.target.value as EggEvolutionAssessment["outcome"])}>
              {Object.entries(outcomeLabels).map(([value,label])=>
                <option value={value} key={value}>{label}</option>)}
            </select>
          </label>
          <label className="block text-[11px]">Сохранность исходного смысла
            <select className="mt-1 w-full rounded border border-foreground/20 bg-background p-2"
              value={dnaImpact} onChange={e=>setDnaImpact(e.target.value as EggEvolutionAssessment["dnaImpact"])}>
              {Object.entries(dnaLabels).map(([value,label])=>
                <option value={value} key={value}>{label}</option>)}
            </select>
          </label>
          {availableSources.length>0&&<details className="rounded border border-foreground/10 p-2">
            <summary className="cursor-pointer text-[11px]">Основания оценки ({evidence.length} выбрано)</summary>
            <div className="mt-2 space-y-2">
              {availableSources.map(s=><label key={s.id} className="flex gap-2 text-[11px]">
                <input type="checkbox" checked={evidence.includes(s.id)}
                  onChange={e=>setEvidence(current=>e.target.checked?
                    current.length<8?[...current,s.id]:current:current.filter(x=>x!==s.id))}/>
                <span>{s.sphere} · {s.id}</span>
              </label>)}
            </div>
          </details>}
          <label className="block text-[11px]">Почему ты так оцениваешь изменение?
            <textarea className="mt-1 w-full rounded border border-foreground/20 bg-background p-2"
              value={reason} onChange={e=>setReason(e.target.value)}
              rows={3} maxLength={2500} placeholder="Основания, компромиссы и оставшиеся вопросы"/>
          </label>
          <button type="button" disabled={busy||reason.trim().length<12||
            ["improved","worsened"].includes(outcome)&&!selectedHasNewSource}
            onClick={()=>void recordAssessment()}
            className="rounded-full border border-foreground/35 px-3 py-2 text-xs disabled:opacity-40"
            data-testid="egg-evolution-save">
            Сохранить оценку Автора
          </button>
          <p className="text-[11px] text-foreground/55">
            Только Автор может зафиксировать оценку. Оценка не меняет ДНК,
            стадию цикла и не является сертификатом качества.
          </p>
        </div>}
    </>}
    {message&&<p role="status" className="text-[11px] text-foreground/70">{message}</p>}
    <p className="text-[11px] leading-relaxed text-foreground/55">
      Сравниваются записанные версии и источники. Изменение текста не доказывает
      улучшение, устранение дефекта или сохранение смысловых инвариантов.
    </p>
  </section>;
}

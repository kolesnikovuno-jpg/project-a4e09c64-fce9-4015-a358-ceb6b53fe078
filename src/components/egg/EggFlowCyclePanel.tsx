import {useState} from "react";
import {createClient} from "@supabase/supabase-js";
import {EGG_FLOW_ROUTES,currentEggFlowCycle,type EggFlowBranch,type EggSphereVisit} from "../../lib/eggFlowCycle";
import type {EggProject,SphereId} from "../../lib/eggEngine";
import EggYolkPassport from "./EggYolkPassport";
import EggYolkSemanticPanel from "./EggYolkSemanticPanel";

const names:Record<SphereId,string>={
  marketing:"Маркетинг",design:"Дизайн",testDrive:"Тестдрайв",commerce:"Коммерция",
  legal:"Право",production:"Производство",procurement:"Комплектация",retail:"Ритейл",
};
const statusLabels:Record<EggSphereVisit["status"],string>={
  pending:"Ожидает очереди",
  awaiting_result:"Требуется работа",
  completed:"Результат получен",
  transited:"Транзит",
};
const routeNames:Record<EggFlowBranch,string>={
  first:"Первый поток — ценность и форма",
  second:"Второй поток — осуществление и передача",
};

export default function EggFlowCyclePanel({
  project,revision,authorControls=false,onSaved,
}:{
  project:EggProject;revision:number|null;authorControls?:boolean;onSaved?:()=>void;
}){
  const cycle=currentEggFlowCycle(project);
  const [outcome,setOutcome]=useState<"accept"|"revise">("revise");
  const [remark,setRemark]=useState("");
  const [targets,setTargets]=useState<SphereId[]>([]);
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState("");
  const [historyOpen,setHistoryOpen]=useState(false);
  const canStart=authorControls&&revision!==null&&project.seed.text.trim()&&
    (!cycle || cycle.status==="accepted"&&cycle.level<5);
  const canDecide=authorControls&&revision!==null&&cycle?.status==="awaiting_author";
  const cycles=project.flowCycles??[];
  async function send(command:"start_flow_cycle"|"decide_flow_cycle"){
    if(!authorControls||revision===null||busy)return;
    if(command==="decide_flow_cycle"&&(!remark.trim()||(outcome==="revise"&&!targets.length)))return;
    setBusy(true);setStatus("");
    try{
      const configResponse=await fetch("/api/egg-config",{cache:"no-store"});
      if(!configResponse.ok)throw Error("config");
      const cfg=await configResponse.json() as {supabaseUrl:string;publishableKey:string};
      const client=createClient(cfg.supabaseUrl,cfg.publishableKey);
      const {data}=await client.auth.getSession();
      if(!data.session?.access_token)throw Error("auth");
      const body=command==="start_flow_cycle"?
        {command,projectId:project.id,expectedRevision:revision}:
        {command,projectId:project.id,expectedRevision:revision,outcome,reason:remark.trim(),
          addressedSpheres:outcome==="revise"?targets:[]};
      const response=await fetch("/api/egg",{method:"POST",headers:{
        "Content-Type":"application/json",Authorization:"Bearer "+data.session.access_token,
      },body:JSON.stringify(body)});
      if(response.status===409){setStatus("Проект изменился. Обновите состояние.");onSaved?.();return;}
      if(!response.ok)throw Error("request");
      setStatus(command==="start_flow_cycle"?"Полный цикл запущен.":"Решение по циклу сохранено.");
      setRemark("");setTargets([]);onSaved?.();
    }catch{
      setStatus("Не удалось выполнить действие. Проверьте вход в EGG и повторите.");
    }finally{setBusy(false);}
  }
  const visits=(branch:EggFlowBranch):EggSphereVisit[]=>cycle?.[branch]??EGG_FLOW_ROUTES[branch].map((sphere,position)=>({
    branch,sphere,position,mode:"work" as const,status:"pending" as const,
  }));
  return <section className="rounded-xl border border-foreground/15 p-4 sm:p-5"
    data-testid="egg-flow-cycle" aria-label="Два постоянных потока и цикл EGG">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h3 className="text-sm font-medium">EGG · два постоянных потока</h3>
      <span className="text-xs text-foreground/60">
        {cycle?"Уровень "+cycle.level+"/5 · итерация "+cycle.iteration:"5 уровней · Идея / Материя"}
      </span>
    </div>
    <p className="mt-2 text-xs leading-relaxed text-foreground/65">
      Маршрут не меняется. Сферы с актуальной задачей работают; остальные фиксируют транзит,
      сохраняя предыдущие результаты. Обе ветви сходятся в Желтке. Автор рассматривает
      целостный результат после синтеза, а не каждый отдельный вывод.
    </p>
    {!cycle&&<p className="mt-3 text-xs text-foreground/65">
      Новый потоковый цикл ещё не запускался. Старые записи и документы остаются в памяти проекта.
    </p>}
    <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-4">
      {(["first","second"] as EggFlowBranch[]).map(branch=><div key={branch}
        className="rounded-lg border border-foreground/10 p-2 sm:p-3">
        <h4 className="mb-3 text-center text-[11px] font-medium text-foreground/75">{routeNames[branch]}</h4>
        <div className="space-y-2">
          {visits(branch).map((visit,i)=><div key={visit.sphere}>
            {i>0&&<p aria-hidden className="mb-1 text-center text-foreground/30">↓</p>}
            <div className={"rounded-lg border px-2 py-3 "+
              (visit.status==="awaiting_result"?"border-foreground/55 bg-foreground/5":"border-foreground/10")}
              data-testid={"flow-visit-"+visit.sphere}>
              <p className="text-center text-xs font-medium">{names[visit.sphere]}</p>
              <p className="mt-1 text-center text-[10px] text-foreground/65">
                {statusLabels[visit.status]}
              </p>
              {visit.inherited&&<p className="mt-1 text-center text-[10px] text-foreground/50">
                Использован прошлый результат
              </p>}
              {visit.requiresRecheck&&<p className="mt-1 text-center text-[10px] text-amber-700 dark:text-amber-300">
                Проверить актуальность
              </p>}
              {visit.result&&<details className="mt-2 text-[11px]">
                <summary className="cursor-pointer text-foreground/70">Вывод</summary>
                <p className="mt-1 whitespace-pre-wrap text-foreground/70">{visit.result.text}</p>
                <p className="mt-1 text-foreground/50">{visit.result.evidence}</p>
                 {!!visit.result.discoveredQuestions?.length&&<div className="mt-2 border-t border-foreground/10 pt-2">
                   <p className="font-medium">Сфера самостоятельно выявила вопросы</p>
                   <ul className="mt-1 space-y-1">
                     {visit.result.discoveredQuestions.map(q=><li key={q.id}>
                       <strong>{q.domain}:</strong> {q.question}
                       <span className="block text-foreground/50">Открытый вопрос · не подтверждён</span>
                     </li>)}
                   </ul>
                 </div>}
                 {visit.result.legalSimilarity&&<div className="mt-3 space-y-2 border-t border-foreground/10 pt-2" data-testid="legal-ip-screening">
                   <p className="font-medium">Право · проверка правовых пересечений</p>
                   <p className="text-foreground/55">
                     {visit.result.legalSimilarity.status==="no_search_reported"?
                       "Поиск аналогов ещё не проведён":"Сообщено о поиске; результаты не подтверждены EGG"}
                   </p>
                   <p className="text-foreground/55">Сопоставлена версия формы:
                     {visit.result.legalSimilarity.subject.designResultId??" отсутствует"}
                   </p>
                   <p className="text-foreground/55">Территории:
                     {visit.result.legalSimilarity.territories.join(", ")||" не определены"}
                   </p>
                   {visit.result.legalSimilarity.candidates.map((candidate,i)=><div key={i}
                     className="space-y-1 rounded bg-foreground/5 p-2">
                     <p className="font-medium">{candidate.title} · возможное пересечение</p>
                     <p>Сходство: {candidate.similarity}</p>
                     {candidate.differences&&<p>Отличия: {candidate.differences}</p>}
                     <a className="underline underline-offset-2 break-all"
                       href={candidate.sourceUrl} target="_blank" rel="noopener noreferrer">
                       Источник / сопоставляемый объект
                     </a>
                   </div>)}
                   {visit.result.legalSimilarity.limitations.map((note,i)=><p key={i}
                     className="text-foreground/55">Ограничение: {note}</p>)}
                   <p className="text-foreground/55">Сходство не доказывает нарушение прав.
                     Отсутствие найденного аналога не подтверждает правовую чистоту.</p>
                 </div>}
              </details>}
            </div>
          </div>)}
        </div>
      </div>)}
    </div>
    <div className="mt-4 rounded-lg border border-foreground/15 bg-foreground/[0.025] p-3">
      <h4 className="text-sm font-medium">Желток · встреча потоков</h4>
      <div className="mt-3 space-y-3">
        <EggYolkPassport project={project}/>
        <EggYolkSemanticPanel project={project}/>
      </div>
      {!cycle?<p className="mt-2 text-xs text-foreground/65">Синтез будет доступен после полного прохождения обеих ветвей.</p>:
       cycle.status==="running"?<p className="mt-2 text-xs text-foreground/65">
         В работе. До синтеза обе линии должны пройти все четыре станции, включая транзит.
       </p>:
       <div className="mt-2 space-y-2">
         <p className="text-xs text-foreground/70">
           {cycle.status==="awaiting_author"?"Сводка двух потоков готова к рассмотрению Автором.":
            cycle.status==="accepted"?"Цикл принят Автором.":"Цикл направлен на адресную доработку."}
         </p>
         {cycle.synthesis&&<div className="space-y-2 text-xs">
           <p className="text-foreground/60">Коммерция: {cycle.synthesis.endpoints.commerce.text??"Нет результата"} · {cycle.synthesis.endpoints.commerce.status}</p>
           <p className="text-foreground/60">Ритейл: {cycle.synthesis.endpoints.retail.text??"Нет результата"} · {cycle.synthesis.endpoints.retail.status}</p>
           <details className="rounded border border-foreground/10 p-2">
             <summary className="cursor-pointer text-foreground/70">Синтез: ограничения ({cycle.synthesis.gaps.length}), вопросы сфер ({cycle.synthesis.openQuestions?.length??0})</summary>
             <ul className="mt-2 space-y-1 text-foreground/65">
               {cycle.synthesis.gaps.map((gap,i)=><li key={i}>— {gap}</li>)}
               {cycle.synthesis.second[0]?.legalSimilarity&&<li className="mt-2 rounded bg-foreground/5 p-2"
                 data-testid="yolk-ip-review">
                 Право: зарегистрировано сравнений с аналогами — {cycle.synthesis.second[0].legalSimilarity.candidates.length}.
                 Проверена версия формы: {cycle.synthesis.second[0].legalSimilarity.subject.designResultId??"нет"}.
                 Это не юридическое заключение.
               </li>}
               {(cycle.synthesis.openQuestions??[]).map(q=><li key={q.id} className="mt-2 rounded bg-foreground/5 p-2">
                 <strong>{names[q.sphere]} · {q.domain}</strong>
                 <p className="mt-1">{q.question}</p>
                 {q.basis&&<p className="mt-1 text-foreground/55">Основание: {q.basis}</p>}
                 <p className="mt-1 text-foreground/50">
                   {q.provenance==="inherited"?"Унаследовано":"Новый вопрос"} · не подтверждено
                   {q.requiresRecheck?" · проверить актуальность":""}
                 </p>
               </li>)}
             </ul>
           </details>
         </div>}
       </div>}
    </div>
    {canStart&&<div className="mt-4">
      <button type="button" disabled={busy} onClick={()=>void send("start_flow_cycle")}
        className="rounded-full border border-foreground/45 px-4 py-2 text-xs disabled:opacity-40"
        data-testid="start-flow-cycle">
        {cycle?"Запустить полный цикл следующего уровня":"Начать первый полный цикл"}
      </button>
    </div>}
    {canDecide&&<div className="mt-4 space-y-3 border-t border-foreground/10 pt-4">
      <h4 className="text-sm font-medium">Решение Автора · после синтеза</h4>
      <label className="block text-xs">Результат цикла
        <select className="mt-1 block w-full rounded border border-foreground/20 bg-background p-2"
          value={outcome} onChange={e=>setOutcome(e.target.value as "accept"|"revise")}>
          <option value="revise">Новая итерация текущего уровня</option>
          <option value="accept">Принять цикл и перейти к следующему уровню</option>
        </select>
      </label>
      {outcome==="revise"&&<fieldset className="rounded border border-foreground/10 p-3">
        <legend className="px-1 text-xs">Адресаты замечаний · другие сферы пройдут транзитом</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {([...EGG_FLOW_ROUTES.first,...EGG_FLOW_ROUTES.second] as SphereId[]).map(s=><label key={s}
            className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={targets.includes(s)}
              onChange={e=>setTargets(v=>e.target.checked?[...v,s]:v.filter(item=>item!==s))}/>
            {names[s]}
          </label>)}
        </div>
      </fieldset>}
      <textarea value={remark} onChange={e=>setRemark(e.target.value)} rows={3} maxLength={10000}
        className="block w-full rounded border border-foreground/20 bg-background p-3 text-xs"
        aria-label="Итоговые замечания Автора"
        placeholder="Замечание к итоговому синтезу или основание принятия"/>
      <button type="button" disabled={busy||!remark.trim()||(outcome==="revise"&&!targets.length)}
        onClick={()=>void send("decide_flow_cycle")}
        className="rounded-full border border-foreground/45 px-4 py-2 text-xs disabled:opacity-40"
        data-testid="decide-flow-cycle">
        {busy?"Сохраняем…":outcome==="accept"?"Принять полный цикл":"Запустить адресную итерацию"}
      </button>
    </div>}
    {cycles.length>1&&<div className="mt-4 border-t border-foreground/10 pt-3">
      <button type="button" className="text-xs underline underline-offset-4"
        aria-expanded={historyOpen} onClick={()=>setHistoryOpen(v=>!v)}>
        {historyOpen?"Скрыть":"Показать"} предыдущие циклы ({cycles.length-1})
      </button>
      {historyOpen&&<div className="mt-3 space-y-2">
        {cycles.slice(0,-1).map(c=><p key={c.id} className="text-xs text-foreground/65">
          Уровень {c.level}, итерация {c.iteration} · {c.status} · {c.decision?.reason??"Решение ещё не внесено"}
        </p>)}
      </div>}
    </div>}
    {status&&<p role="status" className="mt-3 text-xs text-foreground/65">{status}</p>}
  </section>;
}

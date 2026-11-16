import type {EggFlowCycle,EggSynthesisItem} from "../../lib/eggFlowCycle";
import type {EggProject,SphereId} from "../../lib/eggEngine";

const names:Record<SphereId,string>={
 marketing:"Маркетинг",design:"Дизайн",testDrive:"Тестдрайв",commerce:"Коммерция",
 legal:"Право",production:"Производство",procurement:"Комплектация",retail:"Ритейл",
};

/** Read-only editorial projection of actual versioned records.
 * Never invent a tension or promote an AI hypothesis into a fact.
 */
export function readEggCycleSummary(project:EggProject,cycle:EggFlowCycle){
 const visits=[...cycle.first,...cycle.second];
 const completed=visits.filter(v=>v.status==="completed"||v.status==="transited").length;
 const questions=cycle.synthesis?.openQuestions??[...visits]
  .flatMap(v=>(v.result?.discoveredQuestions??[]).map(q=>({
   id:q.id,question:q.question,sphere:v.sphere,status:"unverified" as const,
  })));
 // Examples from distinct spheres, NOT an AI ranking of importance.
 const examples:typeof questions=[];
 const already=new Set<SphereId>();
 for(const q of questions){
  if(already.has(q.sphere))continue;
  examples.push(q);already.add(q.sphere);
  if(examples.length===3)break;
 }
 const review=cycle.semanticReview;
 const tensions=review?.interpretations.filter(x=>x.kind==="tension")??[];
 const gaps=cycle.synthesis?.gaps??[];
 const reference=cycle.ideaHandoff?.workingDna||cycle.synthesis?.dna.workingDna
  ||project.seed.text;
 const source=cycle.ideaHandoff?"author_handoff" as const:"legacy_cycle" as const;
 const endState=cycle.status==="awaiting_author"?"Нужен выбор Автора":
  cycle.status==="running"?"Проходит две ветви":
  cycle.status==="accepted"?"Принято Автором":"Направлено на доработку";
 return {completed,total:8,questionsCount:questions.length,examples,
  review,tensions,gaps,reference,source,endState,
  started:cycle.startedAt.slice(0,10),hasSynthesis:Boolean(cycle.synthesis)};
}

export default function EggCycleSummary({project,cycle}:{
 project:EggProject;cycle:EggFlowCycle;
}){
 const info=readEggCycleSummary(project,cycle);
 return <section className="mt-4 space-y-3 rounded-xl border border-foreground/15 bg-foreground/[.025] p-3 sm:p-4"
   aria-label="Краткий итог итерации" data-testid="egg-cycle-summary">
  <header className="flex flex-wrap items-start justify-between gap-2">
   <div>
    <p className="text-[10px] uppercase tracking-[.12em] text-foreground/50">Текущая запись · уровень {cycle.level} · итерация {cycle.iteration}</p>
    <h4 className="mt-1 text-base font-medium">Итог цикла</h4>
    <p className="mt-1 text-[11px] text-foreground/55">Начало: {info.started} · {info.endState}</p>
   </div>
   <div className="rounded-full border border-foreground/20 px-3 py-1 text-xs" data-testid="egg-cycle-progress">
    {info.completed}/{info.total} сфер
   </div>
  </header>
  {info.source==="legacy_cycle"&&<div role="note" data-testid="egg-cycle-legacy-warning"
   className="rounded-lg border border-foreground/20 bg-background/75 p-3 text-xs leading-relaxed">
    Это ранее созданный цикл. Он <strong>не содержит</strong> утверждённого пакета новой мастерской «Идея».
    Новые фотографии, карточки и рабочая ДНК из локального холста не участвовали в его обработке.
    Для другой идеи нужен отдельный проект либо отдельное авторское решение о продолжении этого.
   </div>}
  <div className="grid gap-3 sm:grid-cols-2">
   <div className="rounded-lg border border-foreground/10 bg-background/60 p-3">
    <h5 className="text-xs font-medium">01 · ДНК / опорный замысел</h5>
    <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs text-foreground/75">{info.reference}</p>
    <details className="mt-2 text-xs">
     <summary className="cursor-pointer text-foreground/55">Полная версия и источник</summary>
     <p className="mt-2 whitespace-pre-wrap">{info.reference}</p>
     <p className="mt-2 text-foreground/55">{info.source==="author_handoff"?
      "Рабочая версия утверждена Автором для этого цикла. Исходное зерно проекта отдельно сохранено.":
      "Использовано исходное зерно проекта. Новая рабочая версия «Идеи» отсутствует."}</p>
    </details>
   </div>
   <div className="rounded-lg border border-foreground/10 bg-background/60 p-3" data-testid="egg-cycle-review-status">
    <h5 className="text-xs font-medium">02 · Сопоставление двух потоков</h5>
    {info.review?<><p className="mt-2 line-clamp-4 whitespace-pre-wrap text-xs">{info.review.summary}</p>
     <p className="mt-2 text-[11px] text-foreground/55">Интерпретация ИИ. Не проверена и не утверждена Автором.</p></>:
     <><p className="mt-2 text-xs text-foreground/75">{info.hasSynthesis?
      "Оба потока собраны структурно, но смысловой анализ совпадений и противоречий ещё не зарегистрирован.":
      "Ожидаем завершения обоих потоков; синтез ещё не создан."}</p>
      <p className="mt-2 text-[11px] text-foreground/55">Не называем выводы сфер доказанными фактами.</p></>}
   </div>
  </div>
  <div className="rounded-lg border border-foreground/10 bg-background/60 p-3"
   data-testid="egg-cycle-tensions">
   <h5 className="text-xs font-medium">03 · Возможные напряжения и пробелы</h5>
   {info.tensions.length?
    <div className="mt-2 space-y-2">{info.tensions.slice(0,2).map(t=>
     <div key={t.id}><p className="text-xs font-medium">{t.title}</p>
      <p className="mt-1 text-xs text-foreground/70">{t.explanation}</p>
      <p className="mt-1 text-[11px] text-foreground/50">Гипотеза ИИ, не подтверждена · источники {t.sourceResultIds.join(", ")}</p>
     </div>)}</div>:
    info.gaps.length?
     <><p className="mt-2 text-[11px] text-foreground/55">Смысловые противоречия ещё не проверены. Зарегистрированы структурные пробелы:</p>
      <ul className="mt-2 space-y-1 text-xs text-foreground/70">
       {info.gaps.slice(0,2).map((gap,i)=><li key={i}>— {gap}</li>)}
      </ul></>:
     <p className="mt-2 text-xs text-foreground/65">Подтверждённых противоречий нет; текущих данных недостаточно для вывода.</p>}
  </div>
  <div className="rounded-lg border border-foreground/10 bg-background/60 p-3"
   data-testid="egg-cycle-open-questions">
   <div className="flex flex-wrap items-baseline justify-between gap-2">
    <h5 className="text-xs font-medium">04 · Что требует проверки</h5>
    <p className="text-[11px] text-foreground/55">{info.questionsCount} открытых вопросов</p>
   </div>
   {info.examples.length?
    <><p className="mt-2 text-[11px] text-foreground/55">Примеры из разных сфер; это не ранжирование важности.</p>
     <ul className="mt-2 space-y-2">{info.examples.map(q=><li key={q.id} className="text-xs">
      <span className="font-medium">{names[q.sphere]}:</span> {q.question}
      <span className="block text-[11px] text-foreground/50">Без проверки · вопрос</span>
     </li>)}</ul></>:
    <p className="mt-2 text-xs text-foreground/60">Список вопросов пока не создан.</p>}
   {info.questionsCount>info.examples.length&&
    <p className="mt-2 text-[11px] text-foreground/55">Остальные {info.questionsCount-info.examples.length} — в подробном журнале ниже.</p>}
  </div>
  <p className="text-xs leading-relaxed text-foreground/65" data-testid="egg-cycle-next-step">
   <strong>05 · Решение Автора.</strong> {cycle.status==="awaiting_author"?
    "После просмотра полного анализа можно направить конкретные сферы на новую итерацию либо принять текущий уровень. Ни одно решение не принято автоматически.":
    cycle.status==="running"?
     "Дождаться результатов восьми сфер и синтеза Желтка.":"Решение этой записи зафиксировано; детали доступны в истории."}
  </p>
 </section>;
}

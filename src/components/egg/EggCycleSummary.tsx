import type {EggFlowCycle} from "../../lib/eggFlowCycle";
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
 const note=cycle.status==="awaiting_author"
  ?"Результаты готовы. Можно запросить смысловой разбор Желтка, затем принять уровень либо назначить уточнения."
  :cycle.status==="running"?"Продолжается обработка двух ветвей; решение пока недоступно."
  :"Решение этой итерации записано в историю.";
 return <section className="mt-3 min-w-0 space-y-3 rounded-[14px] border border-foreground/15 bg-background/85 p-3 sm:p-4"
   aria-label="Краткий итог итерации" data-testid="egg-cycle-summary">
  <header className="flex flex-wrap items-start justify-between gap-2">
   <div className="min-w-0 flex-1">
    <p className="text-[10px] tracking-[.06em] text-foreground/55">УРОВЕНЬ {cycle.level} · ИТЕРАЦИЯ {cycle.iteration} · {info.started}</p>
    <h4 className="mt-1 text-base font-medium">Итог цикла</h4>
    <p className="mt-1 text-xs text-foreground/65">{info.endState}</p>
   </div>
   <div className="shrink-0 rounded-full border border-foreground/20 px-3 py-1 text-xs" data-testid="egg-cycle-progress">
    {info.completed}/{info.total} сфер
   </div>
  </header>
  {info.source==="legacy_cycle"&&<div role="note" data-testid="egg-cycle-legacy-warning"
   className="rounded-[10px] border border-foreground/20 bg-background p-3 text-xs leading-relaxed">
    <strong>Это предыдущая итерация.</strong> Она <strong>не содержит</strong> утверждённого пакета из новой «Идеи».
    Фото помещения и новые материалы в этот цикл не вошли.
    <details className="mt-2">
     <summary className="cursor-pointer text-foreground/65">Почему это важно</summary>
     <p className="mt-2">Чтобы развивать другую идею, потребуется новый проект либо отдельное решение Автора о продолжении текущего. Запись не следует считать анализом нового замысла.</p>
    </details>
   </div>}
  <div className="rounded-[10px] border border-foreground/10 p-3" data-testid="egg-cycle-dna">
   <h5 className="text-xs font-medium">01 · ДНК / опорный замысел</h5>
   <p className="mt-2 line-clamp-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-foreground/75">{info.reference}</p>
   <details className="mt-2 text-xs">
    <summary className="cursor-pointer text-foreground/60">Полная версия и источник</summary>
    <p className="mt-2 whitespace-pre-wrap break-words leading-relaxed">{info.reference}</p>
    <p className="mt-2 text-foreground/60">{info.source==="author_handoff"
     ?"Рабочая версия утверждена Автором для этого цикла. Исходное зерно отдельно сохранено."
     :"Использовано исходное зерно проекта. Новая рабочая версия «Идеи» отсутствует."}</p>
   </details>
  </div>
  <div className="rounded-[10px] border border-foreground/10 p-3" data-testid="egg-cycle-review-status">
   <h5 className="text-xs font-medium">02 · Сопоставление потоков</h5>
   {info.review?<><p className="mt-2 line-clamp-3 break-words text-xs leading-relaxed">{info.review.summary}</p>
    <p className="mt-1 text-[11px] text-foreground/60">Черновик ИИ · требует проверки и решения Автора.</p></>:
    <p className="mt-2 text-xs leading-relaxed text-foreground/70">{info.hasSynthesis
     ?"Оба потока собраны, но смысловой анализ совпадений и противоречий ещё не зарегистрирован."
     :"Ожидаем завершения обоих потоков; синтез ещё не создан."}</p>}
  </div>
  <div className="grid grid-cols-2 gap-2" data-testid="egg-cycle-metrics">
   <div className="rounded-[10px] border border-foreground/10 px-3 py-2">
    <p className="text-lg tabular-nums">{info.questionsCount}</p>
    <p className="text-[11px] leading-snug text-foreground/60">открытых вопросов</p>
   </div>
   <div className="rounded-[10px] border border-foreground/10 px-3 py-2">
    <p className="text-lg tabular-nums">{info.tensions.length}</p>
    <p className="text-[11px] leading-snug text-foreground/60">гипотез напряжения в разборе Желтка</p>
   </div>
  </div>
  <details className="rounded-[10px] border border-foreground/15 px-3 py-3" data-testid="egg-cycle-analysis-details">
   <summary className="cursor-pointer text-xs font-medium">03–04 · Напряжения, пробелы и вопросы</summary>
   <div className="mt-4 space-y-4">
    <div data-testid="egg-cycle-tensions">
     <h5 className="text-xs font-medium">Что пока не согласовано</h5>
     {info.tensions.length?
      <div className="mt-2 space-y-3">{info.tensions.slice(0,2).map(t=>
       <div key={t.id}><p className="text-xs font-medium">{t.title}</p>
        <p className="mt-1 break-words text-xs leading-relaxed text-foreground/70">{t.explanation}</p>
        <p className="mt-1 break-all text-[11px] text-foreground/55">Гипотеза ИИ · источники {t.sourceResultIds.join(", ")}</p>
       </div>)}</div>:info.gaps.length?
      <><p className="mt-2 text-xs text-foreground/65">Смысловые противоречия ещё не проверены. Зарегистрированы структурные пробелы:</p>
       <ul className="mt-2 space-y-2">{info.gaps.slice(0,2).map((gap,i)=>
        <li key={i} className="break-words text-xs leading-relaxed text-foreground/70">— {gap}</li>)}</ul></>:
      <p className="mt-2 text-xs text-foreground/65">Сведений недостаточно для установления противоречий.</p>}
    </div>
    <div className="border-t border-foreground/10 pt-3" data-testid="egg-cycle-open-questions">
     <h5 className="text-xs font-medium">Что проверить · {info.questionsCount} открытых вопросов</h5>
     {info.examples.length?
      <><p className="mt-2 text-[11px] text-foreground/60">Примеры из трёх сфер, без ранжирования важности.</p>
       <ul className="mt-2 space-y-3">{info.examples.map(q=><li key={q.id} className="break-words text-xs leading-relaxed">
        <strong>{names[q.sphere]}:</strong> {q.question}
        <span className="block text-[11px] text-foreground/50">Вопрос · без проверки</span>
       </li>)}</ul></>:
      <p className="mt-2 text-xs text-foreground/60">Вопросы пока не зарегистрированы.</p>}
     {info.questionsCount>info.examples.length&&
      <p className="mt-2 text-[11px] text-foreground/55">Остальные {info.questionsCount-info.examples.length} — в подробном журнале.</p>}
    </div>
   </div>
  </details>
  <p className="rounded-[10px] bg-foreground/[.035] p-3 text-xs leading-relaxed" data-testid="egg-cycle-next-step">
   <strong>05 · Решение Автора.</strong> {note}
  </p>
 </section>;
}

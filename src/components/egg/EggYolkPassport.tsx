import type {EggProject} from "../../lib/eggEngine";
import {
  buildEggYolkProductProjection,type EggYolkVerification,
} from "../../lib/eggYolkState";

const originLabel={
  new:"Новый результат",
  inherited:"Прошлый цикл",
  missing:"Результата нет",
};
const checkLabel:Record<EggYolkVerification["status"],string>={
  attention:"Нужна проверка версии",
  to_compare:"Требует сопоставления",
  not_enough_data:"Недостаточно данных",
};

/** Displays only source-linked, deterministic synthesis.
 * The current local 3D sketch is never represented as the approved product.
 */
export default function EggYolkPassport({project}:{project:EggProject}){
  const state=buildEggYolkProductProjection(project);
  return <section className="space-y-3 rounded-lg border border-foreground/15 p-3 sm:p-4"
    aria-label="Паспорт состояния продукта" data-testid="yolk-product-passport">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h5 className="text-sm font-medium">Паспорт состояния продукта</h5>
      <p className="text-[11px] text-foreground/55">Уровень {state.level}/5 · итерация {state.iteration}</p>
    </div>
    <p className="text-xs text-foreground/65">
      {state.synthesisOrigin==="current"
        ?"Синтез обоих потоков · не является экспертной проверкой."
        :state.synthesisOrigin==="previous"
          ?"Новый цикл идёт. Ниже показан последний завершённый синтез; это не текущие выводы."
          :"Сводка появится после первого полного прохождения обоих потоков."}
    </p>
    <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
      {[
        ["Новые",state.counts.new],
        ["Наследованные",state.counts.inherited],
        ["Нет данных",state.counts.missing],
        ["Открытые вопросы",state.counts.questionCount],
      ].map(([name,value])=><div key={name} className="rounded border border-foreground/10 p-2">
        <span className="block text-[10px] text-foreground/55">{name}</span>
        <strong className="mt-1 block font-medium">{value}</strong>
      </div>)}
    </div>
    <div className="rounded border border-foreground/10 p-3 text-xs" data-testid="yolk-version-source">
      <p className="font-medium">ДНК и визуальная версия</p>
      <p className="mt-1 text-foreground/65">
        {state.dna.conceptStatus==="approved"
          ?"Имеется принятая Автором концепция · "+state.dna.conceptId
          :"Есть исходная ДНК; принятая концепция не зарегистрирована."}
      </p>
      <p className="mt-2 text-foreground/70">
        {state.visual.url?<a href={state.visual.url} target="_blank" rel="noopener noreferrer"
          className="break-words underline underline-offset-2">{state.visual.label}</a>:state.visual.label}
      </p>
      <p className="mt-1 text-[11px] text-foreground/55">{state.visual.warning}</p>
    </div>
    <div className="grid gap-2 sm:grid-cols-2" data-testid="yolk-eight-sphere-summary">
      {state.spheres.map(s=><div key={s.sphere} className="rounded border border-foreground/10 p-2.5"
        data-testid={"yolk-passport-"+s.sphere}>
        <div className="flex flex-wrap items-baseline justify-between gap-1">
          <p className="text-xs font-medium">{s.label}</p>
          <span className="text-[10px] text-foreground/50">{originLabel[s.status]}</span>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-foreground/65">
          {s.summary??"От сферы пока не получены сведения."}
        </p>
        {s.requiresRecheck&&<p className="mt-1 text-[10px] text-foreground/60">
          Проверить актуальность</p>}
      </div>)}
    </div>
    <details data-testid="yolk-intersection-checks" className="rounded border border-foreground/10 p-3">
      <summary className="cursor-pointer text-xs font-medium">
        Проверки пересечений ({state.checks.length}) · не автоматическое согласование
      </summary>
      <div className="mt-3 space-y-2">
        {state.checks.map(check=><div key={check.id} data-testid={"yolk-check-"+check.id}
          className="rounded bg-foreground/5 p-2 text-xs">
          <p className="font-medium">{check.title}
            <span className="ml-2 font-normal text-foreground/55">{checkLabel[check.status]}</span>
          </p>
          <p className="mt-1 text-foreground/65">{check.note}</p>
        </div>)}
        {!state.checks.length&&<p className="text-xs text-foreground/55">Для сверки ожидается завершённый синтез.</p>}
        <p className="text-[11px] leading-relaxed text-foreground/55">
          Структурная проверка выявляет пропущенные связи и расхождения версий,
          но не умеет достоверно устанавливать смысловые, юридические, технические
          или экономические противоречия по свободному тексту.
        </p>
      </div>
    </details>
    {!!state.questions.length&&<details className="rounded border border-foreground/10 p-3"
      data-testid="yolk-open-questions">
      <summary className="cursor-pointer text-xs font-medium">
        Незакрытые вопросы сфер ({state.questions.length})
      </summary>
      <ul className="mt-2 space-y-2">
        {state.questions.map(q=><li key={q.id} className="text-[11px] leading-relaxed">
          <span className="font-medium">{q.domain} / {state.spheres.find(s=>s.sphere===q.sphere)?.label}</span>
          <p className="mt-1 text-foreground/65">{q.question}</p>
          <p className="mt-1 text-foreground/50">{q.provenance==="inherited"?"Унаследован":"Новый"} · не подтверждён</p>
        </li>)}
      </ul>
    </details>}
    <p className="text-[11px] leading-relaxed text-foreground/55">
      Желток не принимает решений за Автора и не изменяет ДНК. При необходимости
      Автор направляет замечания конкретным сферам в следующей итерации.
    </p>
  </section>;
}

import type { Dispatch, SetStateAction } from "react";

export type IdeaCyclePhase = "seed" | "research" | "synthesis" | "layered" | "forwarded";
export type IdeaCycleReport = "marketing" | "legal";
export type IdeaCycle = {
  seed: string;
  phase: IdeaCyclePhase;
  marketing: string;
  legal: string;
  marketingReturned: boolean;
  legalReturned: boolean;
  layer: string;
};

export const IDEA_CYCLE_KEY = "unocalc.egg.idea-cycle.v1";

export const newIdeaCycle = (seed: string): IdeaCycle => ({
  seed: seed.trim(),
  phase: "seed",
  marketing: "",
  legal: "",
  marketingReturned: false,
  legalReturned: false,
  layer: "",
});

export const restoreIdeaCycle = (): IdeaCycle | null => {
  try {
    const raw = window.localStorage.getItem(IDEA_CYCLE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<IdeaCycle>;
    if (typeof data.seed !== "string" || !data.seed.trim()) return null;
    const phase: IdeaCyclePhase =
      data.phase === "research" || data.phase === "synthesis" ||
      data.phase === "layered" || data.phase === "forwarded" ? data.phase : "seed";
    return {
      seed: data.seed,
      phase,
      marketing: typeof data.marketing === "string" ? data.marketing : "",
      legal: typeof data.legal === "string" ? data.legal : "",
      marketingReturned: data.marketingReturned === true,
      legalReturned: data.legalReturned === true,
      layer: typeof data.layer === "string" ? data.layer : "",
    };
  } catch { return null; }
};

export const returnIdeaReport = (cycle: IdeaCycle, source: IdeaCycleReport): IdeaCycle => {
  if (cycle.phase !== "research") return cycle;
  if (!cycle[source].trim() || cycle[source + "Returned" as "marketingReturned" | "legalReturned"]) return cycle;
  const next = { ...cycle, [source + "Returned"]: true };
  return {
    ...next,
    phase: next.marketingReturned && next.legalReturned ? "synthesis" : "research",
  };
};

type Locale = "ru" | "uk" | "en";
type Node = "author" | "idea" | "marketing" | "legal" | "design" | "production";
type Props = {
  locale: Locale;
  node: Node;
  draft: string;
  onDraft: (value: string) => void;
  cycle: IdeaCycle | null;
  setCycle: Dispatch<SetStateAction<IdeaCycle | null>>;
  onSetSeed: () => void;
};

const messages = {
  ru: {
    prototype: "Проверка маршрута · ручной прототип",
    note: "Исследования ИИ здесь ещё не выполняются. Вы сами вводите условные заключения, чтобы проверить механизм.",
    seed: "Зерно смысла",
    noSeed: "Зерно ещё не внесено в Ядро. Откройте панель Автора.",
    seedHelp: "Вставьте сформированный в диалоге замысел. Он станет исходной записью цикла.",
    seedPlaceholder: "Вставьте описание идеи или концепции…",
    setSeed: "Внести зерно в Ядро",
    replaceSeed: "Начать новый цикл с этим зерном",
    seedRecorded: "Зерно зафиксировано. Перейдите в сферу «Идея».",
    launch: "Отправить в Маркетинг и Право",
    launchNote: "Запуск создаёт два входящих задания по существующим линиям. Данные о внешнем рынке и праве не генерируются автоматически.",
    sent: "Два импульса отправлены",
    waiting: "Ожидает входящей задачи от Идеи.",
    task: "Поступило из Идеи",
    marketing: "Маркетинг",
    legal: "Право",
    research: "Обработка в своей компетенции",
    marketPrompt: "Что удалось понять о внешнем поле, аудитории и позиционировании? Укажите, что является гипотезой.",
    legalPrompt: "Что нужно учесть по авторству, ограничениям и способам распространения? Не выдавайте предположения за правовое заключение.",
    responsePlaceholder: "Введите пробный результат исследования или ограничение…",
    return: "Передать результат в Идею",
    returned: "Результат передан в Идею",
    pending: "Ожидаем обратную связь",
    synth: "Оба результата вернулись",
    layerPrompt: "Сопоставьте ответы с исходным зерном. Что уточнилось? Что остаётся открытым?",
    layerPlaceholder: "Сформулируйте следующий смысловой слой, не стирая исходное зерно…",
    makeLayer: "Зафиксировать слой 1",
    layer: "Слой 1",
    next: "Передать следующий импульс",
    nextNote: "В этой проверке подсветятся следующие связи: Маркетинг → Дизайн и Право → Производство. Реальные задания этим сферам пока не формируются.",
    forwarded: "Следующий импульс отмечен на графе",
    received: "Сигнал о следующем слое",
    receivedNote: "На этом прототип останавливается. Процедуры этой сферы ещё не подключены.",
    status: "Состояние контура",
    source: "Источник: Автор · исходный замысел",
    example: "Можно вводить условные результаты. Они сохраняются только в этом браузере.",
  },
  uk: {
    prototype: "Перевірка маршруту · ручний прототип", note: "Дослідження ШІ ще не виконуються. Ви вводите умовні висновки для перевірки механізму.",
    seed: "Зерно сенсу", noSeed: "Зерно ще не внесено в Ядро. Відкрийте панель Автора.",
    seedHelp: "Вставте задум, сформований у діалозі. Це вихідний запис циклу.",
    seedPlaceholder: "Вставте опис ідеї або концепції…", setSeed: "Внести зерно в Ядро", replaceSeed: "Почати новий цикл із цим зерном",
    seedRecorded: "Зерно зафіксоване. Перейдіть до сфери «Ідея».",
    launch: "Передати Маркетингу та Праву", launchNote: "Створюються два запити по наявних зв'язках. Дослідження не генеруються автоматично.",
    sent: "Два імпульси передані", waiting: "Очікує завдання від Ідеї.", task: "Отримано від Ідеї",
    marketing: "Маркетинг", legal: "Право", research: "Опрацювання в межах компетенції",
    marketPrompt: "Що відомо про зовнішнє поле, аудиторію та позиціонування? Позначайте гіпотези.",
    legalPrompt: "Які питання авторства та правових обмежень варто дослідити? Не подавайте припущення як юридичний висновок.",
    responsePlaceholder: "Введіть пробний результат дослідження…", return: "Повернути результат до Ідеї",
    returned: "Результат передано в Ідею", pending: "Очікуємо зворотний зв'язок",
    synth: "Обидва результати повернулися", layerPrompt: "Зіставте результати із зерном. Що уточнилося?",
    layerPlaceholder: "Сформулюйте новий смисловий шар…", makeLayer: "Зафіксувати шар 1", layer: "Шар 1",
    next: "Передати наступний імпульс", nextNote: "Підсвітяться зв'язки Маркетинг → Дизайн і Право → Виробництво. Реальні завдання поки не створюються.",
    forwarded: "Наступний імпульс позначено на графі", received: "Сигнал нового шару",
    receivedNote: "На цьому прототип завершується. Роботу цієї сфери ще не підключено.",
    status: "Стан контуру", source: "Джерело: Автор · початковий задум", example: "Умовні результати залишаються лише в браузері.",
  },
  en: {
    prototype: "Routing experiment · manual prototype", note: "No AI research runs here yet. Enter provisional findings to test the workflow.",
    seed: "Seed of meaning", noSeed: "No seed in the Core yet. Open the Author panel.",
    seedHelp: "Paste the concept developed in conversation. It becomes the source record.",
    seedPlaceholder: "Paste your idea or concept…", setSeed: "Place seed in Core", replaceSeed: "Start a new cycle with this seed",
    seedRecorded: "Seed recorded. Open the Idea sphere.",
    launch: "Send to Marketing and Legal", launchNote: "Creates two incoming tasks on existing links. Research is not automatically generated.",
    sent: "Two signals sent", waiting: "Waiting for an incoming Idea task.", task: "Received from Idea",
    marketing: "Marketing", legal: "Legal", research: "Work within this sphere",
    marketPrompt: "What did you find about audience, market and positioning? Mark hypotheses clearly.",
    legalPrompt: "Which copyright, legal and distribution questions require examination? Do not state guesses as legal conclusions.",
    responsePlaceholder: "Enter a sample finding or constraint…", return: "Return result to Idea",
    returned: "Result returned to Idea", pending: "Waiting for feedback",
    synth: "Both results returned", layerPrompt: "Compare responses with the original seed. What changed or remains open?",
    layerPlaceholder: "Write a new conceptual layer while preserving the original seed…",
    makeLayer: "Record layer 1", layer: "Layer 1", next: "Pass the next signal",
    nextNote: "Highlights the next links: Marketing → Design and Legal → Production. No actual tasks are created there yet.",
    forwarded: "Next signal marked on the graph", received: "New layer signal",
    receivedNote: "This is the end of the prototype. This sphere's procedures are not yet implemented.",
    status: "Cycle status", source: "Source: Author · original intention", example: "Sample findings remain in this browser only.",
  },
} as const;

const fieldClass = "mt-2 min-h-[112px] w-full resize-y rounded-lg border border-foreground/20 bg-transparent p-3 text-[13px] font-light leading-[1.7] text-foreground outline-none placeholder:text-foreground/35 focus-visible:border-foreground/50";
const actionClass = "min-h-11 rounded-full border border-foreground/35 px-5 py-2.5 text-[12px] font-light text-foreground/85 transition-colors hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-35";
const shellClass = "w-full space-y-5 text-left";
const sectionClass = "rounded-xl border border-foreground/15 p-4";
const statusClass = "text-[11px] font-light leading-[1.6] text-foreground/55";

export const UnoEggIdeaCyclePanel = ({ locale, node, draft, onDraft, cycle, setCycle, onSetSeed }: Props) => {
  const m = messages[locale];
  const hasCycle = !!cycle?.seed.trim();
  const started = hasCycle && cycle.phase !== "seed";
  const reportNode = node === "marketing" || node === "legal" ? node : null;
  const isReturned = reportNode && !!cycle?.[`${reportNode}Returned` as "marketingReturned" | "legalReturned"];
  const isForwarded = cycle?.phase === "forwarded";
  const viewSeed = cycle?.seed ?? "";

  return <div data-testid={`unocalc-cycle-${node}`} className={shellClass}>
    <p className="text-[10px] uppercase tracking-[0.13em] text-foreground/40">{m.prototype}</p>
    {node === "author" && <>
      <div className={sectionClass}>
        <h3 className="text-[16px] font-light">{m.seed}</h3>
        <p className={statusClass + " mt-2"}>{m.seedHelp}</p>
        <label htmlFor="unocalc-cycle-seed" className="sr-only">{m.seed}</label>
        <textarea id="unocalc-cycle-seed" data-testid="unocalc-cycle-seed" value={draft} onChange={(e) => onDraft(e.target.value)}
          placeholder={m.seedPlaceholder} maxLength={10000} rows={7} className={fieldClass} />
        <button type="button" data-testid="unocalc-cycle-set-seed" className={actionClass + " mt-3"}
          disabled={!draft.trim() || (cycle?.seed === draft.trim() && cycle.phase !== "forwarded")}
          onClick={onSetSeed}>{hasCycle ? m.replaceSeed : m.setSeed}</button>
        {hasCycle && <p role="status" className={statusClass + " mt-2"}>{m.seedRecorded}</p>}
      </div>
      {hasCycle && <div className={sectionClass}>
        <p className={statusClass}>{m.status}</p>
        <p className="mt-2 text-[13px]">{cycle.phase === "seed" ? m.seedRecorded : cycle.phase === "forwarded" ? m.forwarded : cycle.phase === "layered" ? m.layer : cycle.phase === "synthesis" ? m.synth : m.sent}</p>
      </div>}
    </>}
    {node === "idea" && <>
      {!hasCycle ? <p className={statusClass}>{m.noSeed}</p> : <>
        <div className={sectionClass}>
          <p className={statusClass}>{m.seed} · {m.source}</p>
          <p className="mt-3 whitespace-pre-wrap break-words text-[13px] font-light leading-[1.7]">{viewSeed}</p>
        </div>
        {cycle.phase === "seed" ? <div className={sectionClass}>
          <p className={statusClass}>{m.launchNote}</p>
          <button type="button" data-testid="unocalc-cycle-launch" className={actionClass + " mt-3"}
            onClick={() => setCycle((prev) => prev?.phase === "seed" ? {...prev, phase:"research"} : prev)}>{m.launch}</button>
        </div> : <>
          <div className={sectionClass}>
            <p className="text-[12px] font-medium">{m.status}</p>
            <div className="mt-3 space-y-2">
              {(["marketing", "legal"] as const).map((branch) => <div key={branch} className="border-t border-foreground/10 pt-2">
                <p className="text-[12px]">{branch === "marketing" ? m.marketing : m.legal} · <span className="text-foreground/50">{cycle[`${branch}Returned` as "marketingReturned" | "legalReturned"] ? m.returned : m.pending}</span></p>
                {cycle[`${branch}Returned` as "marketingReturned" | "legalReturned"] && <p className="mt-2 whitespace-pre-wrap break-words text-[12px] text-foreground/70">{cycle[branch]}</p>}
              </div>)}
            </div>
          </div>
          {(cycle.phase === "synthesis" || cycle.phase === "layered" || cycle.phase === "forwarded") && <div className={sectionClass}>
            <h3 className="text-[16px] font-light">{m.layer}</h3>
            <p className={statusClass + " mt-2"}>{m.layerPrompt}</p>
            <textarea data-testid="unocalc-cycle-layer" value={cycle.layer} disabled={cycle.phase !== "synthesis"}
              onChange={(e) => setCycle((prev) => prev?.phase === "synthesis" ? {...prev, layer:e.target.value} : prev)}
              placeholder={m.layerPlaceholder} rows={5} className={fieldClass} />
            {cycle.phase === "synthesis" && <button type="button" data-testid="unocalc-cycle-make-layer" className={actionClass + " mt-3"}
              disabled={!cycle.layer.trim()} onClick={() => setCycle((prev) => prev?.phase === "synthesis" && prev.layer.trim() ? {...prev, phase:"layered"} : prev)}>{m.makeLayer}</button>}
          </div>}
          {cycle.phase === "layered" && <div className={sectionClass}>
            <p className={statusClass}>{m.nextNote}</p>
            <button type="button" data-testid="unocalc-cycle-forward" className={actionClass + " mt-3"}
              onClick={() => setCycle((prev) => prev?.phase === "layered" ? {...prev, phase:"forwarded"} : prev)}>{m.next}</button>
          </div>}
          {isForwarded && <p className={statusClass} role="status">{m.forwarded}</p>}
        </>}
      </>}
    </>}
    {reportNode && <>
      {!started ? <p className={statusClass}>{m.waiting}</p> : <>
        <div className={sectionClass}>
          <p className={statusClass}>{m.task}</p>
          <p className="mt-3 whitespace-pre-wrap break-words text-[13px] font-light leading-[1.7]">{viewSeed}</p>
        </div>
        <div className={sectionClass}>
          <h3 className="text-[15px] font-light">{m.research}</h3>
          <p className={statusClass + " mt-2"}>{reportNode === "marketing" ? m.marketPrompt : m.legalPrompt}</p>
          <textarea data-testid={`unocalc-cycle-${reportNode}-report`} disabled={!!isReturned} value={cycle?.[reportNode] ?? ""}
            onChange={(e) => setCycle((prev) => prev?.phase === "research" ? {...prev, [reportNode]:e.target.value} : prev)}
            placeholder={m.responsePlaceholder} rows={6} className={fieldClass} />
          {isReturned ? <p className={statusClass + " mt-2"} role="status">{m.returned}</p> :
            <button type="button" data-testid={`unocalc-cycle-${reportNode}-return`} className={actionClass + " mt-3"}
              disabled={!cycle?.[reportNode]?.trim() || cycle?.phase !== "research"}
              onClick={() => setCycle((prev) => prev ? returnIdeaReport(prev, reportNode) : prev)}>{m.return}</button>}
        </div>
      </>}
    </>}
    {(node === "design" || node === "production") && <>
      {isForwarded ? <div className={sectionClass}>
        <h3 className="text-[15px] font-light">{m.received}</h3>
        <p className="mt-3 whitespace-pre-wrap break-words text-[13px]">{cycle?.layer}</p>
        <p className={statusClass + " mt-3"}>{m.receivedNote}</p>
      </div> : <p className={statusClass}>{m.waiting}</p>}
    </>}
    <p className={statusClass}>{m.note} {m.example}</p>
  </div>;
};

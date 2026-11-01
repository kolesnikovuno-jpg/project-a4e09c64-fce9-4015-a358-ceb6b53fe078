import { useEffect, useMemo, useState } from "react";
import { Check, Plus, RotateCcw } from "lucide-react";
import type { SphereId } from "@/lib/unocalcObject";
import {
  CORE_SPHERES, TEXTILE_FIELDS, addTextileElement, calculateTextileCut,
  recordSphereAssessment, renameElement, setTextileProperty,
  type EvidenceStatus, type ObjectCore, type TextileField,
} from "@/lib/unocalcObjectCore";

type Locale = "ru" | "uk" | "en";
type Props = {
  locale: Locale;
  core: ObjectCore;
  onUpdate: (updater: (core: ObjectCore) => ObjectCore) => void;
};

const copy = {
  ru: {
    heading: "Ядро объекта · элементы и связи", description: "Одна модель для восьми сфер. Изменение параметра создаёт задачи проверки для связанных компетенций.",
    add: "Добавить текстильный элемент", empty: "Добавьте первый элемент, чтобы проверить согласование сфер на реальных параметрах.",
    defaultTitle: "Тканевый элемент", title: "Наименование элемента",
    properties: "Параметры элемента", assessments: "Оценки восьми сфер",
    cutting: "Раскрой · предварительный расчёт", history: "История изменений",
    pending: "Требуется проверка", noPending: "Нет новых зависимых проверок",
    unreviewed: "Нет заключения", recheck: "Перепроверить после изменений",
    source: "Источник / документ / протокол", note: "Вывод, ограничение или возможность",
    saveAssessment: "Зафиксировать заключение", requiredSource: "Для статуса «Подтверждено» укажите источник или протокол.",
    status: "Статус доказательности", calculation: "Расчёт", incomplete: "Введите ширину рулона, размеры, припуск и количество.",
    invalid: "Проверьте числовые параметры: значения должны быть положительными, припуск — неотрицательным, количество — целым.",
    doesNotFit: "Цельная прямоугольная выкройка не помещается по ширине рулона ни в одной ориентации. Требуется другое решение.",
    cut: "Размер раскроя", orientation: "Ориентация", normal: "Прямая", rotated: "Поворот 90°",
    perRow: "Деталей в ряду", rows: "Рядов", length: "Погонных метров", waste: "Остаток площади",
    cost: "Стоимость ткани", noPrice: "Цена не указана", estimateHint: "Модель прямоугольного раскроя без направления нити, усадки, дефектов, швов между полотнами и технологических потерь. Это расчёт, не испытание.",
    noHistory: "Изменений пока нет", lastHistory: "Последние события", pendingLabel: "Ожидают проверки",
    spheres: { design: "Дизайн", production: "Производство", commerce: "Коммерция", retail: "Ритейл", law: "Право", components: "Комплектация", marketing: "Маркетинг", testing: "Тест-драйв" },
    statuses: { hypothesis: "Гипотеза", calculated: "Расчёт / анализ", verified: "Подтверждено (ввод вручную)", blocked: "Ограничение / стоп" },
    fields: {
      materialName: "Материал", composition: "Состав / свойства", sku: "Артикул", supplier: "Поставщик",
      originCountry: "Страна происхождения", rollWidthMm: "Ширина рулона · мм",
      pricePerMetre: "Цена за пог. м", currency: "Валюта",
      finishedWidthMm: "Ширина детали · мм", finishedLengthMm: "Длина детали · мм",
      seamAllowanceMm: "Припуск на сторону · мм", quantity: "Количество деталей",
    },
  },
  uk: {
    heading: "Ядро об’єкта · елементи та зв’язки", description: "Одна модель для восьми сфер. Зміна параметра створює завдання перевірки для пов’язаних компетенцій.",
    add: "Додати текстильний елемент", empty: "Додайте перший елемент, щоб перевірити узгодження сфер на реальних параметрах.",
    defaultTitle: "Текстильний елемент", title: "Назва елемента",
    properties: "Параметри елемента", assessments: "Оцінки восьми сфер",
    cutting: "Розкрій · попередній розрахунок", history: "Історія змін",
    pending: "Потрібна перевірка", noPending: "Немає нових залежних перевірок",
    unreviewed: "Немає висновку", recheck: "Перевірити після змін",
    source: "Джерело / документ / протокол", note: "Висновок, обмеження або можливість",
    saveAssessment: "Зафіксувати висновок", requiredSource: "Для статусу «Підтверджено» вкажіть джерело або протокол.",
    status: "Статус доказовості", calculation: "Розрахунок", incomplete: "Введіть ширину рулону, розміри, припуск і кількість.",
    invalid: "Перевірте числові параметри: значення мають бути додатними, припуск — невід’ємним, кількість — цілим.",
    doesNotFit: "Цілісна прямокутна викрійка не вміщується за шириною рулону в жодній орієнтації. Потрібне інше рішення.",
    cut: "Розмір розкрою", orientation: "Орієнтація", normal: "Пряма", rotated: "Поворот 90°",
    perRow: "Деталей у ряду", rows: "Рядів", length: "Погонних метрів", waste: "Залишок площі",
    cost: "Вартість тканини", noPrice: "Ціну не вказано", estimateHint: "Модель прямокутного розкрою без напрямку нитки, усадки, дефектів, швів між полотнами та технологічних втрат. Це розрахунок, не випробування.",
    noHistory: "Змін поки немає", lastHistory: "Останні події", pendingLabel: "Очікують перевірки",
    spheres: { design: "Дизайн", production: "Виробництво", commerce: "Комерція", retail: "Ритейл", law: "Право", components: "Комплектація", marketing: "Маркетинг", testing: "Тест-драйв" },
    statuses: { hypothesis: "Гіпотеза", calculated: "Розрахунок / аналіз", verified: "Підтверджено (введено вручну)", blocked: "Обмеження / стоп" },
    fields: {
      materialName: "Матеріал", composition: "Склад / властивості", sku: "Артикул", supplier: "Постачальник",
      originCountry: "Країна походження", rollWidthMm: "Ширина рулону · мм",
      pricePerMetre: "Ціна за пог. м", currency: "Валюта",
      finishedWidthMm: "Ширина деталі · мм", finishedLengthMm: "Довжина деталі · мм",
      seamAllowanceMm: "Припуск на сторону · мм", quantity: "Кількість деталей",
    },
  },
  en: {
    heading: "Object core · elements and dependencies", description: "One shared model for eight spheres. Changing a property flags related specialist assessments for review.",
    add: "Add textile element", empty: "Add the first element to test cross-sphere coordination with real parameters.",
    defaultTitle: "Textile element", title: "Element name",
    properties: "Element properties", assessments: "Eight-sphere assessments",
    cutting: "Cutting · preliminary estimate", history: "Change history",
    pending: "Review required", noPending: "No new dependent reviews",
    unreviewed: "No assessment", recheck: "Recheck after changes",
    source: "Source / document / test protocol", note: "Finding, constraint or opportunity",
    saveAssessment: "Record assessment", requiredSource: "Verified assessments require a source or test protocol.",
    status: "Evidence status", calculation: "Estimate", incomplete: "Enter roll width, dimensions, allowance and quantity.",
    invalid: "Check numerical inputs: positive dimensions, nonnegative allowance and integer quantity.",
    doesNotFit: "The single-piece rectangular pattern cannot fit across the roll in either orientation. Another solution is required.",
    cut: "Cut size", orientation: "Orientation", normal: "Straight", rotated: "Rotated 90°",
    perRow: "Pieces per row", rows: "Rows", length: "Linear metres", waste: "Unused area",
    cost: "Fabric cost", noPrice: "Price not entered", estimateHint: "Rectangular cutting estimate excludes grain direction, shrinkage, defects, seams joining panels and processing losses. This is not a physical test.",
    noHistory: "No changes yet", lastHistory: "Recent events", pendingLabel: "Awaiting review",
    spheres: { design: "Design", production: "Production", commerce: "Commerce", retail: "Retail", law: "Legal", components: "Components", marketing: "Marketing", testing: "Test drive" },
    statuses: { hypothesis: "Hypothesis", calculated: "Calculation / analysis", verified: "Verified (manual entry)", blocked: "Restriction / stop" },
    fields: {
      materialName: "Material", composition: "Composition / properties", sku: "SKU", supplier: "Supplier",
      originCountry: "Country of origin", rollWidthMm: "Roll width · mm",
      pricePerMetre: "Price per linear m", currency: "Currency",
      finishedWidthMm: "Finished width · mm", finishedLengthMm: "Finished length · mm",
      seamAllowanceMm: "Allowance per side · mm", quantity: "Piece count",
    },
  },
} as const;

const inputClass = "w-full rounded-lg border border-foreground/15 bg-background/70 px-3 py-2 text-[12px] outline-none focus:border-primary/65";
const groupClass = "rounded-xl border border-foreground/10 bg-background/40 p-3 sm:p-4";

const PropertyInput = ({ label, value, onCommit, inputMode }: {
  label: string; value: string; onCommit: (value: string) => void; inputMode?: "decimal" | "numeric";
}) => {
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[10px] leading-snug text-foreground/55">{label}</span>
      <input className={inputClass} value={draft} inputMode={inputMode}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => { if (draft !== value) onCommit(draft); }} />
    </label>
  );
};

export default function UnoObjectCorePanel({ locale, core, onUpdate }: Props) {
  const t = copy[locale];
  const [selectedId, setSelectedId] = useState("");
  const [sphere, setSphere] = useState<SphereId>("components");
  const [status, setStatus] = useState<EvidenceStatus>("hypothesis");
  const [note, setNote] = useState("");
  const [source, setSource] = useState("");
  const element = core.elements.find((item) => item.id === selectedId) ?? core.elements[0];
  const estimate = useMemo(() => element ? calculateTextileCut(element.properties) : null, [element]);
  const assessment = element?.assessments[sphere];

  useEffect(() => {
    setStatus(assessment?.status ?? "hypothesis");
    setNote(assessment?.note ?? "");
    setSource(assessment?.source ?? "");
  }, [element?.id, sphere, assessment?.updatedAt]);

  const addElement = () => {
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
    onUpdate((current) => addTextileElement(current, t.defaultTitle, id));
    setSelectedId(id);
  };

  const saveAssessment = () => {
    if (!element || !note.trim() || (status === "verified" && !source.trim())) return;
    onUpdate((current) => recordSphereAssessment(current, element.id, { sphere, status, note: note.trim(), source: source.trim() }));
  };

  const formatNumber = (value: number, digits = 2) =>
    new Intl.NumberFormat(locale === "uk" ? "uk-UA" : locale === "en" ? "en-GB" : "ru-RU", { maximumFractionDigits: digits }).format(value);

  return (
    <section className="mb-5 rounded-2xl border border-foreground/10 bg-foreground/[0.025] p-4 sm:p-5" data-testid="unocalc-object-core">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-medium">{t.heading}</h2>
          <p className="mt-1 max-w-[800px] text-[11px] leading-relaxed text-foreground/55">{t.description}</p>
        </div>
        <button type="button" onClick={addElement}
          className="inline-flex min-h-9 items-center gap-2 rounded-full border border-foreground/25 px-3 text-[11px] hover:border-primary/60">
          <Plus size={14} />{t.add}
        </button>
      </div>

      {!element ? <p className="py-5 text-[12px] text-foreground/60">{t.empty}</p> : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {core.elements.map((item) => (
              <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} aria-pressed={element.id === item.id}
                className={`rounded-full border px-3 py-2 text-[11px] ${element.id === item.id ? "border-primary/65 bg-primary/10" : "border-foreground/15 text-foreground/65"}`}>
                {item.title || t.defaultTitle}
              </button>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <div className="space-y-4">
              <div className={groupClass}>
                <h3 className="mb-3 text-[12px] font-medium">{t.properties}</h3>
                <div className="mb-3">
                  <PropertyInput key={element.id + "-title"} label={t.title} value={element.title}
                    onCommit={(value) => onUpdate((current) => renameElement(current, element.id, value))} />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {TEXTILE_FIELDS.map((field: TextileField) => (
                    <PropertyInput key={element.id + field} label={t.fields[field]} value={element.properties[field]}
                      inputMode={["rollWidthMm", "pricePerMetre", "finishedWidthMm", "finishedLengthMm", "seamAllowanceMm", "quantity"].includes(field) ? "decimal" : undefined}
                      onCommit={(value) => onUpdate((current) => setTextileProperty(current, element.id, field, value))} />
                  ))}
                </div>
              </div>

              <div className={groupClass}>
                <h3 className="mb-3 text-[12px] font-medium">{t.cutting}</h3>
                {estimate?.status === "incomplete" && <p className="text-[12px] text-foreground/60">{t.incomplete}</p>}
                {estimate?.status === "invalid" && <p role="alert" className="text-[12px] text-foreground/75">{t.invalid}</p>}
                {estimate?.status === "does_not_fit" && (
                  <p role="alert" className="text-[12px] leading-relaxed text-foreground/85">
                    {t.doesNotFit} ({formatNumber(estimate.cutWidthMm, 0)} × {formatNumber(estimate.cutLengthMm, 0)} мм / {formatNumber(estimate.rollWidthMm, 0)} мм)
                  </p>
                )}
                {estimate?.status === "calculated" && (
                  <dl className="grid grid-cols-2 gap-3 text-[12px] sm:grid-cols-3" data-testid="textile-cut-result">
                    {([
                      [t.cut, `${formatNumber(estimate.cutWidthMm, 0)} × ${formatNumber(estimate.cutLengthMm, 0)} мм`],
                      [t.orientation, estimate.orientation === "normal" ? t.normal : t.rotated],
                      [t.perRow, String(estimate.piecesPerRow)],
                      [t.rows, String(estimate.rows)],
                      [t.length, formatNumber(estimate.linearMetres, 3)],
                      [t.waste, formatNumber(estimate.wastePercent, 1) + "%"],
                      [t.cost, estimate.materialCost === null ? t.noPrice : formatNumber(estimate.materialCost) + " " + estimate.currency],
                    ] as const).map(([label, value]) => (
                      <div key={label}><dt className="mb-1 text-[10px] text-foreground/55">{label}</dt><dd className="font-medium tabular-nums">{value}</dd></div>
                    ))}
                  </dl>
                )}
                <p className="mt-3 text-[10px] leading-relaxed text-foreground/50">{t.estimateHint}</p>
              </div>

              <div className={groupClass}>
                <h3 className="mb-2 text-[12px] font-medium">{t.pending}</h3>
                {CORE_SPHERES.filter((id) => (element.pendingChecks[id]?.length ?? 0) > 0).length === 0
                  ? <p className="text-[11px] text-foreground/55">{t.noPending}</p>
                  : <div className="flex flex-wrap gap-2">
                    {CORE_SPHERES.filter((id) => (element.pendingChecks[id]?.length ?? 0) > 0).map((id) => (
                      <button key={id} type="button" onClick={() => setSphere(id)}
                        className="rounded-lg border border-foreground/20 px-2.5 py-2 text-left text-[11px]">
                        <span className="block font-medium">{t.spheres[id]}</span>
                        <span className="mt-1 block text-[10px] text-foreground/55">{element.pendingChecks[id]!.map((field) => t.fields[field]).join(", ")}</span>
                      </button>
                    ))}
                  </div>}
              </div>
            </div>

            <div className="space-y-4">
              <div className={groupClass}>
                <h3 className="mb-3 text-[12px] font-medium">{t.assessments}</h3>
                <div className="mb-4 grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                  {CORE_SPHERES.map((id) => (
                    <button key={id} type="button" onClick={() => setSphere(id)} aria-pressed={sphere === id}
                      className={`rounded-lg border px-2 py-2 text-left text-[10px] ${sphere === id ? "border-primary/65 bg-primary/10" : "border-foreground/15 text-foreground/65"}`}>
                      <span className="block">{t.spheres[id]}</span>
                      <span className="mt-1 block text-[9px] text-foreground/50">
                        {element.pendingChecks[id]?.length ? t.recheck : element.assessments[id] ? t.statuses[element.assessments[id]!.status] : t.unreviewed}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="space-y-3 border-t border-foreground/10 pt-3">
                  <p className="text-[12px] font-medium">{t.spheres[sphere]}</p>
                  {(element.pendingChecks[sphere]?.length ?? 0) > 0 && (
                    <p role="status" className="text-[11px] text-foreground/75">
                      <RotateCcw size={12} className="mr-1 inline" />{t.recheck}: {element.pendingChecks[sphere]!.map((field) => t.fields[field]).join(", ")}
                    </p>
                  )}
                  <label className="block">
                    <span className="mb-1 block text-[10px] text-foreground/55">{t.status}</span>
                    <select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value as EvidenceStatus)}>
                      {(Object.keys(t.statuses) as EvidenceStatus[]).map((key) => <option key={key} value={key}>{t.statuses[key]}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[10px] text-foreground/55">{t.note}</span>
                    <textarea rows={4} className={inputClass} value={note} onChange={(event) => setNote(event.target.value)} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[10px] text-foreground/55">{t.source}</span>
                    <input className={inputClass} value={source} onChange={(event) => setSource(event.target.value)} />
                  </label>
                  {status === "verified" && !source.trim() && <p className="text-[10px] text-foreground/65">{t.requiredSource}</p>}
                  <button type="button" onClick={saveAssessment}
                    disabled={!note.trim() || (status === "verified" && !source.trim())}
                    className="inline-flex min-h-9 items-center gap-2 rounded-full border border-foreground/25 px-3 text-[11px] disabled:opacity-35">
                    <Check size={13} />{t.saveAssessment}
                  </button>
                </div>
              </div>
              <div className={groupClass}>
                <h3 className="mb-2 text-[12px] font-medium">{t.lastHistory}</h3>
                {!element.events.length && <p className="text-[11px] text-foreground/55">{t.noHistory}</p>}
                <div className="space-y-2">
                  {[...element.events].reverse().slice(0, 8).map((event) => (
                    <div key={event.id} className="border-t border-foreground/10 pt-2 text-[11px]">
                      <div className="flex flex-wrap justify-between gap-1">
                        <span>{event.actor === "author" ? "Автор" : t.spheres[event.actor]}</span>
                        <span className="text-[10px] text-foreground/45">{new Date(event.at).toLocaleString(locale === "uk" ? "uk-UA" : locale === "en" ? "en-GB" : "ru-RU")}</span>
                      </div>
                      <p className="mt-1 break-words text-foreground/60">{event.kind === "property" ? (t.fields[event.detail as TextileField] ?? event.detail) : t.statuses[event.detail as EvidenceStatus] ?? event.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

import { useState } from "react";
import { Link } from "react-router-dom";
import LanguageSwitcher from "@/i18n/LanguageSwitcher";
import { useLocale } from "@/i18n/useLocale";
import {
  calculateUno,
  formatUer,
  formatVolume,
  isInvalidDimension,
  type UnoLevel,
} from "@/lib/unocalc";

const levels: UnoLevel[] = [432, 270, 108];

const copy = {
  en: {
    eyebrow: "a reference before the project",
    heroTop: "Form. Quality.",
    heroBottom: "Resource.",
    intro: "An early reference for the resources needed to realise an idea. Define its overall dimensions and desired quality — before detailed design or estimation.",
    dimensions: "01 / Overall dimensions",
    dimensionNote: "Use the maximum dimensions, including for an irregular shape.",
    length: "length",
    width: "width",
    height: "height",
    volume: "bounding volume",
    unit: "mm",
    cubic: "m³",
    settings: "02 / Quality of execution",
    qualityNote: "Choose the level of execution you want, not a price category.",
    result: "03 / Your reference",
    reference: "calculated index",
    selection: "selected quality",
    wireframe: "conceptual diagram of the bounding volume",
    prompt: "Enter dimensions to see the reference.",
    invalid: "Each dimension must be a positive number greater than zero.",
    outOfRange: "Dimensions are outside the supported calculation range.",
    analysis: "The final cost is refined after design and specification.",
    definition: "unit of energy resonance",
    disclaimer: "U.E.R. is an author-defined reference index, not a measured physical energy unit, detailed estimate, or retail price.",
    levels: {
      108: { label: "basic form", hint: "Accessible materials, established methods and sound execution without complex detailing." },
      270: { label: "functional architecture", hint: "Considered functions, quality materials, precise detailing and balanced execution." },
      432: { label: "field of strength", hint: "Individual solutions, selected materials, demanding details and meticulous execution." },
    },
  },
  ru: {
    eyebrow: "опора до начала проекта",
    heroTop: "Форма. Качество.",
    heroBottom: "Ресурс.",
    intro: "Предварительный ориентир ресурса для реализации замысла. Достаточно габаритов и желаемого уровня качества — до проектирования и подробной сметы.",
    dimensions: "01 / Габариты",
    dimensionNote: "Используй максимальные размеры объекта, даже если его форма сложная.",
    length: "длина",
    width: "ширина",
    height: "высота",
    volume: "габаритный объём",
    unit: "мм",
    cubic: "м³",
    settings: "02 / Уровень качества",
    qualityNote: "Выбери желаемый уровень исполнения, а не ценовую категорию.",
    result: "03 / Твой ориентир",
    reference: "расчётный индекс",
    selection: "выбранный уровень",
    wireframe: "условная схема габаритного объёма",
    prompt: "Введи размеры, чтобы получить ориентир.",
    invalid: "Каждый размер должен быть положительным числом больше нуля.",
    outOfRange: "Размеры выходят за пределы допустимого расчёта.",
    analysis: "Окончательная стоимость уточняется после проектирования и комплектации.",
    definition: "единица энергетического резонанса",
    disclaimer: "U.E.R. — авторский расчётный индекс, не физическая единица энергии, не подробная смета и не цена продажи.",
    levels: {
      108: { label: "базовая форма", hint: "Доступные материалы, проверенные технологии и аккуратное исполнение без сложной деталировки." },
      270: { label: "функциональная архитектура", hint: "Продуманная функция, качественные материалы, точная деталировка и сбалансированное исполнение." },
      432: { label: "поле силы", hint: "Индивидуальные решения, отборные материалы, сложные узлы и высокий уровень исполнения." },
    },
  },
  uk: {
    eyebrow: "опора до початку проєкту",
    heroTop: "Форма. Якість.",
    heroBottom: "Ресурс.",
    intro: "Попередній орієнтир ресурсу для реалізації задуму. Достатньо габаритів і бажаного рівня якості — до проєктування та докладного кошторису.",
    dimensions: "01 / Габарити",
    dimensionNote: "Використовуй найбільші розміри об'єкта, навіть якщо його форма складна.",
    length: "довжина",
    width: "ширина",
    height: "висота",
    volume: "габаритний об'єм",
    unit: "мм",
    cubic: "м³",
    settings: "02 / Рівень якості",
    qualityNote: "Обери бажаний рівень виконання, а не цінову категорію.",
    result: "03 / Твій орієнтир",
    reference: "розрахунковий індекс",
    selection: "обраний рівень",
    wireframe: "умовна схема габаритного об'єму",
    prompt: "Введи розміри, щоб отримати орієнтир.",
    invalid: "Кожен розмір має бути додатним числом, більшим за нуль.",
    outOfRange: "Розміри виходять за межі допустимого розрахунку.",
    analysis: "Остаточна вартість уточнюється після проєктування та комплектації.",
    definition: "одиниця енергетичного резонансу",
    disclaimer: "U.E.R. — авторський розрахунковий індекс, не фізична одиниця енергії, не докладний кошторис і не ціна продажу.",
    levels: {
      108: { label: "базова форма", hint: "Доступні матеріали, перевірені технології й акуратне виконання без складної деталізації." },
      270: { label: "функціональна архітектура", hint: "Продумана функція, якісні матеріали, точна деталізація та збалансоване виконання." },
      432: { label: "поле сили", hint: "Індивідуальні рішення, добірні матеріали, складні вузли та високий рівень виконання." },
    },
  },
} as const;


const VolumeDiagram = ({
  dimensions,
  level,
  label,
}: {
  dimensions: [string, string, string];
  level: UnoLevel;
  label: string;
}) => {
  const entered = dimensions.map(Number);
  const valid = dimensions.every((value) => value.trim() !== "") &&
    entered.every((value) => Number.isFinite(value) && value > 0);
  const values = valid ? entered : [5200, 3600, 2800];
  const largest = Math.max(...values);
  const x = 78 + (60 * values[0]) / largest;
  const y = 28 + (39 * values[1]) / largest;
  const z = 62 + (49 * values[2]) / largest;
  const ox = 55;
  const oy = 182;
  const point = (...coords: number[]) => coords[0].toFixed(1) + "," + coords[1].toFixed(1);
  const base = [
    [ox, oy],
    [ox + x, oy],
    [ox + x + y, oy - y * 0.45],
    [ox + y, oy - y * 0.45],
  ];
  const top = base.map(([px, py]) => [px, py - z]);
  const polygon = (points: number[][]) => points.map(([px, py]) => point(px, py)).join(" ");
  const fill = level === 432 ? 0.13 : level === 270 ? 0.075 : 0.035;

  return (
    <div className="relative overflow-hidden border border-border/55 bg-foreground/[0.018]">
      <svg viewBox="0 0 310 220" role="img" aria-label={label} className="mx-auto block h-auto w-full max-w-[330px] text-foreground">
        <line x1="20" y1="192" x2="290" y2="192" stroke="currentColor" strokeOpacity="0.09" />
        <line x1="32" y1="28" x2="32" y2="192" stroke="currentColor" strokeOpacity="0.09" />
        <polygon points={polygon([top[0], top[1], top[2], top[3]])} fill="currentColor" fillOpacity={fill} stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" />
        <polygon points={polygon([base[0], base[1], top[1], top[0]])} fill="currentColor" fillOpacity={fill / 2} stroke="currentColor" strokeOpacity="0.4" strokeWidth="1" />
        <polygon points={polygon([base[1], base[2], top[2], top[1]])} fill="currentColor" fillOpacity={fill * 1.4} stroke="currentColor" strokeOpacity="0.4" strokeWidth="1" />
        <path d={"M " + point(...base[0]) + " L " + point(...base[3]) + " L " + point(...base[2])} stroke="currentColor" strokeOpacity="0.22" strokeDasharray="4 5" fill="none" />
        <path d={"M " + point(...base[3]) + " L " + point(...top[3])} stroke="currentColor" strokeOpacity="0.22" strokeDasharray="4 5" fill="none" />
        <circle cx={base[0][0]} cy={base[0][1]} r="2.5" fill="currentColor" fillOpacity="0.55" />
        <circle cx={top[2][0]} cy={top[2][1]} r="2.5" fill="currentColor" fillOpacity="0.55" />
      </svg>
      <span className="absolute bottom-3 left-4 text-[9px] uppercase tracking-[0.17em] text-muted-foreground/70">A × B × C</span>
    </div>
  );
};

const UnoCalc = () => {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [c, setC] = useState("");
  const [q, setQ] = useState<UnoLevel>(108);
  const { locale, localePath } = useLocale();
  const t = copy[locale];

  const calculation = calculateUno({ a, b, c, q });
  const ready = calculation.status === "ok";
  const feedback =
    calculation.status === "invalid"
      ? t.invalid
      : calculation.status === "out-of-range"
        ? t.outOfRange
        : null;

  const dimensions = [
    { key: "length", label: t.length, value: a, set: setA },
    { key: "width", label: t.width, value: b, set: setB },
    { key: "height", label: t.height, value: c, set: setC },
  ];


  return (
    <div
      className="relative min-h-screen overflow-hidden bg-background font-body text-foreground"
      style={{
        paddingTop: "max(2.5rem, env(safe-area-inset-top))",
        paddingBottom: "max(3rem, calc(env(safe-area-inset-bottom) + 1rem))",
        paddingLeft: "max(1.25rem, env(safe-area-inset-left))",
        paddingRight: "max(1.25rem, env(safe-area-inset-right))",
      }}
    >
      <LanguageSwitcher />
      <main className="mx-auto w-full max-w-[1050px]">
        <header className="flex min-h-10 items-start justify-between border-b border-border/60 pb-4 pr-16 sm:pr-20">
          <span className="text-[12px] font-normal lowercase tracking-[0.22em]">unocalc <span className="text-muted-foreground/55">/ uno</span></span>
          <Link
            to={localePath("/")}
            className="text-[12px] lowercase tracking-[0.12em] text-primary hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            .uno
          </Link>
        </header>

        <section className="mb-12 mt-14 sm:mb-16 sm:mt-20" aria-label="UNOcalc">
          <p className="mb-5 text-[10px] font-light uppercase tracking-[0.25em] text-muted-foreground">{t.eyebrow}</p>
          <h1 className="max-w-[880px] text-[clamp(2.4rem,7vw,5.2rem)] font-extralight leading-[1.08] tracking-[-0.045em]">
            {t.heroTop}<span className="block text-foreground/50">{t.heroBottom}</span>
          </h1>
          <p className="mt-7 max-w-[570px] text-[13px] font-light leading-[1.9] text-muted-foreground sm:text-[14px]">{t.intro}</p>
        </section>

        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:items-start lg:gap-14">
          <div className="space-y-12">
            <section aria-labelledby="unocalc-dimensions">
              <div className="mb-6 border-t border-border/65 pt-5">
                <h2 id="unocalc-dimensions" className="text-[11px] uppercase tracking-[0.17em]">{t.dimensions}</h2>
                <p className="mt-3 text-[12px] font-light leading-[1.7] text-muted-foreground">{t.dimensionNote}</p>
              </div>
              <div className="grid grid-cols-3 gap-4 sm:gap-6">
                {dimensions.map((field) => (
                  <div key={field.key}>
                    <label htmlFor={"unocalc-" + field.key} className="block text-[11px] lowercase tracking-[0.05em] text-muted-foreground">
                      {field.label} <span className="opacity-60">/ {t.unit}</span>
                    </label>
                    <input
                      id={"unocalc-" + field.key}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      value={field.value}
                      onChange={(event) => field.set(event.target.value)}
                      aria-invalid={isInvalidDimension(field.value)}
                      aria-describedby={feedback ? "unocalc-feedback" : undefined}
                      placeholder="—"
                      className="mt-2 w-full min-w-0 rounded-none border-0 border-b border-border/80 bg-transparent py-3 text-[clamp(1.05rem,3vw,1.45rem)] font-light tabular-nums text-foreground outline-none transition-colors focus:border-primary aria-[invalid=true]:border-red-600/70"
                    />
                  </div>
                ))}
              </div>
              {feedback && <p id="unocalc-feedback" role="alert" className="mt-4 text-[12px] text-red-700">{feedback}</p>}
              <div className="mt-6 flex items-baseline justify-between border-b border-border/45 pb-3">
                <span className="text-[11px] text-muted-foreground">{t.volume}</span>
                <span className="text-[19px] font-light tabular-nums">
                  {ready ? formatVolume(calculation.volume) : "—"}
                  <span className="ml-2 text-[11px] text-muted-foreground">{t.cubic}</span>
                </span>
              </div>
            </section>

            <fieldset>
              <legend className="w-full border-t border-border/65 pt-5 text-[11px] uppercase tracking-[0.17em]">{t.settings}</legend>
              <p className="mb-5 mt-3 text-[12px] font-light leading-[1.7] text-muted-foreground">{t.qualityNote}</p>
              <div className="space-y-2">
                {levels.map((level) => {
                  const active = q === level;
                  const item = t.levels[level];
                  return (
                    <label
                      key={level}
                      className={"relative flex cursor-pointer items-start gap-4 border px-4 py-5 transition-colors duration-200 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary sm:px-5 " +
                        (active ? "border-foreground/65 bg-foreground/[0.04]" : "border-border/60 hover:border-foreground/30 hover:bg-foreground/[0.015]")}
                    >
                      <input
                        type="radio"
                        name="unocalc-level"
                        value={level}
                        checked={active}
                        onChange={() => setQ(level)}
                        className="sr-only"
                      />
                      <span aria-hidden="true" className={"mt-1.5 h-[11px] w-[11px] flex-none rounded-full border " + (active ? "border-foreground bg-foreground" : "border-muted-foreground/40")} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-normal lowercase tracking-[0.015em]">{item.label}</span>
                        <span className="mt-2 block max-w-[350px] text-[12px] font-light leading-[1.75] text-muted-foreground">{item.hint}</span>
                      </span>
                      <span className={"text-[25px] font-extralight tabular-nums tracking-[-0.035em] " + (active ? "text-foreground" : "text-muted-foreground/60")}>{level}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </div>

          <aside className="lg:sticky lg:top-10" aria-labelledby="unocalc-result">
            <div className="border-t border-foreground/65 pt-5">
              <h2 id="unocalc-result" className="text-[11px] uppercase tracking-[0.17em]">{t.result}</h2>
              <div className="mt-6">
                <VolumeDiagram dimensions={[a, b, c]} level={q} label={t.wireframe} />
              </div>
              <div className="mt-7 flex items-baseline justify-between gap-3">
                <span className="text-[11px] text-muted-foreground">{t.reference}</span>
                <span className="text-[11px] text-muted-foreground">U.E.R.</span>
              </div>
              <output
                aria-live="polite"
                className="mt-2 block break-all border-b border-border/60 pb-5 text-right text-[clamp(3.5rem,8vw,5.7rem)] font-extralight leading-[1.12] tracking-[-0.06em] tabular-nums"
              >
                {ready ? formatUer(calculation.energy) : "—"}
              </output>
              <div className="mt-5 flex items-start justify-between gap-4">
                <span className="pt-1 text-[11px] text-muted-foreground">{t.selection}</span>
                <span className="text-right text-[13px] font-light">{q} · {t.levels[q].label}</span>
              </div>
              <p className="mt-7 text-[12px] font-light leading-[1.85] text-muted-foreground">
                {ready ? t.analysis : feedback ?? t.prompt}
              </p>
            </div>
          </aside>
        </div>

        <footer className="mt-16 border-t border-border/60 pt-6 sm:mt-24">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:gap-10">
            <p className="text-[11px] font-light leading-[1.8] text-muted-foreground">U.E.R. — unit of energy resonance / {t.definition}</p>
            <p className="max-w-[490px] text-[11px] font-light leading-[1.8] text-muted-foreground">{t.disclaimer}</p>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default UnoCalc;

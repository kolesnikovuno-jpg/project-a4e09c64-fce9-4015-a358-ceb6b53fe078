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

const levels: UnoLevel[] = [108, 270, 432];

const copy = {
  en: {
    eyebrow: "Before the project",
    heroTop: "Form / Quality / Resource",
    heroBottom: "Resource.",
    intro: "Dimensions and desired quality provide an early resource reference — before detailed design and estimation.",
    dimensions: "01 / Overall dimensions",
    dimensionNote: "Maximum dimensions of the object, including irregular forms.",
    length: "length",
    width: "width",
    height: "height",
    volume: "bounding volume",
    unit: "mm",
    cubic: "m³",
    settings: "02 / Quality of execution",
    qualityNote: "What level of execution do you expect?",
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
    eyebrow: "до начала проекта",
    heroTop: "Форма / Качество / Ресурс",
    heroBottom: "Ресурс.",
    intro: "Габариты и желаемое качество дают предварительный ресурсный ориентир — ещё до разработки проекта и сметы.",
    dimensions: "01 / Габариты",
    dimensionNote: "Максимальные размеры объекта, включая сложные формы.",
    length: "длина",
    width: "ширина",
    height: "высота",
    volume: "габаритный объём",
    unit: "мм",
    cubic: "м³",
    settings: "02 / Уровень качества",
    qualityNote: "Какого уровня исполнения ты ожидаешь?",
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
    eyebrow: "до початку проєкту",
    heroTop: "Форма / Якість / Ресурс",
    heroBottom: "Ресурс.",
    intro: "Габарити й бажана якість дають попередній ресурсний орієнтир — ще до розробки проєкту й кошторису.",
    dimensions: "01 / Габарити",
    dimensionNote: "Найбільші розміри об'єкта, зокрема складної форми.",
    length: "довжина",
    width: "ширина",
    height: "висота",
    volume: "габаритний об'єм",
    unit: "мм",
    cubic: "м³",
    settings: "02 / Рівень якості",
    qualityNote: "Якого рівня виконання ти очікуєш?",
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
      className="min-h-screen bg-background font-body text-foreground"
      style={{
        paddingTop: "max(2.25rem, env(safe-area-inset-top))",
        paddingBottom: "max(2rem, calc(env(safe-area-inset-bottom) + 1rem))",
        paddingLeft: "max(1.25rem, env(safe-area-inset-left))",
        paddingRight: "max(1.25rem, env(safe-area-inset-right))",
      }}
    >
      <LanguageSwitcher />
      <main className="mx-auto w-full max-w-[1060px]">
        <header className="flex items-center justify-between border-b border-foreground/25 pb-4 pr-2">
          <h1 className="text-[25px] font-light leading-none tracking-[-0.045em] sm:text-[28px]">
            UNO<span className="font-normal">calc</span>
          </h1>
          <Link
            to={localePath("/")}
            className="inline-flex min-h-9 items-center text-[12px] tracking-[0.12em] text-foreground/80 transition-colors hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            .uno
          </Link>
        </header>

        <section className="mb-8 mt-7 grid gap-3 border-b border-border/75 pb-7 sm:mb-10 sm:mt-9 sm:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] sm:gap-10" aria-label="UNOcalc">
          <div>
            <p className="mb-2 text-[11px] font-normal uppercase tracking-[0.17em] text-foreground/65">{t.eyebrow}</p>
            <p className="text-[20px] font-light leading-tight tracking-[-0.015em] text-foreground sm:text-[25px]">{t.heroTop}</p>
          </div>
          <p className="max-w-[490px] text-[13px] font-light leading-[1.75] text-foreground/75">{t.intro}</p>
        </section>

        <div className="grid items-start gap-9 md:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] md:gap-10 lg:gap-14">
          <div>
            <section aria-labelledby="unocalc-dimensions">
              <div className="mb-4 flex flex-col gap-1">
                <h2 id="unocalc-dimensions" className="text-[12px] font-medium uppercase tracking-[0.13em]">{t.dimensions}</h2>
                <p className="text-[12px] font-light leading-[1.65] text-foreground/65">{t.dimensionNote}</p>
              </div>
              <div className="grid grid-cols-3 gap-4 sm:gap-5">
                {dimensions.map((field) => (
                  <div key={field.key} className="min-w-0">
                    <label htmlFor={"unocalc-" + field.key} className="block text-[12px] font-light text-foreground/80">
                      {field.label} <span className="text-foreground/55">/ {t.unit}</span>
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
                      className="mt-1 w-full min-w-0 rounded-none border-0 border-b border-foreground/30 bg-transparent py-2.5 text-[23px] font-light tracking-[-0.025em] tabular-nums text-foreground outline-none transition-colors placeholder:text-foreground/25 focus:border-primary aria-[invalid=true]:border-red-600/75 sm:text-[25px]"
                    />
                  </div>
                ))}
              </div>
              {feedback && <p id="unocalc-feedback" role="alert" className="mt-3 text-[12px] text-red-700">{feedback}</p>}
              <div className="mt-4 flex items-baseline justify-between gap-3 border-b border-border/60 py-2">
                <span className="text-[12px] text-foreground/70">{t.volume}</span>
                <span className="text-[20px] font-light tabular-nums tracking-[-0.02em]">
                  {ready ? formatVolume(calculation.volume) : "—"}
                  <span className="ml-1 text-[12px] text-foreground/60">{t.cubic}</span>
                </span>
              </div>
            </section>

            <fieldset className="mt-8">
              <legend className="w-full border-t border-foreground/25 pt-4 text-[12px] font-medium uppercase tracking-[0.13em]">{t.settings}</legend>
              <p className="mb-4 mt-1 text-[12px] font-light text-foreground/65">{t.qualityNote}</p>
              <div className="divide-y divide-border/65 border-y border-border/65">
                {levels.map((level) => {
                  const active = q === level;
                  const item = t.levels[level];
                  return (
                    <label
                      key={level}
                      className={
                        "group relative flex cursor-pointer items-center gap-3 py-3 transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary sm:gap-4 " +
                        (active ? "bg-foreground/[0.035]" : "hover:bg-foreground/[0.02]")
                      }
                    >
                      <input
                        type="radio"
                        name="unocalc-level"
                        value={level}
                        checked={active}
                        onChange={() => setQ(level)}
                        className="sr-only"
                      />
                      <span className={"ml-2 w-[55px] shrink-0 text-[25px] font-extralight tracking-[-0.035em] tabular-nums sm:w-[64px] " + (active ? "text-foreground" : "text-foreground/55")}>
                        {level}
                      </span>
                      <span className="min-w-0 flex-1 pr-2">
                        <span className={"block text-[13px] font-normal leading-[1.4] " + (active ? "text-foreground" : "text-foreground/80")}>{item.label}</span>
                        <span className="mt-0.5 block text-[11px] font-light leading-[1.5] text-foreground/65">{item.hint}</span>
                      </span>
                      <span
                        aria-hidden="true"
                        className={"mr-3 h-3 w-3 shrink-0 rounded-full border border-foreground/45 " + (active ? "bg-foreground" : "bg-transparent")}
                      />
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </div>

          <section className="md:border-l md:border-border/70 md:pl-8 lg:pl-10" aria-labelledby="unocalc-result">
            <div className="flex items-baseline justify-between gap-2">
              <h2 id="unocalc-result" className="text-[12px] font-medium uppercase tracking-[0.13em]">{t.result}</h2>
              <span className="text-[10px] tracking-[0.17em] text-foreground/55">A × B × C</span>
            </div>
            <div className="mt-4">
              <VolumeDiagram dimensions={[a, b, c]} level={q} label={t.wireframe} />
            </div>
            <div className="mt-5 flex items-center justify-between gap-3">
              <span className="text-[12px] text-foreground/70">{t.reference}</span>
              <span className="text-[12px] font-light tracking-[0.12em] text-foreground/70">U.E.R.</span>
            </div>
            <output
              aria-live="polite"
              className="mt-2 block break-all border-b border-foreground/35 pb-4 text-right text-[clamp(3rem,6vw,4.5rem)] font-extralight leading-[1.1] tracking-[-0.045em] tabular-nums"
            >
              {ready ? formatUer(calculation.energy) : "—"}
            </output>
            <div className="mt-4 flex justify-between gap-4">
              <span className="text-[12px] text-foreground/65">{t.selection}</span>
              <span className="text-right text-[13px] font-normal">{q} · {t.levels[q].label}</span>
            </div>
            <p className="mt-4 text-[12px] font-light leading-[1.65] text-foreground/65">
              {ready ? t.analysis : feedback ?? t.prompt}
            </p>
          </section>
        </div>

        <footer className="mt-10 flex flex-col justify-between gap-2 border-t border-border/70 pt-4 text-[11px] font-light leading-[1.7] text-foreground/60 md:mt-12 md:flex-row md:gap-10">
          <p>U.E.R. — unit of energy resonance / {t.definition}</p>
          <p className="max-w-[490px]">{t.disclaimer}</p>
        </footer>
      </main>
    </div>
  );
};

export default UnoCalc;

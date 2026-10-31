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
    intro: "spatial energy density calculator",
    dimensions: "element dimensions",
    length: "length",
    width: "width",
    height: "height",
    volume: "volume",
    unit: "mm",
    cubic: "m³",
    settings: "tuning level",
    result: "result",
    prompt: "enter dimensions to calculate",
    invalid: "each dimension must be a positive number greater than zero",
    outOfRange: "dimensions are outside the supported calculation range",
    analysis: "precise tuning requires structural analysis",
    definition: "unit of energy resonance",
    disclaimer: "author-defined calculation index, not a physical energy unit",
    levels: {
      108: { label: "basic form", hint: "comfort and basic tuning", interpretation: "basic level — the form provides comfort and stability" },
      270: { label: "functional architecture", hint: "balance of functions and rhythm", interpretation: "balanced system — the space aligns functions and rhythm" },
      432: { label: "field of strength", hint: "sacred tuning of space", interpretation: "field of strength — the space influences and shapes one's state" },
    },
  },
  ru: {
    intro: "расчёт энергетической плотности пространства",
    dimensions: "габариты элемента",
    length: "длина",
    width: "ширина",
    height: "высота",
    volume: "объём",
    unit: "мм",
    cubic: "м³",
    settings: "уровень настройки",
    result: "результат",
    prompt: "введи параметры для расчёта",
    invalid: "каждый размер должен быть положительным числом больше нуля",
    outOfRange: "размеры выходят за пределы допустимого расчёта",
    analysis: "для точной настройки требуется анализ структуры",
    definition: "единица энергетического резонанса",
    disclaimer: "расчётный индекс авторской модели, не физическая единица энергии",
    levels: {
      108: { label: "базовая форма", hint: "комфорт и базовая настройка", interpretation: "базовый уровень — форма обеспечивает комфорт и стабильность" },
      270: { label: "функциональная архитектура", hint: "баланс функций и ритма", interpretation: "сбалансированная система — пространство согласует функции и ритм" },
      432: { label: "поле силы", hint: "сакральная настройка пространства", interpretation: "поле силы — пространство влияет и формирует состояние" },
    },
  },
  uk: {
    intro: "розрахунок енергетичної щільності простору",
    dimensions: "габарити елемента",
    length: "довжина",
    width: "ширина",
    height: "висота",
    volume: "об'єм",
    unit: "мм",
    cubic: "м³",
    settings: "рівень налаштування",
    result: "результат",
    prompt: "введи параметри для розрахунку",
    invalid: "кожен розмір має бути додатним числом, більшим за нуль",
    outOfRange: "розміри виходять за межі допустимого розрахунку",
    analysis: "для точного налаштування потрібен аналіз структури",
    definition: "одиниця енергетичного резонансу",
    disclaimer: "розрахунковий індекс авторської моделі, не фізична одиниця енергії",
    levels: {
      108: { label: "базова форма", hint: "комфорт і базове налаштування", interpretation: "базовий рівень — форма забезпечує комфорт і стабільність" },
      270: { label: "функціональна архітектура", hint: "баланс функцій і ритму", interpretation: "збалансована система — простір узгоджує функції та ритм" },
      432: { label: "поле сили", hint: "сакральне налаштування простору", interpretation: "поле сили — простір впливає та формує стан" },
    },
  },
} as const;

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
      className="min-h-screen flex items-start justify-center bg-background font-body"
      style={{
        paddingTop: "max(2rem, env(safe-area-inset-top))",
        paddingBottom: "max(2rem, calc(env(safe-area-inset-bottom) + 1rem))",
        paddingLeft: "max(1.75rem, env(safe-area-inset-left))",
        paddingRight: "max(1.75rem, env(safe-area-inset-right))",
      }}
    >
      <LanguageSwitcher />
      <main className="w-full max-w-[440px]">
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-[12px] font-normal tracking-[0.22em] lowercase text-foreground">
            unocalc
          </h1>
          <Link
            to={localePath("/")}
            className="text-[12px] tracking-[0.18em] lowercase text-primary hover:text-primary transition-colors"
          >
            .uno
          </Link>
        </header>

        <p className="text-center text-[11px] tracking-[0.28em] uppercase font-light text-muted-foreground mb-10 leading-relaxed">
          {t.intro}
        </p>

        <section className="mb-10" aria-labelledby="unocalc-dimensions">
          <h2 id="unocalc-dimensions" className="text-[10px] tracking-[0.24em] uppercase text-muted-foreground/80 font-light mb-4">
            {t.dimensions}
          </h2>
          <div className="space-y-5">
            {dimensions.map((field) => (
              <div key={field.key} className="group">
                <div className="flex items-baseline justify-between mb-1">
                  <label
                    htmlFor={"unocalc-" + field.key}
                    className="text-[11px] tracking-[0.16em] lowercase text-muted-foreground/80 font-light"
                  >
                    {field.label}
                  </label>
                  <span className="text-[10px] tracking-[0.12em] lowercase text-muted-foreground/60">
                    {t.unit}
                  </span>
                </div>
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
                  className="w-full border-0 border-b border-border/60 bg-transparent py-1 text-[15px] tracking-[0.02em] text-foreground/90 outline-none transition-colors duration-500 focus:border-foreground/30 aria-[invalid=true]:border-red-600/70"
                />
              </div>
            ))}
          </div>

          {feedback && (
            <p id="unocalc-feedback" role="alert" className="mt-3 text-[11px] leading-relaxed text-red-700">
              {feedback}
            </p>
          )}

          <div className="mt-6 flex items-baseline justify-between border-b border-border/30 pb-2">
            <span className="text-[10px] tracking-[0.24em] uppercase text-muted-foreground/80 font-light">
              {t.volume}
            </span>
            <span className="text-[14px] tracking-[0.04em] text-foreground font-light tabular-nums">
              {ready ? formatVolume(calculation.volume) : "—"}{" "}
              <span className="text-muted-foreground/60 text-[11px] ml-1">{t.cubic}</span>
            </span>
          </div>
        </section>

        <fieldset className="mb-10">
          <legend className="text-[10px] tracking-[0.24em] uppercase text-muted-foreground/80 font-light mb-4">
            {t.settings}
          </legend>
          <div className="divide-y divide-border/30 border-y border-border/30">
            {levels.map((level) => {
              const active = q === level;
              const item = t.levels[level];
              return (
                <label
                  key={level}
                  className={"flex items-start cursor-pointer px-1 py-3 transition-colors duration-300 " +
                    (active ? "bg-foreground/[0.025]" : "hover:bg-foreground/[0.015]")}
                >
                  <input
                    type="radio"
                    name="unocalc-level"
                    value={level}
                    checked={active}
                    onChange={() => setQ(level)}
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={"mt-[4px] mr-3 flex-shrink-0 w-[10px] h-[10px] rounded-full border transition-colors duration-300 relative peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-ring " +
                      (active ? "border-foreground/60" : "border-border")}
                  >
                    {active && <span className="absolute inset-[2px] rounded-full bg-foreground/70" />}
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[13px] tracking-[0.04em] lowercase text-foreground font-light">
                      {item.label}
                    </span>
                    <span className="text-[11px] tracking-[0.02em] text-muted-foreground/75 font-light leading-relaxed">
                      {item.hint}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <section className="mb-8" aria-labelledby="unocalc-results">
          <h2 id="unocalc-results" className="text-[10px] tracking-[0.24em] uppercase text-muted-foreground/80 font-light mb-3">
            {t.result}
          </h2>
          <div className="flex items-baseline justify-between border-t border-foreground/20 pt-4">
            <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground/70 font-light">
              U.E.R.
            </span>
            <output
              aria-live="polite"
              className="text-[34px] md:text-[38px] tracking-[-0.01em] text-foreground font-extralight tabular-nums leading-none break-all"
            >
              {ready ? formatUer(calculation.energy) : "—"}
            </output>
          </div>
          <p className="mt-5 text-[12px] tracking-[0.04em] lowercase text-foreground/80 font-light leading-relaxed">
            {ready ? t.levels[q].interpretation : feedback ?? t.prompt}
          </p>
        </section>

        <section className="mt-9 border-t border-border/50 pt-7" aria-labelledby="unocalc-lab-title">
          <h2 id="unocalc-lab-title" className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            UNOcalc Lab
          </h2>
          <p className="mt-3 text-[12px] font-light leading-[1.8] text-foreground/80">
            {{
              ru: "Исследуй взаимодействие пространства и внимания: геометрия, личные наблюдения и сравнение вариантов.",
              uk: "Досліджуй взаємодію простору й уваги: геометрія, власні спостереження та порівняння варіантів.",
              en: "Explore space and attention through geometry, personal observations, and scenario comparison.",
            }[locale]}
          </p>
          <Link
            to={localePath("/unocalc/lab")}
            className="mt-5 inline-flex min-h-11 items-center border-b border-foreground/40 text-[12px] tracking-[0.1em] text-primary hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            {{
              ru: "Открыть лабораторию →",
              uk: "Відкрити лабораторію →",
              en: "Open the lab →",
            }[locale]}
          </Link>
        </section>

        <footer className="mt-10 pt-6 border-t border-border/30">
          <p className="text-center text-[11px] tracking-[0.04em] lowercase text-foreground/80 font-light leading-relaxed">
            {t.analysis}
          </p>
          <p className="mt-4 text-center text-[10px] tracking-[0.14em] lowercase text-muted-foreground/60 font-light leading-relaxed">
            U.E.R. — unit of energy resonance
            <br />
            {t.definition}
          </p>
          <p className="mt-3 text-center text-[10px] tracking-[0.04em] lowercase text-muted-foreground/60 font-light leading-relaxed">
            {t.disclaimer}
          </p>
        </footer>
      </main>
    </div>
  );
};

export default UnoCalc;

import { useState } from "react";
import { Link } from "react-router-dom";

const levels = [
  { value: 432, label: "поле силы", hint: "сакральная настройка пространства" },
  { value: 270, label: "функциональная архитектура", hint: "баланс функций и ритма" },
  { value: 108, label: "базовая форма", hint: "комфорт и базовая настройка" },
];

const interpret = (q: number) => {
  if (q === 108) return "базовый уровень — форма обеспечивает комфорт и стабильность";
  if (q === 270) return "сбалансированная система — пространство согласует функции и ритм";
  return "поле силы — пространство влияет и формирует состояние";
};

const UnoCalc = () => {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [c, setC] = useState("");
  const [q, setQ] = useState(108);

  const aNum = parseFloat(a);
  const bNum = parseFloat(b);
  const cNum = parseFloat(c);
  const valid = !isNaN(aNum) && !isNaN(bNum) && !isNaN(cNum);

  const volume = valid ? (aNum * bNum * cNum) / 1e9 : 0;
  const energy = valid
    ? Math.round((aNum / 432) * (bNum / 432) * (cNum / 432) * (q / 3) * 0.432)
    : null;

  return (
    <div
      className="min-h-screen flex items-start justify-center bg-background"
      style={{
        paddingTop: "max(2rem, env(safe-area-inset-top))",
        paddingBottom: "max(2rem, calc(env(safe-area-inset-bottom) + 1rem))",
        paddingLeft: "max(1.75rem, env(safe-area-inset-left))",
        paddingRight: "max(1.75rem, env(safe-area-inset-right))",
      }}
    >
      <div className="w-full max-w-[440px]">
        {/* Header — quiet, aligned with site navigation */}
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-[12px] font-normal tracking-[0.22em] lowercase text-foreground">
            unocalc
          </h1>
          <Link
            to="/"
            className="text-[12px] tracking-[0.18em] lowercase text-primary hover:text-primary transition-colors"
          >
            .uno
          </Link>
        </header>

        {/* Title — thin, spaced, architectural */}
        <p className="text-center text-[11px] tracking-[0.28em] uppercase font-light text-muted-foreground mb-10 leading-relaxed">
          расчет энергетической плотности пространства
        </p>

        {/* Section: dimensions */}
        <section className="mb-10">
          <p className="text-[10px] tracking-[0.24em] uppercase text-muted-foreground/80 font-light mb-4">
            габариты элемента
          </p>

          <div className="space-y-5">
            {[
              { label: "длина", unit: "мм", value: a, set: setA },
              { label: "ширина", unit: "мм", value: b, set: setB },
              { label: "высота", unit: "мм", value: c, set: setC },
            ].map((f) => (
              <div key={f.label} className="group">
                <div className="flex items-baseline justify-between mb-1">
                  <label className="text-[11px] tracking-[0.16em] lowercase text-muted-foreground/80 font-light">
                    {f.label}
                  </label>
                  <span className="text-[10px] tracking-[0.12em] lowercase text-muted-foreground/60">
                    {f.unit}
                  </span>
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  value={f.value}
                  onChange={(e) => f.set(e.target.value)}
                  className="w-full border-0 border-b border-border/60 bg-transparent py-1 text-[15px] tracking-[0.02em] text-foreground/90 placeholder:text-muted-foreground/30 outline-none transition-colors duration-500 focus:border-foreground/30"
                />
              </div>
            ))}
          </div>

          {/* Volume — quiet computed line */}
          <div className="mt-6 flex items-baseline justify-between border-b border-border/30 pb-2">
            <span className="text-[10px] tracking-[0.24em] uppercase text-muted-foreground/80 font-light">
              объем
            </span>
            <span className="text-[14px] tracking-[0.04em] text-foreground font-light tabular-nums">
              {volume.toFixed(2)} <span className="text-muted-foreground/60 text-[11px] ml-1">м³</span>
            </span>
          </div>
        </section>

        {/* Section: tuning level */}
        <section className="mb-10">
          <p className="text-[10px] tracking-[0.24em] uppercase text-muted-foreground/80 font-light mb-4">
            уровень настройки
          </p>

          <div className="divide-y divide-border/30 border-y border-border/30">
            {levels.map((lvl) => {
              const active = q === lvl.value;
              return (
                <label
                  key={lvl.value}
                  className={`flex items-start cursor-pointer px-1 py-3 transition-colors duration-300 ${
                    active ? "bg-foreground/[0.025]" : "hover:bg-foreground/[0.015]"
                  }`}
                >
                  <input
                    type="radio"
                    name="q"
                    value={lvl.value}
                    checked={active}
                    onChange={() => setQ(lvl.value)}
                    className="hidden"
                  />
                  <span
                    className={`mt-[4px] mr-3 flex-shrink-0 w-[10px] h-[10px] rounded-full border transition-colors duration-300 relative ${
                      active ? "border-foreground/60" : "border-border"
                    }`}
                  >
                    {active && (
                      <span className="absolute inset-[2px] rounded-full bg-foreground/70" />
                    )}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[13px] tracking-[0.04em] lowercase text-foreground font-light">
                      {lvl.label}
                    </span>
                    <span className="text-[11px] tracking-[0.02em] text-muted-foreground/75 font-light leading-relaxed">
                      {lvl.hint}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </section>

        {/* Result — primary computational output */}
        <section className="mb-8">
          <p className="text-[10px] tracking-[0.24em] uppercase text-muted-foreground/80 font-light mb-3">
            результат
          </p>
          <div className="flex items-baseline justify-between border-t border-foreground/20 pt-4">
            <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground/70 font-light">
              U.E.R.
            </span>
            <span className="text-[34px] md:text-[38px] tracking-[-0.01em] text-foreground font-extralight tabular-nums leading-none">
              {energy ?? "—"}
            </span>
          </div>

          <p className="mt-5 text-[12px] tracking-[0.04em] lowercase text-foreground/80 font-light leading-relaxed">
            {valid ? interpret(q) : "введи параметры для расчета"}
          </p>
        </section>

        {/* Footnote */}
        <div className="mt-10 pt-6 border-t border-border/30">
          <p className="text-center text-[11px] tracking-[0.04em] lowercase text-foreground/80 font-light leading-relaxed">
            для точной настройки требуется анализ структуры
          </p>
          <p className="mt-4 text-center text-[10px] tracking-[0.14em] lowercase text-muted-foreground/60 font-light leading-relaxed">
            U.E.R. — unit of energy resonance
            <br />
            единица энергетического резонанса
          </p>
        </div>
      </div>
    </div>
  );
};

export default UnoCalc;

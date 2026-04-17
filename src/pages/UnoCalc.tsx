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
      className="min-h-screen flex items-start md:items-center justify-center bg-background px-6 py-8 md:py-0"
      style={{
        paddingTop: "max(2rem, env(safe-area-inset-top))",
        paddingBottom: "max(2rem, env(safe-area-inset-bottom))",
        paddingLeft: "max(1.5rem, env(safe-area-inset-left))",
        paddingRight: "max(1.5rem, env(safe-area-inset-right))",
      }}
    >
      <div className="max-w-[640px] w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <h1 className="text-[15px] md:text-[16px] font-normal tracking-[0.04em] text-foreground">
            unocalc
          </h1>
          <Link
            to="/"
            className="text-[13px] text-primary font-medium hover:text-primary/80 transition-colors"
          >
            .uno
          </Link>
        </div>

        {/* Top note */}
        <p className="text-center text-[12px] text-muted-foreground mb-4">
          расчет энергетической плотности пространства
        </p>

        {/* Subtitle */}
        <p className="text-center text-[14px] text-muted-foreground/80 mt-6 mb-3">
          введи габариты элемента пространства
        </p>

        {/* Inputs */}
        {[
          { label: "длина (мм)", value: a, set: setA },
          { label: "ширина (мм)", value: b, set: setB },
          { label: "высота (мм)", value: c, set: setC },
        ].map((f) => (
          <div key={f.label} className="mb-4">
            <label className="block text-[12px] text-muted-foreground mb-1">{f.label}</label>
            <input
              type="number"
              value={f.value}
              onChange={(e) => f.set(e.target.value)}
              className="w-full border-0 border-b border-border bg-transparent py-2 text-[16px] text-foreground outline-none transition-colors duration-300 focus:border-primary"
            />
          </div>
        ))}

        {/* Volume */}
        <div className="mt-5 mb-4 px-4 py-3 bg-muted/40 rounded-sm flex items-center justify-between text-[14px]">
          <span className="text-muted-foreground">объем</span>
          <span className="text-[17px] text-foreground">{volume.toFixed(2)} м³</span>
        </div>

        {/* Level */}
        <p className="text-center text-[14px] text-muted-foreground/80 mt-6 mb-3">
          уровень настройки
        </p>

        <div className="space-y-1">
          {levels.map((lvl) => (
            <label
              key={lvl.value}
              className={`flex items-start cursor-pointer text-[14px] text-foreground/85 rounded-sm px-3 py-2.5 transition-colors duration-200 ${
                q === lvl.value ? "bg-primary/[0.07]" : "hover:bg-muted/30"
              }`}
            >
              <input
                type="radio"
                name="q"
                value={lvl.value}
                checked={q === lvl.value}
                onChange={() => setQ(lvl.value)}
                className="hidden"
              />
              <span
                className={`mt-[3px] mr-2.5 flex-shrink-0 w-4 h-4 rounded-full border transition-colors duration-200 relative ${
                  q === lvl.value ? "border-primary" : "border-border"
                }`}
              >
                {q === lvl.value && (
                  <span className="absolute top-[3px] left-[3px] w-2 h-2 rounded-full bg-primary" />
                )}
              </span>
              <div className="flex flex-col">
                <span>{lvl.label}</span>
                <span className="text-[12px] text-muted-foreground mt-0.5">{lvl.hint}</span>
              </div>
            </label>
          ))}
        </div>

        {/* Result */}
        <div className="mt-5 px-4 py-3 bg-primary/[0.12] border-l-[3px] border-primary rounded-sm flex items-center justify-between text-[14px]">
          <span className="text-muted-foreground">результат</span>
          <span className="text-[17px] text-foreground">{energy ?? "—"} U.E.R.</span>
        </div>

        {/* Interpretation — visually separated */}
        <div className="mt-5 px-4 py-3 bg-muted/25 rounded-sm text-center">
          <p className="text-[13px] text-muted-foreground">
            {valid ? interpret(q) : "введи параметры для расчета"}
          </p>
        </div>

        <p className="mt-4 text-center text-[13px] text-foreground">
          для точной настройки требуется анализ структуры
        </p>

        <p className="mt-8 text-center text-[11px] text-muted-foreground/60">
          U.E.R. — Unit of Energy Resonance / Единица Энергетического Резонанса
        </p>
      </div>
    </div>
  );
};

export default UnoCalc;

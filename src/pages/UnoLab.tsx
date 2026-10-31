import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import LanguageSwitcher from "@/i18n/LanguageSwitcher";
import { useLocale } from "@/i18n/useLocale";
import { formatUer, formatVolume, type UnoLevel } from "@/lib/unocalc";
import {
  LAB_STORAGE_KEY,
  calculateRoom,
  compareRooms,
  initialLabState,
  readMeters,
  restoreLabState,
  type LabDimensions,
  type LabSignal,
  type LabState,
  type LabStep,
  type LabZone,
} from "@/lib/unoLab";
import { labCopy } from "@/content/unoLabCopy";

const steps: LabStep[] = ["space", "attention", "compare"];
const zones: LabZone[] = ["window", "center", "entrance"];
const signals: LabSignal[] = ["light", "noise", "movement", "layout"];
const levels: UnoLevel[] = [108, 270, 432];

const readSaved = (): LabState => {
  try {
    return restoreLabState(window.localStorage.getItem(LAB_STORAGE_KEY));
  } catch {
    return initialLabState();
  }
};

const numberText = (value: number, digits = 2): string =>
  value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });

const RoomDiagram = ({
  length,
  width,
  selectedZone,
}: {
  length: string;
  width: string;
  selectedZone?: LabZone;
}) => {
  const a = readMeters(length) ?? 4.8;
  const b = readMeters(width) ?? 3.6;
  const maximum = Math.max(a, b);
  const roomW = Math.max(125, (260 * a) / maximum);
  const roomH = Math.max(92, (160 * b) / maximum);
  const x = (360 - roomW) / 2;
  const y = (220 - roomH) / 2;
  const points: Record<LabZone, { x: number; y: number }> = {
    window: { x: x + roomW / 2, y: y + roomH * 0.23 },
    center: { x: x + roomW / 2, y: y + roomH / 2 },
    entrance: { x: x + roomW * 0.18, y: y + roomH * 0.78 },
  };

  return (
    <svg viewBox="0 0 360 220" role="img" aria-label="Conceptual room plan with window, entrance and centre" className="w-full h-auto max-h-[250px] text-foreground">
      <rect x={x} y={y} width={roomW} height={roomH} rx="1" fill="currentColor" fillOpacity="0.022" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.2" />
      <line x1={x + roomW * 0.34} y1={y} x2={x + roomW * 0.66} y2={y} stroke="hsl(var(--primary))" strokeWidth="4" strokeLinecap="square" />
      <line x1={x + 18} y1={y + roomH} x2={x + 55} y2={y + roomH} stroke="hsl(var(--background))" strokeWidth="5" />
      <path d={'M ' + (x + 18) + ' ' + (y + roomH) + ' A 37 37 0 0 1 ' + (x + 55) + ' ' + (y + roomH - 37)} fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 4" strokeOpacity="0.35" />
      <line x1={x + roomW / 2 - 12} y1={y + roomH / 2} x2={x + roomW / 2 + 12} y2={y + roomH / 2} stroke="currentColor" strokeOpacity="0.16" />
      <line x1={x + roomW / 2} y1={y + roomH / 2 - 12} x2={x + roomW / 2} y2={y + roomH / 2 + 12} stroke="currentColor" strokeOpacity="0.16" />
      {selectedZone && (
        <>
          <circle cx={points[selectedZone].x} cy={points[selectedZone].y} r="17" fill="hsl(var(--primary))" fillOpacity="0.10" stroke="hsl(var(--primary))" strokeOpacity="0.55" strokeWidth="1" />
          <circle cx={points[selectedZone].x} cy={points[selectedZone].y} r="4" fill="hsl(var(--primary))" />
        </>
      )}
      <text x="180" y="214" fontSize="10" textAnchor="middle" fill="currentColor" opacity="0.55">
        {length} × {width} m
      </text>
    </svg>
  );
};

const UnoLab = () => {
  const { locale, localePath } = useLocale();
  const t = labCopy[locale];
  const [data, setData] = useState<LabState>(readSaved);
  const [step, setStep] = useState<LabStep>("space");
  const result = calculateRoom(data.dimensions, data.level);
  const valid = result.status === "ok";
  const { baseline, proposal, percent } = compareRooms(data);
  const proposedValid = proposal.status === "ok";
  const stepNumber = steps.indexOf(step) + 1;

  useEffect(() => {
    try {
      window.localStorage.setItem(LAB_STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Private browsing, storage policy and quota can prevent saving.
    }
  }, [data]);

  const changeDimension = (field: keyof LabDimensions, value: string) =>
    setData((previous) => ({
      ...previous,
      dimensions: { ...previous.dimensions, [field]: value },
    }));

  const toggleSignal = (signal: LabSignal) =>
    setData((previous) => ({
      ...previous,
      signals: previous.signals.includes(signal)
        ? previous.signals.filter((item) => item !== signal)
        : [...previous.signals, signal],
    }));

  const reset = () => {
    if (!window.confirm(t.resetConfirm)) return;
    setData(initialLabState());
    setStep("space");
  };

  const selectStep = (target: LabStep) => {
    if ((target === "attention" || target === "compare") && !valid) return;
    setStep(target);
  };

  const fieldClass = "w-full rounded-none border-0 border-b border-border bg-transparent py-3 text-[16px] font-light tracking-wide text-foreground outline-none transition-colors focus:border-primary";
  const panelClass = "rounded-sm border border-border/65 bg-background px-5 py-5 sm:px-7 sm:py-6";
  const eyebrow = "text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-light";
  const fieldTitle = "text-[11px] uppercase tracking-[0.17em] text-muted-foreground font-light";

  return (
    <div className="min-h-screen bg-background font-body text-foreground" style={{
      paddingTop: "max(4rem, env(safe-area-inset-top))",
      paddingBottom: "max(2rem, calc(env(safe-area-inset-bottom) + 1.5rem))",
    }}>
      <SEO
        title={"UNOcalc Lab — " + t.title}
        description={t.spaceLead}
        image="/favicon.png"
        alternates={{
          en: "/en/unocalc/lab",
          ru: "/ru/unocalc/lab",
          uk: "/uk/unocalc/lab",
        }}
      />
      <LanguageSwitcher />
      <main className="mx-auto w-full max-w-[660px] px-6 sm:px-8">
        <header className="flex items-center justify-between gap-4 border-b border-border/55 pb-5">
          <Link to={localePath("/unocalc")} className="inline-flex min-h-11 items-center gap-2 text-[11px] tracking-[0.07em] text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
            <ArrowLeft size={14} aria-hidden />
            {t.backCalc}
          </Link>
          <Link to={localePath("/")} className="text-[12px] tracking-[0.18em] text-primary hover:text-foreground">
            {t.home}
          </Link>
        </header>

        <div className="pb-8 pt-10 sm:pb-10 sm:pt-12">
          <p className={eyebrow}>{t.proto}</p>
          <h1 className="mt-3 text-[29px] font-extralight tracking-[-0.025em] leading-tight sm:text-[38px]">
            UNOcalc <span className="text-muted-foreground">Lab</span>
          </h1>
          <p className="mt-3 text-[13px] font-light leading-relaxed text-muted-foreground">{t.title}</p>
        </div>

        <nav className="grid grid-cols-3 gap-0 border-y border-border/65" aria-label={t.step}>
          {steps.map((item, index) => {
            const active = step === item;
            const blocked = index > 0 && !valid;
            return (
              <button
                key={item}
                type="button"
                disabled={blocked}
                aria-current={active ? "step" : undefined}
                onClick={() => selectStep(item)}
                className={
                  "min-h-14 border-b-2 px-1 py-3 text-left text-[11px] leading-snug transition-colors sm:px-3 sm:text-[12px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary " +
                  (active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground") +
                  (blocked ? " cursor-not-allowed opacity-35" : "")
                }
              >
                <span className="mr-2 text-[10px] tabular-nums opacity-55">0{index + 1}</span>
                {t.stages[index]}
              </button>
            );
          })}
        </nav>

        <div className="pb-6 pt-9 sm:pt-10" role="region" aria-live="off">
          {step === "space" && (
            <section aria-labelledby="lab-space-title">
              <p className={eyebrow}>{t.spaceKicker}</p>
              <h2 id="lab-space-title" className="mt-3 text-[24px] font-light leading-snug sm:text-[27px]">{t.spaceTitle}</h2>
              <p className="mt-3 max-w-[550px] text-[13px] font-light leading-[1.9] text-muted-foreground">{t.spaceLead}</p>

              <div className="mt-7 rounded-sm bg-foreground/[0.025] px-3 pb-3 pt-4 sm:px-7">
                <RoomDiagram length={data.dimensions.length} width={data.dimensions.width} />
                <p className="pt-2 text-center text-[10px] tracking-[0.04em] text-muted-foreground">{t.planLabel}</p>
              </div>

              <div className="mt-7 grid grid-cols-3 gap-4 sm:gap-6">
                {(["length", "width", "height"] as const).map((field) => (
                  <div key={field}>
                    <label htmlFor={"lab-" + field} className={fieldTitle}>{t[field]}, {t.unit}</label>
                    <input
                      id={"lab-" + field}
                      value={data.dimensions[field]}
                      onChange={(event) => changeDimension(field, event.target.value)}
                      inputMode="decimal"
                      autoComplete="off"
                      aria-invalid={readMeters(data.dimensions[field]) === null}
                      className={fieldClass}
                    />
                  </div>
                ))}
              </div>

              {!valid && <p role="alert" className="mt-4 text-[12px] text-red-700">{t.empty}</p>}

              <div className={"mt-8 " + panelClass}>
                <div className="flex items-baseline justify-between gap-4">
                  <span className={fieldTitle}>{t.volume}</span>
                  <span className="text-[22px] font-extralight tabular-nums">
                    {valid ? formatVolume(result.volume) : "—"} <span className="text-[12px] text-muted-foreground">m³</span>
                  </span>
                </div>
                <div className="my-5 h-px bg-border/65" />
                <div>
                  <label htmlFor="lab-level" className={fieldTitle}>{t.level}</label>
                  <select
                    id="lab-level"
                    value={data.level}
                    onChange={(event) => setData((previous) => ({ ...previous, level: Number(event.target.value) as UnoLevel }))}
                    className="mt-2 w-full border-0 border-b border-border bg-transparent py-2 text-[13px] font-light text-foreground outline-none focus:border-primary"
                  >
                    {levels.map((level) => <option key={level} value={level}>{t.levels[level]}</option>)}
                  </select>
                </div>
                <div className="my-5 h-px bg-border/65" />
                <div className="flex items-baseline justify-between gap-4">
                  <span className={fieldTitle}>U.E.R.</span>
                  <output className="text-[29px] font-extralight tabular-nums">{valid ? formatUer(result.energy) : "—"}</output>
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">{t.indexNote}</p>
              </div>

              <button
                type="button"
                disabled={!valid}
                onClick={() => setStep("attention")}
                className="mt-7 flex min-h-12 w-full items-center justify-between bg-primary px-5 text-[12px] tracking-[0.06em] text-primary-foreground transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {t.nextAttention}<ArrowRight size={17} aria-hidden />
              </button>
            </section>
          )}

          {step === "attention" && (
            <section aria-labelledby="lab-attention-title">
              <p className={eyebrow}>{t.attentionKicker}</p>
              <h2 id="lab-attention-title" className="mt-3 text-[24px] font-light leading-snug sm:text-[27px]">{t.attentionTitle}</h2>
              <p className="mt-3 text-[13px] font-light leading-[1.9] text-muted-foreground">{t.attentionLead}</p>

              <div className="mt-7 rounded-sm bg-foreground/[0.025] px-3 pb-3 pt-4 sm:px-7">
                <RoomDiagram length={data.dimensions.length} width={data.dimensions.width} selectedZone={data.zone} />
                <p className="text-center text-[10px] text-muted-foreground">{t.planLabel}</p>
              </div>

              <fieldset className="mt-8">
                <legend className="text-[13px] font-normal">{t.zoneQuestion}</legend>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {zones.map((zone) => (
                    <label key={zone} className={
                      "flex min-h-14 cursor-pointer items-center justify-center border px-2 py-3 text-center text-[12px] leading-snug transition-colors " +
                      (data.zone === zone ? "border-primary bg-primary/[0.055] text-foreground" : "border-border/75 text-muted-foreground hover:border-foreground/35")
                    }>
                      <input
                        type="radio"
                        className="sr-only peer"
                        name="lab-zone"
                        value={zone}
                        checked={data.zone === zone}
                        onChange={() => setData((previous) => ({ ...previous, zone }))}
                      />
                      <span className="peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-primary">
                        {t[zone]}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="mt-9 border-t border-border/65 pt-7">
                <label htmlFor="lab-focus" className="text-[13px] font-normal">{t.focusQuestion}</label>
                <div className="mt-4 flex items-baseline justify-between">
                  <span className="text-[11px] text-muted-foreground">{t.scattered}</span>
                  <output htmlFor="lab-focus" className="text-[23px] font-extralight tabular-nums">{data.focus} / 5</output>
                  <span className="text-[11px] text-muted-foreground">{t.focused}</span>
                </div>
                <input
                  id="lab-focus"
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={data.focus}
                  onChange={(event) => setData((previous) => ({ ...previous, focus: Number(event.target.value) }))}
                  className="mt-5 w-full cursor-pointer accent-primary"
                />
              </div>

              <fieldset className="mt-9 border-t border-border/65 pt-7">
                <legend className="text-[13px] font-normal">{t.signalsQuestion}</legend>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {signals.map((signal) => {
                    const selected = data.signals.includes(signal);
                    return (
                      <button
                        key={signal}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggleSignal(signal)}
                        className={
                          "min-h-11 border px-3 text-[12px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary " +
                          (selected ? "border-primary bg-primary/[0.055] text-foreground" : "border-border/75 text-muted-foreground hover:border-foreground/35")
                        }
                      >
                        {t.signals[signal]}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div className="mt-9 border-t border-border/65 pt-7">
                <label htmlFor="lab-note" className="text-[13px] font-normal">{t.noteLabel}</label>
                <textarea
                  id="lab-note"
                  rows={4}
                  maxLength={1200}
                  value={data.note}
                  onChange={(event) => setData((previous) => ({ ...previous, note: event.target.value }))}
                  placeholder={t.notePlaceholder}
                  className="mt-4 w-full resize-y rounded-sm border border-border/75 bg-transparent p-4 text-[14px] leading-relaxed text-foreground placeholder:text-muted-foreground/65 outline-none focus:border-primary"
                />
                <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">{t.noteHint}</p>
              </div>

              <div className="mt-8 flex items-center gap-3">
                <button type="button" onClick={() => setStep("space")} className="flex min-h-12 items-center gap-2 border border-border px-4 text-[12px] text-muted-foreground hover:text-foreground">
                  <ArrowLeft size={15} aria-hidden />{t.prev}
                </button>
                <button
                  type="button"
                  onClick={() => setStep("compare")}
                  className="flex min-h-12 flex-1 items-center justify-between bg-primary px-5 text-[12px] text-primary-foreground hover:opacity-85"
                >
                  {t.nextCompare}<ArrowRight size={17} aria-hidden />
                </button>
              </div>
            </section>
          )}

          {step === "compare" && (
            <section aria-labelledby="lab-compare-title">
              <p className={eyebrow}>{t.compareKicker}</p>
              <h2 id="lab-compare-title" className="mt-3 text-[24px] font-light leading-snug sm:text-[27px]">{t.compareTitle}</h2>
              <p className="mt-3 text-[13px] font-light leading-[1.9] text-muted-foreground">{t.compareLead}</p>

              <div className="mt-8 max-w-[230px]">
                <label htmlFor="lab-proposed-height" className={fieldTitle}>{t.newHeight}, {t.unit}</label>
                <input
                  id="lab-proposed-height"
                  value={data.dimensions.proposedHeight}
                  onChange={(event) => changeDimension("proposedHeight", event.target.value)}
                  inputMode="decimal"
                  aria-invalid={!proposedValid}
                  className={fieldClass}
                />
              </div>

              <div className="mt-7 grid grid-cols-2 gap-3">
                {[
                  { title: t.original, result: baseline, height: data.dimensions.height },
                  { title: t.proposed, result: proposal, height: data.dimensions.proposedHeight },
                ].map((item) => (
                  <div key={item.title} className={panelClass + " min-w-0"}>
                    <p className={fieldTitle}>{item.title}</p>
                    <p className="mt-4 break-words text-[23px] font-extralight tabular-nums sm:text-[30px]">
                      {item.result.status === "ok" ? formatVolume(item.result.volume) : "—"}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">m³ · {item.height} m</p>
                    <div className="my-4 h-px bg-border/65" />
                    <p className="text-[10px] tracking-[0.08em] text-muted-foreground">U.E.R.</p>
                    <p className="mt-1 text-[18px] font-light tabular-nums">{item.result.status === "ok" ? formatUer(item.result.energy) : "—"}</p>
                  </div>
                ))}
              </div>

              {percent === null ? (
                <p role="alert" className="mt-4 text-[12px] text-red-700">{t.empty}</p>
              ) : (
                <div className="mt-5 border-y border-border/65 py-5">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className={fieldTitle}>{t.difference}</span>
                    <span className="text-[22px] font-extralight tabular-nums">
                      {percent > 0 ? "+" : ""}{numberText(percent, 1)}%
                    </span>
                  </div>
                  {baseline.status === "ok" && proposal.status === "ok" && (
                    <div className="mt-3 flex items-baseline justify-between gap-4">
                      <span className={fieldTitle}>{t.uerChange}</span>
                      <span className="text-[14px] font-light tabular-nums">
                        {numberText(proposal.energy - baseline.energy, 2)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-8 " >
                <p className={eyebrow}>{t.yourObservation}</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className={panelClass}>
                    <p className={fieldTitle}>{t.selectedZone}</p>
                    <p className="mt-3 text-[14px] font-light">{t[data.zone]}</p>
                  </div>
                  <div className={panelClass}>
                    <p className={fieldTitle}>{t.selectedFocus}</p>
                    <p className="mt-3 text-[14px] font-light">{data.focus} / 5</p>
                  </div>
                </div>
                <div className="mt-3 " >
                  <p className={fieldTitle}>{t.notedFactors}</p>
                  <p className="mt-2 text-[13px] font-light leading-relaxed">
                    {data.signals.length ? data.signals.map((item) => t.signals[item]).join(" · ") : t.noFactors}
                  </p>
                  <p className="mt-3 whitespace-pre-wrap break-words text-[13px] font-light leading-[1.9] text-muted-foreground">
                    {data.note.trim() || t.noNote}
                  </p>
                </div>
              </div>

              <div className="mt-8 border-l-2 border-primary/40 bg-foreground/[0.025] px-5 py-6">
                <p className={eyebrow}>{t.hypothesis}</p>
                <p className="mt-3 text-[13px] font-light leading-[1.9]">{t.hypothesisText}</p>
                <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">{t.indexNote}</p>
              </div>

              <div className="mt-8 flex items-center gap-3">
                <button type="button" onClick={() => setStep("attention")} className="flex min-h-12 items-center gap-2 border border-border px-4 text-[12px] text-muted-foreground hover:text-foreground">
                  <ArrowLeft size={15} aria-hidden />{t.prev}
                </button>
                <button
                  type="button"
                  onClick={() => setStep("space")}
                  className="flex min-h-12 flex-1 items-center justify-between bg-primary px-5 text-[12px] text-primary-foreground hover:opacity-85"
                >
                  {t.startAgain}<ArrowRight size={17} aria-hidden />
                </button>
              </div>
            </section>
          )}
        </div>

        <footer className="mt-3 border-t border-border/65 py-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[10px] tracking-[0.1em] text-muted-foreground">{t.footer}</p>
            <p className="text-[10px] tracking-[0.1em] text-muted-foreground">{t.step} 0{stepNumber} / 03</p>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-[350px] text-[11px] leading-relaxed text-muted-foreground">{t.saved}</p>
            <button
              type="button"
              onClick={reset}
              className="inline-flex min-h-11 items-center gap-2 text-[11px] text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground"
            >
              <RotateCcw size={13} aria-hidden />{t.reset}
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default UnoLab;

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { parse, type SemanticObject } from "@/lib/semantic/parser";
import { useLocale } from "@/i18n/useLocale";
import LanguageSwitcher from "@/i18n/LanguageSwitcher";

type Mode = "current" | "manual" | "symbol";

interface Interpretation {
  structure?: string;
  core?: string;
  deep?: string;
  architectural?: string;
  reflection?: string;
  recommendation?: string;
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const SYMBOL_RE = /^\d{1,6}$/;

function currentHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function Semantic() {
  const { t, locale, localePath } = useLocale();
  const S = t.semantic;
  const [mode, setMode] = useState<Mode>("current");
  const [currentTime, setCurrentTime] = useState(currentHHMM());
  const [manualTime, setManualTime] = useState("");
  const [symbol, setSymbol] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [semantic, setSemantic] = useState<SemanticObject | null>(null);
  const [interp, setInterp] = useState<Interpretation | null>(null);

  // Live clock for current-time mode (no auto-interpret).
  useEffect(() => {
    if (mode !== "current") return;
    const id = window.setInterval(() => setCurrentTime(currentHHMM()), 1000 * 15);
    return () => window.clearInterval(id);
  }, [mode]);

  const canSubmit = useMemo(() => {
    if (mode === "current") return TIME_RE.test(currentTime);
    if (mode === "manual") return TIME_RE.test(manualTime);
    return SYMBOL_RE.test(symbol);
  }, [mode, currentTime, manualTime, symbol]);

  async function interpret() {
    setError(null);
    setInterp(null);
    let obj: SemanticObject;
    if (mode === "current") obj = parse(currentTime, "time", currentTime);
    else if (mode === "manual") obj = parse(manualTime, "time", manualTime);
    else obj = parse(symbol, "symbol", symbol);
    setSemantic(obj);
    setLoading(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("semantic-interpret", {
        body: { semantic: obj, language: locale },
      });
      if (fnErr) throw fnErr;
      if (data?.error === "rate_limited") setError(S.err_rate);
      else if (data?.error === "credits_exhausted") setError(S.err_credits);
      else if (data?.error) setError(S.err_generic);
      else setInterp(data?.interpretation ?? null);
    } catch (e) {
      setError(S.err_generic);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0b0c] text-neutral-200 font-light antialiased">
      <LanguageSwitcher background="#0b0b0c" />
      <header className="max-w-3xl mx-auto px-6 pt-10 pb-6 flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-neutral-500">
        <Link to={localePath("/semantic")} className="hover:text-neutral-200 transition-colors">{S.brand}</Link>
        <nav className="flex gap-6">
          <Link to={localePath("/semantic/about")} className="hover:text-neutral-200 transition-colors">{S.nav_about}</Link>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-6 pb-24">
        <section className="pt-12 pb-14 border-b border-neutral-900">
          <h1 className="text-[28px] md:text-[34px] leading-tight tracking-tight text-neutral-100 font-extralight">
            {S.hero_title}
          </h1>
          <p className="mt-4 text-[13px] leading-relaxed text-neutral-500 max-w-xl">
            {S.hero_lead}
          </p>
        </section>

        <section className="pt-10">
          <div className="flex gap-6 text-[11px] uppercase tracking-[0.18em]">
            {(["current", "manual", "symbol"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setInterp(null);
                  setSemantic(null);
                  setError(null);
                }}
                className={`pb-2 border-b transition-colors ${
                  mode === m
                    ? "text-neutral-100 border-neutral-100"
                    : "text-neutral-600 border-transparent hover:text-neutral-300"
                }`}
              >
                {m === "current" ? S.mode_current : m === "manual" ? S.mode_manual : S.mode_symbol}
              </button>
            ))}
          </div>

          <div className="mt-10">
            {mode === "current" && (
              <div className="flex items-baseline gap-6">
                <div className="text-[64px] md:text-[80px] font-extralight tracking-tight tabular-nums text-neutral-100 leading-none">
                  {currentTime}
                </div>
                <button
                  onClick={() => setCurrentTime(currentHHMM())}
                  className="text-[11px] uppercase tracking-[0.18em] text-neutral-500 hover:text-neutral-200 transition-colors"
                >
                  {S.refresh}
                </button>
              </div>
            )}

            {mode === "manual" && (
              <input
                type="text"
                inputMode="numeric"
                placeholder={S.manual_placeholder}
                value={manualTime}
                onChange={(e) => setManualTime(e.target.value)}
                maxLength={5}
                className="w-full bg-transparent border-b border-neutral-800 focus:border-neutral-400 outline-none text-[48px] md:text-[64px] font-extralight tracking-tight tabular-nums text-neutral-100 placeholder:text-neutral-700 pb-2 transition-colors"
              />
            )}

            {mode === "symbol" && (
              <input
                type="text"
                inputMode="numeric"
                placeholder={S.symbol_placeholder}
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                className="w-full bg-transparent border-b border-neutral-800 focus:border-neutral-400 outline-none text-[48px] md:text-[64px] font-extralight tracking-tight tabular-nums text-neutral-100 placeholder:text-neutral-700 pb-2 transition-colors"
              />
            )}
          </div>

          <div className="mt-10 flex items-center gap-6">
            <button
              onClick={interpret}
              disabled={!canSubmit || loading}
              className="text-[11px] uppercase tracking-[0.22em] text-neutral-100 border border-neutral-700 hover:border-neutral-300 px-6 py-3 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {loading ? S.interpreting : S.interpret}
            </button>
            {error && <span className="text-[11px] text-neutral-500">{error}</span>}
          </div>
        </section>

        {semantic && (
          <section className="mt-20 space-y-12 animate-in fade-in duration-700">
            <Block label={S.label_structure}>
              <Decomposition obj={semantic} S={S} />
              {interp?.structure && <p className="mt-4">{interp.structure}</p>}
            </Block>

            {interp?.core && <Block label={S.label_core}><p>{interp.core}</p></Block>}
            {interp?.deep && <Block label={S.label_deep}><p>{interp.deep}</p></Block>}
            {interp?.architectural && <Block label={S.label_architectural}><p>{interp.architectural}</p></Block>}
            {interp?.reflection && (
              <Block label={S.label_reflection}>
                <p className="italic text-neutral-300">{interp.reflection}</p>
              </Block>
            )}
            {interp?.recommendation && <Block label={S.label_recommendation}><p>{interp.recommendation}</p></Block>}

            {loading && !interp && (
              <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">
                {S.generating}
              </p>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.28em] text-neutral-600 mb-3">{label}</div>
      <div className="text-[14px] leading-[1.7] text-neutral-300 max-w-2xl">{children}</div>
    </div>
  );
}

function Decomposition({ obj, S }: { obj: SemanticObject; S: ReturnType<typeof useLocale>["t"]["semantic"] }) {
  const patternLabel = obj.patterns.map((p) => S.patterns[p] ?? p).join(" · ");
  const dominantPrinciple = S.principles[obj.dominant] ?? obj.dominant_principle;
  const dynamicsLabel = S.dynamics[obj.pattern] ?? obj.dynamics;
  const directionLabel = obj.digits
    .split("")
    .map((c) => S.principles_short[c] ?? c)
    .join("_");
  const tensionLabel =
    obj.tension === "low" ? S.tension_low : obj.tension === "high" ? S.tension_high : S.tension_medium;
  return (
    <div className="space-y-2 text-[13px] text-neutral-400 font-mono">
      <Row k={S.row_value} v={obj.value} />
      <Row k={S.row_pattern} v={patternLabel} />
      <Row k={S.row_dominant} v={`${obj.dominant} — ${dominantPrinciple}`} />
      <Row k={S.row_dynamics} v={dynamicsLabel} />
      <Row k={S.row_direction} v={directionLabel} />
      <Row k={S.row_tension} v={tensionLabel} />
      {obj.interaction.length > 0 && <Row k={S.row_interaction} v={obj.interaction.join("  ")} />}
      <div className="pt-3 mt-3 border-t border-neutral-900 text-[11px] text-neutral-600">
        {S.row_principles}:{" "}
        {Array.from(new Set(obj.digits.split(""))).map((d) => `${d}=${S.principles[d] ?? d}`).join("  ·  ")}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-4">
      <span className="w-28 shrink-0 text-neutral-600">{k}</span>
      <span className="text-neutral-300">{v}</span>
    </div>
  );
}
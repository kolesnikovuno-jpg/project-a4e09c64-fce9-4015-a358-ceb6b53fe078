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
  const [showStructural, setShowStructural] = useState(false);

  // Live clock for current-time mode (no auto-interpret).
  useEffect(() => {
    if (mode !== "current") return;
    setCurrentTime(currentHHMM());
    const id = window.setInterval(() => setCurrentTime(currentHHMM()), 1000);
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
    <div className="min-h-screen bg-background text-foreground antialiased">
      <LanguageSwitcher />
      <header className="max-w-3xl mx-auto px-6 pt-10 pb-6 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <Link to={localePath("/semantic")} className="hover:text-foreground transition-colors">{S.brand}</Link>
        <nav className="flex gap-6">
          <Link to={localePath("/semantic/about")} className="hover:text-foreground transition-colors">{S.nav_about}</Link>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-6 pb-24">
        <section className="pt-12 pb-14 border-b border-border">
          <h1 className="text-[24px] md:text-[30px] leading-tight tracking-tight text-foreground font-normal">
            {S.hero_title}
          </h1>
          <p className="mt-4 text-[14px] leading-[1.75] text-foreground/85 max-w-xl">
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
                    ? "text-primary border-primary"
                    : "text-foreground/60 border-transparent hover:text-foreground"
                }`}
              >
                {m === "current" ? S.mode_current : m === "manual" ? S.mode_manual : S.mode_symbol}
              </button>
            ))}
          </div>

          <div className="mt-10">
            {mode === "current" && (
              <div className="text-[56px] md:text-[76px] font-light tracking-tight tabular-nums text-foreground leading-none">
                {currentTime}
              </div>
            )}

            {mode === "manual" && (
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder={S.manual_placeholder}
                value={manualTime}
                onChange={(e) => {
                  const prev = manualTime;
                  const raw = e.target.value;
                  // Detect backspace over the colon: "13:" -> "13" should drop the "3"
                  if (raw.length < prev.length && prev.endsWith(":") && !raw.includes(":")) {
                    setManualTime(raw.slice(0, -1));
                    return;
                  }
                  const digits = raw.replace(/\D/g, "").slice(0, 4);
                  let formatted = digits;
                  if (digits.length >= 3) {
                    formatted = `${digits.slice(0, 2)}:${digits.slice(2)}`;
                  } else if (digits.length === 2 && raw.length > prev.length) {
                    // auto-insert colon as user types the 3rd char-position
                    formatted = `${digits}:`;
                  }
                  // Validate ranges progressively
                  const h = parseInt(digits.slice(0, 2) || "0", 10);
                  const m = parseInt(digits.slice(2, 4) || "0", 10);
                  if (digits.length >= 1 && parseInt(digits[0], 10) > 2) return;
                  if (digits.length >= 2 && h > 23) return;
                  if (digits.length >= 3 && parseInt(digits[2], 10) > 5) return;
                  if (digits.length >= 4 && m > 59) return;
                  setManualTime(formatted);
                }}
                maxLength={5}
                className="w-full bg-transparent border-b border-border focus:border-primary outline-none text-[44px] md:text-[60px] font-light tracking-tight tabular-nums text-foreground placeholder:text-muted-foreground/60 pb-2 transition-colors"
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
                className="w-full bg-transparent border-b border-border focus:border-primary outline-none text-[44px] md:text-[60px] font-light tracking-tight tabular-nums text-foreground placeholder:text-muted-foreground/60 pb-2 transition-colors"
              />
            )}
          </div>

          <div className="mt-10 flex items-center gap-6">
            <button
              onClick={interpret}
              disabled={!canSubmit || loading}
              className="text-[10px] uppercase tracking-[0.22em] text-primary border border-primary/40 hover:border-primary hover:bg-primary/5 px-6 py-3 rounded-none transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {loading ? S.interpreting : S.interpret}
            </button>
            {error && <span className="text-[12px] text-foreground/70">{error}</span>}
          </div>
        </section>

        {semantic && (
          <section className="mt-20 space-y-12 animate-in fade-in duration-700">
            {interp?.core && <Block label={S.label_core}><p>{interp.core}</p></Block>}
            {interp?.deep && <Block label={S.label_deep}><p>{interp.deep}</p></Block>}
            {interp?.architectural && <Block label={S.label_architectural}><p>{interp.architectural}</p></Block>}
            {interp?.reflection && (
              <Block label={S.label_reflection}>
                <p className="italic text-primary/90">{interp.reflection}</p>
              </Block>
            )}
            {interp?.recommendation && <Block label={S.label_recommendation}><p>{interp.recommendation}</p></Block>}

            {loading && !interp && (
              <p className="text-[11px] uppercase tracking-[0.18em] text-foreground/70">
                {S.generating}
              </p>
            )}

            <div className="pt-8 border-t border-border">
              <button
                onClick={() => setShowStructural((v) => !v)}
                className="text-[10px] uppercase tracking-[0.22em] text-foreground/60 hover:text-foreground transition-colors"
              >
                {showStructural ? S.hide_structural : S.show_structural}
              </button>
              {showStructural && (
                <div className="mt-6 animate-in fade-in duration-300">
                  <Decomposition obj={semantic} S={S} />
                  {interp?.structure && (
                    <p className="mt-4 text-[13px] leading-[1.85] text-foreground/85 max-w-2xl">
                      {interp.structure}
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.22em] text-foreground/70 mb-3">{label}</div>
      <div className="text-[14px] leading-[1.85] text-foreground/90 max-w-2xl">{children}</div>
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
    .join(" → ");
  const tensionLabel =
    obj.tension === "low" ? S.tension_low : obj.tension === "high" ? S.tension_high : S.tension_medium;
  return (
    <div className="space-y-2 text-[12px] text-foreground/80 font-mono">
      <Row k={S.row_value} v={obj.value} />
      <Row k={S.row_pattern} v={patternLabel} />
      <Row k={S.row_dominant} v={`${obj.dominant} — ${dominantPrinciple}`} />
      <Row k={S.row_dynamics} v={dynamicsLabel} />
      <Row k={S.row_direction} v={directionLabel} />
      <Row k={S.row_tension} v={tensionLabel} />
      {obj.interaction.length > 0 && (
        <Row k={S.row_interaction} v={obj.interaction.map((s) => s.replace("→", " → ")).join("   ")} />
      )}
      <div className="pt-3 mt-3 border-t border-border text-[11px] text-foreground/70">
        {S.row_principles}:{" "}
        {Array.from(new Set(obj.digits.split(""))).map((d) => `${d}=${S.principles[d] ?? d}`).join("  ·  ")}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-4">
      <span className="w-28 shrink-0 text-foreground/60">{k}</span>
      <span className="text-foreground/90">{v}</span>
    </div>
  );
}
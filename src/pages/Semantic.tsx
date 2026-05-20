import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { parse, type SemanticObject, PRINCIPLES } from "@/lib/semantic/parser";

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
        body: { semantic: obj, language: "en" },
      });
      if (fnErr) throw fnErr;
      if (data?.error === "rate_limited") setError("Rate limit reached — try again in a moment.");
      else if (data?.error === "credits_exhausted") setError("AI credits exhausted.");
      else if (data?.error) setError("Interpretation unavailable.");
      else setInterp(data?.interpretation ?? null);
    } catch (e) {
      setError("Interpretation unavailable.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0b0c] text-neutral-200 font-light antialiased">
      <header className="max-w-3xl mx-auto px-6 pt-10 pb-6 flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-neutral-500">
        <Link to="/semantic" className="hover:text-neutral-200 transition-colors">Semantic Time</Link>
        <nav className="flex gap-6">
          <Link to="/semantic/about" className="hover:text-neutral-200 transition-colors">About</Link>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-6 pb-24">
        <section className="pt-12 pb-14 border-b border-neutral-900">
          <h1 className="text-[28px] md:text-[34px] leading-tight tracking-tight text-neutral-100 font-extralight">
            Semantic Time
          </h1>
          <p className="mt-4 text-[13px] leading-relaxed text-neutral-500 max-w-xl">
            A cognitive interface for structured observation. Numeric patterns become
            semantic triggers — not predictions, not signs. A tool for reflection.
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
                {m === "current" ? "Current" : m === "manual" ? "Manual" : "Symbol"}
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
                  refresh
                </button>
              </div>
            )}

            {mode === "manual" && (
              <input
                type="text"
                inputMode="numeric"
                placeholder="HH:MM"
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
                placeholder="1–6 digits"
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
              {loading ? "Interpreting…" : "Interpret"}
            </button>
            {error && <span className="text-[11px] text-neutral-500">{error}</span>}
          </div>
        </section>

        {semantic && (
          <section className="mt-20 space-y-12 animate-in fade-in duration-700">
            <Block label="Structure">
              <Decomposition obj={semantic} />
              {interp?.structure && <p className="mt-4">{interp.structure}</p>}
            </Block>

            {interp?.core && <Block label="Core"><p>{interp.core}</p></Block>}
            {interp?.deep && <Block label="Deep"><p>{interp.deep}</p></Block>}
            {interp?.architectural && <Block label="Architectural"><p>{interp.architectural}</p></Block>}
            {interp?.reflection && (
              <Block label="Reflection">
                <p className="italic text-neutral-300">{interp.reflection}</p>
              </Block>
            )}
            {interp?.recommendation && <Block label="Recommendation"><p>{interp.recommendation}</p></Block>}

            {loading && !interp && (
              <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">
                generating interpretation…
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

function Decomposition({ obj }: { obj: SemanticObject }) {
  return (
    <div className="space-y-2 text-[13px] text-neutral-400 font-mono">
      <Row k="value" v={obj.value} />
      <Row k="pattern" v={obj.patterns.join(" · ")} />
      <Row k="dominant" v={`${obj.dominant} — ${obj.dominant_principle}`} />
      <Row k="dynamics" v={obj.dynamics} />
      <Row k="direction" v={obj.direction} />
      <Row k="tension" v={obj.tension} />
      {obj.interaction.length > 0 && <Row k="interaction" v={obj.interaction.join("  ")} />}
      <div className="pt-3 mt-3 border-t border-neutral-900 text-[11px] text-neutral-600">
        principles:{" "}
        {Array.from(new Set(obj.digits.split(""))).map((d) => `${d}=${PRINCIPLES[d]}`).join("  ·  ")}
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
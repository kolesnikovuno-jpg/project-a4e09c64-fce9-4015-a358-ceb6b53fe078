import { Link } from "react-router-dom";

export default function SemanticAbout() {
  return (
    <div className="min-h-screen bg-[#0b0b0c] text-neutral-200 font-light antialiased">
      <header className="max-w-3xl mx-auto px-6 pt-10 pb-6 flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-neutral-500">
        <Link to="/semantic" className="hover:text-neutral-200 transition-colors">Semantic Time</Link>
        <nav className="flex gap-6">
          <Link to="/semantic" className="hover:text-neutral-200 transition-colors">Interface</Link>
        </nav>
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-16 pb-24 space-y-10">
        <h1 className="text-[28px] md:text-[34px] tracking-tight text-neutral-100 font-extralight leading-tight">
          About
        </h1>

        <p className="text-[15px] leading-[1.75] text-neutral-300">
          Semantic Time is a cognitive semantic interpretation system for
          reflective observation and structural thinking.
        </p>

        <p className="text-[14px] leading-[1.8] text-neutral-400">
          It treats numeric patterns — times, sequences, repetitions — as
          structural triggers for attention. Each interpretation is a hypothesis
          about process dynamics, not a claim about reality.
        </p>

        <p className="text-[14px] leading-[1.8] text-neutral-400">
          The system does not predict, divine, or instruct. It does not produce
          mystical, esoteric, or fortune-telling output. Its only function is to
          help you observe pattern, structure attention, and frame reflection.
        </p>

        <div className="pt-6 border-t border-neutral-900 space-y-3 text-[13px] text-neutral-500 font-mono">
          <Principle d="0" t="potential / semantic gap" />
          <Principle d="1" t="impulse / initiation" />
          <Principle d="2" t="connection / interaction" />
          <Principle d="3" t="manifestation / expression" />
          <Principle d="4" t="structure / stabilization" />
          <Principle d="5" t="change / movement" />
          <Principle d="6" t="harmonization" />
          <Principle d="7" t="inquiry / depth" />
          <Principle d="8" t="materialization / density" />
          <Principle d="9" t="completion / transition" />
        </div>

        <p className="text-[12px] text-neutral-600 leading-relaxed pt-6">
          These are semantic principles. They are not deterministic meanings.
        </p>
      </main>
    </div>
  );
}

function Principle({ d, t }: { d: string; t: string }) {
  return (
    <div className="flex gap-6">
      <span className="w-6 text-neutral-300">{d}</span>
      <span>{t}</span>
    </div>
  );
}
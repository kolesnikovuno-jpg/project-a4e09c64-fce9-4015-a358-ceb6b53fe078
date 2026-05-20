import { Link } from "react-router-dom";
import { useLocale } from "@/i18n/useLocale";
import LanguageSwitcher from "@/i18n/LanguageSwitcher";

export default function SemanticAbout() {
  const { t, localePath } = useLocale();
  const S = t.semantic;
  return (
    <div className="min-h-screen bg-[#0b0b0c] text-neutral-200 font-light antialiased">
      <LanguageSwitcher background="#0b0b0c" />
      <header className="max-w-3xl mx-auto px-6 pt-10 pb-6 flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-neutral-500">
        <Link to={localePath("/semantic")} className="hover:text-neutral-200 transition-colors">{S.brand}</Link>
        <nav className="flex gap-6">
          <Link to={localePath("/semantic")} className="hover:text-neutral-200 transition-colors">{S.nav_interface}</Link>
        </nav>
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-16 pb-24 space-y-10">
        <h1 className="text-[28px] md:text-[34px] tracking-tight text-neutral-100 font-extralight leading-tight">
          {S.about.title}
        </h1>

        <p className="text-[15px] leading-[1.75] text-neutral-300">
          {S.about.p1}
        </p>

        <p className="text-[14px] leading-[1.8] text-neutral-400">
          {S.about.p2}
        </p>

        <p className="text-[14px] leading-[1.8] text-neutral-400">
          {S.about.p3}
        </p>

        <div className="pt-6 border-t border-neutral-900 space-y-3 text-[13px] text-neutral-500 font-mono">
          {Object.entries(S.principles).map(([d, label]) => (
            <Principle key={d} d={d} t={label} />
          ))}
        </div>

        <p className="text-[12px] text-neutral-600 leading-relaxed pt-6">
          {S.about.footnote}
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
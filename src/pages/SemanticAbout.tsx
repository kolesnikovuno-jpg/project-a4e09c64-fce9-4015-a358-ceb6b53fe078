import { Link } from "react-router-dom";
import { useLocale } from "@/i18n/useLocale";
import LanguageSwitcher from "@/i18n/LanguageSwitcher";

export default function SemanticAbout() {
  const { t, localePath } = useLocale();
  const S = t.semantic;
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <LanguageSwitcher />
      <header className="max-w-3xl mx-auto px-6 pt-10 pb-6 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <Link to={localePath("/semantic")} className="hover:text-foreground transition-colors">{S.brand}</Link>
        <nav className="flex gap-6">
          <Link to={localePath("/semantic")} className="hover:text-foreground transition-colors">{S.nav_interface}</Link>
        </nav>
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-16 pb-24 space-y-10">
        <h1 className="text-[24px] md:text-[30px] tracking-tight text-foreground font-normal leading-tight">
          {S.about.title}
        </h1>

        <div className="text-[14px] leading-[1.85] text-foreground/85 space-y-4">
          {S.about.intro.split("\n\n").map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        <div className="w-12 h-px bg-primary/30" />

        <section className="space-y-5">
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-normal">
            {S.about.modes_title}
          </h2>
          <div className="space-y-4">
            {S.about.modes.map((m) => (
              <div key={m.name} className="space-y-1">
                <p className="text-[13px] font-medium text-foreground/90">{m.name}</p>
                <p className="text-[13px] text-foreground/70">{m.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="w-12 h-px bg-primary/30" />

        <section className="space-y-5">
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-normal">
            {S.about.read_title}
          </h2>
          <div className="text-[13px] leading-[1.85] text-foreground/80 space-y-2">
            {S.about.read.map((line, i) => (
              <p key={i} className={line.startsWith("—") ? "pl-4 text-foreground/70" : ""}>{line}</p>
            ))}
          </div>
        </section>

        <div className="w-12 h-px bg-primary/30" />

        <section className="space-y-5">
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-normal">
            {S.about.principles_title}
          </h2>
          <div className="space-y-3 text-[12px] text-foreground/70 font-mono">
            {Object.entries(S.principles).map(([d, label]) => (
              <Principle key={d} d={d} t={label} />
            ))}
          </div>
        </section>

        <p className="text-[11px] text-muted-foreground leading-relaxed pt-6">
          {S.about.footnote}
        </p>
      </main>
    </div>
  );
}

function Principle({ d, t }: { d: string; t: string }) {
  return (
    <div className="flex gap-6">
      <span className="w-6 text-primary">{d}</span>
      <span className="text-foreground/80">{t}</span>
    </div>
  );
}

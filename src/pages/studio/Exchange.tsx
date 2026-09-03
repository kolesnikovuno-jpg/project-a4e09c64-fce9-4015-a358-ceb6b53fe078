import { Link } from "react-router-dom";
import StudioLayout, { body, h1, label, rule, useStudio } from "@/components/studio/StudioLayout";

const Exchange = () => {
  const { c, localePath } = useStudio();
  const e = c.exchange;

  return (
    <StudioLayout page="/exchange" title={`${c.nav.exchange} — Kolesnikov.studio`}>
      <header className="max-w-[760px]">
        <span className={label}>{e.number}</span>
        <h1 className={`${h1} mt-4`}>{e.title}</h1>
        <div className="mt-10 space-y-2">
          {e.intro.map((l) => (
            <p key={l} className="text-[17px] md:text-[20px] font-light leading-[1.6] text-foreground/85">
              {l}
            </p>
          ))}
        </div>
      </header>

      <section className={`${rule} mt-16 grid gap-12 pt-12 md:grid-cols-12`}>
        <div className="md:col-span-5">
          <span className={label}>{e.youBringLabel}</span>
          <ul className="mt-5 space-y-2">
            {e.youBring.map((x) => (
              <li key={x} className="text-[15px] font-light text-foreground/80">{x}</li>
            ))}
          </ul>
        </div>
        <div className="hidden md:flex md:col-span-2 items-center justify-center text-foreground/30 text-[22px] font-light">⇄</div>
        <div className="md:col-span-5">
          <span className={label}>{e.iBringLabel}</span>
          <ul className="mt-5 space-y-2">
            {e.iBring.map((x) => (
              <li key={x} className="text-[15px] font-light text-foreground/80">{x}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className={`${rule} mt-16 pt-12`}>
        <span className={label}>{e.modelsLabel}</span>
        <ol className="mt-6">
          {e.models.map((m, i) => (
            <li key={m.key} className="grid gap-2 border-t border-foreground/10 py-7 md:grid-cols-12 md:gap-8">
              <span className={`${label} md:col-span-1`}>{String(i + 1).padStart(2, "0")}</span>
              <h2 className="text-[14px] tracking-[0.2em] font-light text-foreground md:col-span-3">{m.title}</h2>
              <p className={`${body} md:col-span-8`}>{m.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={`${rule} mt-12 pt-12 grid gap-10 md:grid-cols-12`}>
        <p className={`${body} md:col-span-6 text-foreground/85`}>{e.statement}</p>
        <div className="md:col-span-6">
          <span className={label}>{e.diagramLabel}</span>
          <ol className="mt-5 flex flex-wrap items-center gap-3">
            {e.diagram.map((d, i) => (
              <li key={d} className="flex items-center gap-3">
                <span className="text-[12px] tracking-[0.2em] font-light text-foreground/80">{d}</span>
                {i < e.diagram.length - 1 && <span className="text-foreground/30">→</span>}
              </li>
            ))}
          </ol>
          <p className="mt-5 text-[13px] font-light leading-[1.7] text-foreground/50">{e.note}</p>
        </div>
      </section>

      <div className="mt-16">
        <Link
          to={localePath("/start")}
          className="inline-block border border-foreground/40 px-7 py-3 text-[12px] tracking-[0.18em] uppercase font-light text-foreground hover:bg-foreground hover:text-background transition-colors"
        >
          {c.home.ctaPrimary}
        </Link>
      </div>
    </StudioLayout>
  );
};

export default Exchange;

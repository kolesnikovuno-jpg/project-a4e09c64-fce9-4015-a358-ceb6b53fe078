import StudioLayout, { body, h1, label, rule, useStudio } from "@/components/studio/StudioLayout";

const Method = () => {
  const { c } = useStudio();
  const m = c.method;

  return (
    <StudioLayout page="/method" title={`${c.nav.method} — Kolesnikov.studio`}>
      <header className="max-w-[760px]">
        <span className={label}>{m.number}</span>
        <h1 className={`${h1} mt-4`}>{m.title}</h1>
        <div className="mt-10 space-y-2">
          {m.intro.map((l) => (
            <p key={l} className="text-[17px] md:text-[20px] font-light leading-[1.6] text-foreground/85">
              {l}
            </p>
          ))}
        </div>
      </header>

      <ol className={`${rule} mt-16`}>
        {m.steps.map((s, i) => (
          <li key={s.key} className="grid gap-3 border-b border-foreground/10 py-8 md:grid-cols-12 md:gap-8">
            <span className={`${label} md:col-span-1`}>{String(i + 1).padStart(2, "0")}</span>
            <h2 className="text-[14px] tracking-[0.2em] font-light text-foreground md:col-span-3">{s.title}</h2>
            <p className={`${body} md:col-span-7`}>{s.body}</p>
          </li>
        ))}
      </ol>

      <div className="mt-16 max-w-[640px] space-y-1">
        {m.closing.map((l) => (
          <p key={l} className="text-[17px] md:text-[20px] font-light leading-[1.6] text-foreground/85">
            {l}
          </p>
        ))}
      </div>
    </StudioLayout>
  );
};

export default Method;

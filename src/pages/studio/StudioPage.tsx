import StudioLayout, { body, h1, label, rule, useStudio } from "@/components/studio/StudioLayout";
import { contact } from "@/content/studio";

const StudioPage = () => {
  const { c } = useStudio();
  const s = c.studio;

  return (
    <StudioLayout page="/studio" title={`${c.nav.studio} — Kolesnikov.studio`} description={s.positioning}>
      <header className="max-w-[760px]">
        <span className={label}>{s.number}</span>
        <h1 className={`${h1} mt-4`}>{s.title}</h1>
        <p className="mt-10 text-[17px] md:text-[20px] font-light leading-[1.6] text-foreground/85">{s.positioning}</p>
        <p className="mt-4 text-[12px] tracking-[0.16em] font-light text-foreground/45">{s.role}</p>
      </header>

      <section className={`${rule} mt-16 pt-12`}>
        <span className={label}>{s.disciplinesLabel}</span>
        <ul className="mt-6 grid gap-x-10 md:grid-cols-2">
          {s.disciplines.map((d) => (
            <li key={d.key} className="border-t border-foreground/10 py-6">
              <h2 className="text-[13px] tracking-[0.2em] font-light text-foreground">{d.key}</h2>
              <p className={`${body} mt-2`}>{d.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className={`${rule} mt-12 pt-12 grid gap-10 md:grid-cols-12`}>
        <p className="md:col-span-8 text-[17px] md:text-[20px] font-light leading-[1.6] text-foreground/85">{s.statement}</p>
        <div className="md:col-span-4">
          <span className={label}>{s.contactLabel}</span>
          <div className="mt-4 flex flex-col gap-2">
            <a href={`mailto:${contact.email}`} className="text-[14px] font-light text-foreground/75 hover:text-foreground transition-colors">
              {contact.email}
            </a>
            <a href={contact.telegram} target="_blank" rel="noreferrer" className="text-[14px] font-light text-foreground/75 hover:text-foreground transition-colors">
              t.me/kolesnikov_uno
            </a>
          </div>
        </div>
      </section>
    </StudioLayout>
  );
};

export default StudioPage;

import { Link } from "react-router-dom";
import StudioLayout, { body, h1, label, rule, useStudio } from "@/components/studio/StudioLayout";
import type { CaseItem } from "@/content/studio";
import lyraHero from "@/assets/lyra-hero.png";
import navaHero from "@/assets/nava-hero.png";
import voidHero from "@/assets/void-hero.png";

const IMAGES = { lyra: lyraHero, nava: navaHero, void: voidHero } as const;

const Layer = ({ name, value, pending }: { name: string; value: string | null; pending: string }) => (
  <div className="grid gap-1 py-4 border-t border-foreground/10 md:grid-cols-12 md:gap-8">
    <span className={`${label} md:col-span-3`}>{name}</span>
    <p className={`${body} md:col-span-9 ${value ? "" : "italic text-foreground/35"}`}>{value ?? pending}</p>
  </div>
);

const CaseBlock = ({ item }: { item: CaseItem }) => {
  const { c, localePath } = useStudio();
  const L = c.cases.labels;
  const img = item.image ? IMAGES[item.image] : null;

  return (
    <article id={item.id} className="scroll-mt-32 py-14 border-b border-foreground/10">
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
        <span className={label}>{item.code}</span>
        <span className={label}>{item.category}</span>
        <span className={label}>{item.stage}</span>
      </div>
      <div className="mt-5 grid gap-10 md:grid-cols-12">
        <div className="md:col-span-7">
          <h2 className="text-[26px] md:text-[34px] font-light tracking-[0.02em] text-foreground">{item.title}</h2>
          <p className="mt-5 text-[17px] md:text-[20px] font-light leading-[1.55] text-foreground/85">{item.question}</p>
          <div className="mt-8">
            <Layer name={L.observed} value={item.observed} pending={L.pending} />
            <Layer name={L.tension} value={item.tension} pending={L.pending} />
            <Layer name={L.opportunity} value={item.opportunity} pending={L.pending} />
            <Layer name={L.created} value={item.created} pending={L.pending} />
            <Layer name={L.next} value={item.next} pending={L.open} />
          </div>
          {item.href && (
            <Link
              to={localePath(item.href)}
              className="mt-6 inline-block text-[12px] tracking-[0.18em] uppercase font-light text-foreground/55 hover:text-foreground transition-colors"
            >
              {item.title} →
            </Link>
          )}
        </div>
        {img && (
          <div className="md:col-span-5">
            <img src={img} alt={item.title} loading="lazy" className="w-full object-contain opacity-90" />
          </div>
        )}
      </div>
    </article>
  );
};

const Cases = () => {
  const { c } = useStudio();
  const k = c.cases;

  return (
    <StudioLayout page="/cases" title={`${c.nav.cases} — Kolesnikov.studio`} description={k.intro}>
      <header className="max-w-[760px]">
        <span className={label}>{k.number}</span>
        <h1 className={`${h1} mt-4`}>{k.title}</h1>
        <p className={`${body} mt-8`}>{k.intro}</p>
      </header>

      <nav className={`${rule} mt-14 flex flex-wrap gap-x-8 gap-y-2 pt-5`} aria-label="Cases">
        {k.items.map((it) => (
          <a key={it.id} href={`#${it.id}`} className="text-[12px] tracking-[0.18em] font-light text-foreground/50 hover:text-foreground transition-colors">
            {it.code} {it.title}
          </a>
        ))}
      </nav>

      <div className="mt-4">
        {k.items.map((it) => (
          <CaseBlock key={it.id} item={it} />
        ))}
      </div>
    </StudioLayout>
  );
};

export default Cases;

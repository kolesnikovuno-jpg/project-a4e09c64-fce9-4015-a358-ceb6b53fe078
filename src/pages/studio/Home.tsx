import { Link } from "react-router-dom";
import { motion } from "motion/react";
import StudioLayout, { body, h1, label, rule, useStudio } from "@/components/studio/StudioLayout";
import heroField from "@/assets/hero-field-v2.jpg";

const fade = (d = 0) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay: d, ease: [0.22, 0.61, 0.36, 1] as const },
});

const Home = () => {
  const { c, localePath } = useStudio();
  const h = c.home;

  return (
    <StudioLayout page="">
      <img
        src={heroField}
        alt=""
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 h-full w-full object-cover opacity-[0.16] md:opacity-[0.2]"
      />

      <section className="min-h-[calc(100dvh-14rem)] flex flex-col justify-center">
        <motion.div {...fade(0)} className="flex items-baseline gap-4">
          <span className={label}>{h.number}</span>
          <span className={label}>{h.label}</span>
        </motion.div>
        <motion.p {...fade(0.1)} className="mt-3 text-[12px] tracking-[0.16em] font-light text-foreground/45">
          {h.role}
        </motion.p>
        <motion.h1 {...fade(0.2)} className={`${h1} mt-10 max-w-[820px]`}>
          {h.statement}
        </motion.h1>
        <motion.p {...fade(0.35)} className={`${body} mt-8 max-w-[600px]`}>
          {h.secondary}
        </motion.p>
        <motion.div {...fade(0.5)} className="mt-12 flex flex-wrap items-center gap-6">
          <Link
            to={localePath("/start")}
            className="border border-foreground/40 px-7 py-3 text-[12px] tracking-[0.18em] uppercase font-light text-foreground hover:border-foreground hover:bg-foreground hover:text-background transition-colors"
          >
            {h.ctaPrimary}
          </Link>
          <Link
            to={localePath("/cases")}
            className="text-[12px] tracking-[0.18em] uppercase font-light text-foreground/55 hover:text-foreground transition-colors"
          >
            {h.ctaSecondary} →
          </Link>
        </motion.div>
      </section>

      <section className={`${rule} mt-10 pt-14 grid gap-10 md:grid-cols-12`}>
        <div className="md:col-span-5">
          {h.conceptLines.map((l) => (
            <p key={l} className="text-[18px] md:text-[22px] font-light leading-[1.5] text-foreground">
              {l}
            </p>
          ))}
        </div>
        <div className="md:col-span-7">
          <span className={label}>{h.chainLabel}</span>
          <ol className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-3">
            {h.chain.map((step, i) => (
              <li key={step} className="flex items-center gap-3">
                <span className="text-[12px] md:text-[13px] tracking-[0.2em] font-light text-foreground/80">{step}</span>
                {i < h.chain.length - 1 && <span className="text-foreground/30">→</span>}
              </li>
            ))}
          </ol>
        </div>
      </section>
    </StudioLayout>
  );
};

export default Home;

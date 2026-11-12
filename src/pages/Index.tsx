import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { useLocale } from "@/i18n/useLocale";
import heroField from "@/assets/hero-field-v2.jpg";

const methodLines = {
  ru: "Исследую → Анализирую → Создаю эффективные решения",
  uk: "Досліджую → Аналізую → Створюю ефективні рішення",
  en: "Research → Analysis → Effective solutions",
};

export default function Index() {
  const { t, locale, localePath } = useLocale();
  const methodLine = methodLines[locale];
  const [typedCount, setTypedCount] = useState(0);

  useEffect(() => {
    const chars = Array.from(methodLine);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTypedCount(chars.length);
      return;
    }
    setTypedCount(0);
    let interval: number | undefined;
    const delay = window.setTimeout(() => {
      let count = 0;
      interval = window.setInterval(() => {
        count += 1;
        setTypedCount(count);
        if (count >= chars.length) window.clearInterval(interval);
      }, 58);
    }, 900);
    return () => {
      window.clearTimeout(delay);
      if (interval !== undefined) window.clearInterval(interval);
    };
  }, [methodLine]);

  return (
    <main className="relative min-h-screen min-h-[100dvh] flex items-center justify-center overflow-hidden bg-background">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-20"
        style={{ backgroundImage: `url(${heroField})`, backgroundSize: "cover", backgroundPosition: "center", filter: "saturate(.7)" }} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-background/35" />
      <div className="relative z-10 w-full max-w-3xl px-6 py-16 flex flex-col items-center gap-9 text-center">
        <motion.div className="flex flex-col items-center gap-6" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.3 }}>
          <h1 className="text-[11px] md:text-[12px] tracking-[.22em] font-extralight text-foreground/50">{t.index.hero_title}</h1>
          <p className="font-body text-[20px] md:text-[29px] leading-[1.55] text-foreground/90 max-w-xl">{t.index.hero_subtitle}</p>
          <p className="text-[13px] md:text-[15px] leading-[1.9] font-light text-foreground/80">
            {t.index.hero_support.map((line, i) => <span key={i} className="block">{line}</span>)}
          </p>
          <p className="min-h-[3.5em] md:min-h-[2em] text-[12px] md:text-[14px] leading-[1.8] tracking-[.04em] text-primary/90" aria-label={methodLine}>
            <span aria-hidden="true">{Array.from(methodLine).slice(0, typedCount).join("")}</span>
            {typedCount < Array.from(methodLine).length && <span aria-hidden="true" className="inline-block ml-1 h-[1em] w-px bg-primary/70 align-middle" />}
          </p>
        </motion.div>
        <Link to={localePath("/egg")} className="inline-flex items-center justify-center min-w-[160px] border border-primary/50 rounded-xl px-8 py-3 text-[13px] tracking-[.16em] text-primary hover:bg-primary/10 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" aria-label="EGG">EGG</Link>
      </div>
    </main>
  );
}

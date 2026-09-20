import { useCallback, useRef } from "react";
import SEO from "@/components/SEO";
import LanguageSwitcher from "@/i18n/LanguageSwitcher";
import { LOCALES } from "@/i18n/config";
import { useLocale } from "@/i18n/useLocale";
import { getSiteContent } from "@/content/site";
import "./Landing.css";

const landingCopy = {
  en: {
    sequence: ["\n", "sparse   :    form   :   meaning", "\n"],
    disciplines: ["\n", "architect   :   design   :   art", "\n"],
  },
  ru: {
    sequence: ["\n", "пространство : форма : смысл", "\n"],
    disciplines: ["\n", "архитектура : дизайн : искусство", "\n"],
  },
  uk: {
    sequence: ["\n", "простір : форма : сенс", "\n"],
    disciplines: ["\n", "архітектура : дизайн : мистецтво", "\n"],
  },
} as const;

const Landing = () => {
  const { locale } = useLocale();
  const page = getSiteContent(locale);
  const copy = landingCopy[locale];
  const fieldRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();

  const setPointerPosition = useCallback((x: number, y: number) => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    animationFrameRef.current = requestAnimationFrame(() => {
      fieldRef.current?.style.setProperty("--landing-pointer-x", x.toFixed(2));
      fieldRef.current?.style.setProperty("--landing-pointer-y", y.toFixed(2));
    });
  }, []);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const x = (event.clientX / window.innerWidth - 0.5) * 2;
      const y = (event.clientY / window.innerHeight - 0.5) * 2;
      setPointerPosition(x, y);
    },
    [setPointerPosition],
  );

  const alternates = LOCALES.reduce<Record<string, string>>((acc, item) => {
    acc[item] = `/${item}`;
    return acc;
  }, {});

  return (
    <div
      ref={fieldRef}
      className="landing-field font-[Manrope,system-ui,sans-serif] antialiased"
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setPointerPosition(0, 0)}
    >
      <SEO
        title={page.meta.title}
        description={page.meta.description}
        image="/og-semantic-time-v3.jpg"
        alternates={alternates}
      />
      <LanguageSwitcher background="hsl(24 26% 94%)" topOffset={0} />

      <main className="landing-composition">
        <p className="landing-axis landing-axis--upper">
          {copy.sequence.map((word) => (
            <span key={word}>{word}</span>
          ))}
        </p>

        <h1 className="landing-wordmark">
          kolesnikov.studio
        </h1>

        <p className="landing-axis landing-axis--lower">
          {copy.disciplines.map((word) => (
            <span key={word}>{word}</span>
          ))}
        </p>
      </main>
    </div>
  );
};

export default Landing;
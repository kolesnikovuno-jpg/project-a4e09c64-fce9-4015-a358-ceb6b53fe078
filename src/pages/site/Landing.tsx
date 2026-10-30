import { useCallback, useRef } from "react";
import SEO from "@/components/SEO";
import LanguageSwitcher from "@/i18n/LanguageSwitcher";
import { LOCALES } from "@/i18n/config";
import { useLocale } from "@/i18n/useLocale";
import { getSiteContent } from "@/content/site";
import "./Landing.css";

const landingCopy = {
  en: {
    sequence: ["sparse", ":", "form", ":", "meaning"],
    disciplines: ["architect", ":", "design", ":", "art"],
    lab: "Architectural Object Lab ↗",
    positioning: "I help shape spaces around the way you live. I work with the context and the conditions of the place, developing a practical solution from the first idea through to realization.",
  },
  ru: {
    sequence: ["пространство", ":", "форма", ":", "смысл"],
    disciplines: ["архитектура", ":", "дизайн", ":", "искусство"],
    lab: "Архитектурная лаборатория ↗",
    positioning: "Я помогаю настроить пространство так, чтобы оно поддерживало твой ритм жизни. Работаю с контекстом, параметрами места и довожу решение до рабочей формы: от идеи до реализации",
  },
  uk: {
    sequence: ["простір", ":", "форма", ":", "сенс"],
    disciplines: ["архітектура", ":", "дизайн", ":", "мистецтво"],
    lab: "Архітектурна лабораторія ↗",
    positioning: "Я допомагаю налаштувати простір так, щоб він відповідав твоєму ритму життя. Враховую контекст і особливості місця та доводжу рішення до втілення: від задуму до реалізації.",
  },
} as const;

const Landing = () => {
  const { locale, localePath } = useLocale();
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
      className="landing-field font-body antialiased"
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
        <div className="landing-identity">
        <p className="landing-axis landing-axis--upper">
          {splitAxis(copy.sequence).map((part, index) => (
            <span
              key={index}
              className={part === ":" ? "landing-axis__sep" : "landing-axis__word"}
              aria-hidden={part === ":" ? true : undefined}
            >
              {part}
            </span>
          ))}
        </p>

        <h1 className="landing-wordmark">
          kolesnikov.studio
        </h1>

        <p className="landing-axis landing-axis--lower">
          {splitAxis(copy.disciplines).map((part, index) => (
            <span
              key={index}
              className={part === ":" ? "landing-axis__sep" : "landing-axis__word"}
              aria-hidden={part === ":" ? true : undefined}
            >
              {part}
            </span>
          ))}
        </p>
        </div>

        <div className="landing-introduction">
          <p className="landing-positioning">{copy.positioning}</p>
        <a className="landing-lab" href="https://architectural-object-lab.lovable.app">
          {copy.lab}
        </a>
        </div>
      </main>
    </div>
  );
};

/** Splits a row phrase into meaningful words and ":" separators. */
const splitAxis = (parts: readonly string[]) =>
  parts
    .join(" ")
    .replace(/\u00a0/g, " ")
    .split(":")
    .map((word) => word.trim())
    .filter(Boolean)
    .flatMap((word, index) => (index === 0 ? [word] : [":", word]));

export default Landing;
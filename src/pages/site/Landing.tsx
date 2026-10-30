import { useCallback, useLayoutEffect, useRef } from "react";
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
  const upperAxisRef = useRef<HTMLParagraphElement>(null);
  const lowerAxisRef = useRef<HTMLParagraphElement>(null);

  // A shared visual width is not sufficient when long Cyrillic words overflow.
  // Fit both axes together, preserving equal typography and exact edge anchors.
  useLayoutEffect(() => {
    let frame = 0;
    let mounted = true;

    const fitAxes = () => {
      const upper = upperAxisRef.current;
      const lower = lowerAxisRef.current;
      if (!upper || !lower) return;
      const axes = [upper, lower];

      // Read the natural responsive CSS size before measuring.
      axes.forEach((axis) => axis.style.removeProperty("font-size"));
      const baseSize = parseFloat(getComputedStyle(upper).fontSize);
      const availableWidth = Math.min(...axes.map((axis) => axis.clientWidth));
      const widestContent = Math.max(
        ...axes.map((axis) =>
          Array.from(axis.children).reduce(
            (width, child) => width + child.getBoundingClientRect().width,
            0,
          ),
        ),
      );

      if (!baseSize || !availableWidth || !widestContent) return;
      const scale = Math.min(1, (availableWidth - 2) / widestContent);
      const fittedSize = `${(baseSize * scale).toFixed(3)}px`;
      axes.forEach((axis) => { axis.style.fontSize = fittedSize; });
    };

    const scheduleFit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fitAxes);
    };

    scheduleFit();
    const observer = new ResizeObserver(scheduleFit);
    if (fieldRef.current) observer.observe(fieldRef.current);
    document.fonts?.ready.then(() => { if (mounted) scheduleFit(); });

    return () => {
      mounted = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [locale]);

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
        <p ref={upperAxisRef} className="landing-axis landing-axis--upper">
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

        <p ref={lowerAxisRef} className="landing-axis landing-axis--lower">
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
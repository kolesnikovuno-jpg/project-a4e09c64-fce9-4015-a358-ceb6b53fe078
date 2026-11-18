import { useCallback, useEffect, useRef, useState } from "react";
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
    method: "Research → Analysis → Effective solutions",
    positioning: "I help shape spaces around the way you live. I work with the context and the conditions of the place, developing a practical solution from the first idea through to realization.",
  },
  ru: {
    sequence: ["пространство", ":", "форма", ":", "смысл"],
    disciplines: ["архитектура", ":", "дизайн", ":", "искусство"],
    method: "Исследую → Анализирую → Создаю эффективные решения",
    positioning: "Я помогаю настроить пространство так, чтобы оно поддерживало твой ритм жизни. Работаю с контекстом, параметрами места и довожу решение до рабочей формы: от идеи до реализации",
  },
  uk: {
    sequence: ["простір", ":", "форма", ":", "сенс"],
    disciplines: ["архітектура", ":", "дизайн", ":", "мистецтво"],
    method: "Досліджую → Аналізую → Створюю ефективні рішення",
    positioning: "Я допомагаю налаштувати простір так, щоб він відповідав твоєму ритму життя. Враховую контекст і особливості місця та доводжу рішення до втілення: від задуму до реалізації.",
  },
} as const;

const Landing = () => {
  const { locale } = useLocale();
  const page = getSiteContent(locale);
  const copy = landingCopy[locale];
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

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
        <p className="landing-toprail" aria-label={[...copy.sequence, ...copy.disciplines].filter(word => word !== ":").join(" · ")}>
          {Array.from([...copy.sequence, ...copy.disciplines].filter(word => word !== ":").join("")).map((letter, index) => (
            <span key={index} className="landing-toprail__letter" aria-hidden="true">{letter}</span>
          ))}
        </p>

        <h1 className="landing-wordmark">kolesnikov.design</h1>
        </div>

        <div className="landing-interaction">
          <button
            type="button"
            className="landing-orb"
            aria-label={menuOpen ? (locale === "en" ? "Close details" : locale === "uk" ? "Закрити" : "Закрыть") : (locale === "en" ? "Open details" : locale === "uk" ? "Відкрити" : "Открыть")}
            aria-expanded={menuOpen}
            aria-controls="landing-detail-panel"
            onClick={() => setMenuOpen((open) => !open)}
          />
          {menuOpen && (
            <div className="landing-popup" id="landing-detail-panel">
              <div className="landing-popup__stages">
                {(locale === "en"
                  ? ["idea formation", "concept creation", "projection development", "rights transfer", "conformity control"]
                  : locale === "uk"
                    ? ["формування ідеї", "створення концепції", "розробка проєкції", "передача прав", "контроль відповідності"]
                    : ["формирование идеи", "создание концепции", "разработка проекции", "передача прав", "контроль соответствия"]
                ).map((step) => <p key={step}>{step}</p>)}
              </div>
              <nav className="landing-popup__projects" aria-label="Projects">
                <a href={`/${locale}/egg`}>EGG ↗</a>
                <a href={`/${locale}/lyra-request`}>LYRA ↗</a>
              </nav>
            </div>
          )}
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
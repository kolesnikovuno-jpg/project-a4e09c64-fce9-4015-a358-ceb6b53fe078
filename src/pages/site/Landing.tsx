import { useAmbient } from "@/lib/useAmbient";
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
  const topRailRows = [copy.sequence, copy.disciplines].map((row) => row.filter((word) => word !== ":"));
  const topRailLabel = topRailRows.flat().join(" · ");
  const panelLabel = locale === "en" ? "Process and projects" : locale === "uk" ? "Процес і проєкти" : "Процесс и проекты";
  const mobileMenuToggle = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { mode, cycle, night, palette, background } = useAmbient();
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      const toggle = mobileMenuToggle.current;
      if (toggle?.getClientRects().length && document.getElementById("landing-detail-panel")?.contains(document.activeElement)) {
        toggle.focus();
      }
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

  const handleScreenClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (target instanceof Element && target.closest("a, button, input, select, textarea, [role='button'], [role='link']")) return;
    setMenuOpen((open) => !open);
  };

  const alternates = LOCALES.reduce<Record<string, string>>((acc, item) => {
    acc[item] = `/${item}`;
    return acc;
  }, {});

  return (
    <div
      ref={fieldRef}
      className="landing-field font-body antialiased"
      data-theme={night ? "night" : "day"}
      style={palette}
      onClick={handleScreenClick}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setPointerPosition(0, 0)}
    >
      <SEO
        title={page.meta.title}
        description={page.meta.description}
        image="/og-semantic-time-v3.jpg"
        alternates={alternates}
      />
      <div className="landing-language">
        <LanguageSwitcher background={background} topOffset={0} />
      </div>
      <button type="button" className="landing-theme-toggle"
        aria-label={locale === "ru" ? "Сменить световую среду" : locale === "uk" ? "Змінити світлове середовище" : "Change ambient lighting"} onClick={cycle}>
        <span className="is-active">{mode}</span>
      </button>

      <main className="landing-composition">
        <div className="landing-identity">
        <p className="landing-toprail landing-toprail--desktop" aria-label={topRailLabel}>
          {Array.from(topRailRows.flat().join("")).map((letter, index) => (
            <span key={index} className="landing-toprail__letter" aria-hidden="true">{letter}</span>
          ))}
        </p>
        <p className="landing-toprail landing-toprail--mobile">
          <span className="sr-only">{topRailLabel}</span>
          {topRailRows.map((row) => (
            <span key={row[0]} className="landing-toprail__row" aria-hidden="true">
              {Array.from(row.join("")).map((letter, index) => (
                <span key={index} className="landing-toprail__letter">{letter}</span>
              ))}
            </span>
          ))}
        </p>

        <h1 className="landing-wordmark">kolesnikov.studio</h1>
        </div>

        <button
          ref={mobileMenuToggle}
          type="button"
          className="landing-mobile-menu-toggle"
          aria-controls="landing-detail-panel"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {panelLabel}
        </button>
        <div className="landing-interaction">
          <div className={`landing-popup ${menuOpen ? "landing-popup--open" : ""}`} id="landing-detail-panel" aria-hidden={!menuOpen} role="region" aria-label={panelLabel}>
              <div className="landing-popup__stages">
                {(locale === "en"
                  ? ["idea formation", "concept creation", "projection development", "rights transfer", "conformity control"]
                  : locale === "uk"
                    ? ["формування ідеї", "створення концепції", "розробка проєкції", "передача прав", "контроль відповідності"]
                    : ["формирование идеи", "создание концепции", "разработка проекции", "передача прав", "контроль соответствия"]
                ).map((step, lineIndex) => (
                  <p key={step} aria-label={step}>
                    {Array.from(step).map((letter, index) => (
                      <span
                        key={index}
                        className="landing-popup__glyph"
                        aria-hidden="true"
                        style={{ animationDelay: `${lineIndex * 0.64 + index * 0.028}s` }}
                      >{letter === " " ? "\u00a0" : letter}</span>
                    ))}
                  </p>
                ))}
              </div>
              <nav className="landing-popup__projects" aria-label="Projects">
                <a tabIndex={menuOpen ? 0 : -1} href={`/${locale}/egg`} style={{ animationDelay: "3.3s" }}>EGG ↗</a>
                <a tabIndex={menuOpen ? 0 : -1} href={`https://lyra.kolesnikov.studio/${locale}`} style={{ animationDelay: "3.55s" }}>LYRA ↗</a>
                <a tabIndex={menuOpen ? 0 : -1} href={`https://nava.kolesnikov.studio/${locale}`} style={{ animationDelay: "3.8s" }}>NAVA ↗</a>
                <a tabIndex={menuOpen ? 0 : -1} href={`https://color.kolesnikov.studio/${locale}/color`} style={{ animationDelay: "4.05s" }}>COLOR ↗</a>
              </nav>
            </div>
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
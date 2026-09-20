import SEO from "@/components/SEO";
import LanguageSwitcher from "@/i18n/LanguageSwitcher";
import { LOCALES } from "@/i18n/config";
import { useLocale } from "@/i18n/useLocale";
import { getSiteContent } from "@/content/site";

const landingCopy = {
  en: {
    sequence: ["space", "form", "meaning"],
    disciplines: ["architecture", "design", "art"],
  },
  ru: {
    sequence: ["пространство", "форма", "смысл"],
    disciplines: ["архитектура", "дизайн", "искусство"],
  },
  uk: {
    sequence: ["простір", "форма", "сенс"],
    disciplines: ["архітектура", "дизайн", "мистецтво"],
  },
} as const;

const Landing = () => {
  const { locale } = useLocale();
  const page = getSiteContent(locale);
  const copy = landingCopy[locale];

  const alternates = LOCALES.reduce<Record<string, string>>((acc, item) => {
    acc[item] = `/${item}`;
    return acc;
  }, {});

  return (
    <div className="min-h-[100dvh] overflow-hidden bg-background text-foreground font-[Manrope,system-ui,sans-serif] antialiased">
      <SEO
        title={page.meta.title}
        description={page.meta.description}
        image="/og-semantic-time-v3.jpg"
        alternates={alternates}
      />
      <LanguageSwitcher background="hsl(24 26% 94%)" topOffset={0} />

      <main className="relative mx-auto min-h-[100dvh] w-full max-w-[1440px] px-7 sm:px-12 md:px-20 lg:px-28">
        <p className="absolute left-7 right-7 top-[25%] flex -translate-y-1/2 items-baseline justify-between text-[17px] font-extralight leading-none sm:left-12 sm:right-12 sm:text-[23px] md:left-20 md:right-20 md:text-[30px] lg:left-28 lg:right-28 lg:text-[36px]">
          {copy.sequence.map((word) => (
            <span key={word}>{word}</span>
          ))}
        </p>

        <h1 className="absolute inset-x-7 top-[47%] -translate-y-1/2 text-center text-[30px] font-extralight leading-none sm:inset-x-12 sm:text-[42px] md:text-[52px] lg:text-[58px]">
          kolesnikov.studio
        </h1>

        <p className="absolute left-7 right-7 top-[69%] flex -translate-y-1/2 items-baseline justify-between text-[17px] font-extralight leading-none sm:left-12 sm:right-12 sm:text-[23px] md:left-20 md:right-20 md:text-[30px] lg:left-28 lg:right-28 lg:text-[36px]">
          {copy.disciplines.map((word) => (
            <span key={word}>{word}</span>
          ))}
        </p>
      </main>
    </div>
  );
};

export default Landing;
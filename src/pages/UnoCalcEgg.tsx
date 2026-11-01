import { Link } from "react-router-dom";
import LanguageSwitcher from "@/i18n/LanguageSwitcher";
import { useLocale } from "@/i18n/useLocale";
import UnoEggScene from "@/components/unocalc/UnoEggScene";

const copy = {
  ru: { about: "Принцип UNOcalc" },
  uk: { about: "Принцип UNOcalc" },
  en: { about: "The principle" },
};

const UnoCalcEgg = () => {
  const { locale, localePath } = useLocale();
  return (
    <div
      className="min-h-screen bg-background font-body text-foreground"
      style={{
        paddingTop: "max(2.25rem, env(safe-area-inset-top))",
        paddingBottom: "max(2rem, calc(env(safe-area-inset-bottom) + 1rem))",
        paddingLeft: "max(1.25rem, env(safe-area-inset-left))",
        paddingRight: "max(1.25rem, env(safe-area-inset-right))",
      }}
    >
      <LanguageSwitcher />
      <main className="mx-auto w-full max-w-[1060px]">
        <header className="flex items-center justify-between border-b border-foreground/25 pb-4 pr-2">
          <h1 className="text-[25px] font-light leading-none tracking-[-0.045em] sm:text-[28px]">
            UNO<span className="font-normal">calc</span>
          </h1>
          <nav className="flex items-center gap-5 sm:gap-7">
            <Link to={localePath("/unocalc/about")}
              className="inline-flex min-h-9 items-center border-b border-foreground/35 text-[12px] tracking-[0.03em] text-foreground/85 transition-colors hover:border-primary hover:text-primary">
              {copy[locale].about}
            </Link>
            <Link to={localePath("/")}
              className="inline-flex min-h-9 items-center text-[12px] tracking-[0.12em] text-foreground/80 transition-colors hover:text-primary">
              .uno
            </Link>
          </nav>
        </header>
        <section className="mt-3" aria-label="UNOcalc — egg geometry">
          <UnoEggScene locale={locale} />
        </section>
      </main>
    </div>
  );
};

export default UnoCalcEgg;

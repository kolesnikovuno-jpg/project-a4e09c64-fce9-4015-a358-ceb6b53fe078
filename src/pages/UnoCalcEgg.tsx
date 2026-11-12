import { Link, useLocation } from "react-router-dom";
import LanguageSwitcher from "@/i18n/LanguageSwitcher";
import { useLocale } from "@/i18n/useLocale";
import UnoEggScene from "@/components/unocalc/UnoEggScene";

const UnoCalcEgg = () => {
  const { locale, localePath } = useLocale();
  const isEgg = /\\/egg\\/?$/.test(useLocation().pathname);
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
        <header className="flex items-center justify-between pb-4 pr-2">
          <h1 className="text-[25px] font-extralight leading-none tracking-[-0.04em] text-foreground/85 sm:text-[28px]">
            {isEgg ? "EGG" : <>UNO<span className="font-extralight">calc</span></>}
          </h1>
          <nav className="flex items-center gap-5 sm:gap-7">
            <Link to={localePath("/")}
              className="inline-flex min-h-9 items-center text-[12px] tracking-[0.12em] text-foreground/80 transition-colors hover:text-primary">
              .uno
            </Link>
          </nav>
        </header>
        <section className="mt-3" aria-label={isEgg ? "EGG — interactive egg" : "UNOcalc — egg geometry"}>
          <UnoEggScene locale={locale} />
        </section>
      </main>
    </div>
  );
};

export default UnoCalcEgg;

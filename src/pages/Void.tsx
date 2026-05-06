import { useNavigate } from "react-router-dom";
import PageTransition from "@/components/PageTransition";
import LanguageSwitcher from "@/i18n/LanguageSwitcher";
import { useLocale } from "@/i18n/useLocale";
import voidHero from "@/assets/void-hero.png";

const Void = () => {
  const navigate = useNavigate();
  const { t, localePath } = useLocale();

  return (
    <PageTransition>
      <div className="relative w-screen h-screen overflow-hidden bg-background">
        <img
          src={voidHero}
          alt="void"
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
        />
        <button
          onClick={() => navigate(localePath("/garden"))}
          className="fixed top-4 left-4 md:top-5 md:left-5 px-2 py-1 text-[#F5EFEB] hover:text-[#C97A63] transition-colors duration-300 z-[60]"
          aria-label={t.nav.back}
          style={{
            fontFamily: "'Manrope', system-ui, sans-serif",
            fontSize: "12px",
            fontWeight: 300,
            letterSpacing: "0.18em",
            textTransform: "lowercase",
          }}
        >
          {t.nav.back}
        </button>
        <LanguageSwitcher background="transparent" />
      </div>
    </PageTransition>
  );
};

export default Void;
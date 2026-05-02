import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { useLocale } from "@/i18n/useLocale";
import LanguageSwitcher from "@/i18n/LanguageSwitcher";

const About = () => {
  const navigate = useNavigate();
  const { t, localePath } = useLocale();
  const A = t.about;

  return (
    <PageTransition>
      <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
        <LanguageSwitcher />
        <div className="max-w-xl w-full">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label={A.back_aria}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h1 className="text-sm tracking-[0.15em] font-normal">{A.name}</h1>
            </div>
            <a
              href={localePath("/")}
              onClick={(e) => {
                e.preventDefault();
                navigate(localePath("/"));
              }}
              className="text-[13px] text-primary font-medium hover:text-primary/80 transition-colors"
            >
              {t.nav.uno}
            </a>
          </div>

          <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-8">{A.studio_label}</p>

          <div className="text-[13px] leading-[1.85] text-foreground/85 space-y-5">
            <p>{A.body_1}</p>

            <div className="w-12 h-px bg-primary/30 my-6" />

            <p>{A.body_2}</p>

            <div className="w-12 h-px bg-primary/30 my-6" />

            <p className="text-primary/90 font-medium">{A.body_3}</p>
            <p>{A.body_4}</p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default About;

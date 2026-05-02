import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { useLocale } from "@/i18n/useLocale";
import LanguageSwitcher from "@/i18n/LanguageSwitcher";

const SectionLabel = ({ children }: { children: string }) => (
  <p className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground/70 font-normal mb-4">{children}</p>
);

const Pricing = () => {
  const navigate = useNavigate();
  const { t, localePath } = useLocale();
  const P = t.pricing;

  return (
    <PageTransition>
      <div className="min-h-screen bg-background px-6 sm:px-10 md:px-16 lg:px-20 pt-16 sm:pt-20 md:pt-24 pb-20 md:pb-28">
        <LanguageSwitcher />
        <div className="max-w-5xl w-full mx-auto">
          <div className="flex items-center justify-between mb-16 md:mb-20">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label={P.back_aria}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h1 className="text-[13px] md:text-[14px] tracking-[0.06em] text-muted-foreground">{P.header}</h1>
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

          <div className="text-[13px] md:text-[14px] text-muted-foreground leading-[1.7]">
            {/* Essence */}
            <section className="mb-8 md:mb-10">
              <SectionLabel>{P.essence_label}</SectionLabel>
              <p className="text-foreground text-[14px] md:text-[15px] leading-[1.6] max-w-xl">
                {P.essence_lead_1}<br />{P.essence_lead_2}
              </p>
              <p className="mt-5 max-w-xl">
                {P.essence_body_1}<br />{P.essence_body_2}
              </p>
            </section>

            <div className="w-full h-px bg-border/20 mb-8 md:mb-10" />

            {/* Process */}
            <section className="mb-8 md:mb-10">
              <SectionLabel>{P.process_label}</SectionLabel>
              <p className="max-w-xl">{P.process_body}</p>
            </section>

            <div className="w-full h-px bg-border/20 mb-8 md:mb-10" />

            {/* Entry / Result */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8 md:gap-y-10 mb-8 md:mb-10">
              <div>
                <SectionLabel>{P.entry_label}</SectionLabel>
                <p>{P.entry_body}</p>

                <div className="mt-6">
                  <SectionLabel>{P.stage_result_label}</SectionLabel>
                  <ul className="space-y-1.5">
                    {P.stage_result_items.map((item) => (
                      <li key={item} className="relative pl-4 before:content-['—'] before:absolute before:left-0">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <p className="text-foreground font-medium tabular-nums">{P.cost_value}</p>
                <p className="mt-2">{P.cost_body}</p>
                <p className="mt-6">{P.cost_after}</p>
              </div>
            </section>

            <div className="w-full h-px bg-border/20 mb-8 md:mb-10" />

            {/* Further / Final */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8 mb-8 md:mb-10">
              <div>
                <SectionLabel>{P.further_label}</SectionLabel>
                <p>{P.further_body}</p>
              </div>
              <div>
                <SectionLabel>{P.final_label}</SectionLabel>
                <p className="text-foreground text-[14px] md:text-[15px] font-medium tabular-nums leading-[1.5]">
                  {P.final_value}
                </p>
                <p className="mt-4">{P.final_body}</p>
              </div>
            </section>

            <div className="w-full h-px bg-border/20 mb-8 md:mb-10" />

            {/* Terms / Rights */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8 mb-8 md:mb-10">
              <div>
                <SectionLabel>{P.terms_label}</SectionLabel>
                <p>{P.terms_body}</p>
              </div>
              <div>
                <SectionLabel>{P.rights_label}</SectionLabel>
                <p>{P.rights_body}</p>
              </div>
            </section>

            <div className="w-full h-px bg-border/20 mb-8 md:mb-10" />

            {/* Contact */}
            <section>
              <SectionLabel>{P.contact_label}</SectionLabel>
              <p>{P.contact_body}</p>
              <div className="mt-6 flex items-center justify-between">
                <a
                  href="https://t.me/kolesnikov_uno"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] text-primary font-medium border-b border-primary/30 hover:border-primary transition-colors pb-0.5"
                >
                  {P.contact_telegram}
                </a>
                <button
                  onClick={() => navigate(-1)}
                  className="text-[13px] text-muted-foreground hover:text-foreground transition-colors border-b border-border/50 hover:border-foreground pb-0.5"
                >
                  {P.back_button}
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Pricing;

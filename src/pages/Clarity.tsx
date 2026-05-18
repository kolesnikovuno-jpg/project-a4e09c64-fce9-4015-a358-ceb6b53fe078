import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { useLocale } from "@/i18n/useLocale";
import LanguageSwitcher from "@/i18n/LanguageSwitcher";
import SEO from "@/components/SEO";

const SectionLabel = ({ children }: { children: string }) => (
  <p className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground/70 font-normal mb-4">{children}</p>
);

const Clarity = () => {
  const navigate = useNavigate();
  const { t, localePath } = useLocale();
  const C = t.clarity;

  return (
    <PageTransition>
      <SEO title={C.seo_title} description={C.seo_description} image="/og/lyra-preview.png" />
      <div className="min-h-screen bg-background px-6 sm:px-10 md:px-16 lg:px-20 pt-16 sm:pt-20 md:pt-24 pb-20 md:pb-28">
        <LanguageSwitcher />
        <div className="max-w-5xl w-full mx-auto">
          <div className="flex items-center justify-between mb-16 md:mb-20">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label={C.back_aria}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h1 className="text-[13px] md:text-[14px] tracking-[0.06em] text-muted-foreground">{C.header}</h1>
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
            {/* Hero */}
            <section className="mb-14 md:mb-20">
              <p className="text-foreground text-[17px] md:text-[20px] leading-[1.45] max-w-xl font-light tracking-[-0.005em]">
                {C.lead_1}<br />{C.lead_2}
              </p>
              {C.body_1 && (
                <p className="mt-7 md:mt-8 max-w-xl">{C.body_1}</p>
              )}
              {C.body_2 && (
                <p className="mt-4 max-w-xl">{C.body_2}</p>
              )}
              {C.bridge && (
                <p className="mt-6 max-w-xl whitespace-pre-wrap">{C.bridge}</p>
              )}
              <div className="mt-8 md:mt-10">
                <button
                  onClick={() => navigate(localePath("/clarity/intake"))}
                  className="text-left text-[13px] md:text-[14px] text-primary font-normal border-b border-primary/20 hover:border-primary/50 transition-colors pb-0.5"
                >
                  {C.cta_button}
                </button>
              </div>
            </section>

            <div className="w-full h-px bg-border/20 mb-14 md:mb-16" />

            {/* For / Not for */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 mb-14 md:mb-16">
              <div>
                <SectionLabel>{C.for_label}</SectionLabel>
                <ul className="space-y-1.5">
                  {C.for_items.map((item) => (
                    <li key={item} className="relative pl-4 before:content-['—'] before:absolute before:left-0">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <SectionLabel>{C.not_for_label}</SectionLabel>
                <ul className="space-y-1.5">
                  {C.not_for_items.map((item) => (
                    <li key={item} className="relative pl-4 before:content-['—'] before:absolute before:left-0">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <div className="w-full h-px bg-border/20 mb-14 md:mb-16" />

            {/* Process */}
            <section className="mb-14 md:mb-16">
              <SectionLabel>{C.process_label}</SectionLabel>
              <ol className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8 mt-2">
                {C.process_steps.map((step) => (
                  <li key={step.n} className="flex gap-5">
                    <span className="text-[11px] tracking-[0.15em] text-muted-foreground/60 tabular-nums pt-[2px] min-w-[22px]">
                      {step.n}
                    </span>
                    <div>
                      <p className="text-foreground text-[13px] md:text-[14px] tracking-[0.04em] mb-1.5">{step.title}</p>
                      <p>{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <div className="w-full h-px bg-border/20 mb-14 md:mb-16" />

            {/* Outcome / Format */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 mb-14 md:mb-16">
              <div>
                <SectionLabel>{C.outcome_label}</SectionLabel>
                <p className="whitespace-pre-wrap">{C.outcome_body}</p>
              </div>
              <div>
                <SectionLabel>{C.format_label}</SectionLabel>
                <p className="whitespace-pre-wrap">{C.format_body}</p>
              </div>
            </section>

            <div className="w-full h-px bg-border/20 mb-14 md:mb-16" />

            {/* CTA */}
            <section>
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4">
                <button
                  onClick={() => navigate(localePath("/clarity/intake"))}
                  className="text-left text-[14px] md:text-[15px] text-primary font-medium border-b border-primary/30 hover:border-primary transition-colors pb-1 self-start"
                >
                  {C.cta_button}
                </button>
                <p className="text-[11px] tracking-[0.04em] text-muted-foreground/70">{C.cta_note}</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Clarity;

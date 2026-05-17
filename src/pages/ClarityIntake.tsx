import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import PageTransition from "@/components/PageTransition";
import { useLocale } from "@/i18n/useLocale";
import LanguageSwitcher from "@/i18n/LanguageSwitcher";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";

const SectionLabel = ({ children }: { children: string }) => (
  <p className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground/70 font-normal mb-3">{children}</p>
);

type FormState = {
  situation: string;
  unclear: string;
  scope: string;
  refs: string;
  name: string;
  email: string;
};

const initial: FormState = {
  situation: "",
  unclear: "",
  scope: "",
  refs: "",
  name: "",
  email: "",
};

const TOTAL = 4;

const ClarityIntake = () => {
  const navigate = useNavigate();
  const { t, localePath, locale } = useLocale();
  const C = t.clarity;
  const I = C.intake;

  const [step, setStep] = useState(1);
  const [data, setData] = useState<FormState>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const validateStep = (): boolean => {
    const e: Record<string, string> = {};
    if (step === 1 && !data.situation.trim()) e.situation = I.validation_required;
    if (step === 2 && !data.unclear.trim()) e.unclear = I.validation_required;
    if (step === 3 && !data.scope.trim()) e.scope = I.validation_required;
    if (step === 4) {
      if (!data.email.trim()) e.email = I.validation_required;
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) e.email = I.validation_email;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goNext = () => {
    if (!validateStep()) return;
    if (step < TOTAL) setStep(step + 1);
  };
  const goBack = () => {
    setErrors({});
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep()) return;
    setSubmitting(true);
    setSubmitError(null);
    const { error } = await supabase.from("submissions").insert({
      language: locale,
      situation: data.situation.trim(),
      uncertainty: data.unclear.trim(),
      scope: data.scope.trim(),
      supporting_links: data.refs.trim() || null,
      name: data.name.trim() || null,
      email: data.email.trim(),
      status: "new",
    });
    setSubmitting(false);
    if (error) {
      console.error("Clarity intake submission failed", error);
      setSubmitError(I.submit_error ?? "Something went wrong. Please try again.");
      return;
    }
    setDone(true);
  };

  return (
    <PageTransition>
      <SEO
        title={`${I.header} — ${C.seo_title}`}
        description={C.seo_description}
        image="/og/lyra-preview.png"
      />
      <div className="min-h-screen bg-background px-6 sm:px-10 md:px-16 lg:px-20 pt-16 sm:pt-20 md:pt-24 pb-20 md:pb-28">
        <LanguageSwitcher />
        <div className="max-w-2xl w-full mx-auto">
          <div className="flex items-center justify-between mb-12 md:mb-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => (done ? navigate(localePath("/")) : navigate(-1))}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label={I.back_aria}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h1 className="text-[13px] md:text-[14px] tracking-[0.06em] text-muted-foreground">
                {C.header} <span className="text-muted-foreground/50">/ {I.header}</span>
              </h1>
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

          {/* Progress indicator (numerals only — no bars) */}
          {!done && (
            <div className="flex items-center gap-3 mb-10 md:mb-12">
              <span className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground/60">
                {I.step_label}
              </span>
              <span className="tabular-nums text-[12px] text-muted-foreground/80">
                {String(step).padStart(2, "0")}
              </span>
              <span className="text-muted-foreground/40">/</span>
              <span className="tabular-nums text-[12px] text-muted-foreground/50">
                {String(TOTAL).padStart(2, "0")}
              </span>
              <div className="flex-1 ml-4 h-px bg-border/20 relative">
                <div
                  className="absolute left-0 top-0 h-px bg-primary/50 transition-all duration-700 ease-out"
                  style={{ width: `${(step / TOTAL) * 100}%` }}
                />
              </div>
            </div>
          )}

          {!done ? (
            <form onSubmit={step === TOTAL ? handleSubmit : (e) => e.preventDefault()} noValidate>
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                  className="text-[13px] md:text-[14px] text-muted-foreground leading-[1.7]"
                >
                  {step === 1 && (
                    <section className="space-y-7">
                      <div>
                        <SectionLabel>{I.situation_title}</SectionLabel>
                        <p className="max-w-md">{I.situation_intro}</p>
                      </div>
                      <Field label={I.situation_field_label} error={errors.situation}>
                        <textarea
                          value={data.situation}
                          onChange={(e) => set("situation", e.target.value)}
                          maxLength={2500}
                          rows={6}
                          placeholder={I.situation_field_placeholder}
                          className="ci-textarea"
                        />
                      </Field>
                    </section>
                  )}

                  {step === 2 && (
                    <section className="space-y-7">
                      <div>
                        <SectionLabel>{I.uncertain_title}</SectionLabel>
                        <p className="max-w-md">{I.uncertain_intro}</p>
                      </div>
                      <Field label={I.uncertain_field_label} error={errors.unclear}>
                        <textarea
                          value={data.unclear}
                          onChange={(e) => set("unclear", e.target.value)}
                          maxLength={2000}
                          rows={5}
                          placeholder={I.uncertain_field_placeholder}
                          className="ci-textarea"
                        />
                      </Field>
                    </section>
                  )}

                  {step === 3 && (
                    <section className="space-y-7">
                      <div>
                        <SectionLabel>{I.scope_title}</SectionLabel>
                        <p className="max-w-md">{I.scope_intro}</p>
                      </div>
                      <Field label={I.scope_field_label} error={errors.scope}>
                        <textarea
                          value={data.scope}
                          onChange={(e) => set("scope", e.target.value)}
                          maxLength={2000}
                          rows={5}
                          placeholder={I.scope_field_placeholder}
                          className="ci-textarea"
                        />
                      </Field>
                      <Field label={`${I.scope_refs_label} · ${I.optional}`}>
                        <textarea
                          value={data.refs}
                          onChange={(e) => set("refs", e.target.value)}
                          maxLength={1500}
                          rows={3}
                          placeholder={I.scope_refs_placeholder}
                          className="ci-textarea"
                        />
                      </Field>
                    </section>
                  )}

                  {step === 4 && (
                    <section className="space-y-7">
                      <div>
                        <SectionLabel>{I.contact_title}</SectionLabel>
                        <p className="max-w-md">{I.contact_intro}</p>
                      </div>
                      <Field label={`${I.contact_name_label} · ${I.optional}`}>
                        <input
                          type="text"
                          value={data.name}
                          onChange={(e) => set("name", e.target.value)}
                          maxLength={100}
                          autoComplete="name"
                          className="ci-input"
                        />
                      </Field>
                      <Field label={I.contact_email_label} error={errors.email}>
                        <input
                          type="email"
                          value={data.email}
                          onChange={(e) => set("email", e.target.value)}
                          maxLength={255}
                          autoComplete="email"
                          className="ci-input"
                        />
                      </Field>
                    </section>
                  )}
                </motion.div>
              </AnimatePresence>

              <div className="mt-12 pt-6 border-t border-border/20 flex items-center justify-between">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={step === 1}
                  className="text-[13px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:hover:text-muted-foreground"
                >
                  {I.back}
                </button>

                {step < TOTAL ? (
                  <button
                    type="button"
                    onClick={goNext}
                    className="text-[13px] text-primary font-medium border-b border-primary/30 hover:border-primary transition-colors pb-0.5"
                  >
                    {I.next}
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="text-[13px] text-primary font-medium border-b border-primary/30 hover:border-primary transition-colors pb-0.5 disabled:opacity-50"
                  >
                    {submitting ? I.submitting : I.submit}
                  </button>
                )}
              </div>
              {submitError && (
                <p className="mt-4 text-[11px] tracking-[0.04em] text-muted-foreground/70">
                  {submitError}
                </p>
              )}
            </form>
          ) : (
            <motion.section
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
              className="text-[13px] md:text-[14px] text-muted-foreground leading-[1.75]"
            >
              <SectionLabel>{I.confirm_title}</SectionLabel>
              <p className="text-foreground text-[15px] md:text-[16px] leading-[1.6] max-w-md font-light">
                {I.confirm_body}
              </p>
              <p className="mt-8 text-[11px] tracking-[0.12em] text-muted-foreground/70">
                {I.confirm_signature}
              </p>
              <div className="mt-12 pt-6 border-t border-border/20">
                <button
                  type="button"
                  onClick={() => navigate(localePath("/"))}
                  className="text-[13px] text-muted-foreground hover:text-foreground transition-colors border-b border-border/50 hover:border-foreground pb-0.5"
                >
                  {I.back_to_site}
                </button>
              </div>
            </motion.section>
          )}
        </div>
      </div>

      <style>{`
        .ci-input, .ci-textarea {
          width: 100%;
          background: transparent;
          border: 0;
          border-bottom: 1px solid hsl(var(--border));
          padding: 8px 0;
          font: inherit;
          color: hsl(var(--foreground));
          outline: none;
          border-radius: 0;
          transition: border-color .25s ease;
        }
        .ci-textarea {
          resize: vertical;
          min-height: 96px;
          line-height: 1.6;
        }
        .ci-input:focus, .ci-textarea:focus {
          border-bottom-color: hsl(var(--primary) / 0.7);
        }
        .ci-input::placeholder, .ci-textarea::placeholder {
          color: hsl(var(--muted-foreground) / 0.5);
        }
      `}</style>
    </PageTransition>
  );
};

const Field = ({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) => (
  <div>
    <label className="block text-[10px] tracking-[0.14em] uppercase text-muted-foreground/70 mb-2">
      {label}
    </label>
    {children}
    {error && (
      <p className="mt-2 text-[11px] tracking-[0.04em] text-muted-foreground/70">
        {error}
      </p>
    )}
  </div>
);

export default ClarityIntake;

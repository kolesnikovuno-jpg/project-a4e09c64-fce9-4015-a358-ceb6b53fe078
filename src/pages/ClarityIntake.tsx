import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Paperclip, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import PageTransition from "@/components/PageTransition";
import { useLocale } from "@/i18n/useLocale";
import LanguageSwitcher from "@/i18n/LanguageSwitcher";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";

const SectionLabel = ({ children }: { children: string }) => (
  <p className="text-[11px] tracking-[0.18em] uppercase text-foreground/85 font-normal mb-3">{children}</p>
);

type FormState = {
  situation: string;
  unclear: string;
  scope: string;
  refs: string;
  name: string;
  email: string;
};

type UploadedFile = { name: string; url: string; size: number };

const initial: FormState = {
  situation: "",
  unclear: "",
  scope: "",
  refs: "",
  name: "",
  email: "",
};

const TOTAL = 4;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_SIZE = 10 * 1024 * 1024;

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
  const [uploads, setUploads] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const sessionIdRef = useRef<string>(crypto.randomUUID());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setUploadError(null);
    setUploading(true);
    const next: UploadedFile[] = [];
    for (const file of Array.from(files)) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setUploadError(`${file.name}: формат не поддерживается`);
        continue;
      }
      if (file.size > MAX_SIZE) {
        setUploadError(`${file.name}: больше 10 МБ`);
        continue;
      }
      const ext = file.name.split(".").pop() ?? "bin";
      const safe = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `intake/${sessionIdRef.current}/${Date.now()}-${safe}`;
      const { error: upErr } = await supabase.storage
        .from("clarity-attachments")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) {
        setUploadError(`${file.name}: ${upErr.message}`);
        continue;
      }
      // Private bucket: store only the storage path. Operators generate
      // short-lived signed URLs on demand from this path.
      next.push({ name: file.name, url: path, size: file.size });
      void ext;
    }
    if (next.length) setUploads((u) => [...u, ...next]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeUpload = (url: string) => setUploads((u) => u.filter((f) => f.url !== url));

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
    const linkParts = [data.refs.trim(), ...uploads.map((u) => `${u.name} — ${u.url}`)]
      .filter(Boolean)
      .join("\n");
    const { error } = await supabase.from("submissions").insert({
      language: locale,
      situation: data.situation.trim(),
      uncertainty: data.unclear.trim(),
      scope: data.scope.trim(),
      supporting_links: linkParts || null,
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
    try {
      const res = await fetch("https://hook.eu2.make.com/x2ylmmwxgvjehhp3gnou8uxcnpbx69m3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "structural_clarity",
          created_at: new Date().toISOString(),
          language: locale,
          name: data.name || "",
          email: data.email,
          situation: data.situation,
          uncertainty: data.unclear,
          scope: data.scope,
          supporting_links: linkParts || "",
          attachments: uploads.map((u) => ({ name: u.name, url: u.url })),
          status: "new",
        }),
      });
      if (res.ok) {
        console.log("Make webhook notification sent successfully");
      } else {
        console.error("Make webhook notification failed", res.status, res.statusText);
      }
    } catch (webhookError) {
      console.error("Make webhook notification error", webhookError);
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
      <div className="min-h-screen bg-background px-6 sm:px-10 md:px-16 lg:px-20 pt-16 sm:pt-20 md:pt-24 pb-12 md:pb-16">
        <LanguageSwitcher />
        <div className="max-w-2xl w-full mx-auto flex flex-col" style={{ minHeight: "calc(100vh - 9rem)" }}>
          {/* Fixed top: header */}
          <div className="flex items-center justify-between mb-10 md:mb-12">
            <div className="flex items-center gap-3">
              <button
                onClick={() => (done ? navigate(localePath("/")) : navigate(-1))}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label={I.back_aria}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h1 className="text-[13px] md:text-[14px] tracking-[0.06em] text-foreground/80">
                {C.header} <span className="text-muted-foreground/60">/ {I.header}</span>
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

          {/* Fixed progress (reserved space stays even on confirm to preserve geometry) */}
          <div className="flex items-center gap-3 mb-10 md:mb-12 h-5">
            {!done && (
              <>
                <span className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground/80">
                {I.step_label}
              </span>
              <span className="tabular-nums text-[12px] text-foreground/80">
                {String(step).padStart(2, "0")}
              </span>
              <span className="text-muted-foreground/50">/</span>
              <span className="tabular-nums text-[12px] text-muted-foreground/60">
                {String(TOTAL).padStart(2, "0")}
              </span>
              <div className="flex-1 ml-4 h-px bg-border/30 relative overflow-hidden">
                <div
                  className="h-full bg-primary/60 transition-all duration-700 ease-out"
                  style={{ width: `${(step / TOTAL) * 100}%` }}
                />
              </div>
              </>
            )}
          </div>

          {/* Content zone with stable min-height keeps footer from jumping */}
          {!done ? (
            <form
              onSubmit={step === TOTAL ? handleSubmit : (e) => e.preventDefault()}
              noValidate
              className="flex flex-col flex-1"
            >
              <div className="flex-1 min-h-[420px] md:min-h-[460px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                  className="text-[13px] md:text-[14px] text-foreground/75 leading-[1.7]"
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
                    <section className="space-y-8">
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
                      {/* Optional materials — collapsed by default */}
                      <div className="pt-2 border-t border-border/20">
                        <SectionLabel>{`${I.attachments_title} · ${I.optional}`}</SectionLabel>
                        <p className="max-w-md text-muted-foreground/90">{I.attachments_intro}</p>
                        <button
                          type="button"
                          onClick={() => setAttachmentsOpen((v) => !v)}
                          className="mt-4 text-[12px] text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
                        >
                          <span className="text-[13px] select-none">{attachmentsOpen ? "−" : "+"}</span>
                          <span>{I.attachments_expand.replace(/^\+ /, "")}</span>
                        </button>
                        <AnimatePresence>
                          {attachmentsOpen && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                              className="pt-6 space-y-5"
                            >
                              <Field label={`${I.scope_refs_label} · ${I.optional}`}>
                                <textarea
                                  value={data.refs}
                                  onChange={(e) => set("refs", e.target.value)}
                                  maxLength={1500}
                                  rows={2}
                                  placeholder={I.scope_refs_placeholder}
                                  className="ci-textarea"
                                />
                              </Field>
                              <div>
                                <input
                                  ref={fileInputRef}
                                  type="file"
                                  multiple
                                  accept={ACCEPTED_TYPES.join(",")}
                                  onChange={(e) => handleFiles(e.target.files)}
                                  className="hidden"
                                />
                                <button
                                  type="button"
                                  onClick={() => fileInputRef.current?.click()}
                                  disabled={uploading}
                                  className="inline-flex items-center gap-2 text-[12px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                                >
                                  <Paperclip className="w-3.5 h-3.5" />
                                  {uploading ? "…" : I.attachments_add}
                                </button>
                                <p className="mt-2 text-[11px] text-muted-foreground/70">{I.attachments_hint}</p>
                                {uploadError && (
                                  <p className="mt-2 text-[11px] text-muted-foreground/80">{uploadError}</p>
                                )}
                                {uploads.length > 0 && (
                                  <ul className="mt-4 space-y-2">
                                    {uploads.map((f) => (
                                      <li
                                        key={f.url}
                                        className="flex items-center justify-between gap-3 text-[12px] text-foreground/80 border-b border-border/20 pb-2"
                                      >
                                        <span className="truncate text-foreground/80">
                                          {f.name}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => removeUpload(f.url)}
                                          aria-label={I.attachments_remove}
                                          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
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
              </div>

              <div className="mt-10 pt-6 border-t border-border/20 flex items-center justify-between">
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              className="text-[13px] md:text-[14px] text-foreground/75 leading-[1.75] flex-1 min-h-[420px] md:min-h-[460px]"
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
          font-family: inherit;
          font-weight: inherit;
          letter-spacing: inherit;
          /* 16px prevents iOS Safari auto-zoom on focus */
          font-size: 16px;
          color: hsl(var(--foreground));
          outline: none;
          border-radius: 0;
          transition: border-color .25s ease;
        }
        @media (min-width: 768px) {
          .ci-input, .ci-textarea {
            font-size: 14px;
          }
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
          color: hsl(var(--muted-foreground) / 0.7);
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

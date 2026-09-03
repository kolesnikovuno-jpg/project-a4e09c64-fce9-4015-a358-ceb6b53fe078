import { useMemo, useState } from "react";
import StudioLayout, { body, h1, label, rule, useStudio } from "@/components/studio/StudioLayout";
import { contact } from "@/content/studio";

const Choice = ({
  options,
  value,
  onChange,
  name,
}: {
  options: string[];
  value: string | null;
  onChange: (v: string) => void;
  name: string;
}) => (
  <div role="radiogroup" aria-label={name} className="flex flex-wrap gap-2">
    {options.map((o) => {
      const on = value === o;
      return (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={on}
          onClick={() => onChange(o)}
          className={`border px-4 py-2 text-[13px] font-light transition-colors ${
            on
              ? "border-foreground bg-foreground text-background"
              : "border-foreground/20 text-foreground/70 hover:border-foreground/60 hover:text-foreground"
          }`}
        >
          {o}
        </button>
      );
    })}
  </div>
);

const field =
  "w-full bg-transparent border-0 border-b border-foreground/20 rounded-none px-0 py-2 text-[15px] font-light text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-foreground transition-colors";

const Start = () => {
  const { c, locale } = useStudio();
  const s = c.start;
  const [q1, setQ1] = useState<string | null>(null);
  const [q2, setQ2] = useState<string | null>(null);
  const [q3, setQ3] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [desc, setDesc] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);

  const summary = useMemo(() => {
    const lines = [
      `Kolesnikov.studio — ${s.title}`,
      "",
      `${s.q1} ${q1 ?? "—"}`,
      `${s.q2} ${q2 ?? "—"}`,
      `${s.q3} ${q3 ?? "—"}`,
      "",
      `${s.nameLabel}: ${name || "—"}`,
      `${s.emailLabel}: ${email || "—"}`,
      "",
      `${s.descLabel}:`,
      desc || "—",
      "",
      `lang: ${locale}`,
    ];
    return lines.join("\n");
  }, [s, q1, q2, q3, name, email, desc, locale]);

  const validate = () => {
    if (!desc.trim()) {
      setError(s.required);
      return false;
    }
    setError(null);
    return true;
  };

  const submit = () => {
    if (!validate()) return;
    const subject = encodeURIComponent(`Kolesnikov.studio — ${q1 ?? "start"}`);
    window.location.href = `mailto:${contact.email}?subject=${subject}&body=${encodeURIComponent(summary)}`;
    setSent(true);
  };

  const copy = async () => {
    if (!validate()) return;
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  return (
    <StudioLayout page="/start" title={`${c.nav.start} — Kolesnikov.studio`} description={s.subtitle}>
      <header className="max-w-[760px]">
        <span className={label}>{s.number}</span>
        <h1 className={`${h1} mt-4`}>{s.title}</h1>
        <p className={`${body} mt-6`}>{s.subtitle}</p>
      </header>

      <form
        className={`${rule} mt-14 max-w-[820px]`}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <fieldset className="border-b border-foreground/10 py-8">
          <legend className="sr-only">{s.q1}</legend>
          <p className="mb-4 text-[16px] font-light text-foreground">{s.q1}</p>
          <Choice name={s.q1} options={s.q1Options} value={q1} onChange={setQ1} />
        </fieldset>
        <fieldset className="border-b border-foreground/10 py-8">
          <legend className="sr-only">{s.q2}</legend>
          <p className="mb-4 text-[16px] font-light text-foreground">{s.q2}</p>
          <Choice name={s.q2} options={s.q2Options} value={q2} onChange={setQ2} />
        </fieldset>
        <fieldset className="border-b border-foreground/10 py-8">
          <legend className="sr-only">{s.q3}</legend>
          <p className="mb-4 text-[16px] font-light text-foreground">{s.q3}</p>
          <Choice name={s.q3} options={s.q3Options} value={q3} onChange={setQ3} />
        </fieldset>

        <div className="grid gap-8 py-8 md:grid-cols-2">
          <label className="block">
            <span className={label}>{s.nameLabel}</span>
            <input className={`${field} mt-2`} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </label>
          <label className="block">
            <span className={label}>{s.emailLabel}</span>
            <input className={`${field} mt-2`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </label>
          <label className="block md:col-span-2">
            <span className={label}>{s.descLabel}</span>
            <textarea
              className={`${field} mt-2 min-h-[120px] resize-y`}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder={s.descPlaceholder}
            />
          </label>
        </div>

        {error && <p className="text-[13px] font-light text-[#C97A63]">{error}</p>}
        {sent && !error && <p className="text-[13px] font-light text-foreground/55">{s.sentNote}</p>}

        <div className="mt-6 flex flex-wrap items-center gap-6">
          <button
            type="submit"
            className="border border-foreground/40 px-7 py-3 text-[12px] tracking-[0.18em] uppercase font-light text-foreground hover:bg-foreground hover:text-background transition-colors"
          >
            {s.cta}
          </button>
          <button
            type="button"
            onClick={copy}
            className="text-[12px] tracking-[0.18em] uppercase font-light text-foreground/55 hover:text-foreground transition-colors"
          >
            {copied ? s.copied : s.copy}
          </button>
        </div>

        <div className="mt-14 flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <span className={label}>{s.altLabel}</span>
          <a href={contact.telegram} target="_blank" rel="noreferrer" className="text-[13px] font-light text-foreground/70 hover:text-foreground transition-colors">
            {s.telegram}
          </a>
          <a href={`mailto:${contact.email}`} className="text-[13px] font-light text-foreground/70 hover:text-foreground transition-colors">
            {s.email}
          </a>
        </div>
      </form>
    </StudioLayout>
  );
};

export default Start;

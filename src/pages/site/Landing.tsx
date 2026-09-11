import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import SEO from "@/components/SEO";
import LanguageSwitcher from "@/i18n/LanguageSwitcher";
import { useLocale } from "@/i18n/useLocale";
import { LOCALES } from "@/i18n/config";
import { contact, getSiteContent } from "@/content/site";
import lyraHero from "@/assets/lyra-hero.png";
import navaHero from "@/assets/nava-hero.png";
import voidHero from "@/assets/void-hero.png";

const IMAGES: Record<string, string> = { lyra: lyraHero, nava: navaHero, void: voidHero };

/* ---------- shared typography ---------- */
const label = "text-[11px] tracking-[0.2em] uppercase text-foreground/45 font-normal";
const sectionHead =
  "text-[26px] leading-[1.2] md:text-[42px] md:leading-[1.12] font-light tracking-[-0.01em] text-foreground";
const bodyText = "text-[16px] md:text-[17px] leading-[1.7] font-light text-foreground/70";
const rule = "border-t border-foreground/12";

const Reveal = ({ children, delay = 0 }: { children: ReactNode; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 14 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-80px" }}
    transition={{ duration: 0.75, delay, ease: [0.22, 0.61, 0.36, 1] }}
  >
    {children}
  </motion.div>
);

const SectionLabel = ({ n, text }: { n: string; text: string }) => (
  <div className="flex items-baseline gap-4">
    <span className="text-[11px] tracking-[0.2em] text-foreground/35 font-normal">{n}</span>
    <span className={label}>{text}</span>
  </div>
);

/* ---------- contact form ---------- */
const field =
  "w-full bg-transparent border-0 border-b border-foreground/20 rounded-none px-0 py-3 text-[16px] font-light text-foreground placeholder:text-foreground/35 focus:outline-none focus:border-foreground transition-colors";

const ContactForm = ({ c }: { c: ReturnType<typeof getSiteContent>["start"] }) => {
  const [name, setName] = useState("");
  const [reply, setReply] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);

  const text = useMemo(
    () =>
      [`${c.nameLabel}: ${name || "—"}`, `${c.contactLabel}: ${reply || "—"}`, "", message].join("\n"),
    [c, name, reply, message]
  );

  const validate = () => {
    if (!message.trim()) {
      setError(c.required);
      return false;
    }
    setError(null);
    return true;
  };

  return (
    <form
      className="max-w-[640px]"
      onSubmit={(e) => {
        e.preventDefault();
        if (!validate()) return;
        window.location.href = `mailto:${contact.email}?subject=${encodeURIComponent(
          "Kolesnikov — " + (name || c.headline)
        )}&body=${encodeURIComponent(text)}`;
        setSent(true);
      }}
    >
      <div className="grid gap-8 md:grid-cols-2">
        <label className="block">
          <span className={label}>{c.nameLabel}</span>
          <input className={`${field} mt-1`} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </label>
        <label className="block">
          <span className={label}>{c.contactLabel}</span>
          <input className={`${field} mt-1`} value={reply} onChange={(e) => setReply(e.target.value)} autoComplete="email" />
        </label>
        <label className="block md:col-span-2">
          <span className={label}>{c.messageLabel}</span>
          <textarea
            className={`${field} mt-1 min-h-[140px] resize-y`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={c.messagePlaceholder}
          />
        </label>
      </div>

      {error && <p className="mt-6 text-[14px] font-light text-[#B4563C]">{error}</p>}
      {sent && !error && <p className="mt-6 text-[14px] font-light text-foreground/55">{c.sentNote}</p>}

      <div className="mt-10 flex flex-wrap items-center gap-8">
        <button
          type="submit"
          className="border border-foreground/45 px-9 py-3.5 text-[12px] tracking-[0.18em] uppercase font-normal text-foreground/90 hover:bg-foreground hover:text-background hover:border-foreground transition-colors"
        >
          {c.send}
        </button>
        <button
          type="button"
          onClick={async () => {
            if (!validate()) return;
            try {
              await navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            } catch {
              /* ignore */
            }
          }}
          className="text-[12px] tracking-[0.14em] uppercase font-normal text-foreground/50 hover:text-foreground transition-colors"
        >
          {copied ? c.copied : c.copy}
        </button>
      </div>

      <div className="mt-12 flex flex-wrap items-baseline gap-x-8 gap-y-2">
        <span className={label}>{c.or}</span>
        <a href={`mailto:${contact.email}`} className="text-[15px] font-light text-foreground/75 hover:text-foreground transition-colors">
          {contact.email}
        </a>
        <a href={contact.telegram} target="_blank" rel="noreferrer" className="text-[15px] font-light text-foreground/75 hover:text-foreground transition-colors">
          Telegram
        </a>
      </div>
    </form>
  );
};

/* ---------- page ---------- */
const Landing = () => {
  const { locale } = useLocale();
  const c = getSiteContent(locale);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const nav = [
    { href: "#work", text: c.nav.work },
    { href: "#process", text: c.nav.process },
    { href: "#about", text: c.nav.about },
    { href: "#contact", text: c.nav.contact },
  ];

  const alternates = LOCALES.reduce<Record<string, string>>((acc, l) => {
    acc[l] = `/${l}`;
    return acc;
  }, {});

  return (
    <div className="min-h-[100dvh] bg-background text-foreground font-[Manrope,system-ui,sans-serif] antialiased">
      <SEO title={c.meta.title} description={c.meta.description} image="/og-semantic-time-v3.jpg" alternates={alternates} />
      <LanguageSwitcher background="hsl(24 26% 94%)" hidden={open} />

      <header className="fixed inset-x-0 top-0 z-40 bg-background/90 backdrop-blur-[2px]">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between px-6 py-5 md:px-12">
          <a href="#top" className="text-[13px] tracking-[0.22em] uppercase font-normal text-foreground">
            Kolesnikov
          </a>
          <nav className="hidden md:flex items-center gap-10" aria-label="Main">
            {nav.map((i) => (
              <a
                key={i.href}
                href={i.href}
                className="text-[12px] tracking-[0.14em] uppercase font-normal text-foreground/55 hover:text-foreground transition-colors"
              >
                {i.text}
              </a>
            ))}
          </nav>
          <button
            type="button"
            aria-expanded={open}
            aria-label={open ? c.nav.close : c.nav.menu}
            onClick={() => setOpen((v) => !v)}
            className="md:hidden text-[12px] tracking-[0.14em] uppercase font-normal text-foreground/70"
          >
            {open ? "×" : c.nav.menu}
          </button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-30 bg-background md:hidden">
          <nav className="flex h-full flex-col justify-center gap-8 px-8" aria-label="Mobile">
            {nav.map((i) => (
              <a
                key={i.href}
                href={i.href}
                onClick={() => setOpen(false)}
                className="text-[26px] font-light tracking-tight text-foreground"
              >
                {i.text}
              </a>
            ))}
          </nav>
        </div>
      )}

      <main id="top">
        {/* HERO */}
        <section className="mx-auto flex min-h-[92dvh] max-w-[1240px] flex-col justify-center px-6 pt-32 pb-20 md:px-12 md:pt-40">
          <Reveal>
            <p className={label}>{c.hero.disciplines}</p>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-6 text-[44px] leading-[1] md:text-[92px] md:leading-[0.95] font-light tracking-[-0.02em] text-foreground">
              {c.hero.name}
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-10 max-w-[900px] text-[24px] leading-[1.25] md:text-[40px] md:leading-[1.18] font-light tracking-[-0.01em] text-foreground">
              {c.hero.statement}
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <p className={`${bodyText} mt-8 max-w-[560px]`}>{c.hero.support}</p>
          </Reveal>
          <Reveal delay={0.32}>
            <div className="mt-14 flex flex-wrap items-center gap-8">
              <a
                href="#contact"
                className="border border-foreground/45 px-9 py-3.5 text-[12px] tracking-[0.18em] uppercase font-normal text-foreground/90 hover:bg-foreground hover:text-background hover:border-foreground transition-colors"
              >
                {c.hero.ctaPrimary}
              </a>
              <a
                href="#work"
                className="text-[12px] tracking-[0.14em] uppercase font-normal text-foreground/55 hover:text-foreground transition-colors"
              >
                {c.hero.ctaSecondary} →
              </a>
            </div>
          </Reveal>
        </section>

        {/* 01 — WHEN TO COME */}
        <section id="when" className="mx-auto max-w-[1240px] px-6 md:px-12">
          <div className={`${rule} pt-14 md:pt-20`}>
            <Reveal>
              <SectionLabel n={c.when.number} text={c.when.label} />
              <h2 className={`${sectionHead} mt-8 max-w-[820px]`}>{c.when.headline}</h2>
            </Reveal>
            <div className="mt-14 grid gap-x-16 gap-y-12 md:mt-20 md:grid-cols-2">
              {c.when.items.map((i, idx) => (
                <Reveal key={i.n} delay={idx * 0.05}>
                  <article className="border-t border-foreground/12 pt-6">
                    <span className="text-[11px] tracking-[0.2em] text-foreground/35">{i.n}</span>
                    <h3 className="mt-4 max-w-[420px] text-[19px] md:text-[22px] leading-[1.35] font-light text-foreground">
                      {i.title}
                    </h3>
                    <p className="mt-3 max-w-[420px] text-[15px] leading-[1.65] font-light text-foreground/60">{i.body}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* 02 — WHAT I DO */}
        <section id="process" className="mx-auto max-w-[1240px] px-6 pt-24 md:px-12 md:pt-36">
          <div className={`${rule} pt-14 md:pt-20`}>
            <Reveal>
              <SectionLabel n={c.what.number} text={c.what.label} />
              <h2 className={`${sectionHead} mt-8`}>{c.what.headline}</h2>
            </Reveal>
            <div className="mt-14 md:mt-20">
              {c.what.stages.map((s, idx) => (
                <Reveal key={s.n} delay={idx * 0.05}>
                  <article className="grid gap-6 border-t border-foreground/12 py-10 md:grid-cols-12 md:gap-10 md:py-14">
                    <div className="md:col-span-4">
                      <div className="flex items-baseline gap-4">
                        <span className="text-[11px] tracking-[0.2em] text-foreground/35">{s.n}</span>
                        <h3 className="text-[22px] md:text-[30px] font-light tracking-[-0.01em] text-foreground">{s.title}</h3>
                      </div>
                    </div>
                    <div className="md:col-span-3">
                      <ul className="space-y-1.5">
                        {s.keywords.map((k) => (
                          <li key={k} className="text-[14px] font-light tracking-[0.02em] text-foreground/55">
                            {k}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <p className={`${bodyText} md:col-span-5`}>{s.body}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* 03 — WORK */}
        <section id="work" className="mx-auto max-w-[1240px] px-6 pt-24 md:px-12 md:pt-36">
          <div className={`${rule} pt-14 md:pt-20`}>
            <Reveal>
              <SectionLabel n={c.work.number} text={c.work.label} />
              <h2 className={`${sectionHead} mt-8`}>{c.work.headline}</h2>
            </Reveal>
          </div>

          <div className="mt-14 space-y-20 md:mt-20 md:space-y-32">
            {c.work.items.map((w, idx) => {
              const src = w.image ? IMAGES[w.image] : null;
              const wide = idx % 3 === 0;
              return (
                <Reveal key={w.id}>
                  <Link to={`/${locale}${w.href}`} className="group block">
                    {src && (
                      <div className={`overflow-hidden bg-foreground/[0.04] ${wide ? "" : "md:max-w-[74%]"}`}>
                        <img
                          src={src}
                          alt={`${w.title} — ${w.type}`}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.02]"
                        />
                      </div>
                    )}
                    <div className={`mt-6 flex flex-wrap items-baseline justify-between gap-x-10 gap-y-3 border-t border-foreground/12 pt-5 ${wide ? "" : "md:max-w-[74%]"}`}>
                      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
                        <h3 className="text-[22px] md:text-[28px] font-light tracking-[0.01em] text-foreground">{w.title}</h3>
                        <span className={label}>{w.type}</span>
                      </div>
                      <span className="text-[12px] tracking-[0.14em] uppercase font-normal text-foreground/40 group-hover:text-foreground transition-colors">
                        {c.work.open} →
                      </span>
                      <p className="w-full max-w-[520px] text-[15px] md:text-[16px] leading-[1.65] font-light text-foreground/60">
                        {w.description}
                      </p>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* 04 — THE AUTHOR */}
        <section id="about" className="mx-auto max-w-[1240px] px-6 pt-24 md:px-12 md:pt-36">
          <div className={`${rule} grid gap-10 pt-14 md:grid-cols-12 md:gap-16 md:pt-20`}>
            <div className="md:col-span-4">
              <Reveal>
                <SectionLabel n={c.author.number} text={c.author.label} />
                <h2 className={`${sectionHead} mt-8`}>{c.author.headline}</h2>
                <p className={`${label} mt-5`}>{c.author.role}</p>
              </Reveal>
            </div>
            <div className="md:col-span-7 md:col-start-6">
              {c.author.paragraphs.map((p, i) => (
                <Reveal key={p} delay={i * 0.05}>
                  <p className={`${bodyText} ${i === 0 ? "text-[20px] md:text-[24px] leading-[1.45] text-foreground/90" : "mt-6"}`}>{p}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* 05 — HOW WE START */}
        <section id="contact" className="mx-auto max-w-[1240px] px-6 pt-24 md:px-12 md:pt-36">
          <div className={`${rule} pt-14 md:pt-20`}>
            <Reveal>
              <SectionLabel n={c.start.number} text={c.start.label} />
              <h2 className={`${sectionHead} mt-8 max-w-[760px]`}>{c.start.headline}</h2>
              {c.start.body.map((p) => (
                <p key={p} className={`${bodyText} mt-5 max-w-[560px]`}>
                  {p}
                </p>
              ))}
              <p className="mt-10 text-[13px] tracking-[0.14em] uppercase font-normal text-foreground/45">{c.start.cta}</p>
            </Reveal>
            <div className="mt-10">
              <Reveal delay={0.05}>
                <ContactForm c={c.start} />
              </Reveal>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-[1240px] px-6 pt-28 pb-14 md:px-12 md:pt-44">
        <div className={`${rule} pt-14 md:pt-20`}>
          <Reveal>
            <p className="max-w-[900px] text-[26px] leading-[1.25] md:text-[46px] md:leading-[1.15] font-light tracking-[-0.015em] text-foreground">
              {c.closing.statement}
            </p>
          </Reveal>
          <div className="mt-16 flex flex-wrap items-baseline justify-between gap-6 border-t border-foreground/12 pt-6">
            <span className={label}>{c.closing.small}</span>
            <div className="flex gap-8">
              <a href={`mailto:${contact.email}`} className="text-[12px] tracking-[0.14em] uppercase font-normal text-foreground/55 hover:text-foreground transition-colors">
                Email
              </a>
              <a href={contact.telegram} target="_blank" rel="noreferrer" className="text-[12px] tracking-[0.14em] uppercase font-normal text-foreground/55 hover:text-foreground transition-colors">
                Telegram
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

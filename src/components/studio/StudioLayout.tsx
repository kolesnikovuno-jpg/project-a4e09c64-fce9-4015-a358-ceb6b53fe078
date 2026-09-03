import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useLocale } from "@/i18n/useLocale";
import LanguageSwitcher from "@/i18n/LanguageSwitcher";
import SEO from "@/components/SEO";
import { LOCALES } from "@/i18n/config";
import { contact, getStudioContent } from "@/content/studio";

type NavItem = { n: string; label: string; path: string };

type Props = {
  children: ReactNode;
  /** logical page path without locale prefix, e.g. "/method" or "" for home */
  page: string;
  title?: string;
  description?: string;
};

export const useStudio = () => {
  const { locale, localePath } = useLocale();
  return { locale, localePath, c: getStudioContent(locale) };
};

/** Shared micro-typography helpers */
export const label = "text-[11px] tracking-[0.22em] uppercase text-foreground/45 font-light";
export const h1 = "text-[28px] md:text-[44px] leading-[1.15] font-light tracking-[0.005em] text-foreground";
export const h2 = "text-[20px] md:text-[28px] leading-[1.3] font-light text-foreground";
export const body = "text-[15px] md:text-[16px] leading-[1.85] font-light text-foreground/75";
export const rule = "border-t border-foreground/10";

const StudioLayout = ({ children, page, title, description }: Props) => {
  const { c, localePath } = useStudio();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setOpen(false);
    window.scrollTo({ top: 0 });
  }, [pathname]);

  const nav: NavItem[] = [
    { n: "01", label: "Home", path: "" },
    { n: "02", label: c.nav.method, path: "/method" },
    { n: "03", label: c.nav.cases, path: "/cases" },
    { n: "04", label: c.nav.exchange, path: "/exchange" },
    { n: "05", label: c.nav.studio, path: "/studio" },
    { n: "06", label: c.nav.start, path: "/start" },
  ];

  const alternates = LOCALES.reduce<Record<string, string>>((acc, l) => {
    acc[l] = `/${l}${page}`;
    return acc;
  }, {});

  const isActive = (p: string) => (p === "" ? pathname.split("/").filter(Boolean).length === 1 : pathname.endsWith(p));

  return (
    <div className="min-h-[100dvh] bg-background text-foreground font-[Manrope,system-ui,sans-serif] antialiased">
      <SEO
        title={title ?? c.meta.title}
        description={description ?? c.meta.description}
        image="/og/lyra-preview.png"
        alternates={alternates}
      />
      <LanguageSwitcher background="hsl(24 26% 94%)" hidden={open} />

      <header className="fixed inset-x-0 top-0 z-40 bg-background/85 backdrop-blur-[2px]">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-6 py-5 md:px-10">
          <Link to={localePath("/")} className="text-[12px] tracking-[0.2em] uppercase font-light text-foreground/80 hover:text-foreground transition-colors">
            {c.nav.brand}
          </Link>
          <nav className="hidden md:flex items-center gap-8" aria-label="Main">
            {nav.slice(1).map((item) => (
              <Link
                key={item.path}
                to={localePath(item.path || "/")}
                className={`group flex items-baseline gap-2 text-[12px] tracking-[0.16em] uppercase font-light transition-colors ${
                  isActive(item.path) ? "text-foreground" : "text-foreground/50 hover:text-foreground"
                }`}
              >
                <span className="text-[10px] text-foreground/35 group-hover:text-foreground/60">{item.n}</span>
                {item.label}
              </Link>
            ))}
          </nav>
          <button
            type="button"
            aria-label={c.nav.menu}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="md:hidden text-[12px] tracking-[0.16em] uppercase font-light text-foreground/60"
          >
            {open ? "×" : c.nav.menu}
          </button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-30 bg-background md:hidden">
          <nav className="flex h-full flex-col justify-center gap-7 px-8" aria-label="Mobile">
            {nav.map((item) => (
              <Link
                key={item.path}
                to={localePath(item.path || "/")}
                className="flex items-baseline gap-4 text-[22px] font-light tracking-wide text-foreground"
              >
                <span className="text-[11px] tracking-[0.2em] text-foreground/40">{item.n}</span>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}

      <main className="mx-auto max-w-[1180px] px-6 pt-28 pb-24 md:px-10 md:pt-36">{children}</main>

      <footer className={`${rule} mx-auto max-w-[1180px] px-6 md:px-10`}>
        <div className="flex flex-col gap-3 py-8 md:flex-row md:items-center md:justify-between">
          <span className="text-[11px] tracking-[0.2em] uppercase font-light text-foreground/50">{c.footer.left}</span>
          <div className="flex gap-6">
            <a href={`mailto:${contact.email}`} className="text-[11px] tracking-[0.18em] uppercase font-light text-foreground/50 hover:text-foreground transition-colors">
              {c.footer.email}
            </a>
            <a href={contact.telegram} target="_blank" rel="noreferrer" className="text-[11px] tracking-[0.18em] uppercase font-light text-foreground/50 hover:text-foreground transition-colors">
              {c.footer.telegram}
            </a>
          </div>
          <span className="text-[11px] tracking-[0.18em] font-light text-foreground/40">{c.footer.right}</span>
        </div>
      </footer>
    </div>
  );
};

export default StudioLayout;

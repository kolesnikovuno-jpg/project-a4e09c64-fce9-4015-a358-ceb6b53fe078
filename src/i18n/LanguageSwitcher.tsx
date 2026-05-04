import { useEffect, useRef, useState, type CSSProperties } from "react";
import { LOCALE_LABEL, LOCALES, type Locale } from "./config";
import { useLocale } from "./useLocale";

type Props = {
  /** Optional vertical offset from the top of the viewport. */
  topOffset?: number;
  /** Hide the switcher entirely (e.g. on a hero screen). */
  hidden?: boolean;
  /** Reserved for backward compatibility (no longer used visually). */
  background?: string;
};

/**
 * Top-center language switcher shaped as a water drop. On click two more
 * drops "flow" downward with the alternative language options.
 */
const LanguageSwitcher = ({ topOffset = 0, hidden = false }: Props) => {
  const { locale, switchTo } = useLocale();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (hidden) return null;

  const others: Locale[] = LOCALES.filter((l) => l !== locale);

  // Teardrop: pointed top, round bottom — asymmetric border-radius + 45°.
  const SIZE = 36;
  const drop = (active: boolean): CSSProperties => ({
    width: SIZE,
    height: SIZE,
    background: "transparent",
    border: `1px solid ${active ? "hsl(203 60% 50% / 0.85)" : "hsl(203 24% 55% / 0.55)"}`,
    borderRadius: "50% 50% 50% 0",
    transform: "rotate(-45deg)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "border-color .25s ease, color .25s ease",
    color: active ? "hsl(203 60% 50%)" : "hsl(203 24% 55%)",
  });
  const label: CSSProperties = {
    transform: "rotate(45deg)",
    fontSize: 11,
    fontWeight: 300,
    letterSpacing: "0.12em",
    textTransform: "lowercase",
    fontFamily: "'Manrope', system-ui, sans-serif",
  };

  return (
    <div
      ref={rootRef}
      style={{
        position: "fixed",
        top: topOffset + 10,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}
    >
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Change language"
        onClick={() => setOpen((v) => !v)}
        style={{ background: "transparent", border: "none", padding: 0, outline: "none" }}
      >
        <div style={drop(true)}>
          <span style={label}>{LOCALE_LABEL[locale].toLowerCase()}</span>
        </div>
      </button>

      <ul
        role="listbox"
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          pointerEvents: open ? "auto" : "none",
        }}
      >
        {others.map((l, i) => (
          <li
            key={l}
            style={{
              opacity: open ? 1 : 0,
              transform: open ? "translateY(0)" : "translateY(-14px)",
              transition: `opacity .35s ease ${i * 90}ms, transform .5s cubic-bezier(0.22,0.61,0.36,1) ${i * 90}ms`,
            }}
          >
            <button
              type="button"
              role="option"
              aria-selected={false}
              onClick={() => {
                setOpen(false);
                switchTo(l);
              }}
              style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer" }}
            >
              <div
                style={drop(false)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#C97A63";
                  e.currentTarget.style.color = "#C97A63";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "hsl(203 24% 55% / 0.55)";
                  e.currentTarget.style.color = "hsl(203 24% 55%)";
                }}
              >
                <span style={label}>{LOCALE_LABEL[l].toLowerCase()}</span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default LanguageSwitcher;
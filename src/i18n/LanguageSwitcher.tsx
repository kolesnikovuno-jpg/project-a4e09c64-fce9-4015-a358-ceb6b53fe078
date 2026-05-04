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
const LanguageSwitcher = ({ topOffset = 0, hidden = false, background }: Props) => {
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

  // Elegant teardrop pointing downward — filled with page background, no stroke.
  const W = 30;
  const H = 44;
  const fill = background ?? "hsl(24 26% 94%)";
  // Smooth drop: round shoulders at top, gentle taper to a soft tip at bottom.
  // Tip up, round bottom.
  const path =
    "M15 43 C 26 43, 30 32, 24 22 C 20 16, 17 9, 15 1 C 13 9, 10 16, 6 22 C 0 32, 4 43, 15 43 Z";

  const wrap: CSSProperties = {
    position: "relative",
    width: W,
    height: H,
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    paddingBottom: 8,
    cursor: "pointer",
  };
  const labelStyle = (active: boolean): CSSProperties => ({
    position: "relative",
    fontSize: 11,
    fontWeight: 300,
    letterSpacing: "0.14em",
    textTransform: "lowercase",
    fontFamily: "'Manrope', system-ui, sans-serif",
    color: active ? "hsl(203 24% 40%)" : "hsl(203 24% 55%)",
    transition: "color .25s ease",
  });

  return (
    <div
      ref={rootRef}
      style={{
        position: "fixed",
        top: topOffset + 8,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
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
        <div style={wrap}>
          <svg
            viewBox="0 0 30 44"
            width={W}
            height={H}
            style={{ position: "absolute", inset: 0, display: "block" }}
            aria-hidden
          >
            <path d={path} fill={fill} />
          </svg>
          <span style={labelStyle(true)}>{LOCALE_LABEL[locale].toLowerCase()}</span>
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
          gap: 4,
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
                style={wrap}
                onMouseEnter={(e) => {
                  const s = e.currentTarget.querySelector("span") as HTMLElement | null;
                  if (s) s.style.color = "#C97A63";
                }}
                onMouseLeave={(e) => {
                  const s = e.currentTarget.querySelector("span") as HTMLElement | null;
                  if (s) s.style.color = "hsl(203 24% 55%)";
                }}
              >
                <svg
                  viewBox="0 0 30 44"
                  width={W}
                  height={H}
                  style={{ position: "absolute", inset: 0, display: "block" }}
                  aria-hidden
                >
                  <path d={path} fill={fill} />
                </svg>
                <span style={labelStyle(false)}>{LOCALE_LABEL[l].toLowerCase()}</span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default LanguageSwitcher;
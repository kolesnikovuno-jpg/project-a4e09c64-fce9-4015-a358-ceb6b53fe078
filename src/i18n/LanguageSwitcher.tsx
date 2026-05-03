import { useEffect, useRef, useState } from "react";
import { LOCALE_LABEL, LOCALES, type Locale } from "./config";
import { useLocale } from "./useLocale";

type Props = {
  /** Background color matched to the current screen so the button blends in. */
  background?: string;
  /** Optional vertical offset from the top of the viewport. */
  topOffset?: number;
  /** Hide the switcher entirely (e.g. on a hero screen). */
  hidden?: boolean;
};

/**
 * Top-center language switcher. Square trigger that expands vertically
 * downward into a list of available languages. Visually quiet, no border by
 * default — relies on background color matching to stay secondary.
 */
const LanguageSwitcher = ({
  background = "hsl(24 26% 94%)",
  topOffset = 0,
  hidden = false,
}: Props) => {
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

  const items: Locale[] = [...LOCALES];

  return (
    <div
      ref={rootRef}
      style={{
        position: "fixed",
        top: topOffset,
        left: "50%",
        transform: "translateX(-50%)",
        // High z-index so the switcher floats above hero images, the 3D
        // model viewer, and any popup/info panels.
        zIndex: 9999,
        // Background plate from the very top of the viewport, mirrors the
        // "info" button styling (Lyra page) so the switcher reads as part of
        // the same control language.
        background,
        padding: "26px 6px 6px",
        width: 26,
        borderBottomLeftRadius: 2,
        borderBottomRightRadius: 2,
        fontFamily: "'Manrope', system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Change language"
        onClick={() => setOpen((v) => !v)}
        style={{
          background: "transparent",
          border: "none",
          outline: "none",
          cursor: "pointer",
          color: "hsl(203 24% 40%)",
          fontSize: 12,
          fontWeight: 300,
          letterSpacing: "0.18em",
          textTransform: "lowercase",
          padding: 0,
          transition: "color .25s ease",
        }}
      >
        {LOCALE_LABEL[locale]}
      </button>
      <ul
        role="listbox"
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          background: "transparent",
          overflow: "hidden",
          maxHeight: open ? items.length * 26 + 4 : 0,
          opacity: open ? 1 : 0,
          transition:
            "max-height .35s cubic-bezier(0.22,0.61,0.36,1), opacity .25s ease",
          pointerEvents: open ? "auto" : "none",
          marginTop: 4,
          textAlign: "center",
        }}
      >
        {items
          .filter((l) => l !== locale)
          .map((l) => (
            <li key={l}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => {
                  setOpen(false);
                  switchTo(l);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "hsl(203 24% 55%)",
                  fontSize: 12,
                  fontWeight: 300,
                  letterSpacing: "0.18em",
                  textTransform: "lowercase",
                  padding: "3px 0",
                  transition: "color .2s ease",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.color =
                    "#C97A63")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.color =
                    "hsl(203 24% 55%)")
                }
              >
                {LOCALE_LABEL[l]}
              </button>
            </li>
          ))}
      </ul>
    </div>
  );
};

export default LanguageSwitcher;
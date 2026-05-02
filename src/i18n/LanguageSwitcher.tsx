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
  background = "transparent",
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
        fontFamily: "'Manrope', system-ui, sans-serif",
      }}
    >
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Change language"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: 22,
          height: 24,
          background,
          border: "none",
          outline: "none",
          cursor: "pointer",
          color: "hsl(203 24% 40%)",
          fontSize: 10,
          fontWeight: 400,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          padding: 0,
          borderRadius: 2,
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
          background,
          overflow: "hidden",
          maxHeight: open ? items.length * 24 + 4 : 0,
          opacity: open ? 1 : 0,
          transition:
            "max-height .35s cubic-bezier(0.22,0.61,0.36,1), opacity .25s ease",
          pointerEvents: open ? "auto" : "none",
          borderRadius: 2,
          marginTop: 1,
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
                  width: 22,
                  height: 24,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "hsl(203 24% 55%)",
                  fontSize: 10,
                  fontWeight: 400,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  padding: 0,
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
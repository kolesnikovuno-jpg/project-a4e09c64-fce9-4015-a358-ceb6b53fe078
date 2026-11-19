import "@/styles/uno-document.css";
import { useEffect, useState } from "react";
import { useLocale } from "@/i18n/useLocale";

type Props = { showTrigger?: boolean };

// Numeric / contact values are language-independent.
const MODEL_DATA = {
  dimensions: { height: "1500 mm", width: "840 mm", length: "1750 mm" },
  contact: {
    telegram:
      "https://t.me/kolesnikov_uno?text=Hello,%20I'm%20interested%20in%20Lyra.%0A%0AColor:%20%0ALocation:%20%0ANotes:%20",
    email: "kolesnikov.uno@gmail.com",
  },
};

const LyraInfo = ({ showTrigger = true }: Props) => {
  const { t } = useLocale();
  const T = t.lyra_info;
  const [open, setOpen] = useState(false);
  const [copyLabel, setCopyLabel] = useState(T.copy_link);
  const [shareLabel, setShareLabel] = useState(T.system_share);
  const [pageUrl, setPageUrl] = useState("");

  useEffect(() => {
    setPageUrl(window.location.href);
  }, [open]);

  // Reset transient labels whenever the active locale changes so we don't
  // leave stale strings from the previous language on screen.
  useEffect(() => {
    setCopyLabel(T.copy_link);
    setShareLabel(T.system_share);
  }, [T.copy_link, T.system_share]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyLabel(T.copy_done);
      setTimeout(() => setCopyLabel(T.copy_link), 1400);
    } catch {
      setCopyLabel(T.copy_failed);
      setTimeout(() => setCopyLabel(T.copy_link), 1400);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    const text = T.overview.join(" · ");
    if (navigator.share) {
      try {
        await navigator.share({ title: T.title, text, url });
        return;
      } catch {
        // user dismissed — fall through
        return;
      }
    }
    // Fallback: copy link
    handleCopy();
    setShareLabel(T.link_copied);
    setTimeout(() => setShareLabel(T.system_share), 1400);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("lyra:info-open", onOpen);
    return () => window.removeEventListener("lyra:info-open", onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const qrSrc = pageUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=0&qzone=1&color=2A2A2A&bgcolor=F5EFEB&data=${encodeURIComponent(pageUrl)}`
    : "";

  const today = new Date().toISOString().slice(0, 10);
  const ref = T.ref;

  return (
    <>
      

      {showTrigger && (
        <button
          className="lyra-info-btn"
          aria-label={t.nav.info}
          onClick={() => setOpen(true)}
        >
          {t.nav.info}
        </button>
      )}

      <div
        className={`lyra-info-overlay ${open ? "open" : ""}`}
        onClick={() => setOpen(false)}
      />

      <aside className={`lyra-info-panel ${open ? "open" : ""}`} aria-hidden={!open}>
        <button className="lyra-info-close" aria-label="close" onClick={() => setOpen(false)}>×</button>

        {/* document meta */}
        <div className="li-doc-meta">
          <span>ref · {ref}</span>
          <span>{today}</span>
        </div>

        {/* 1. HEADER */}
        <h2 className="li-title">{T.title}</h2>
        <div className="li-headrow">
          <span>{T.model_label} · <b>{T.model_value}</b></span>
          <span>{T.status_label} · <b>{T.status_value}</b></span>
        </div>

        <div style={{ height: 22 }} />
        <hr className="li-rule" />

        {/* 2. OVERVIEW */}
        <div className="li-section li-overview">
          <div className="li-section-title">{T.sections.overview}</div>
          {T.overview.map((line) => <p key={line}>{line}</p>)}
        </div>

        <hr className="li-rule" />

        {/* 3. SPECIFICATIONS */}
        <div className="li-section">
          <div className="li-section-title">{T.sections.specifications}</div>
          <div className="li-row"><span className="k">{T.spec_keys.height}</span><span className="v">{MODEL_DATA.dimensions.height}</span></div>
          <div className="li-row"><span className="k">{T.spec_keys.width}</span><span className="v">{MODEL_DATA.dimensions.width}</span></div>
          <div className="li-row"><span className="k">{T.spec_keys.length}</span><span className="v">{MODEL_DATA.dimensions.length}</span></div>
        </div>

        <hr className="li-rule" />

        {/* 4. STRUCTURE */}
        {/* TECHNICAL */}
        <div className="li-section li-contact">
          <div className="li-section-title">{T.technical_label}</div>
          <div className="li-row"><span className="v">{T.technical_description}</span></div>
          <a href="/lyra-technical.pdf" target="_blank" rel="noopener noreferrer">
            <span>{T.technical_link}</span><span>↗</span>
          </a>
        </div>

        <hr className="li-rule" />

        <div className="li-section">
          <div className="li-section-title">{T.sections.structure}</div>
          <div className="li-list">
            {T.structure.map((s) => <div key={s}>{s}</div>)}
          </div>
        </div>

        <hr className="li-rule" />

        {/* 5. MATERIAL */}
        <div className="li-section">
          <div className="li-section-title">{T.sections.material}</div>
          <div className="li-row"><span className="k">{T.material_keys.textile}</span><span className="v">{T.material_values.textile}</span></div>
          <div className="li-row"><span className="k">{T.material_keys.frame}</span><span className="v">{T.material_values.frame}</span></div>
          <div className="li-row"><span className="k">{T.material_keys.color}</span><span className="v">{T.material_values.color}</span></div>
        </div>

        <hr className="li-rule thick" />

        {/* PROCESS */}
        <div className="li-section">
          <div className="li-section-title">{T.process_label}</div>
          <div className="li-row"><span className="v">{T.process_flow}</span></div>
        </div>

        <hr className="li-rule" />

        {/* PRODUCTION */}
        <div className="li-section">
          <div className="li-section-title">{T.production_label}</div>
          {T.production_lines.map((line) => (
            <div key={line} className="li-row"><span className="v">{line}</span></div>
          ))}
        </div>

        <hr className="li-rule" />

        {/* CONTACT */}
        <div className="li-section li-contact">
          <div className="li-row"><span className="v">{T.inquiry_label}</span></div>
          <a href={MODEL_DATA.contact.telegram} target="_blank" rel="noreferrer">
            <span>{T.contact_telegram}</span><span>↗</span>
          </a>
          <a href={`mailto:${MODEL_DATA.contact.email}`}>
            <span>{T.contact_email}</span><span>↗</span>
          </a>
        </div>

        <hr className="li-rule thick" />

        {/* 6. SHARE */}
        <div className="li-section">
          <div className="li-section-title">{T.sections.share}</div>
          <div className="li-share-actions">
            <button className="li-btn" onClick={handleCopy}>
              <span>{copyLabel}</span>
              <span className="arrow">↗</span>
            </button>
            <button className="li-btn" onClick={handleShare}>
              <span>{shareLabel}</span>
              <span className="arrow">↗</span>
            </button>
          </div>
          <div className="li-qr">
            {qrSrc && <img src={qrSrc} alt="QR code to this page" />}
            <div className="li-qr-meta">
              <b>{T.qr_label}</b>
              {pageUrl}
            </div>
          </div>
        </div>

        <div className="li-foot">
          <span>{T.footer_left}</span>
          <span>{T.footer_right}</span>
        </div>
      </aside>
    </>
  );
};

export default LyraInfo;

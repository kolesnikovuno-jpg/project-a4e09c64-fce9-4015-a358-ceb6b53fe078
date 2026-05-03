import { useEffect, useState } from "react";
import { useLocale } from "@/i18n/useLocale";

type Props = { showTrigger?: boolean };

// Numeric / contact values are language-independent.
const MODEL_DATA = {
  dimensions: { height: "654 mm", width: "656 mm", length: "917 mm" },
  contact: {
    telegram:
      "https://t.me/kolesnikov_uno?text=Hello,%20I'm%20interested%20in%20Nava.%0A%0AColor:%20%0ALocation:%20%0ANotes:%20",
    email: "kolesnikov.uno@gmail.com",
  },
};

const NavaInfo = ({ showTrigger = true }: Props) => {
  const { t } = useLocale();
  const T = t.nava_info;
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
    window.addEventListener("nava:info-open", onOpen);
    return () => window.removeEventListener("nava:info-open", onOpen);
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
      <style>{`
        .lyra-info-btn{
          position:fixed; right:22px; bottom:22px; z-index:60;
          background:transparent; border:none; padding:6px 4px;
          cursor:pointer;
          font-family:'Manrope',system-ui,sans-serif;
          font-size:12px; font-weight:300;
          letter-spacing:0.18em; text-transform:lowercase;
          color:hsl(203 24% 40%);
          transition:color .25s ease;
        }
        .lyra-info-btn:hover{ color:#C97A63; }
        @media(max-width:768px){
          .lyra-info-btn{ right:16px; bottom:18px; }
        }
        .lyra-info-overlay{
          position:fixed; inset:0;
          background:rgba(20,20,20,0.22);
          z-index:70; opacity:0; pointer-events:none;
          transition:opacity .7s cubic-bezier(0.22,0.61,0.36,1);
        }
        .lyra-info-overlay.open{ opacity:1; pointer-events:auto; }
        .lyra-info-panel{
          position:fixed; top:0; right:0; height:100%;
          width:38%; max-width:460px; min-width:360px;
          background:#F5EFEB;
          z-index:71;
          transform:translateX(100%);
          transition:transform .8s cubic-bezier(0.22,0.61,0.36,1);
          padding:42px 40px 56px 44px;
          overflow-y:auto;
          font-family:'JetBrains Mono','IBM Plex Mono','Menlo',ui-monospace,monospace;
          font-weight:400;
          font-size:12px; line-height:1.65;
          color:#3A3A3A;
          letter-spacing:0.01em;
          border-left:1px solid rgba(0,0,0,0.08);
        }
        .lyra-info-panel.open{ transform:translateX(0); }
        @media(max-width:768px){
          .lyra-info-panel{ width:100%; min-width:0; max-width:none; padding:34px 24px 48px 26px; }
        }
        .lyra-info-close{
          position:absolute; top:14px; right:18px;
          background:transparent; border:none; cursor:pointer;
          font-size:22px; color:#9A9A9A; line-height:1;
          font-weight:300; font-family:inherit;
          transition:color .2s ease;
          opacity:0.7;
        }
        .lyra-info-close:hover{ color:#1A1A1A; opacity:1; }

        /* document head */
        .li-doc-meta{
          display:flex; justify-content:space-between;
          font-size:10px; color:#9A9A9A; letter-spacing:0.08em;
          text-transform:lowercase; margin-bottom:26px;
        }
        .li-title{
          font-size:34px; font-weight:400; letter-spacing:0.04em;
          color:#1F1F1F; margin:0 0 14px; line-height:1;
          font-family:'JetBrains Mono','IBM Plex Mono','Menlo',ui-monospace,monospace;
        }
        .li-headrow{
          display:flex; flex-direction:column; gap:2px;
          font-size:11px; color:#5A5A5A; margin-bottom:4px;
        }
        .li-headrow span b{ font-weight:400; color:#2A2A2A; }

        /* sections */
        .li-section{ margin:0; padding:18px 0; }
        .li-section-title{
          font-size:10px; letter-spacing:0.18em; text-transform:uppercase;
          color:#8A8A8A; margin-bottom:10px; font-weight:400;
        }
        .li-section-title::before{ content:"// "; color:#B8B8B8; }

        .li-overview p{ margin:0 0 2px; color:#3A3A3A; font-size:12.5px; }

        .li-row{
          display:flex; gap:24px; padding:3px 0;
          font-size:12px;
        }
        .li-row .k{
          color:#8A8A8A; min-width:90px;
          text-transform:lowercase;
        }
        .li-row .v{ color:#2A2A2A; flex:1; }

        .li-list div{ padding:2px 0; color:#3A3A3A; font-size:12px; }
        .li-list div::before{ content:"— "; color:#B0B0B0; }

        /* dividers — dashed printout feel */
        .li-rule{
          border:0; border-top:1px dashed rgba(0,0,0,0.18);
          margin:0; height:0;
        }
        .li-rule.solid{ border-top:1px solid rgba(0,0,0,0.22); }
        .li-rule.thick{ border-top:1px solid rgba(0,0,0,0.32); margin:6px 0; }

        /* share */
        .li-share-actions{ display:flex; flex-direction:column; gap:0; margin:6px 0 18px; }
        .li-btn{
          display:flex; align-items:center; justify-content:space-between;
          padding:10px 0;
          background:transparent; border:none;
          border-bottom:1px dashed rgba(0,0,0,0.18);
          font-family:inherit; font-size:12px; font-weight:400;
          color:#2A2A2A; letter-spacing:0.02em; text-transform:lowercase;
          cursor:pointer; text-align:left;
          transition:color .2s ease;
        }
        .li-btn:hover{ color:#C97A63; }
        .li-btn .arrow{ color:#9A9A9A; font-size:12px; }

        .li-qr{
          display:flex; align-items:flex-start; gap:18px;
          padding:14px 0 4px;
        }
        .li-qr img{
          width:96px; height:96px; display:block;
          background:#F5EFEB;
        }
        .li-qr-meta{
          font-size:10.5px; color:#8A8A8A; line-height:1.55;
          word-break:break-all; padding-top:2px;
        }
        .li-qr-meta b{ color:#3A3A3A; font-weight:400; display:block; margin-bottom:4px; }

        /* contact */
        .li-contact a{
          display:flex; justify-content:space-between; gap:16px;
          color:#2A2A2A; text-decoration:none;
          padding:6px 0;
          font-size:12px;
          transition:color .2s ease;
        }
        .li-contact a span:first-child{ color:#8A8A8A; }
        .li-contact a:hover{ color:#C97A63; }

        .li-foot{
          margin-top:34px; font-size:10px; color:#A8A8A8;
          letter-spacing:0.08em; text-transform:lowercase;
          display:flex; justify-content:space-between;
        }
      `}</style>

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
          <a href="/nava-technical.pdf" target="_blank" rel="noopener noreferrer">
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

export default NavaInfo;

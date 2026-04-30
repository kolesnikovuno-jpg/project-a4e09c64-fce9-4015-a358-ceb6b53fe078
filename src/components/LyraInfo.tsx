import { useEffect, useState } from "react";
import lyraHero from "@/assets/lyra-hero.png";

type Props = { showTrigger?: boolean };

const MODEL = {
  name: "LYRA",
  subtitle: "model / chair",
  status: "prototype",
  overview: [
    "Tension-based seating system",
    "Flexible support structure",
    "Minimal material, adaptive response",
  ],
  dimensions: { height: "—", width: "—", length: "—" },
  structure: ["tension system", "flexible support"],
  material: { textile: "—", frame: "—", color: "customizable" },
  contact: {
    telegram: "https://t.me/kolesnikov_uno",
    email: "kolesnikov.uno@gmail.com",
  },
};

const setMeta = (selector: string, attr: string, value: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    const [k, v] = selector.replace(/[\[\]"]/g, "").split("=");
    el.setAttribute(k, v);
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
};

const LyraInfo = ({ showTrigger = true }: Props) => {
  const [open, setOpen] = useState(false);
  const [copyLabel, setCopyLabel] = useState("copy link");
  const [shareLabel, setShareLabel] = useState("system share");
  const [pageUrl, setPageUrl] = useState("");

  useEffect(() => {
    setPageUrl(window.location.href);
  }, [open]);

  // Inject sharing meta tags for Lyra
  useEffect(() => {
    const prev = {
      ogTitle: document.head.querySelector('meta[property="og:title"]')?.getAttribute("content") || "",
      ogDesc: document.head.querySelector('meta[property="og:description"]')?.getAttribute("content") || "",
      ogImage: document.head.querySelector('meta[property="og:image"]')?.getAttribute("content") || "",
      twTitle: document.head.querySelector('meta[name="twitter:title"]')?.getAttribute("content") || "",
      twDesc: document.head.querySelector('meta[name="twitter:description"]')?.getAttribute("content") || "",
      twImage: document.head.querySelector('meta[name="twitter:image"]')?.getAttribute("content") || "",
    };
    const origin = window.location.origin;
    const img = origin + lyraHero;
    const desc = MODEL.overview.join(" · ");
    setMeta('meta[property="og:title"]', "content", MODEL.name);
    setMeta('meta[property="og:description"]', "content", desc);
    setMeta('meta[property="og:image"]', "content", img);
    setMeta('meta[name="twitter:title"]', "content", MODEL.name);
    setMeta('meta[name="twitter:description"]', "content", desc);
    setMeta('meta[name="twitter:image"]', "content", img);
    return () => {
      if (prev.ogTitle) setMeta('meta[property="og:title"]', "content", prev.ogTitle);
      if (prev.ogDesc) setMeta('meta[property="og:description"]', "content", prev.ogDesc);
      if (prev.ogImage) setMeta('meta[property="og:image"]', "content", prev.ogImage);
      if (prev.twTitle) setMeta('meta[name="twitter:title"]', "content", prev.twTitle);
      if (prev.twDesc) setMeta('meta[name="twitter:description"]', "content", prev.twDesc);
      if (prev.twImage) setMeta('meta[name="twitter:image"]', "content", prev.twImage);
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyLabel("copied");
      setTimeout(() => setCopyLabel("copy link"), 1400);
    } catch {
      setCopyLabel("failed");
      setTimeout(() => setCopyLabel("copy link"), 1400);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    const text = MODEL.overview.join(" · ");
    if (navigator.share) {
      try {
        await navigator.share({ title: MODEL.name, text, url });
        return;
      } catch {
        // user dismissed — fall through
        return;
      }
    }
    // Fallback: copy link
    handleCopy();
    setShareLabel("link copied");
    setTimeout(() => setShareLabel("system share"), 1400);
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
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=0&color=2A2A2A&bgcolor=F5EFEB&data=${encodeURIComponent(pageUrl)}`
    : "";

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
          background:rgba(20,20,20,0.18);
          z-index:70; opacity:0; pointer-events:none;
          transition:opacity .55s cubic-bezier(0.22,0.61,0.36,1);
        }
        .lyra-info-overlay.open{ opacity:1; pointer-events:auto; }
        .lyra-info-panel{
          position:fixed; top:0; right:0; height:100%;
          width:38%; max-width:480px; min-width:360px;
          background:#F5EFEB;
          z-index:71;
          transform:translateX(100%);
          transition:transform .65s cubic-bezier(0.22,0.61,0.36,1);
          padding:48px 44px 56px;
          overflow-y:auto;
          font-family:'Manrope',system-ui,sans-serif;
          font-weight:300;
          font-size:13px; line-height:1.6;
          color:#3A3A3A;
          letter-spacing:0.01em;
        }
        .lyra-info-panel.open{ transform:translateX(0); }
        @media(max-width:768px){
          .lyra-info-panel{ width:100%; min-width:0; max-width:none; padding:36px 28px 48px; }
        }
        .lyra-info-close{
          position:absolute; top:18px; right:22px;
          background:transparent; border:none; cursor:pointer;
          font-size:26px; color:#6A6A6A; line-height:1;
          font-weight:200;
          transition:color .2s ease;
        }
        .lyra-info-close:hover{ color:#1A1A1A; }

        .li-header{ display:flex; align-items:baseline; justify-content:space-between; gap:16px; margin-bottom:6px; }
        .li-title{ font-size:22px; font-weight:400; letter-spacing:0.12em; color:#1F1F1F; margin:0; }
        .li-status{
          font-size:10px; letter-spacing:0.22em; text-transform:uppercase;
          color:#7A7A7A; padding:3px 8px; border:1px solid rgba(0,0,0,0.18);
          border-radius:2px; font-weight:400;
        }
        .li-subtitle{ font-size:11px; letter-spacing:0.18em; text-transform:uppercase; color:#8A8A8A; margin-bottom:34px; }

        .li-section{ margin-bottom:28px; }
        .li-section-title{
          font-size:10px; letter-spacing:0.22em; text-transform:uppercase;
          color:#9A9A9A; margin-bottom:12px; font-weight:400;
        }
        .li-overview p{ margin:0 0 4px; color:#3A3A3A; font-size:13px; }

        .li-row{
          display:flex; justify-content:space-between; gap:16px;
          padding:7px 0; border-bottom:1px solid rgba(0,0,0,0.06);
        }
        .li-row:last-child{ border-bottom:none; }
        .li-row .k{ color:#7A7A7A; text-transform:lowercase; }
        .li-row .v{ color:#2A2A2A; }

        .li-list div{ padding:5px 0; color:#3A3A3A; }

        .li-divider{
          height:1px; background:rgba(0,0,0,0.08);
          margin:32px 0;
        }

        .li-share-actions{ display:flex; flex-direction:column; gap:8px; margin-bottom:20px; }
        .li-btn{
          display:flex; align-items:center; justify-content:space-between;
          padding:12px 14px;
          background:transparent;
          border:1px solid rgba(0,0,0,0.18);
          border-radius:2px;
          font-family:inherit; font-size:12px; font-weight:400;
          color:#2A2A2A; letter-spacing:0.06em; text-transform:lowercase;
          cursor:pointer;
          transition:background .2s ease, border-color .2s ease, color .2s ease;
        }
        .li-btn:hover{ background:rgba(0,0,0,0.04); border-color:rgba(0,0,0,0.32); }
        .li-btn .arrow{ color:#9A9A9A; font-size:14px; }

        .li-qr{
          display:flex; align-items:center; gap:18px;
          padding:14px; background:rgba(255,255,255,0.5);
          border:1px solid rgba(0,0,0,0.06);
        }
        .li-qr img{ width:90px; height:90px; display:block; }
        .li-qr-meta{ font-size:11px; color:#7A7A7A; line-height:1.5; word-break:break-all; }

        .li-contact a{
          display:block; color:#2A2A2A; text-decoration:none;
          padding:8px 0; border-bottom:1px solid rgba(0,0,0,0.06);
          letter-spacing:0.04em;
          transition:color .2s ease;
        }
        .li-contact a:last-child{ border-bottom:none; }
        .li-contact a:hover{ color:#C97A63; }
      `}</style>

      {showTrigger && (
        <button
          className="lyra-info-btn"
          aria-label="info"
          onClick={() => setOpen(true)}
        >
          info
        </button>
      )}

      <div
        className={`lyra-info-overlay ${open ? "open" : ""}`}
        onClick={() => setOpen(false)}
      />

      <aside className={`lyra-info-panel ${open ? "open" : ""}`} aria-hidden={!open}>
        <button className="lyra-info-close" aria-label="close" onClick={() => setOpen(false)}>×</button>

        {/* 1. HEADER */}
        <div className="li-header">
          <h2 className="li-title">{MODEL.name}</h2>
          <span className="li-status">{MODEL.status}</span>
        </div>
        <div className="li-subtitle">{MODEL.subtitle}</div>

        {/* 2. OVERVIEW */}
        <div className="li-section li-overview">
          {MODEL.overview.map((line) => <p key={line}>{line}</p>)}
        </div>

        {/* 3. SPECIFICATIONS */}
        <div className="li-section">
          <div className="li-section-title">specifications</div>
          <div className="li-row"><span className="k">height</span><span className="v">{MODEL.dimensions.height}</span></div>
          <div className="li-row"><span className="k">width</span><span className="v">{MODEL.dimensions.width}</span></div>
          <div className="li-row"><span className="k">length</span><span className="v">{MODEL.dimensions.length}</span></div>
        </div>

        {/* 4. STRUCTURE */}
        <div className="li-section">
          <div className="li-section-title">structure</div>
          <div className="li-list">
            {MODEL.structure.map((s) => <div key={s}>{s}</div>)}
          </div>
        </div>

        {/* 5. MATERIAL */}
        <div className="li-section">
          <div className="li-section-title">material</div>
          <div className="li-row"><span className="k">textile</span><span className="v">{MODEL.material.textile}</span></div>
          <div className="li-row"><span className="k">frame</span><span className="v">{MODEL.material.frame}</span></div>
          <div className="li-row"><span className="k">color</span><span className="v">{MODEL.material.color}</span></div>
        </div>

        {/* 6. DIVIDER */}
        <div className="li-divider" />

        {/* 7. SHARE MODEL */}
        <div className="li-section">
          <div className="li-section-title">share model</div>
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
              scan to open<br />
              <span style={{ color: "#9A9A9A" }}>{pageUrl}</span>
            </div>
          </div>
        </div>

        <div className="li-divider" />

        {/* 8. CONTACT */}
        <div className="li-section li-contact">
          <div className="li-section-title">contact</div>
          <a href={MODEL.contact.telegram} target="_blank" rel="noreferrer">telegram</a>
          <a href={`mailto:${MODEL.contact.email}`}>email</a>
        </div>
      </aside>
    </>
  );
};

export default LyraInfo;

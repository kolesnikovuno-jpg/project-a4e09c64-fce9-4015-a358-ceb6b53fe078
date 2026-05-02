import { useEffect, useState } from "react";

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
  dimensions: { height: "1500 mm", width: "840 mm", length: "1750 mm" },
  structure: ["tension system", "flexible support"],
  material: { textile: "DYNEEMA weaving cord", frame: "plywood and paint", color: "customizable" },
  contact: {
    telegram: "https://t.me/kolesnikov_uno",
    email: "kolesnikov.uno@gmail.com",
  },
};

const LyraInfo = ({ showTrigger = true }: Props) => {
  const [open, setOpen] = useState(false);
  const [copyLabel, setCopyLabel] = useState("copy link");
  const [shareLabel, setShareLabel] = useState("system share");
  const [pageUrl, setPageUrl] = useState("");

  useEffect(() => {
    setPageUrl(window.location.href);
  }, [open]);

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
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=0&qzone=1&color=2A2A2A&bgcolor=F5EFEB&data=${encodeURIComponent(pageUrl)}`
    : "";

  const today = new Date().toISOString().slice(0, 10);
  const ref = "uno / lyra / 001";

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

        {/* document meta */}
        <div className="li-doc-meta">
          <span>ref · {ref}</span>
          <span>{today}</span>
        </div>

        {/* 1. HEADER */}
        <h2 className="li-title">{MODEL.name}</h2>
        <div className="li-headrow">
          <span>model · <b>chair</b></span>
          <span>status · <b>{MODEL.status}</b></span>
        </div>

        <div style={{ height: 22 }} />
        <hr className="li-rule" />

        {/* 2. OVERVIEW */}
        <div className="li-section li-overview">
          <div className="li-section-title">overview</div>
          {MODEL.overview.map((line) => <p key={line}>{line}</p>)}
        </div>

        <hr className="li-rule" />

        {/* 3. SPECIFICATIONS */}
        <div className="li-section">
          <div className="li-section-title">specifications</div>
          <div className="li-row"><span className="k">height</span><span className="v">{MODEL.dimensions.height}</span></div>
          <div className="li-row"><span className="k">width</span><span className="v">{MODEL.dimensions.width}</span></div>
          <div className="li-row"><span className="k">length</span><span className="v">{MODEL.dimensions.length}</span></div>
        </div>

        <hr className="li-rule" />

        {/* 4. STRUCTURE */}
        <div className="li-section">
          <div className="li-section-title">structure</div>
          <div className="li-list">
            {MODEL.structure.map((s) => <div key={s}>{s}</div>)}
          </div>
        </div>

        <hr className="li-rule" />

        {/* 5. MATERIAL */}
        <div className="li-section">
          <div className="li-section-title">material</div>
          <div className="li-row"><span className="k">textile</span><span className="v">{MODEL.material.textile}</span></div>
          <div className="li-row"><span className="k">frame</span><span className="v">{MODEL.material.frame}</span></div>
          <div className="li-row"><span className="k">color</span><span className="v">{MODEL.material.color}</span></div>
        </div>

        <hr className="li-rule thick" />

        {/* 6. SHARE */}
        <div className="li-section">
          <div className="li-section-title">share · reference</div>
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
              <b>scan · transmit</b>
              {pageUrl}
            </div>
          </div>
        </div>

        <hr className="li-rule" />

        {/* 7. CONTACT */}
        <div className="li-section li-contact">
          <div className="li-section-title">contact</div>
          <a href={MODEL.contact.telegram} target="_blank" rel="noreferrer">
            <span>telegram</span><span>↗</span>
          </a>
          <a href={`mailto:${MODEL.contact.email}`}>
            <span>email</span><span>↗</span>
          </a>
        </div>

        <div className="li-foot">
          <span>uno · studio</span>
          <span>kolesnikov</span>
        </div>
      </aside>
    </>
  );
};

export default LyraInfo;

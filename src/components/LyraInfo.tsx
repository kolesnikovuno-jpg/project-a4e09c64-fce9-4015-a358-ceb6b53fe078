import { useEffect, useState } from "react";

const LyraInfo = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <style>{`
        .lyra-info-btn{
          position:fixed; right:22px; bottom:22px; z-index:60;
          width:38px; height:38px; border-radius:50%;
          background:
            radial-gradient(circle at 32% 28%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.55) 22%, rgba(255,255,255,0.18) 55%, rgba(220,228,232,0.25) 100%),
            radial-gradient(circle at 65% 85%, rgba(86,124,141,0.18) 0%, rgba(86,124,141,0) 60%);
          backdrop-filter:blur(10px);
          -webkit-backdrop-filter:blur(10px);
          border:1px solid rgba(86,124,141,0.25);
          box-shadow:
            inset 0 1px 1.5px rgba(255,255,255,0.9),
            inset 0 -2px 3px rgba(86,124,141,0.18),
            0 4px 10px rgba(86,124,141,0.18),
            0 1px 2px rgba(0,0,0,0.06);
          padding:0; cursor:pointer; position:fixed;
          display:flex; align-items:center; justify-content:center;
          transition:transform .25s ease, box-shadow .25s ease;
          opacity:0.95;
        }
        .lyra-info-btn:hover{
          transform:translateY(-1px);
          box-shadow:
            inset 0 1px 1.5px rgba(255,255,255,0.95),
            inset 0 -2px 3px rgba(86,124,141,0.22),
            0 6px 14px rgba(86,124,141,0.25),
            0 1px 2px rgba(0,0,0,0.08);
          opacity:1;
        }
        .lyra-info-btn:active{
          transform:translateY(0);
          box-shadow:
            inset 0 1px 1px rgba(255,255,255,0.7),
            inset 0 -1px 2px rgba(86,124,141,0.15),
            0 2px 6px rgba(86,124,141,0.18);
        }
        .lyra-info-btn .icon-wrap{
          position:relative;
          display:flex; align-items:center; justify-content:center;
          filter: drop-shadow(0 1px 1px rgba(86,124,141,0.35));
          transform: translateY(-0.5px);
        }
        .lyra-info-btn svg{ display:block; }
        @media(max-width:768px){
          .lyra-info-btn{ width:42px; height:42px; right:16px; bottom:16px; }
        }
        .lyra-info-overlay{
          position:fixed; inset:0; background:rgba(0,0,0,0.1);
          z-index:70; opacity:0; pointer-events:none;
          transition:opacity .25s ease-out;
        }
        .lyra-info-overlay.open{ opacity:1; pointer-events:auto; }
        .lyra-info-panel{
          position:fixed; top:0; right:0; height:100%;
          width:65%; max-width:720px;
          background:rgba(255,255,255,0.85);
          backdrop-filter:blur(12px);
          -webkit-backdrop-filter:blur(12px);
          z-index:71;
          transform:translateX(100%);
          transition:transform .25s ease-out;
          padding:36px;
          overflow-y:auto;
          font-family:ui-monospace,'SF Mono','JetBrains Mono',monospace;
          font-size:13px; line-height:1.7; color:#222;
          text-transform:lowercase;
        }
        .lyra-info-panel.open{ transform:translateX(0); }
        @media(max-width:768px){
          .lyra-info-panel{ width:100%; padding:28px; }
        }
        .lyra-info-close{
          position:absolute; top:18px; right:22px;
          background:transparent; border:none; cursor:pointer;
          font-size:20px; color:#222; line-height:1;
          font-family:inherit;
        }
        .lyra-info-panel h2{
          font-size:13px; font-weight:400; margin:0 0 28px;
          letter-spacing:0.1em;
        }
        .lyra-info-panel .section-title{
          margin:24px 0 8px; color:#888;
        }
        .lyra-info-panel .row{
          display:flex; gap:16px;
        }
        .lyra-info-panel .row span:first-child{
          min-width:88px; color:#666;
        }
        .lyra-info-panel hr{
          border:none; border-top:1px dashed rgba(0,0,0,0.15);
          margin:24px 0;
        }
        .lyra-info-panel a{ color:#222; text-decoration:underline; text-underline-offset:2px; }
      `}</style>

      <button
        className="lyra-info-btn"
        aria-label="info"
        onClick={() => setOpen(true)}
      >
        <span className="icon-wrap">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <circle cx="7" cy="3" r="0.9" fill="#567C8D" />
            <line x1="7" y1="6" x2="7" y2="11" stroke="#567C8D" strokeWidth="1" strokeLinecap="round" />
          </svg>
        </span>
      </button>

      <div
        className={`lyra-info-overlay ${open ? "open" : ""}`}
        onClick={() => setOpen(false)}
      />

      <aside className={`lyra-info-panel ${open ? "open" : ""}`} aria-hidden={!open}>
        <button className="lyra-info-close" aria-label="close" onClick={() => setOpen(false)}>×</button>

        <h2>lyra</h2>

        <div className="section-title">specifications</div>

        <div className="section-title">dimensions</div>
        <div className="row"><span>height</span><span>…</span></div>
        <div className="row"><span>width</span><span>…</span></div>

        <div className="section-title">structure</div>
        <div>tension system</div>
        <div>flexible support</div>

        <div className="section-title">material</div>
        <div className="row"><span>textile</span><span>…</span></div>
        <div className="row"><span>frame</span><span>…</span></div>

        <div className="section-title">color</div>
        <div>customizable</div>

        <hr />

        <div className="section-title">price</div>
        <div>from …</div>

        <hr />

        <div className="section-title">contact</div>
        <div className="row">
          <span>telegram</span>
          <a href="https://t.me/kolesnikov_uno" target="_blank" rel="noreferrer">t.me/kolesnikov_uno</a>
        </div>
        <div className="row">
          <span>email</span>
          <a href="mailto:kolesnikov.uno@gmail.com">kolesnikov.uno@gmail.com</a>
        </div>
      </aside>
    </>
  );
};

export default LyraInfo;

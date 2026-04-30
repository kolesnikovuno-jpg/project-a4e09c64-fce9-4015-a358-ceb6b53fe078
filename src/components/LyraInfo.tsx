import { useEffect, useState } from "react";

type Props = { showTrigger?: boolean };

const LyraInfo = ({ showTrigger = true }: Props) => {
  const [open, setOpen] = useState(false);

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
          position:fixed; inset:0; background:rgba(0,0,0,0.1);
          z-index:70; opacity:0; pointer-events:none;
          transition:opacity .25s ease-out;
        }
        .lyra-info-overlay.open{ opacity:1; pointer-events:auto; }
        .lyra-info-overlay{ background:transparent; }
        .lyra-info-panel{
          position:fixed; top:0; right:0; height:100%;
          width:33.3333%; max-width:520px;
          background:rgba(255,255,255,0.96);
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
          font-size:32px; color:#555; line-height:1;
          font-family:'Manrope',system-ui,sans-serif; font-weight:100;
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

        <h2>lyra</h2>

        <div className="section-title">specifications</div>

        <div className="section-title">dimensions</div>
        <div className="row"><span>height</span><span>…</span></div>
        <div className="row"><span>width</span><span>…</span></div>
        <div className="row"><span>length</span><span>…</span></div>

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
        <div className="row" style={{ marginTop: 8 }}>
          <a href="https://t.me/kolesnikov_uno" target="_blank" rel="noreferrer">telegram</a>
        </div>
        <div className="row" style={{ marginTop: 18 }}>
          <a href="mailto:kolesnikov.uno@gmail.com">email</a>
        </div>
      </aside>
    </>
  );
};

export default LyraInfo;

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        alt?: string;
        "camera-controls"?: boolean | string;
        "interaction-prompt"?: string;
        "auto-rotate"?: boolean | string;
        "auto-rotate-delay"?: string;
        "rotation-per-second"?: string;
        "environment-image"?: string;
        exposure?: string;
        "shadow-intensity"?: string;
        "shadow-softness"?: string;
        "camera-orbit"?: string;
        "field-of-view"?: string;
        "camera-target"?: string;
        ar?: boolean | string;
        "ar-modes"?: string;
        "ar-scale"?: string;
        "ios-src"?: string;
        crossorigin?: string;
        referrerpolicy?: string;
      };
    }
  }
}

const GLB_URL = "https://mpmftrhzuldtasfelrgz.supabase.co/storage/v1/object/public/models/lyra.glb";
const USDZ_URL = "https://mpmftrhzuldtasfelrgz.supabase.co/storage/v1/object/public/models/lyra.usdz";

const Lyra = () => {
  const navigate = useNavigate();
  const modelRef = useRef<HTMLElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  const [modelLoaded, setModelLoaded] = useState(false);

  useEffect(() => {
    if (!customElements.get("model-viewer")) {
      const script = document.createElement("script");
      script.type = "module";
      script.src = "https://ajax.googleapis.com/ajax/libs/model-viewer/3.0.1/model-viewer.min.js";
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    const mv = modelRef.current;
    const loader = loaderRef.current;
    if (!mv || !loader) return;

    const onLoad = () => {
      loader.classList.add("hide");
      (mv as any).cameraTarget = "auto";
      (mv as any).cameraOrbit = "12deg 70deg 300%";
      (mv as any).fieldOfView = "28deg";
      const had = mv.hasAttribute("auto-rotate");
      mv.removeAttribute("auto-rotate");
      requestAnimationFrame(() => {
        if (had) mv.setAttribute("auto-rotate", "");
      });
      setTimeout(() => setModelLoaded(true), 600);
    };

    mv.addEventListener("load", onLoad);
    return () => mv.removeEventListener("load", onLoad);
  }, []);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center relative">
      {/* Back arrow */}
      <button
        onClick={() => navigate("/garden")}
        className="absolute top-8 left-8 p-2 text-[hsl(168_40%_52%)] hover:text-[hsl(168_40%_72%)] transition-colors duration-300 z-10"
        aria-label="Назад"
      >
        <ChevronLeft size={24} strokeWidth={1} />
      </button>

      

      <style>{`
        .uno-3d-wrap{
          --pad:clamp(12px,1.8vw,24px);
          position:relative;
          width:min(1100px,100%);
          margin:0 auto;
          padding:var(--pad);
          box-sizing:border-box;
        }
        .uno-3d-stage{
          position:relative;
          height:clamp(420px,62vw,640px);
          border-radius:18px;
          overflow:hidden;
          background:#fff;
        }
        model-viewer::part(default-progress-bar){display:none;}
        .uno-loader{
          position:absolute;inset:0;
          display:flex;align-items:center;justify-content:center;
          background:#fff;z-index:2;
          transition:opacity .6s ease;
        }
        .uno-loader.hide{opacity:0;pointer-events:none;}
        .uno-sphere{
          width:52px;height:52px;border-radius:50%;
          border:2.5px solid hsl(168 40% 72% / 0.18);
          border-top-color:hsl(168 40% 72% / 0.85);
          animation:unoSpin 1s cubic-bezier(.4,.15,.6,.85) infinite;
          box-shadow:0 0 18px hsl(168 40% 72% / 0.12);
          position:relative;
        }
        .uno-sphere::after{
          content:'';position:absolute;inset:6px;border-radius:50%;
          border:2px solid hsl(168 40% 72% / 0.1);
          border-bottom-color:hsl(168 40% 72% / 0.5);
          animation:unoSpin 1.6s cubic-bezier(.4,.15,.6,.85) infinite reverse;
        }
        @keyframes unoSpin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
        .uno-overlay{
          position:absolute;bottom:32px;left:32px;z-index:4;
          pointer-events:none;
        }
        .uno-overlay h1{
          font-family:'SF Pro Display',system-ui,-apple-system,sans-serif;
          font-size:clamp(22px,3.2vw,38px);font-weight:300;
          letter-spacing:0.04em;color:#222;margin:0 0 6px;
          opacity:0;transform:translateY(12px);
          transition:opacity .8s ease, transform .8s ease;
        }
        .uno-overlay p{
          font-family:'SF Pro Text',system-ui,-apple-system,sans-serif;
          font-size:clamp(12px,1.6vw,16px);font-weight:300;
          letter-spacing:0.02em;color:#888;margin:0;
          opacity:0;transform:translateY(12px);
          transition:opacity .8s ease .25s, transform .8s ease .25s;
        }
        .uno-overlay.visible h1,
        .uno-overlay.visible p{
          opacity:1;transform:translateY(0);
        }
        .uno-ar{
          position:absolute;right:14px;top:14px;
          width:40px;height:40px;border:none;border-radius:50%;
          background:transparent;display:flex;align-items:center;justify-content:center;
          cursor:pointer;transition:all .25s ease;z-index:3;opacity:0.6;
        }
        .uno-ar:hover{opacity:1;transform:scale(1.05);}
        .uno-ar svg{stroke:#999;transition:stroke .25s ease;}
        .uno-ar:hover svg{stroke:#000;}
        @media(max-width:768px){
          .uno-ar{width:52px;height:52px;right:10px;top:10px;opacity:0.7;}
          .uno-ar svg{width:26px;height:26px;}
        }
        .uno-stem-05{
          position:absolute;
          right:34px;
          bottom:-4px;
          height:calc(100% - 32px);
          width:0;
          z-index:5;
          overflow:visible;
          pointer-events:none;
        }
        .uno-stem-05 svg{
          position:absolute;
          left:50%;
          bottom:0;
          height:100%;
          transform:translateX(-50%);
          overflow:visible;
          pointer-events:none;
        }
        .uno-stem-05 .stem-bud{cursor:pointer;pointer-events:auto;}
        .uno-stem-05 .stem-bud:hover circle:first-child{
          stroke-width:1.8;
          filter:drop-shadow(0 0 6px hsl(168 40% 72% / 0.5));
        }
        @media(max-width:768px){
          .uno-stem-05{
            right:36px;
            bottom:6px;
          }
        }
      `}</style>

      <div className="uno-3d-wrap">
        <div className="uno-3d-stage">
          <div className="uno-loader" ref={loaderRef}>
            <div className="uno-sphere" />
          </div>

          {/* Desktop overlay — inside stage */}
          <div className={`uno-overlay hidden md:block ${modelLoaded ? 'visible' : ''}`}>
            <h1>Контур отдыха</h1>
            <p>Чем меньше усилия — тем точнее поддержка.</p>
          </div>

          <model-viewer
            ref={modelRef as any}
            src={GLB_URL}
            alt="Lyra — Kolesnikov.UNO"
            camera-controls
            interaction-prompt="none"
            auto-rotate
            auto-rotate-delay="1200"
            rotation-per-second="20deg"
            environment-image="neutral"
            exposure="1.45"
            shadow-intensity="0"
            shadow-softness="0"
            camera-orbit="12deg 70deg 300%"
            field-of-view="28deg"
            crossorigin="anonymous"
            referrerpolicy="no-referrer"
            style={{
              width: "100%",
              height: "100%",
              display: "block",
              background: "#fff",
            }}
            ar
            ar-modes="webxr scene-viewer quick-look"
            ar-scale="auto"
            ios-src={USDZ_URL}
          >
            <img
              slot="poster"
              alt=""
              src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
            />
            <button slot="ar-button" className="uno-ar" aria-label="View in AR" title="AR">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
                <path d="M7 7L17 17M17 7L7 17" stroke="#aaa" strokeWidth="1" />
              </svg>
            </button>
          </model-viewer>

          {/* Stem 05 — garden proportions (viewBox 100×600, stem 410/600) */}
          <div className="uno-stem-05">
            <svg viewBox="-50 0 100 600" preserveAspectRatio="xMidYMax meet" xmlns="http://www.w3.org/2000/svg">
              {/* Ground line at y=560 (same as garden gY) */}
              <line x1="-30" y1="560" x2="30" y2="560" stroke="hsl(168 40% 52%)" strokeWidth="0.8" />
              {/* Vertical stem: from ground (560) to top (150 = 560-410) */}
              <line x1="0" y1="560" x2="0" y2="150" stroke="hsl(168 40% 52%)" strokeWidth="0.8" />
              {/* Top bud — 05 → /lyra, r=14, outline */}
              <g className="stem-bud" role="button" tabIndex={0} onClick={() => navigate("/lyra")}>
                <circle cx="0" cy="150" r="14" fill="none" stroke="hsl(168 40% 52%)" strokeWidth="0.8" />
                <circle cx="0" cy="150" r="20" fill="transparent" stroke="transparent" />
              </g>
              {/* Branch 05.2 — right */}
              <g className="stem-bud" role="button" tabIndex={0} onClick={() => navigate("/lyra")}>
                <line x1="0" y1="370" x2="22" y2="370" stroke="hsl(168 40% 52%)" strokeWidth="0.8" />
                <circle cx="22" cy="370" r="9" fill="none" stroke="hsl(168 40% 52%)" strokeWidth="0.8" />
                <circle cx="22" cy="370" r="16" fill="transparent" stroke="transparent" />
              </g>
              {/* Branch 2 — left */}
              <g className="stem-bud" role="button" tabIndex={0} onClick={() => console.log("05.2")}>
                <line x1="0" y1="250" x2="-28" y2="250" stroke="hsl(168 40% 52%)" strokeWidth="0.8" />
                <circle cx="-28" cy="250" r="6" fill="hsl(168 40% 72%)" stroke="hsl(168 40% 52%)" strokeWidth="0.8" />
                <circle cx="-28" cy="250" r="13" fill="transparent" stroke="transparent" />
              </g>
            </svg>
          </div>
        </div>

        {/* Mobile overlay — below stage */}
        <div className={`uno-overlay md:hidden ${modelLoaded ? 'visible' : ''}`}>
          <h1>Контур отдыха</h1>
          <p>Чем меньше усилия — тем точнее поддержка.</p>
        </div>
      </div>
    </div>
  );
};

export default Lyra;

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import PageTransition from "@/components/PageTransition";

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
      (mv as any).cameraOrbit = "-8deg 70deg 300%";
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
    <PageTransition>
    <div className="min-h-screen bg-white flex items-center justify-center relative overflow-x-hidden">
      {/* Back arrow */}
      <button
        onClick={() => navigate("/garden")}
        className="absolute top-8 left-8 p-2 text-[hsl(168_40%_52%)] hover:text-[#C97A63] transition-colors duration-300 z-10"
        aria-label="Назад"
      >
        <ChevronLeft size={24} strokeWidth={1} />
      </button>

      

      <style>{`
        .uno-3d-wrap{
          --pad:clamp(6px,0.9vw,12px);
          position:relative;
          width:min(1100px,100%);
          margin:0 auto;
          padding:var(--pad);
          box-sizing:border-box;
          overflow:visible;
        }
        .uno-3d-stage{
          position:relative;
          height:clamp(420px,62vw,640px);
          border-radius:18px;
          overflow:visible;
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
        .uno-pixel-cloud{
          position:relative;
          width:120px;height:120px;
        }
        .uno-pixel-cloud i{
          position:absolute;
          width:1.3px;height:1.3px;
          background:hsl(168 40% 58%);
          border-radius:0;
          opacity:0;
          animation:unoWave 3.6s ease-in-out infinite;
        }
        @keyframes unoWave{
          0%,100%{
            opacity:0;
            transform:translate(var(--tx,0),var(--ty,0)) scale(0.6);
          }
          25%{
            opacity:0.7;
            transform:translate(calc(var(--tx,0) + var(--wx,0)),calc(var(--ty,0) + var(--wy,0))) scale(1);
          }
          50%{
            opacity:0.45;
            transform:translate(calc(var(--tx,0) - var(--wx,0) * 0.6),calc(var(--ty,0) - var(--wy,0) * 0.6)) scale(0.85);
          }
          75%{
            opacity:0.6;
            transform:translate(calc(var(--tx,0) + var(--wx,0) * 0.4),calc(var(--ty,0) + var(--wy,0) * 0.4)) scale(0.95);
          }
        }
        .uno-overlay-below{
          padding:12px 20px 0;
          display: flex;
          flex-direction: row;
          align-items: baseline;
          gap: 8px;
        }
        .uno-overlay-below h1,
        .uno-overlay-below p{
          font-family:'Manrope',system-ui,sans-serif;
          margin:0;
          overflow:hidden;
          white-space:nowrap;
          width:0;
          border-right:1px solid transparent;
          display: inline-block;
        }
        .uno-overlay-below h1{
          font-size:15px;font-weight:500;
          letter-spacing:0.04em;color:hsl(168 40% 58%);
        }
        .uno-overlay-below p{
          font-size:clamp(11px,1.4vw,14px);font-weight:300;
          letter-spacing:0.04em;color:hsl(0 0% 45%);
        }
        /* Order in DOM: <p> then <h1>. Rotated -90deg → first line visually appears at bottom.
           Type <p> first, then <h1>. */
        .uno-overlay-below.visible p{
          animation:unoType 1.4s steps(40,end) .2s forwards,
                    unoCaret .7s step-end .2s 3;
        }
        .uno-overlay-below.visible h1{
          animation:unoType 1s steps(20,end) 1.7s forwards,
                    unoCaret .7s step-end 1.7s 2;
        }
        @keyframes unoType{
          from{width:0;}
          to{width:100%;}
        }
        @keyframes unoCaret{
          50%{border-right-color:hsl(168 40% 58% / 0.6);}
        }
        .uno-ar{
          position:absolute;right:14px;top:14px;
          width:40px;height:40px;border:none;border-radius:50%;
          background:transparent;display:flex;align-items:center;justify-content:center;
          cursor:pointer;transition:all .25s ease;z-index:3;opacity:0.7;
        }
        .uno-ar:hover{opacity:1;transform:scale(1.05);}
        .uno-ar svg{stroke:hsl(168 40% 52%);transition:stroke .25s ease;}
        .uno-ar:hover svg{stroke:hsl(168 40% 42%);}
        @media(max-width:768px){
          .uno-ar{width:52px;height:52px;right:10px;top:10px;opacity:0.75;}
          .uno-ar svg{width:26px;height:26px;}
        }
        .uno-stem-05{
          position:absolute;
          right:34px;
          bottom:-90px;
          height:calc(100% + 58px);
          width:0;
          z-index:5;
          overflow:visible;
          pointer-events:none;
          opacity:0.55;
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
            bottom:-80px;
            opacity:0.65;
          }
        }
      `}</style>

      <div className="uno-3d-wrap">
        <div className="uno-3d-stage">
          <div className="uno-loader" ref={loaderRef}>
            <div className="uno-pixel-cloud">
              {Array.from({ length: 70 }).map((_, i) => {
                const seed = (i * 9301 + 49297) % 233280;
                const rand = seed / 233280;
                const angle = rand * Math.PI * 2;
                const radius = 8 + Math.sqrt((i * 53) % 100) * 5.5;
                const tx = Math.cos(angle) * radius;
                const ty = Math.sin(angle) * radius * 0.75;
                const wAngle = angle + Math.PI / 2;
                const wAmp = 4 + ((i * 17) % 7);
                const wx = Math.cos(wAngle) * wAmp;
                const wy = Math.sin(wAngle) * wAmp;
                return (
                  <i
                    key={i}
                    style={{
                      left: "50%",
                      top: "50%",
                      ["--tx" as any]: `${tx}px`,
                      ["--ty" as any]: `${ty}px`,
                      ["--wx" as any]: `${wx}px`,
                      ["--wy" as any]: `${wy}px`,
                      animationDelay: `${(i * 0.05) % 3.6}s`,
                    }}
                  />
                );
              })}
            </div>
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
            camera-orbit="-8deg 70deg 300%"
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
              <svg width="22" height="22" viewBox="-1 -2 26 26" fill="none"
                stroke="hsl(168 40% 52%)" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
                <path d="M12 12l8-4.5" />
                <path d="M12 12v9" />
                <path d="M12 12L4 7.5" />
                <line x1="12" y1="3" x2="12" y2="-1" stroke="hsl(168 40% 52%)" strokeWidth="0.8" />
                <circle cx="12" cy="-1" r="1.2" fill="hsl(168 40% 52%)" stroke="none" />
              </svg>
            </button>
          </model-viewer>

          {/* Stem 05 */}
          <div className="uno-stem-05">
            <svg viewBox="-50 0 100 600" preserveAspectRatio="xMidYMax meet" xmlns="http://www.w3.org/2000/svg">
              <line x1="-30" y1="555" x2="30" y2="555" stroke="hsl(168 40% 52%)" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="0" y1="555" x2="0" y2="150" stroke="hsl(168 40% 52%)" strokeWidth="0.8" />
              <g className="stem-bud" role="button" tabIndex={0} onClick={() => navigate("/lyra")}>
                <circle cx="0" cy="150" r="14" fill="none" stroke="hsl(168 40% 52%)" strokeWidth="0.8" />
                <circle cx="0" cy="150" r="20" fill="transparent" stroke="transparent" />
              </g>
              <g className="stem-bud" role="button" tabIndex={0} onClick={() => navigate("/lyra")}>
                <line x1="0" y1="370" x2="22" y2="370" stroke="hsl(168 40% 52%)" strokeWidth="0.8" />
                <circle cx="22" cy="370" r="9" fill="none" stroke="hsl(168 40% 52%)" strokeWidth="0.8" />
                <circle cx="22" cy="370" r="16" fill="transparent" stroke="transparent" />
              </g>
              <g className="stem-bud" role="button" tabIndex={0} onClick={() => console.log("05.2")}>
                <line x1="0" y1="250" x2="-28" y2="250" stroke="hsl(168 40% 52%)" strokeWidth="0.8" />
                <circle cx="-28" cy="250" r="6" fill="hsl(168 40% 52% / 0.45)" stroke="hsl(168 40% 52%)" strokeWidth="0.8" />
                <circle cx="-28" cy="250" r="13" fill="transparent" stroke="transparent" />
              </g>
            </svg>
          </div>

          <div
            className={`uno-overlay-below ${modelLoaded ? 'visible' : ''}`}
            style={{
              transform: 'rotate(-90deg)',
              transformOrigin: 'left top',
              position: 'absolute',
              left: '12px',
             bottom: '-110px',
              padding: 0,
              whiteSpace: 'nowrap',
              zIndex: 4,
            }}
          >
            <p>Чем меньше усилия — тем точнее поддержка.</p>
            <h1>контур отдыха</h1>
          </div>
        </div>
      </div>
    </div>
    </PageTransition>
  );
};

export default Lyra;

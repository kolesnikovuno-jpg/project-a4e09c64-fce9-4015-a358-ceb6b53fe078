import { useEffect, useRef } from "react";

// Declare model-viewer as a custom element
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
        ar?: boolean | string;
        "ar-modes"?: string;
        "ar-scale"?: string;
        "ios-src"?: string;
      };
    }
  }
}

const Lyra = () => {
  const modelRef = useRef<HTMLElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);

  // Load model-viewer once
  useEffect(() => {
    if (!customElements.get("model-viewer")) {
      const script = document.createElement("script");
      script.type = "module";
      script.src = "https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js";
      document.head.appendChild(script);
    }
  }, []);

  // Loader logic
  useEffect(() => {
    const mv = modelRef.current;
    const loader = loaderRef.current;
    if (!mv || !loader) return;

    const onLoad = () => {
      loader.classList.add("hide");
    };

    mv.addEventListener("load", onLoad);

    return () => {
      mv.removeEventListener("load", onLoad);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        .uno-3d-wrap{
          --pad:clamp(12px,1.8vw,24px);
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

        model-viewer::part(default-progress-bar){
          display:none;
        }

        .uno-loader{
          position:absolute;
          inset:0;
          display:flex;
          align-items:center;
          justify-content:center;
          background:#fff;
          z-index:2;
          transition:opacity .6s ease;
        }

        .uno-loader.hide{
          opacity:0;
          pointer-events:none;
        }

        .uno-sphere{
          width:46px;
          height:46px;
          border-radius:50%;
          background:radial-gradient(circle at 30% 30%,#e7e7e7 0%,#d9d9d9 60%,#c9c9c9 100%);
          animation:unoSpin 2.2s linear infinite;
          box-shadow:0 0 8px rgba(0,0,0,0.05);
        }

        @keyframes unoSpin{
          from{transform:rotate(0deg);}
          to{transform:rotate(360deg);}
        }

        .uno-ar{
          position:absolute;
          right:14px;
          top:14px;
          width:40px;
          height:40px;
          border:none;
          border-radius:50%;
          background:transparent;
          display:flex;
          align-items:center;
          justify-content:center;
          cursor:pointer;
          opacity:0.6;
          z-index:3;
        }

        .uno-ar:hover{
          opacity:1;
        }
      `}</style>

      <div className="uno-3d-wrap">
        <div className="uno-3d-stage">
          {/* Loader */}
          <div className="uno-loader" ref={loaderRef}>
            <div className="uno-sphere" />
          </div>

          {/* Model */}
          <model-viewer
            ref={modelRef as any}
            src="https://my-uno-model.b-cdn.net/VITA.glb"
            alt="Lyra — Kolesnikov.UNO"
            camera-controls
            interaction-prompt="none"
            auto-rotate
            auto-rotate-delay="1200"
            rotation-per-second="20deg"
            environment-image="neutral"
            exposure="1.2"
            shadow-intensity="0"
            camera-orbit="auto"
            field-of-view="45deg"
            style={{
              width: "100%",
              height: "100%",
              display: "block",
              background: "#fff",
            }}
            ar
            ar-modes="webxr scene-viewer quick-look"
            ar-scale="auto"
            ios-src="https://my-uno-model.b-cdn.net/VITA.usdz"
          >
            <img
              slot="poster"
              alt=""
              src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
            />

            <button slot="ar-button" className="uno-ar" aria-label="AR">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </button>
          </model-viewer>
        </div>
      </div>
    </div>
  );
};

export default Lyra;

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import lyraHero from "@/assets/lyra-hero.png";

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
  const heroRef = useRef<HTMLElement>(null);
  const heroImgRef = useRef<HTMLImageElement>(null);
  const heroLensRef = useRef<HTMLDivElement>(null);
  const heroFoldRef = useRef<HTMLDivElement>(null);
  const heroWarpRef = useRef<HTMLDivElement>(null);

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

  // Responsive medium — LOCALIZED around a focal point (cursor / tilt vector).
  // - Base image stays perfectly still.
  // - A duplicate "lens" layer is masked by a radial gradient at the focal
  //   point and translated 1–2px along the drag direction (smooth falloff).
  // - Scroll within hero → vertical stretch + bottom "neck" via clip-path
  //   (kept as a separate, global guidance — not the local distortion).
  // - Lerp + micro-inertia (≈40ms) toward target; decays to 0 → silence.
  useEffect(() => {
    const hero = heroRef.current;
    const img = heroImgRef.current;
    const lens = heroLensRef.current;
    const fold = heroFoldRef.current;
    const warp = heroWarpRef.current;
    if (!hero || !img || !lens || !fold || !warp) return;

    const strips = Array.from(warp.children) as HTMLElement[];
    const N = strips.length;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    // Focal point in hero coordinates (px). Drag vector in normalized [-1, 1].
    let tFX = 0, tFY = 0;          // target focal point (px from hero top-left)
    let fx = 0, fy = 0;            // current focal point (lerped)
    let tDX = 0, tDY = 0;          // target drag direction in [-1, 1]
    let dx = 0, dy = 0;            // current drag (lerped, micro-inertia)
    let tIntensity = 0, intensity = 0; // 0 at rest, 1 while interacting
    let tS = 0, s = 0;        // scroll progress through hero in [0, 1]
    let lastInput = performance.now();
    let lastPX = 0, lastPY = 0;    // previous pointer for drag direction
    let hasLast = false;
    let raf = 0;

    const MAX_PX = 2;          // strict cap on local displacement
    const SMOOTH_FOCAL = 0.18; // focal point follows cursor briskly
    const SMOOTH_DRAG = 0.12;  // drag has slight inertia (~40ms perceived)
    const SMOOTH_INT = 0.10;   // intensity fades smoothly
    const REST_AFTER_MS = 120; // brief idle window before fading

    const setFocalFromClient = (clientX: number, clientY: number) => {
      const rect = hero.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      // Only respond when pointer is over hero.
      if (px < 0 || py < 0 || px > rect.width || py > rect.height) return;
      tFX = px;
      tFY = py;
      // Drag direction = pointer delta, normalized & clamped.
      if (hasLast) {
        const ddx = px - lastPX;
        const ddy = py - lastPY;
        const mag = Math.hypot(ddx, ddy);
        if (mag > 0.0001) {
          // Normalize by a small reference speed → saturates quickly.
          const k = Math.min(1, mag / 24);
          tDX = (ddx / mag) * k;
          tDY = (ddy / mag) * k;
        }
      }
      lastPX = px; lastPY = py; hasLast = true;
      tIntensity = 1;
      lastInput = performance.now();
    };

    const onMouse = (e: MouseEvent) => {
      setFocalFromClient(e.clientX, e.clientY);
    };

    const onTilt = (e: DeviceOrientationEvent) => {
      // Mobile: tilt sets focal point relative to hero center, drag = tilt vector.
      const rect = hero.getBoundingClientRect();
      const g = e.gamma ?? 0;
      const b = (e.beta ?? 0) - 30;
      const nx = Math.max(-1, Math.min(1, g / 20));
      const ny = Math.max(-1, Math.min(1, b / 20));
      tFX = rect.width / 2 + nx * (rect.width * 0.35);
      tFY = rect.height / 2 + ny * (rect.height * 0.35);
      tDX = nx;
      tDY = ny;
      tIntensity = Math.min(1, Math.hypot(nx, ny));
      lastInput = performance.now();
    };

    const onScroll = () => {
      const rect = hero.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, -rect.top / rect.height));
      tS = progress;
    };

    const tick = () => {
      const now = performance.now();
      // After idle window: fade drag + intensity to 0 → perfect stillness.
      if (now - lastInput > REST_AFTER_MS) {
        tDX *= 0.85;
        tDY *= 0.85;
        tIntensity *= 0.88;
        hasLast = false;
        if (Math.abs(tDX) < 0.001) tDX = 0;
        if (Math.abs(tDY) < 0.001) tDY = 0;
        if (tIntensity < 0.002) tIntensity = 0;
      }
      fx += (tFX - fx) * SMOOTH_FOCAL;
      fy += (tFY - fy) * SMOOTH_FOCAL;
      dx += (tDX - dx) * SMOOTH_DRAG;
      dy += (tDY - dy) * SMOOTH_DRAG;
      intensity += (tIntensity - intensity) * SMOOTH_INT;
      s += (tS - s) * 0.08;

      // Local displacement of the lens layer along drag direction.
      const tx = dx * MAX_PX * intensity;
      const ty = dy * MAX_PX * intensity;

      // Scroll-driven "fabric pull": center lifts up slightly, edges sag less.
      // Vertical stretch + tiny upward translate to suggest tension toward top.
      const sy = 1 + s * 0.05;
      const sx = 1 - s * 0.012;
      const tyImg = -s * 8; // center pulled up
      img.style.transform = `translate3d(0, ${tyImg}px, 0) scale(${sx}, ${sy})`;
      // Hide the flat base image once warp kicks in, so we only see the
      // deformed strips (no double image).
      img.style.opacity = String(Math.max(0, 1 - s * 2.2));

      // Lens layer = duplicate, displaced + radially masked at focal point.
      // Smooth falloff curve via radial-gradient stops (non-linear, soft edge).
      const rect = hero.getBoundingClientRect();
      const radius = Math.max(120, Math.min(rect.width, rect.height) * 0.22);
      const a = Math.max(0, Math.min(1, intensity));
      lens.style.transform = `translate3d(${tx}px, ${ty + tyImg}px, 0) scale(${sx}, ${sy})`;
      lens.style.opacity = String(a);
      lens.style.maskImage = `radial-gradient(circle ${radius}px at ${fx}px ${fy}px, hsl(0 0% 0% / 1) 0%, hsl(0 0% 0% / 0.85) 18%, hsl(0 0% 0% / 0.45) 45%, hsl(0 0% 0% / 0.12) 75%, hsl(0 0% 0% / 0) 100%)`;
      (lens.style as any).webkitMaskImage = lens.style.maskImage;

      // "Fabric fold": bottom edge is no longer straight — it curves inward
      // toward center, with the midpoint pulled UP (concave) to suggest
      // material being gathered. Top edge stays rigid.
      // We build an SVG-style path() with a smooth cubic curve along the bottom.
      const W = rect.width;
      const H = rect.height;
      // Horizontal pinch at bottom corners (px) — grows with scroll.
      const pinch = s * (W * 0.18);
      // Vertical lift of the bottom-center (px) — the "fold" depth.
      const lift = s * (H * 0.12);
      // Control points sit ~25% from each side, pulled up by `lift`.
      const blX = pinch;
      const brX = W - pinch;
      const cy = H - lift; // center-bottom y
      const c1x = W * 0.28;
      const c2x = W * 0.72;
      const c1y = H - lift * 0.55;
      const c2y = H - lift * 0.55;
      // Path: top-left → top-right → bottom-right corner → cubic curve to
      // bottom-left corner (passing through lifted center) → close.
      const path =
        `M 0 0 L ${W} 0 L ${brX} ${H} ` +
        `C ${c2x} ${c2y}, ${c1x} ${c1y}, ${blX} ${H} Z`;
      hero.style.clipPath = `path('${path}')`;
      (hero.style as any).webkitClipPath = `path('${path}')`;

      // ===== Real image deformation via vertical strip warp =====
      // Each strip shows the same image but offset by background-position-x
      // and is deformed individually: lifted in the center, stretched at the
      // edges. This bends the actual pixels (not just clips them).
      // Activates progressively with `s`.
      const warpAmt = Math.min(1, s * 1.4);
      warp.style.opacity = String(warpAmt);
      if (warpAmt > 0.001) {
        for (let i = 0; i < N; i++) {
          const u = (i + 0.5) / N;       // 0..1 across width
          const d = (u - 0.5) * 2;       // -1..1 from center
          // Cosine profile: center lifts up most, edges stay near bottom.
          const lift = Math.cos(d * Math.PI * 0.5); // 1 at center, 0 at edges
          const sag = -lift * H * 0.10 * s;          // upward translate
          // Edges shrink vertically (gathered/folded), center stays tall.
          const stripSY = 1 - (1 - lift) * 0.18 * s;
          // Slight horizontal pull toward center.
          const stripTX = -d * W * 0.04 * s;
          const el = strips[i];
          el.style.transform =
            `translate3d(${stripTX}px, ${sag}px, 0) scaleY(${stripSY})`;
        }
      }

      // Soft darkening gradient that strengthens the fold (bottom-center shadow).
      // Opacity grows with scroll; radial focus near the lifted midpoint.
      const foldA = Math.min(0.22, s * 0.28);
      fold.style.opacity = String(s);
      fold.style.background =
        `radial-gradient(ellipse 70% 38% at 50% ${100 - (lift / H) * 100}%, ` +
        `hsl(0 0% 0% / ${foldA}) 0%, hsl(0 0% 0% / 0) 70%), ` +
        `linear-gradient(to bottom, transparent 55%, hsl(0 0% 0% / ${foldA * 0.6}) 100%)`;

      // Stop the loop only when fully at rest AND scrolled to top.
      const stillRest =
        Math.abs(dx) < 0.0005 &&
        Math.abs(dy) < 0.0005 &&
        intensity < 0.002 &&
        Math.abs(s - tS) < 0.0005;
      if (stillRest && tS === 0 && tDX === 0 && tDY === 0 && tIntensity === 0) {
        img.style.transform = `translate3d(0,0,0) scale(1,1)`;
        img.style.opacity = "1";
        lens.style.opacity = "0";
        lens.style.transform = `translate3d(0,0,0) scale(1,1)`;
        hero.style.clipPath = `polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)`;
        (hero.style as any).webkitClipPath = `polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)`;
        fold.style.opacity = "0";
        warp.style.opacity = "0";
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const ensureLoop = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onMouseWake = (e: MouseEvent) => { onMouse(e); ensureLoop(); };
    const onLeave = () => {
      tDX = 0; tDY = 0; tIntensity = 0; hasLast = false;
      lastInput = 0; // force fade immediately
      ensureLoop();
    };
    const onTiltWake = (e: DeviceOrientationEvent) => { onTilt(e); ensureLoop(); };
    const onScrollWake = () => { onScroll(); ensureLoop(); };

    window.addEventListener("mousemove", onMouseWake, { passive: true });
    hero.addEventListener("mouseleave", onLeave);
    window.addEventListener("scroll", onScrollWake, { passive: true });
    window.addEventListener("deviceorientation", onTiltWake);

    // Initial sync.
    onScroll();
    const r0 = hero.getBoundingClientRect();
    fx = tFX = r0.width / 2;
    fy = tFY = r0.height / 2;
    ensureLoop();

    return () => {
      window.removeEventListener("mousemove", onMouseWake);
      hero.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("scroll", onScrollWake);
      window.removeEventListener("deviceorientation", onTiltWake);
      if (raf) cancelAnimationFrame(raf);
      img.style.transform = "";
      img.style.opacity = "";
      lens.style.transform = "";
      lens.style.opacity = "";
      lens.style.maskImage = "";
      (lens.style as any).webkitMaskImage = "";
      hero.style.clipPath = "";
      (hero.style as any).webkitClipPath = "";
      if (fold) {
        fold.style.opacity = "";
        fold.style.background = "";
      }
      if (warp) {
        warp.style.opacity = "";
        strips.forEach((el) => (el.style.transform = ""));
      }
    };
  }, []);

  return (
    <PageTransition>
      <section
        ref={heroRef}
        className="relative w-screen h-screen overflow-hidden"
        style={{ willChange: "clip-path" }}
      >
        <img
          ref={heroImgRef}
          src={lyraHero}
          alt="Lyra chair — woman reclining in a sunlit concrete interior"
          className="absolute inset-0 w-full h-full object-cover object-[75%_center] md:object-center"
          loading="eager"
          style={{
            willChange: "transform",
            transformOrigin: "50% 100%",
            backfaceVisibility: "hidden",
          }}
        />
        <div
          ref={heroLensRef}
          aria-hidden
          className="hero-lens absolute inset-0 w-full h-full pointer-events-none bg-cover bg-[position:75%_center] md:bg-center"
          style={{
            willChange: "transform, mask-image, opacity",
            transformOrigin: "50% 100%",
            backfaceVisibility: "hidden",
            opacity: 0,
            backgroundImage: `url(${lyraHero})`,
          }}
        />
        {/* Warp grid: vertical strips of the same image, deformed per-strip
            to bend the actual pixels (fabric gather effect). */}
        <div
          ref={heroWarpRef}
          aria-hidden
          className="absolute inset-0 w-full h-full pointer-events-none flex"
          style={{ willChange: "opacity", opacity: 0 }}
        >
          {Array.from({ length: 28 }).map((_, i) => {
            const N = 28;
            const stripW = 100 / N;
            return (
              <i
                key={i}
                style={{
                  display: "block",
                  width: `${stripW}%`,
                  height: "100%",
                  backgroundImage: `url(${lyraHero})`,
                  // Fit image by HEIGHT (like object-fit: cover vertically).
                  // Then background-position-x with percentage automatically
                  // shifts each strip to show its own column of the same image,
                  // because % positions align "image overflow" with "container
                  // overflow" — i.e. the strips reassemble the full picture.
                  backgroundSize: "auto 100%",
                  backgroundPosition: `${(i / (N - 1)) * 100}% center`,
                  backgroundRepeat: "no-repeat",
                  transformOrigin: "50% 100%",
                  willChange: "transform",
                  backfaceVisibility: "hidden",
                }}
              />
            );
          })}
        </div>
        <div
          ref={heroFoldRef}
          aria-hidden
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{
            willChange: "opacity, background",
            opacity: 0,
            mixBlendMode: "multiply",
          }}
        />
      </section>
      <div className="min-h-screen bg-background flex items-center justify-center relative overflow-x-hidden">
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
          background:hsl(24 26% 94%);
        }
        model-viewer::part(default-progress-bar){display:none;}
        .uno-loader{
          position:absolute;inset:0;
          display:flex;align-items:center;justify-content:center;
          background:hsl(24 26% 94%);z-index:2;
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
          background:hsl(203 24% 40%);
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
        }
        .uno-overlay-below h1,
        .uno-overlay-below p{
          font-family:'Manrope',system-ui,sans-serif;
          margin:0;
          overflow:hidden;
          white-space:nowrap;
          width:0;
          border-right:1px solid transparent;
        }
        .uno-overlay-below h1{
          font-size:15px;font-weight:500;
          letter-spacing:0.04em;color:hsl(203 24% 40%);
          margin-top:4px;
        }
        .uno-overlay-below p{
          font-size:clamp(9px,1.1vw,11px);font-weight:300;
          letter-spacing:0.54em;color:hsl(0 0% 45%);
        }
        /* Order in DOM: <p> then <h1>. Rotated -90deg → first line visually appears at bottom.
           Type <p> first, then <h1>. */
        .uno-overlay-below.visible p{
          animation:unoType 1.4s steps(40,end) .2s forwards,
                    unoCaret .7s step-end .2s 3;
        }
        @keyframes unoType{
          from{width:0;}
          to{width:100%;}
        }
        @keyframes unoCaret{
          50%{border-right-color:hsl(203 24% 40% / 0.6);}
        }
        .uno-ar{
          position:absolute;right:14px;top:14px;
          width:40px;height:40px;border:none;border-radius:50%;
          background:transparent;display:flex;align-items:center;justify-content:center;
          cursor:pointer;transition:all .25s ease;z-index:3;opacity:0.7;
        }
        .uno-ar:hover{opacity:1;transform:scale(1.05);}
        .uno-ar svg{stroke:hsl(203 24% 35%);transition:stroke .25s ease;}
        .uno-ar:hover svg{stroke:hsl(203 24% 28%);}
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
          filter:drop-shadow(0 0 6px hsl(203 24% 45% / 0.5));
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
              shadow-intensity="0.6"
              shadow-softness="1"
              camera-orbit="-8deg 70deg 300%"
              field-of-view="28deg"
              crossorigin="anonymous"
              referrerpolicy="no-referrer"
              style={{
                width: "100%",
                height: "100%",
                display: "block",
                background: "hsl(24 26% 94%)",
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
                <svg
                  width="22"
                  height="22"
                  viewBox="-1 -2 26 26"
                  fill="none"
                  stroke="hsl(203 24% 35%)"
                  strokeWidth="0.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
                  <path d="M12 12l8-4.5" />
                  <path d="M12 12v9" />
                  <path d="M12 12L4 7.5" />
                  <line x1="12" y1="3" x2="12" y2="-1" stroke="hsl(203 24% 35%)" strokeWidth="0.8" />
                  <circle cx="12" cy="-1" r="1.2" fill="hsl(203 24% 35%)" stroke="none" />
                </svg>
              </button>
            </model-viewer>

            {/* Stem 05 */}
            <div className="uno-stem-05">
              <svg viewBox="-50 0 100 600" preserveAspectRatio="xMidYMax meet" xmlns="http://www.w3.org/2000/svg">
                <line
                  x1="-30"
                  y1="555"
                  x2="30"
                  y2="555"
                  stroke="hsl(203 24% 35%)"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
                <line x1="0" y1="555" x2="0" y2="150" stroke="hsl(203 24% 35%)" strokeWidth="0.8" />
                <g className="stem-bud" role="button" tabIndex={0} onClick={() => navigate("/lyra")}>
                  <circle cx="0" cy="150" r="14" fill="none" stroke="hsl(203 24% 35%)" strokeWidth="0.8" />
                  <circle cx="0" cy="150" r="20" fill="transparent" stroke="transparent" />
                </g>
                <g className="stem-bud" role="button" tabIndex={0} onClick={() => navigate("/lyra")}>
                  <line x1="0" y1="370" x2="22" y2="370" stroke="hsl(203 24% 35%)" strokeWidth="0.8" />
                  <circle cx="22" cy="370" r="9" fill="none" stroke="hsl(203 24% 35%)" strokeWidth="0.8" />
                  <circle cx="22" cy="370" r="16" fill="transparent" stroke="transparent" />
                </g>
                <g className="stem-bud" role="button" tabIndex={0} onClick={() => console.log("05.2")}>
                  <line x1="0" y1="250" x2="-28" y2="250" stroke="hsl(203 24% 35%)" strokeWidth="0.8" />
                  <circle
                    cx="-28"
                    cy="250"
                    r="6"
                    fill="hsl(203 24% 35% / 0.45)"
                    stroke="hsl(203 24% 35%)"
                    strokeWidth="0.8"
                  />
                  <circle cx="-28" cy="250" r="13" fill="transparent" stroke="transparent" />
                </g>
              </svg>
            </div>

            <div
              className={`uno-overlay-below ${modelLoaded ? "visible" : ""}`}
              style={{
                transform: "rotate(-90deg) translateX(-12px)",
                transformOrigin: "left top",
                position: "absolute",
                left: "0px",
                bottom: "-54px",
                padding: 0,
                whiteSpace: "nowrap",
                zIndex: 4,
              }}
            >
              <p>Чем меньше усилия — тем точнее поддержка.</p>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Lyra;

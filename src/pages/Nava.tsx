import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageTransition from "@/components/PageTransition";
import lyraHero from "@/assets/nava-hero.png";
import NavaInfo from "@/components/NavaInfo";
import SEO from "@/components/SEO";
import { useLocale } from "@/i18n/useLocale";
import LanguageSwitcher from "@/i18n/LanguageSwitcher";
import { LOCALES } from "@/i18n/config";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        alt?: string;
        "camera-controls"?: boolean | string;
        "disable-zoom"?: boolean | string;
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

const GLB_URL = "/nava.glb";
const USDZ_URL = "/nava.usdz";

const Nava = () => {
  const navigate = useNavigate();
  const { t, locale, localePath } = useLocale();
  const modelRef = useRef<HTMLElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelFullyVisible, setModelFullyVisible] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const heroImgRef = useRef<HTMLImageElement>(null);
  const heroLensRef = useRef<HTMLDivElement>(null);
  const crossfadeRef = useRef<HTMLDivElement>(null);
  const heroLayerRef = useRef<HTMLDivElement>(null);
  const modelLayerRef = useRef<HTMLDivElement>(null);
  const scrollFillRef = useRef<HTMLDivElement>(null);
  const heroCaptionRef = useRef<HTMLDivElement>(null);
  const [captionLoaded, setCaptionLoaded] = useState(false);
  // Switcher visibility — hidden while the hero screen is the dominant layer.
  const [switcherVisible, setSwitcherVisible] = useState(false);

  // Smooth fade-in on mount.
  useEffect(() => {
    const t = requestAnimationFrame(() => setCaptionLoaded(true));
    return () => cancelAnimationFrame(t);
  }, []);

  // Caption opacity follows scroll: fades out as user scrolls, reappears on return.
  useEffect(() => {
    const el = heroCaptionRef.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight || 1;
      // Fade across first ~40% of viewport scroll.
      const p = Math.max(0, Math.min(1, window.scrollY / (vh * 0.4)));
      const op = 1 - p;
      el.style.setProperty("--caption-scroll-opacity", String(op));
      el.style.setProperty("--caption-scroll-shift", `${p * 10}px`);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Scroll indicator: a small colored segment that moves along a vertical track
  // anchored above the "info" button. Position reflects window scroll progress.
  useEffect(() => {
    const fill = scrollFillRef.current;
    if (!fill) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const doc = document.documentElement;
      const max = (doc.scrollHeight - window.innerHeight) || 1;
      const p = Math.max(0, Math.min(1, window.scrollY / max));
      // Track height = 100% of parent; segment height fixed in CSS (~14%).
      // Move via top percentage so segment travels from 0 to (100% - segment).
      // Move the segment from top:0 to top:(100% - segmentHeight)
      fill.style.top = `calc(${p * 100}% - ${p * 36}px)`;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

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

  // Scroll-driven crossfade between hero image (layer 1) and 3D scene (layer 2)
  useEffect(() => {
    const zone = crossfadeRef.current;
    const hero = heroLayerRef.current;
    const model = modelLayerRef.current;
    if (!zone || !hero || !model) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = zone.getBoundingClientRect();
      const total = zone.offsetHeight - window.innerHeight;
      const scrolled = Math.max(0, Math.min(total, -rect.top));
      const p = total > 0 ? scrolled / total : 0; // 0..1
      // Two-stage crossfade: hero → model.
      const heroOp = Math.max(0, Math.min(1, 1 - p * 2));
      const modelOp = Math.max(0, Math.min(1, (p - 0.3) * 2));
      hero.style.opacity = String(heroOp);
      model.style.opacity = String(modelOp);
      const fullyVisible = modelOp >= 0.999;
      model.style.pointerEvents = fullyVisible ? "auto" : "none";
      setModelFullyVisible((prev) => (prev !== fullyVisible ? fullyVisible : prev));
      // Show switcher once the hero has visibly receded — keeps the first
      // (hero) screen clean per the multilingual UX rules.
      const showSwitcher = heroOp < 0.5;
      setSwitcherVisible((prev) => (prev !== showSwitcher ? showSwitcher : prev));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
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
    if (!hero || !img || !lens) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    // Focal point in hero coordinates (px). Drag vector in normalized [-1, 1].
    let tFX = 0, tFY = 0;          // target focal point (px from hero top-left)
    let fx = 0, fy = 0;            // current focal point (lerped)
    let tDX = 0, tDY = 0;          // target drag direction in [-1, 1]
    let dx = 0, dy = 0;            // current drag (lerped, micro-inertia)
    let tIntensity = 0, intensity = 0; // 0 at rest, 1 while interacting
    let tPanX = 0, panX = 0;  // -1..1, mobile tilt → horizontal image pan
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
      // Horizontal pan from gamma (left-right tilt). Saturates around ±25°.
      // Account for screen orientation so landscape feels natural.
      const angle = (screen.orientation && screen.orientation.angle) || 0;
      let panSrc = g;
      if (angle === 90) panSrc = -(e.beta ?? 0);
      else if (angle === -90 || angle === 270) panSrc = (e.beta ?? 0);
      tPanX = Math.max(-1, Math.min(1, panSrc / 25));
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
      // Smooth pan separately — it should keep working at rest.
      panX += (tPanX - panX) * 0.08;

      // Local displacement of the lens layer along drag direction.
      const tx = dx * MAX_PX * intensity;
      const ty = dy * MAX_PX * intensity;

      // Mobile horizontal parallax: shift object-position-x in [0%..100%].
      // Default focal is 75% (right side) → map panX∈[-1..1] to [15%..95%].
      const panPct = 55 + panX * 40;
      img.style.objectPosition = `${panPct}% center`;
      lens.style.backgroundPosition = `${panPct}% center`;

      // Lens layer = duplicate, displaced + radially masked at focal point.
      // Smooth falloff curve via radial-gradient stops (non-linear, soft edge).
      const rect = hero.getBoundingClientRect();
      const radius = Math.max(120, Math.min(rect.width, rect.height) * 0.22);
      const a = Math.max(0, Math.min(1, intensity));
      lens.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
      lens.style.opacity = String(a);
      lens.style.maskImage = `radial-gradient(circle ${radius}px at ${fx}px ${fy}px, hsl(0 0% 0% / 1) 0%, hsl(0 0% 0% / 0.85) 18%, hsl(0 0% 0% / 0.45) 45%, hsl(0 0% 0% / 0.12) 75%, hsl(0 0% 0% / 0) 100%)`;
      (lens.style as any).webkitMaskImage = lens.style.maskImage;

      // Stop the loop only when fully at rest.
      const stillRest =
        Math.abs(dx) < 0.0005 &&
        Math.abs(dy) < 0.0005 &&
        intensity < 0.002;
      if (stillRest && tDX === 0 && tDY === 0 && tIntensity === 0) {
        // Keep looping if there's still tilt-pan to settle.
        if (Math.abs(tPanX - panX) > 0.001) {
          raf = requestAnimationFrame(tick);
          return;
        }
        // Don't reset objectPosition — keep the current pan so a tilted
        // phone still shows the panned view at rest.
        lens.style.opacity = "0";
        lens.style.transform = `translate3d(0,0,0)`;
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

    window.addEventListener("mousemove", onMouseWake, { passive: true });
    hero.addEventListener("mouseleave", onLeave);
    window.addEventListener("deviceorientation", onTiltWake);

    // iOS 13+ requires explicit permission for DeviceOrientationEvent.
    // Request it on the first user touch anywhere on the page.
    const DOE: any = (window as any).DeviceOrientationEvent;
    const needsPerm = DOE && typeof DOE.requestPermission === "function";
    const requestTilt = () => {
      window.removeEventListener("touchend", requestTilt);
      if (!needsPerm) return;
      DOE.requestPermission().then((state: string) => {
        if (state === "granted") {
          window.addEventListener("deviceorientation", onTiltWake);
        }
      }).catch(() => {});
    };
    if (needsPerm) {
      window.addEventListener("touchend", requestTilt, { once: true });
    }

    // Initial sync.
    const r0 = hero.getBoundingClientRect();
    fx = tFX = r0.width / 2;
    fy = tFY = r0.height / 2;
    ensureLoop();

    return () => {
      window.removeEventListener("mousemove", onMouseWake);
      hero.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("deviceorientation", onTiltWake);
      window.removeEventListener("touchend", requestTilt);
      if (raf) cancelAnimationFrame(raf);
      img.style.transform = "";
      img.style.opacity = "";
      img.style.objectPosition = "";
      lens.style.transform = "";
      lens.style.opacity = "";
      lens.style.maskImage = "";
      lens.style.backgroundPosition = "";
      (lens.style as any).webkitMaskImage = "";
    };
  }, []);

  return (
    <PageTransition>
      {/* Crossfade scroll zone: hero image fades out, 3D fades in */}
      <div
        ref={crossfadeRef}
        className="relative w-screen"
        style={{ height: "200vh" }}
      >
        <div className="sticky top-0 w-screen h-screen overflow-hidden">
          {/* Layer 1: hero image */}
          <section
            ref={heroRef}
            className="absolute inset-0 w-full h-full overflow-hidden"
            style={{ willChange: "opacity" }}
          >
            <div ref={heroLayerRef} className="absolute inset-0 w-full h-full">
              <img
                ref={heroImgRef}
                src={lyraHero}
                alt={t.nava.hero_alt}
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
              <div
                ref={heroCaptionRef}
                aria-hidden
                className="hero-caption absolute left-4 sm:left-8 md:left-12 lg:left-16 right-4 sm:right-12 pointer-events-none select-none"
                style={{
                  top: "calc(33% + 70px)",
                  color: "#F5EFEB",
                  fontFamily: "'Manrope', sans-serif",
                  fontWeight: 300,
                  letterSpacing: "var(--caption-tracking, 0.42em)",
                  fontSize: "clamp(9px, 1.445vw, 15.3px)",
                  marginLeft: "var(--caption-shift, -35px)",
                  lineHeight: 1.35,
                  opacity: `calc(var(--caption-scroll-opacity, 1) * ${captionLoaded ? 0.95 : 0})`,
                  textShadow: "0 1px 12px rgba(0,0,0,0.45), 0 0 2px rgba(0,0,0,0.35)",
                  transform: `translateY(calc(var(--caption-scroll-shift, 0px) + ${captionLoaded ? "0px" : "12px"}))`,
                  transition: "opacity 0.8s ease-out, transform 0.8s ease-out",
                }}
              >
                {t.nava.hero_caption}
              </div>
            </div>
          </section>

          {/* Layer 2: 3D scene */}
          <div
            ref={modelLayerRef}
            className="absolute inset-0 w-full h-full bg-background flex items-center justify-center overflow-x-hidden"
            style={{ opacity: 0, willChange: "opacity", pointerEvents: "none" }}
          >
        <style>{`
        /* Hide native scrollbar on Lyra page */
        html, body { scrollbar-width: none; -ms-overflow-style: none; }
        html::-webkit-scrollbar, body::-webkit-scrollbar { width: 0; height: 0; display: none; }
        @keyframes lyra-caption-in {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        /* Mobile-safe caption: tighter tracking, no negative left margin so
           the text never clips off the left edge on small screens. */
        @media (max-width: 640px){
          .hero-caption{
            --caption-shift: 0px;
          }
        }
        .uno-3d-wrap{
          --pad:clamp(6px,0.9vw,12px);
          position:relative;
          width:min(1250px,100%);
          margin:0 auto;
          padding:var(--pad);
          box-sizing:border-box;
          overflow:visible;
        }
        .uno-3d-stage{
          position:relative;
          height:clamp(420px,68vw,720px);
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
        .uno-actions{
          position:fixed; right:0; bottom:22px; z-index:60;
          display:flex; align-items:center; gap:22px;
          padding:5px 22px 5px 20px;
          background:hsl(24 26% 94%);
          border:none;
          border-top-left-radius:2px;
          border-bottom-left-radius:2px;
        }
        .uno-actions button{
          background:transparent; border:none; padding:0; cursor:pointer;
          font-family:'Manrope',system-ui,sans-serif;
          font-size:12px; font-weight:300;
          letter-spacing:0.18em; text-transform:lowercase;
          color:hsl(203 24% 40%);
          transition:color .25s ease;
        }
        .uno-actions button:hover{ color:#C97A63; }
        @media(max-width:768px){
          .uno-actions{ bottom:18px; padding:4px 18px 4px 16px; gap:18px; }
        }
        /* Scroll indicator: vertical 2px track rising from the middle of the
           "info" button up to ~2/3 of the viewport. A small colored segment
           travels along it as the page scrolls. Fixed to the viewport. */
        .uno-scroll-indicator{
          position:fixed;
          right:35px;            /* ≈ center of the "info" text (padding 22 + ~13 half-text) */
          bottom:46px;           /* sits just above the top edge of the info button */
          width:2px;
          height:66.6vh;
          /* subtle but visible track */
          background:hsl(24 14% 80%);
          pointer-events:none;
          overflow:hidden;
          z-index:60;
        }
        .uno-scroll-fill{
          position:absolute;
          left:0;
          top:0;
          width:2px;
          height:56px;
          /* clearly visible accent matching the info button color */
          background:hsl(203 24% 40%);
          will-change:top;
        }
        /* Side touch gutters — let finger scroll the page along the edges
           without rotating the 3D model. */
        .uno-side-gutter{
          position:absolute; top:0; bottom:0;
          width:clamp(28px, 8vw, 96px);
          z-index:3;
          touch-action:pan-y;
          background:transparent;
        }
        .uno-side-gutter.left{ left:0; }
        .uno-side-gutter.right{ right:0; }
        /* Model itself: allow vertical page scroll via touch even when
           interacting with model; horizontal still rotates it. */
        .uno-3d-stage model-viewer{
          touch-action:pan-y;
        }
        @media(max-width:768px){
          .uno-scroll-indicator{ right:29px; bottom:40px; }
        }
        model-viewer::part(default-ar-button){ display:none !important; }
        model-viewer [slot="ar-button"]{ display:none !important; }
      `}</style>

            <div className="uno-3d-wrap" style={{ pointerEvents: "auto" }}>
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
              alt="Nava — Kolesnikov.UNO"
              camera-controls
              disable-zoom
              interaction-prompt="none"
              auto-rotate
              auto-rotate-delay="1200"
              rotation-per-second="20deg"
              environment-image="neutral"
              exposure="1.45"
              shadow-intensity="0.6"
              shadow-softness="1"
              camera-orbit="-8deg 70deg 360%"
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
            </model-viewer>

            <div
              className={`uno-overlay-below ${modelLoaded && modelFullyVisible ? "visible" : ""}`}
              style={{
                transform: "rotate(-90deg)",
                transformOrigin: "left top",
                position: "absolute",
                left: "calc((min(1250px, 100%) - 100vw) / 2 - var(--pad, 12px) + 21px)",
                bottom: "-54px",
                padding: 0,
                whiteSpace: "nowrap",
                zIndex: 4,
              }}
            >
              <p>{t.nava.rotated_line}</p>
            </div>
            {/* Side touch-scroll safe zones around the model */}
            <div className="uno-side-gutter left" aria-hidden />
            <div className="uno-side-gutter right" aria-hidden />
          </div>
        </div>
          </div>
        </div>
      </div>
      {/* Back arrow — pinned to viewport */}
      <button
        onClick={() => navigate("/garden")}
        className="fixed top-4 left-4 md:top-5 md:left-5 px-2 py-1 text-[hsl(203_24%_40%)] hover:text-[#C97A63] transition-colors duration-300 z-[60]"
        aria-label={t.nav.back}
      >
        <span
          style={{
            fontFamily: "'Manrope', system-ui, sans-serif",
            fontSize: "12px",
            fontWeight: 300,
            letterSpacing: "0.18em",
            textTransform: "lowercase",
          }}
        >
          {t.nav.back}
        </span>
      </button>
      <div className="uno-actions">
        {modelFullyVisible && (
          <button
            type="button"
            aria-label={t.nav.ar}
            onClick={() => {
              const mv: any = modelRef.current;
              if (mv && typeof mv.activateAR === "function") {
                try { mv.activateAR(); } catch (e) { /* no-op */ }
              }
            }}
          >
            {t.nav.ar}
          </button>
        )}
        <button
            type="button"
            aria-label={t.nav.info}
            onClick={() => window.dispatchEvent(new CustomEvent("nava:info-open"))}
          >
            {t.nav.info}
          </button>
      </div>
      <NavaInfo showTrigger={false} />
      {/* Vertical scroll indicator above the info button */}
      <div className="uno-scroll-indicator" aria-hidden>
        <div className="uno-scroll-fill" ref={scrollFillRef} />
      </div>
      <SEO
        title={t.nava.seo_title}
        description={t.nava.seo_description}
        image="/og/nava-preview.png"
        type="product"
        alternates={LOCALES.reduce<Record<string, string>>((acc, l) => {
          acc[l] = `/${l}/nava`;
          return acc;
        }, {})}
      />
      {/* Language switcher — hidden on hero, fades in once user scrolls past it. */}
      <LanguageSwitcher
        background="hsl(24 26% 94%)"
      />
    </PageTransition>
  );
};

export default Nava;

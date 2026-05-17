import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageTransition from "@/components/PageTransition";
import LanguageSwitcher from "@/i18n/LanguageSwitcher";
import { useLocale } from "@/i18n/useLocale";
import voidHero from "@/assets/void-hero.png";
import Participation from "@/components/Participation";

const Void = () => {
  const navigate = useNavigate();
  const { t, localePath, locale } = useLocale();
  const crossfadeRef = useRef<HTMLDivElement>(null);
  const heroLayerRef = useRef<HTMLDivElement>(null);
  const heroSectionRef = useRef<HTMLElement>(null);
  const heroImgRef = useRef<HTMLImageElement>(null);
  const heroLensRef = useRef<HTMLDivElement>(null);
  const secondLayerRef = useRef<HTMLDivElement>(null);
  const thirdLayerRef = useRef<HTMLDivElement>(null);
  const scrollFillRef = useRef<HTMLDivElement>(null);
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const [participationOpen, setParticipationOpen] = useState(false);

  // Scroll indicator
  useEffect(() => {
    const fill = scrollFillRef.current;
    if (!fill) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const doc = document.documentElement;
      const max = (doc.scrollHeight - window.innerHeight) || 1;
      const p = Math.max(0, Math.min(1, window.scrollY / max));
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

  // Crossfade hero -> empty second block
  useEffect(() => {
    const zone = crossfadeRef.current;
    const hero = heroLayerRef.current;
    const second = secondLayerRef.current;
    const third = thirdLayerRef.current;
    if (!zone || !hero || !second || !third) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = zone.getBoundingClientRect();
      const total = zone.offsetHeight - window.innerHeight;
      const scrolled = Math.max(0, Math.min(total, -rect.top));
      const p = total > 0 ? scrolled / total : 0;
      // Three stages: hero (0..0.33) → second text (0.33..0.66) → third (0.66..1)
      const heroOp = Math.max(0, Math.min(1, 1 - p * 3));
      const secondIn = Math.max(0, Math.min(1, (p - 0.2) * 4));
      const secondOut = Math.max(0, Math.min(1, 1 - (p - 0.55) * 4));
      const secondOp = Math.min(secondIn, secondOut);
      const thirdOp = Math.max(0, Math.min(1, (p - 0.62) * 3));
      hero.style.opacity = String(heroOp);
      second.style.opacity = String(secondOp);
      second.style.pointerEvents = secondOp > 0.5 && thirdOp < 0.5 ? "auto" : "none";
      third.style.opacity = String(thirdOp);
      third.style.pointerEvents = thirdOp > 0.5 ? "auto" : "none";
      const showSwitcher = heroOp < 0.5;
      setSwitcherVisible((prev) => (prev !== showSwitcher ? showSwitcher : prev));
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

  // Localized lens distortion + tilt/drag pan (ported from Lyra hero).
  useEffect(() => {
    const hero = heroSectionRef.current;
    const img = heroImgRef.current;
    const lens = heroLensRef.current;
    if (!hero || !img || !lens) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    let tFX = 0, tFY = 0, fx = 0, fy = 0;
    let tDX = 0, tDY = 0, dx = 0, dy = 0;
    let tIntensity = 0, intensity = 0;
    let tPanX = 0, panX = 0;
    let tPanY = 0, panY = 0;
    let lastInput = performance.now();
    let lastPX = 0, lastPY = 0, hasLast = false;
    let raf = 0;
    let dragging = false;
    let dragStartX = 0, dragStartY = 0;
    let dragBasePanX = 0, dragBasePanY = 0;

    const MAX_PX = 2;
    const SMOOTH_FOCAL = 0.18;
    const SMOOTH_DRAG = 0.12;
    const SMOOTH_INT = 0.10;
    const REST_AFTER_MS = 120;

    const setFocalFromClient = (clientX: number, clientY: number) => {
      const rect = hero.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      if (px < 0 || py < 0 || px > rect.width || py > rect.height) return;
      tFX = px; tFY = py;
      if (hasLast) {
        const ddx = px - lastPX;
        const ddy = py - lastPY;
        const mag = Math.hypot(ddx, ddy);
        if (mag > 0.0001) {
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
      if (dragging) {
        const rect = hero.getBoundingClientRect();
        const ndx = (e.clientX - dragStartX) / rect.width;
        const ndy = (e.clientY - dragStartY) / rect.height;
        tPanX = Math.max(-1, Math.min(1, dragBasePanX - ndx * 2));
        tPanY = Math.max(-1, Math.min(1, dragBasePanY - ndy * 2));
      }
      ensureLoop();
    };

    const onDown = (e: MouseEvent) => {
      dragging = true;
      dragStartX = e.clientX; dragStartY = e.clientY;
      dragBasePanX = tPanX; dragBasePanY = tPanY;
    };
    const onUp = () => { dragging = false; };

    let touchActive = false;
    let tStartX = 0, tStartY = 0, tBasePanX = 0, tBasePanY = 0;
    const onTouchStart = (e: TouchEvent) => {
      if (!e.touches[0]) return;
      touchActive = true;
      tStartX = e.touches[0].clientX;
      tStartY = e.touches[0].clientY;
      tBasePanX = tPanX; tBasePanY = tPanY;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!touchActive || !e.touches[0]) return;
      const rect = hero.getBoundingClientRect();
      const ndx = (e.touches[0].clientX - tStartX) / rect.width;
      const ndy = (e.touches[0].clientY - tStartY) / rect.height;
      tPanX = Math.max(-1, Math.min(1, tBasePanX - ndx * 2));
      tPanY = Math.max(-1, Math.min(1, tBasePanY - ndy * 2));
      setFocalFromClient(e.touches[0].clientX, e.touches[0].clientY);
      ensureLoop();
    };
    const onTouchEnd = () => { touchActive = false; };

    const onTilt = (e: DeviceOrientationEvent) => {
      const rect = hero.getBoundingClientRect();
      const g = e.gamma ?? 0;
      const b = (e.beta ?? 0) - 30;
      const nx = Math.max(-1, Math.min(1, g / 20));
      const ny = Math.max(-1, Math.min(1, b / 20));
      tFX = rect.width / 2 + nx * (rect.width * 0.35);
      tFY = rect.height / 2 + ny * (rect.height * 0.35);
      tDX = nx; tDY = ny;
      tIntensity = Math.min(1, Math.hypot(nx, ny));
      lastInput = performance.now();
      if (!touchActive) {
        const angle = (screen.orientation && screen.orientation.angle) || 0;
        let panSrcX = g;
        let panSrcY = b;
        if (angle === 90) { panSrcX = -(e.beta ?? 0); panSrcY = g; }
        else if (angle === -90 || angle === 270) { panSrcX = (e.beta ?? 0); panSrcY = -g; }
        tPanX = Math.max(-1, Math.min(1, panSrcX / 25));
        tPanY = Math.max(-1, Math.min(1, panSrcY / 25));
      }
      ensureLoop();
    };

    const tick = () => {
      const now = performance.now();
      if (now - lastInput > REST_AFTER_MS) {
        tDX *= 0.85; tDY *= 0.85; tIntensity *= 0.88;
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
      panX += (tPanX - panX) * 0.10;
      panY += (tPanY - panY) * 0.10;

      const tx = dx * MAX_PX * intensity;
      const ty = dy * MAX_PX * intensity;

      const panPctX = 50 + panX * 40;
      const panPctY = 50 + panY * 40;
      img.style.objectPosition = `${panPctX}% ${panPctY}%`;
      lens.style.backgroundPosition = `${panPctX}% ${panPctY}%`;

      const rect = hero.getBoundingClientRect();
      const radius = Math.max(120, Math.min(rect.width, rect.height) * 0.22);
      const a = Math.max(0, Math.min(1, intensity));
      lens.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
      lens.style.opacity = String(a);
      lens.style.maskImage = `radial-gradient(circle ${radius}px at ${fx}px ${fy}px, hsl(0 0% 0% / 1) 0%, hsl(0 0% 0% / 0.85) 18%, hsl(0 0% 0% / 0.45) 45%, hsl(0 0% 0% / 0.12) 75%, hsl(0 0% 0% / 0) 100%)`;
      (lens.style as any).webkitMaskImage = lens.style.maskImage;

      const stillRest =
        Math.abs(dx) < 0.0005 && Math.abs(dy) < 0.0005 && intensity < 0.002 &&
        Math.abs(tPanX - panX) < 0.001 && Math.abs(tPanY - panY) < 0.001;
      if (stillRest && tDX === 0 && tDY === 0 && tIntensity === 0 && !dragging && !touchActive) {
        lens.style.opacity = "0";
        lens.style.transform = `translate3d(0,0,0)`;
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    function ensureLoop() {
      if (!raf) raf = requestAnimationFrame(tick);
    }

    const onLeave = () => {
      tDX = 0; tDY = 0; tIntensity = 0; hasLast = false;
      lastInput = 0; ensureLoop();
    };

    window.addEventListener("mousemove", onMouse, { passive: true });
    hero.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    hero.addEventListener("mouseleave", onLeave);
    hero.addEventListener("touchstart", onTouchStart, { passive: true });
    hero.addEventListener("touchmove", onTouchMove, { passive: true });
    hero.addEventListener("touchend", onTouchEnd);
    window.addEventListener("deviceorientation", onTilt);

    // iOS 13+ requires explicit permission for DeviceOrientationEvent.
    const DOE: any = (window as any).DeviceOrientationEvent;
    const needsPerm = DOE && typeof DOE.requestPermission === "function";
    const requestTilt = () => {
      window.removeEventListener("touchend", requestTilt);
      if (!needsPerm) return;
      DOE.requestPermission().then((state: string) => {
        if (state === "granted") {
          window.addEventListener("deviceorientation", onTilt);
        }
      }).catch(() => {});
    };
    if (needsPerm) {
      window.addEventListener("touchend", requestTilt, { once: true });
    }

    const r0 = hero.getBoundingClientRect();
    fx = tFX = r0.width / 2;
    fy = tFY = r0.height / 2;
    ensureLoop();

    return () => {
      window.removeEventListener("mousemove", onMouse);
      hero.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      hero.removeEventListener("mouseleave", onLeave);
      hero.removeEventListener("touchstart", onTouchStart);
      hero.removeEventListener("touchmove", onTouchMove);
      hero.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("deviceorientation", onTilt);
      window.removeEventListener("touchend", requestTilt);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <PageTransition>
      <style>{`
        html, body { scrollbar-width: none; -ms-overflow-style: none; }
        html::-webkit-scrollbar, body::-webkit-scrollbar { width: 0; height: 0; display: none; }
        .void-actions{
          position:fixed; right:0; bottom:22px; z-index:60;
          display:flex; align-items:center; gap:22px;
          padding:5px 22px 5px 20px;
          background:hsl(24 26% 94%);
          border-top-left-radius:2px;
          border-bottom-left-radius:2px;
        }
        .void-actions button{
          background:transparent; border:none; padding:0; cursor:pointer;
          font-family:'Manrope',system-ui,sans-serif;
          font-size:12px; font-weight:300;
          letter-spacing:0.18em; text-transform:lowercase;
          color:hsl(203 24% 40%);
          transition:color .25s ease;
        }
        .void-actions button:hover{ color:#C97A63; }
        @media(max-width:768px){
          .void-actions{ bottom:18px; padding:4px 18px 4px 16px; gap:18px; }
        }
        .void-scroll-indicator{
          position:fixed;
          right:35px;
          bottom:46px;
          width:2px;
          height:66.6vh;
          background:hsl(24 14% 80%);
          pointer-events:none;
          overflow:hidden;
          z-index:60;
        }
        .void-scroll-fill{
          position:absolute;
          left:0; top:0;
          width:2px;
          height:56px;
          background:hsl(203 24% 40%);
          will-change:top;
        }
        @media(max-width:768px){
          .void-scroll-indicator{ right:29px; bottom:40px; }
        }
      `}</style>

      <div ref={crossfadeRef} className="relative w-screen" style={{ height: "300vh" }}>
        <div className="sticky top-0 w-screen h-screen overflow-hidden">
          {/* Layer 1: hero image */}
          <section
            ref={heroSectionRef}
            className="absolute inset-0 w-full h-full overflow-hidden"
            style={{ willChange: "opacity", cursor: "grab", touchAction: "pan-y" }}
          >
            <div ref={heroLayerRef} className="absolute inset-0 w-full h-full">
              <img
                ref={heroImgRef}
                src={voidHero}
                alt="void"
                className="absolute inset-0 w-full h-full object-cover"
                loading="eager"
                draggable={false}
                style={{
                  willChange: "transform",
                  transformOrigin: "50% 50%",
                  backfaceVisibility: "hidden",
                  objectPosition: "50% 50%",
                }}
              />
              <div
                ref={heroLensRef}
                aria-hidden
                className="absolute inset-0 w-full h-full pointer-events-none bg-cover"
                style={{
                  willChange: "transform, mask-image, opacity",
                  transformOrigin: "50% 50%",
                  backfaceVisibility: "hidden",
                  opacity: 0,
                  backgroundImage: `url(${voidHero})`,
                  backgroundPosition: "50% 50%",
                }}
              />
            </div>
          </section>

          {/* Layer 2: empty placeholder block */}
          <div
            ref={secondLayerRef}
            className="absolute inset-0 w-full h-full bg-background"
            style={{ opacity: 0, willChange: "opacity", pointerEvents: "none" }}
          >
            <div className="w-full h-full flex items-center justify-center px-6">
              <p
                className="max-w-2xl text-center"
                style={{
                  fontFamily: "'Manrope', system-ui, sans-serif",
                  fontSize: "13px",
                  fontWeight: 300,
                  lineHeight: 1.7,
                  letterSpacing: "0.14em",
                  color: "hsl(203 24% 40%)",
                }}
              >
                {locale === "en"
                  ? "The concept of the art gallery is based on the idea of a gap between outer and inner spaces. Within this gap, objects are formed that do not belong to time. Their influence is not transmitted directly, but emerges in the external world through human perception."
                  : locale === "uk"
                  ? "Концепт art-gallery заснований на ідеї зазору між зовнішнім та внутрішнім просторами. У цьому зазорі формуються об'єкти, що не належать часу. Їхній вплив не транслюється безпосередньо, а проявляється у зовнішньому світі через людське сприйняття."
                  : "Концепт art-gallery основан на идее зазора между внешним и внутренним пространствами. В этом зазоре формируются объекты, не принадлежащие времени. Их влияние не транслируется напрямую, а проявляется во внешнем мире через человеческое восприятие."}
              </p>
            </div>
          </div>

          {/* Layer 3: participation CTA */}
          <div
            ref={thirdLayerRef}
            className="absolute inset-0 w-full h-full bg-background"
            style={{
              padding: "0 clamp(20px, 6vw, 96px)",
              boxSizing: "border-box",
              opacity: 0,
              willChange: "opacity",
              pointerEvents: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
            }}
          >
            <div style={{ textAlign: "left" }}>
                <p
                  style={{
                    maxWidth: "460px",
                    margin: "0 0 36px",
                    fontFamily: "'Manrope', system-ui, sans-serif",
                    fontSize: "13px",
                    fontWeight: 300,
                    lineHeight: 1.9,
                    letterSpacing: "0.04em",
                    color: "hsl(0 0% 38%)",
                    whiteSpace: "pre-line",
                  }}
                >
                  {t.lyra.description}
                </p>
                <button
                  type="button"
                  onClick={() => setParticipationOpen(true)}
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    margin: 0,
                    cursor: "pointer",
                    fontFamily: "'Manrope', system-ui, sans-serif",
                    fontSize: "13px",
                    fontWeight: 300,
                    letterSpacing: "0.04em",
                    color: "hsl(0 0% 45%)",
                    transition: "color .25s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#C97A63")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "hsl(0 0% 45%)")}
                >
                  {t.participation.link} <span style={{ marginLeft: 4, opacity: 0.7 }}>↗</span>
                </button>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => navigate(localePath("/garden"))}
        className="fixed top-4 left-4 md:top-5 md:left-5 px-2 py-1 hover:text-[#C97A63] transition-colors duration-300 z-[60]"
        aria-label={t.nav.back}
        style={{
          fontFamily: "'Manrope', system-ui, sans-serif",
          color: "hsl(203 24% 40%)",
          fontSize: "12px",
          fontWeight: 300,
          letterSpacing: "0.18em",
          textTransform: "lowercase",
        }}
      >
        {t.nav.back}
      </button>

      <div className="void-actions">
        <button type="button" aria-label={t.nav.info}>
          {t.nav.info}
        </button>
      </div>

      <div className="void-scroll-indicator" aria-hidden>
        <div className="void-scroll-fill" ref={scrollFillRef} />
      </div>

      <LanguageSwitcher background="hsl(24 26% 94%)" />
      <Participation
        model="void"
        open={participationOpen}
        onClose={() => setParticipationOpen(false)}
      />
    </PageTransition>
  );
};

export default Void;

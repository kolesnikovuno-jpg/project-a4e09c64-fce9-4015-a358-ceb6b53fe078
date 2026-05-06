import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageTransition from "@/components/PageTransition";
import LanguageSwitcher from "@/i18n/LanguageSwitcher";
import { useLocale } from "@/i18n/useLocale";
import voidHero from "@/assets/void-hero.png";

const Void = () => {
  const navigate = useNavigate();
  const { t, localePath } = useLocale();
  const crossfadeRef = useRef<HTMLDivElement>(null);
  const heroLayerRef = useRef<HTMLDivElement>(null);
  const secondLayerRef = useRef<HTMLDivElement>(null);
  const scrollFillRef = useRef<HTMLDivElement>(null);
  const [switcherVisible, setSwitcherVisible] = useState(false);

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
    if (!zone || !hero || !second) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = zone.getBoundingClientRect();
      const total = zone.offsetHeight - window.innerHeight;
      const scrolled = Math.max(0, Math.min(total, -rect.top));
      const p = total > 0 ? scrolled / total : 0;
      const heroOp = Math.max(0, Math.min(1, 1 - p * 2));
      const secondOp = Math.max(0, Math.min(1, (p - 0.3) * 2));
      hero.style.opacity = String(heroOp);
      second.style.opacity = String(secondOp);
      second.style.pointerEvents = secondOp > 0.5 ? "auto" : "none";
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

      <div ref={crossfadeRef} className="relative w-screen" style={{ height: "200vh" }}>
        <div className="sticky top-0 w-screen h-screen overflow-hidden">
          {/* Layer 1: hero image */}
          <div ref={heroLayerRef} className="absolute inset-0 w-full h-full" style={{ willChange: "opacity" }}>
            <img
              src={voidHero}
              alt="void"
              className="absolute inset-0 w-full h-full object-cover"
              loading="eager"
            />
          </div>

          {/* Layer 2: empty placeholder block */}
          <div
            ref={secondLayerRef}
            className="absolute inset-0 w-full h-full bg-background"
            style={{ opacity: 0, willChange: "opacity", pointerEvents: "none" }}
          />
        </div>
      </div>

      <button
        onClick={() => navigate(localePath("/garden"))}
        className="fixed top-4 left-4 md:top-5 md:left-5 px-2 py-1 text-[#F5EFEB] hover:text-[#C97A63] transition-colors duration-300 z-[60]"
        aria-label={t.nav.back}
        style={{
          fontFamily: "'Manrope', system-ui, sans-serif",
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
    </PageTransition>
  );
};

export default Void;

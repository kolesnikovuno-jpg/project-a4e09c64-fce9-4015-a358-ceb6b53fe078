import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, LayoutGroup, useAnimation } from "motion/react";
import { useIsNative } from "@/hooks/use-native";
import { useLocale } from "@/i18n/useLocale";
import LanguageSwitcher from "@/i18n/LanguageSwitcher";

const Index = () => {
  const [open, setOpen] = useState(false);
  const [toggled, setToggled] = useState(false);
  const navigate = useNavigate();
  const isNative = useIsNative();
  const controls = useAnimation();
  const { t, localePath } = useLocale();

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => {
        controls.start("visible");
      }, 400);
      return () => clearTimeout(t);
    } else {
      controls.start("hidden");
    }
  }, [open, controls]);

  // In the native iOS app, launch directly into the calculator.
  useEffect(() => {
    if (isNative) navigate("/unocalc", { replace: true });
  }, [isNative, navigate]);

  const handleToggle = () => {
    if (!toggled) {
      setToggled(true);
      setTimeout(() => setOpen(true), 250);
    } else {
      setOpen(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => setToggled(false), 400);
  };

  const handleBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (open) return;

    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("[data-popup]")) return;

    navigate("/doodle");
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.currentTarget === e.target) {
      handleClose();
    }
  };

  return (
    <LayoutGroup>
      <div
        className="relative min-h-screen flex items-center justify-center bg-background cursor-pointer"
        onClick={handleBackgroundClick}
      >
        {/* Toggle button — asymmetric placement, shifted right */}
        <div className="flex items-center justify-center mt-[72px] md:mt-0 translate-x-[22vw] sm:translate-x-[24vw] md:translate-x-[28vw]">
          <div className="group/uno relative flex items-center justify-center">
            {/* Surrounding circle — fingerprint texture instead of solid fill */}
            <span
              aria-hidden
              className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full w-[150px] h-[150px] md:w-[170px] md:h-[170px] overflow-hidden transition-opacity duration-300 ease-in-out group-hover/uno:opacity-100 ${
                toggled ? "opacity-100" : "opacity-80"
              }`}
            >
              <svg viewBox="0 0 76 76" width="100%" height="100%" aria-hidden preserveAspectRatio="xMidYMid meet">
                <defs>
                  <clipPath id="uno-fp-clip">
                    <circle cx="38" cy="38" r="38" />
                  </clipPath>
                </defs>
                <g
                  clipPath="url(#uno-fp-clip)"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="1.1"
                  strokeLinecap="round"
                  opacity="0.85"
                >
                  {/* Concentric fingerprint-like ridges (open arcs) */}
                  <path d="M10 38 Q38 8 66 38" />
                  <path d="M12 44 Q38 16 64 44" />
                  <path d="M14 50 Q38 24 62 50" />
                  <path d="M17 55 Q38 32 59 55" />
                  <path d="M21 59 Q38 40 55 59" />
                  <path d="M26 62 Q38 50 50 62" />
                  <path d="M30 64 Q38 57 46 64" />
                  {/* Lower mirrored ridges */}
                  <path d="M14 32 Q38 60 62 32" />
                  <path d="M18 27 Q38 54 58 27" />
                  <path d="M23 23 Q38 46 53 23" />
                  <path d="M28 20 Q38 38 48 20" />
                  {/* Small ridge endings / minutiae */}
                  <path d="M32 38 Q38 34 44 38" />
                  <path d="M34 42 Q38 39 42 42" />
                </g>
              </svg>
            </span>
          <button
            onClick={handleToggle}
            className="group/uno relative flex items-center justify-center rounded-full w-[76px] h-[76px] transition-colors duration-300 cursor-pointer"
          >
            {!open && (
              <motion.div
                layoutId="morph-circle"
                className="absolute w-7 h-7"
                initial={false}
                transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                animate={{ left: toggled ? 42 : 4 }}
              >
                <svg width="28" height="28" viewBox="0 0 28 28">
                  <defs>
                    <pattern
                      id="hatch-toggle"
                      patternUnits="userSpaceOnUse"
                      width="2.2"
                      height="2.2"
                      patternTransform="rotate(45)"
                    >
                      <line x1="0" y1="0" x2="0" y2="2.2" stroke="hsl(var(--primary))" strokeWidth="1.3" />
                    </pattern>
                  </defs>
                  <circle
                    cx="14"
                    cy="14"
                    r="13"
                    fill="url(#hatch-toggle)"
                    stroke="hsl(var(--primary))"
                    strokeWidth="0.8"
                  />
                </svg>
              </motion.div>
            )}
            <span
              className={`text-xs font-semibold text-primary transition-all duration-300 ease-in-out ${toggled ? "ml-3" : "ml-10"}`}
            >
              .uno
            </span>
          </button>
          </div>
        </div>

        {/* Custom overlay popup */}
        <AnimatePresence>
          {open && (
            <motion.div
              data-overlay
              className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
              onClick={handleOverlayClick}
            >
              {/* Backdrop */}
              <motion.div
                data-overlay
                className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
              />

              {/* Content card */}
              <motion.div
                data-popup
                className="relative z-10 w-full max-w-2xl mx-2 md:mx-4 my-4 border border-border/30 bg-background/80 backdrop-blur-sm p-4 md:p-8 overflow-visible max-h-[calc(100vh-2rem)] overflow-y-auto"
                initial={{ opacity: 0, scale: 0.97, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 10 }}
                transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
              >
                {/* Close button + circle menu — shared coordinate system anchored at top-right */}
                <div className="absolute top-4 right-4">
                  {/* Close button = origin (0,0) of this system */}
                  <button
                    onClick={handleClose}
                    className="absolute top-0 right-0 w-5 h-5 flex items-center justify-center cursor-pointer focus:outline-none z-10"
                  >
                    <motion.span
                      layoutId="morph-circle"
                      className="block w-5 h-5 rounded-full bg-primary/80"
                      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                    />
                  </button>

                  {/* Connector line + circle, positioned relative to the button */}
                  {/*
                    Mobile geometry (button is 20x20 at top:0, right:0):
                      - button center  = (right: 10, top: 10)
                      - circle (46x46) at top: 44, right: 44 → center (right: 67, top: 67)
                      - line from button center to circle center
                    Desktop geometry (button 20x20):
                      - circle (60x60) at top: 56, right: 56 → center (right: 86, top: 86)
                  */}
                  <div className="pointer-events-none">
                    {/* Mobile SVG */}
                    <svg
                      className="absolute md:hidden"
                      style={{ top: 10, right: 10, width: 57, height: 57 }}
                      viewBox="0 0 57 57"
                      fill="none"
                    >
                      <motion.line
                        x1="57"
                        y1="0"
                        x2="33"
                        y2="24"
                        stroke="hsl(var(--primary))"
                        strokeWidth="0.5"
                        opacity="0.5"
                        initial={{ pathLength: 0 }}
                        animate={controls}
                        variants={{
                          hidden: { pathLength: 0 },
                          visible: {
                            pathLength: 1,
                            transition: { duration: 0.45, ease: [0.25, 0.1, 0.25, 1] },
                          },
                        }}
                      />
                    </svg>
                    {/* Desktop SVG */}
                    <svg
                      className="absolute hidden md:block"
                      style={{ top: 10, right: 10, width: 76, height: 76 }}
                      viewBox="0 0 76 76"
                      fill="none"
                    >
                      <motion.line
                        x1="76"
                        y1="0"
                        x2="46"
                        y2="30"
                        stroke="hsl(var(--primary))"
                        strokeWidth="0.5"
                        opacity="0.5"
                        initial={{ pathLength: 0 }}
                        animate={controls}
                        variants={{
                          hidden: { pathLength: 0 },
                          visible: {
                            pathLength: 1,
                            transition: { duration: 0.45, ease: [0.25, 0.1, 0.25, 1] },
                          },
                        }}
                      />
                    </svg>
                    <motion.a
                      href="/garden"
                      onClick={(e) => {
                        e.preventDefault();
                        handleClose();
                        navigate(localePath("/garden"));
                      }}
                      className="pointer-events-auto absolute flex items-center justify-center w-[77px] h-[77px] md:w-[77px] md:h-[77px] top-[22px] right-[22px] md:top-[28px] md:right-[28px] rounded-full text-[9px] md:text-[10px] tracking-[0.1em] text-primary/70 hover:text-primary transition-colors cursor-pointer"
                      initial={{ opacity: 0 }}
                      animate={controls}
                      variants={{
                        hidden: { opacity: 0 },
                        visible: {
                          opacity: 1,
                          transition: {
                            delay: 0.5,
                            duration: 0.35,
                            ease: [0.22, 1, 0.36, 1],
                          },
                        },
                      }}
                    >
                      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 77 77">
                        <motion.circle
                          cx="38.5"
                          cy="38.5"
                          r="37.5"
                          fill="none"
                          stroke="hsl(var(--primary))"
                          strokeWidth="1"
                          strokeDasharray="236"
                          initial={{ strokeDashoffset: 236 }}
                          animate={controls}
                          variants={{
                            hidden: { strokeDashoffset: 236 },
                            visible: {
                              strokeDashoffset: 0,
                              transition: {
                                delay: 0.48,
                                duration: 0.75,
                                ease: [0.25, 0.1, 0.25, 1],
                              },
                            },
                          }}
                        />
                      </svg>

                      <motion.span
                        initial={{ opacity: 0, y: 4 }}
                        animate={controls}
                        variants={{
                          hidden: { opacity: 0, y: 4 },
                          visible: {
                            opacity: 1,
                            y: 0,
                            transition: { delay: 0.75, duration: 0.25, ease: [0.22, 1, 0.36, 1] },
                          },
                        }}
                      >
                        garden
                      </motion.span>
                    </motion.a>
                  </div>
                </div>

                {/* Header */}
                <div className="flex flex-col space-y-1.5 text-left overflow-visible">
                  {/* Mobile header */}
                  <div className="md:hidden overflow-visible">
                    <div className="flex flex-col gap-1 -ml-[0.35em] pr-10">
                      <a
                        href="/gateway"
                        onClick={(e) => {
                          e.preventDefault();
                          handleClose();
                          navigate(localePath("/gateway"));
                        }}
                        className="text-base tracking-[0.15em] font-normal text-foreground hover:text-primary transition-colors"
                      >
                        .uno<span className="text-[9px] tracking-[0.08em] text-muted-foreground">{t.index.studio_suffix}</span>
                      </a>
                      <p className="text-muted-foreground tracking-[0.08em] text-[9px] font-light">
                        {t.index.architect_design_art}
                      </p>
                    </div>
                  </div>
                  {/* Desktop header */}
                  <div className="hidden md:flex items-baseline gap-4 overflow-visible -ml-[0.35em]">
                    <a
                      href="/gateway"
                      onClick={(e) => {
                        e.preventDefault();
                        handleClose();
                        navigate(localePath("/gateway"));
                      }}
                      className="text-base tracking-[0.15em] font-normal whitespace-nowrap hover:text-primary transition-colors"
                    >
                      .uno<span className="text-[9px] tracking-[0.08em] text-muted-foreground">{t.index.studio_suffix}</span>
                    </a>
                    <p className="text-muted-foreground tracking-[0.08em] text-[9px] font-light">
                      {t.index.architect_design_art}
                    </p>
                  </div>
                </div>

                {/* Content */}
                <div className="text-foreground leading-relaxed mt-7 flex flex-col">
                  <motion.div
                    className="text-left text-foreground"
                    initial="hidden"
                    animate={controls}
                    variants={{
                      hidden: { opacity: 0, y: 12 },
                      visible: {
                        opacity: 1,
                        y: 0,
                        transition: {
                          delay: 0.7,
                          duration: 0.45,
                          ease: [0.25, 0.1, 0.25, 1],
                        },
                      },
                    }}
                  >
                    <p className="text-[12px] md:text-[13px] font-light text-foreground/80 tracking-[0.1em] mt-6 mb-1">
                      {t.index.structure_label}
                    </p>
                    <p className="text-[14px] md:text-[15px] leading-[1.65]">
                      {t.index.tagline}
                    </p>
                  </motion.div>
                  <motion.a
                    href="/pricing"
                    onClick={(e) => {
                      e.preventDefault();
                      handleClose();
                      navigate(localePath("/pricing"));
                    }}
                    className="block text-left text-[13px] text-primary/75 hover:text-primary/90 transition-colors mt-7"
                    initial="hidden"
                    animate={controls}
                    variants={{
                      hidden: { opacity: 0, y: 10 },
                      visible: {
                        opacity: 1,
                        y: 0,
                        transition: {
                          delay: 0.95,
                          duration: 0.4,
                          ease: [0.25, 0.1, 0.25, 1],
                        },
                      },
                    }}
                  >
                    {t.index.pricing_link}
                  </motion.a>
                  <motion.div
                    className="mt-10 pt-4 border-t border-border/20 flex items-baseline gap-2"
                    initial="hidden"
                    animate={controls}
                    variants={{
                      hidden: { opacity: 0 },
                      visible: {
                        opacity: 1,
                        transition: {
                          delay: 1.2,
                          duration: 0.45,
                          ease: [0.25, 0.1, 0.25, 1],
                        },
                      },
                    }}
                  >
                    <span className="text-[9px] tracking-[0.08em] text-muted-foreground">© 2026</span>
                    <a
                      href="/about"
                      onClick={(e) => {
                        e.preventDefault();
                        handleClose();
                        navigate(localePath("/about"));
                      }}
                      className="text-[11px] tracking-[0.12em] font-normal text-primary hover:text-primary/80 transition-colors"
                    >
                      {t.index.author_link}
                    </a>
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Language switcher — hidden on the hero, visible only when the
            popup is open. */}
        <LanguageSwitcher hidden={!open} />
      </div>
    </LayoutGroup>
  );
};

export default Index;

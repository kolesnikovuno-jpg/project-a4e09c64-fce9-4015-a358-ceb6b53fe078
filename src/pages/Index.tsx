import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, LayoutGroup, useAnimation } from "motion/react";
import { useIsNative } from "@/hooks/use-native";
import { useLocale } from "@/i18n/useLocale";
import LanguageSwitcher from "@/i18n/LanguageSwitcher";

const Index = () => {
  const [open, setOpen] = useState(false);
  const [toggled, setToggled] = useState(false);
  const [buttonActive, setButtonActive] = useState(false);
  const [returnPhase, setReturnPhase] = useState<"idle" | "center">("idle");
  const [popupMounted, setPopupMounted] = useState(false);
  const openRef = useRef(open);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const centerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buttonTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();
  const isNative = useIsNative();
  const controls = useAnimation();
  const { t, localePath } = useLocale();

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    return () => {
      if (openTimerRef.current) clearTimeout(openTimerRef.current);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      if (centerTimerRef.current) clearTimeout(centerTimerRef.current);
      if (buttonTimerRef.current) clearTimeout(buttonTimerRef.current);
    };
  }, []);

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
    if (open) {
      handleClose();
      return;
    }

    if (openTimerRef.current) clearTimeout(openTimerRef.current);
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    if (centerTimerRef.current) clearTimeout(centerTimerRef.current);
    if (buttonTimerRef.current) clearTimeout(buttonTimerRef.current);
    setReturnPhase("idle");
    setToggled(true);
    setButtonActive(true);

    if (popupMounted) {
      setOpen(true);
      return;
    }

    setPopupMounted(true);
    setOpen(true);
  };

  const handleClose = () => {
    if (openTimerRef.current) clearTimeout(openTimerRef.current);
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    if (centerTimerRef.current) clearTimeout(centerTimerRef.current);
    if (buttonTimerRef.current) clearTimeout(buttonTimerRef.current);
    setReturnPhase("center");
    setOpen(false);
    centerTimerRef.current = setTimeout(() => setReturnPhase("idle"), 750);
    resetTimerRef.current = setTimeout(() => setToggled(false), 470);
    buttonTimerRef.current = setTimeout(() => setButtonActive(false), 750);
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
            {/* Surrounding circle — same fill as button, mirrors hover/toggled state */}
            <span
              aria-hidden
              className={`pointer-events-none absolute rounded-full w-[76px] h-[76px] transition-colors duration-300 ease-in-out group-hover/uno:bg-primary/75 ${
                buttonActive ? "bg-primary/75" : "bg-primary/45"
              }`}
            />
          <button
            onClick={handleToggle}
            className="group/uno relative flex items-center justify-center bg-primary/45 rounded-full w-[76px] h-[76px] hover:bg-primary/75 transition-colors duration-300 cursor-pointer active:scale-[1.06]"
          >
            {!open && (
              <motion.div
                layoutId="morph-circle"
                className="absolute w-7 h-7"
                initial={false}
                transition={{
                  duration: 0.58,
                  ease: [0.65, 0, 0.35, 1],
                  left: {
                    duration: 0.58,
                    ease: [0.65, 0, 0.35, 1],
                  },
                  scale: {
                    duration: 0.7,
                    ease: [0.4, 0, 0.2, 1],
                    times: returnPhase === "center" ? [0, 0.45, 1] : undefined,
                  },
                  opacity: {
                    duration: 0.7,
                    ease: [0.33, 1, 0.68, 1],
                    times: returnPhase === "center" ? [0, 0.55, 1] : undefined,
                  },
                }}
                style={{ willChange: "transform, opacity" }}
                animate={{
                  left: toggled ? 42 : 4,
                  scale: toggled
                    ? 0.42
                    : returnPhase === "center"
                    ? [0.42, 0.18, 1]
                    : 1,
                  opacity: toggled
                    ? 0
                    : returnPhase === "center"
                    ? [0, 0, 1]
                    : 1,
                }}
              >
                <div className="relative w-full h-full">
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 28 28">
                    <defs>
                      <pattern
                        id="hatch-toggle"
                        patternUnits="userSpaceOnUse"
                        width="2.2"
                        height="2.2"
                        patternTransform="rotate(45)"
                      >
                        <line x1="0" y1="0" x2="0" y2="2.2" stroke="hsl(var(--background))" strokeWidth="1.3" />
                      </pattern>
                    </defs>
                    <circle
                      cx="14"
                      cy="14"
                      r="13"
                      fill="url(#hatch-toggle)"
                      stroke="hsl(var(--background))"
                      strokeWidth="0.4"
                    />
                  </svg>
                </div>
              </motion.div>
            )}
            <span
              className="text-xs font-semibold text-background ml-[36px]"
            >
              .uno
            </span>
          </button>
          </div>
        </div>

        {/* Custom overlay popup */}
        {popupMounted && (
            <motion.div
              data-overlay
              className={`fixed inset-0 z-50 flex items-center justify-center overflow-y-auto ${open ? "pointer-events-auto" : "pointer-events-none"}`}
              initial={false}
              animate={{ opacity: open ? 1 : 0 }}
              transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
              onAnimationComplete={() => {
                if (!openRef.current) setPopupMounted(false);
              }}
              onClick={handleOverlayClick}
            >
              {/* Backdrop */}
              <motion.div
                data-overlay
                className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                initial={false}
                animate={{ opacity: open ? 1 : 0 }}
                transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
              />

              {/* Content card */}
              <motion.div
                data-popup
                className="relative z-10 w-full max-w-2xl mx-2 md:mx-4 my-4 border border-border/30 bg-background/80 backdrop-blur-sm p-4 md:p-8 overflow-visible max-h-[calc(100vh-2rem)] overflow-y-auto"
                initial={false}
                animate={open ? { opacity: 1 } : { opacity: 0 }}
                transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
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
                      className="block w-5 h-5 relative"
                      initial={{ scale: 0.7 }}
                      animate={{ scale: [0.7, 0.7, 1] }}
                      transition={{
                        duration: 0.75,
                        ease: [0.4, 0, 0.2, 1],
                        scale: { duration: 0.75, ease: [0.4, 0, 0.2, 1], times: [0, 0.55, 1] },
                      }}
                      style={{ willChange: "transform, opacity" }}
                    >
                      {/* Striped layer — fades out during travel */}
                      <motion.svg
                        className="absolute inset-0 w-full h-full"
                        viewBox="0 0 28 28"
                        initial={{ opacity: 1 }}
                        animate={{ opacity: open ? 0 : 1 }}
                        transition={{
                          duration: 0.4,
                          delay: open ? 0.25 : 0.15,
                          ease: [0.4, 0, 0.2, 1],
                        }}
                        style={{ willChange: "opacity" }}
                      >
                        <defs>
                          <pattern
                            id="hatch-morph"
                            patternUnits="userSpaceOnUse"
                            width="2.2"
                            height="2.2"
                            patternTransform="rotate(45)"
                          >
                            <line x1="0" y1="0" x2="0" y2="2.2" stroke="hsl(var(--background))" strokeWidth="1.3" />
                          </pattern>
                        </defs>
                        <circle
                          cx="14"
                          cy="14"
                          r="13"
                          fill="url(#hatch-morph)"
                          stroke="hsl(var(--background))"
                          strokeWidth="0.4"
                        />
                      </motion.svg>
                      {/* Filled layer — fades in during travel */}
                      <motion.span
                        className="absolute inset-0 rounded-full bg-primary/80"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: open ? 1 : 0 }}
                        transition={{
                          duration: 0.4,
                          delay: open ? 0.25 : 0.15,
                          ease: [0.4, 0, 0.2, 1],
                        }}
                        style={{ willChange: "opacity" }}
                      />
                    </motion.span>
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
                        exit={{ pathLength: 0, transition: { duration: 0.5, ease: [0.4, 0, 1, 1] } }}
                        variants={{
                          hidden: { pathLength: 0 },
                          visible: {
                            pathLength: 1,
                            transition: { delay: 0.37, duration: 1.4, ease: [0.4, 0, 1, 1] },
                          },
                        }}
                      />
                      <motion.circle
                        r="2"
                        fill="hsl(var(--primary))"
                        initial={{ opacity: 0, cx: 57, cy: 0 }}
                        animate={controls}
                        exit={{ opacity: 0, transition: { duration: 0.3 } }}
                        variants={{
                          hidden: { opacity: 0, cx: 57, cy: 0 },
                          visible: {
                            opacity: [0, 0.9, 0.9, 0.9, 0],
                            cx: [57, 57, 33, 33, 33],
                            cy: [0, 0, 24, 24, 24],
                            transition: {
                              delay: 0.37,
                              duration: 3.17,
                              times: [0, 0.05, 0.44, 0.55, 0.88],
                              ease: "linear",
                            },
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
                        exit={{ pathLength: 0, transition: { duration: 0.5, ease: [0.4, 0, 1, 1] } }}
                        variants={{
                          hidden: { pathLength: 0 },
                          visible: {
                            pathLength: 1,
                            transition: { delay: 0.37, duration: 1.4, ease: [0.4, 0, 1, 1] },
                          },
                        }}
                      />
                      <motion.circle
                        r="2.2"
                        fill="hsl(var(--primary))"
                        initial={{ opacity: 0, cx: 76, cy: 0 }}
                        animate={controls}
                        exit={{ opacity: 0, transition: { duration: 0.3 } }}
                        variants={{
                          hidden: { opacity: 0, cx: 76, cy: 0 },
                          visible: {
                            opacity: [0, 0.9, 0.9, 0.9, 0],
                            cx: [76, 76, 46, 46, 46],
                            cy: [0, 0, 30, 30, 30],
                            transition: {
                              delay: 0.37,
                              duration: 3.17,
                              times: [0, 0.05, 0.44, 0.55, 0.88],
                              ease: "linear",
                            },
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
                      exit={{ opacity: 0, transition: { duration: 0.2 } }}
                      variants={{
                        hidden: { opacity: 0 },
                        visible: {
                          opacity: 1,
                          transition: {
                            delay: 1.77,
                            duration: 0.01,
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
                        transform="rotate(-45 38.5 38.5) scale(1 -1) translate(0 -77)"
                        initial={{ strokeDashoffset: 236 }}
                          animate={controls}
                          exit={{ strokeDashoffset: 236, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] } }}
                          variants={{
                            hidden: { strokeDashoffset: 236 },
                            visible: {
                              strokeDashoffset: 0,
                              transition: {
                                delay: 1.77,
                                duration: 1.4,
                                ease: [0.4, 0, 0.2, 1],
                              },
                            },
                          }}
                        />
                      </svg>

                      <motion.span
                        initial={{ opacity: 0, y: 4 }}
                        animate={controls}
                        exit={{ opacity: 0, y: 4, transition: { duration: 0.35, ease: [0.4, 0, 1, 1] } }}
                        variants={{
                          hidden: { opacity: 0, y: 4 },
                          visible: {
                            opacity: 1,
                            y: 0,
                            transition: { delay: 3.0, duration: 1.2, ease: [0.4, 0, 0.2, 1] },
                          },
                        }}
                      >
                        garden
                      </motion.span>
                    </motion.a>
                  </div>
                </div>

                {/* Header */}
                <motion.div
                  className="flex flex-col space-y-1.5 text-left overflow-visible"
                  initial="hidden"
                  animate={controls}
                  exit={{ opacity: 0, transition: { duration: 0.35, ease: [0.4, 0, 1, 1] } }}
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: { delay: 3.17, duration: 1.6, ease: [0.4, 0, 0.2, 1] },
                    },
                  }}
                >
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
                </motion.div>

                {/* Content */}
                <div className="text-foreground leading-relaxed mt-7 flex flex-col">
                  <div className="text-left text-foreground">
                    <motion.p
                      className="text-[12px] md:text-[13px] font-light text-foreground/80 tracking-[0.1em] mt-6 mb-1"
                      initial="hidden"
                      animate={controls}
                      exit={{ opacity: 0, transition: { duration: 0.35, ease: [0.4, 0, 1, 1] } }}
                      variants={{
                        hidden: { opacity: 0 },
                        visible: {
                          opacity: 1,
                          transition: { delay: 3.17, duration: 1.8, ease: [0.4, 0, 0.2, 1] },
                        },
                      }}
                    >
                      {t.index.structure_label}
                    </motion.p>
                    <motion.p
                      className="text-[14px] md:text-[15px] leading-[1.65]"
                      initial="hidden"
                      animate={controls}
                      exit={{ opacity: 0, transition: { duration: 0.35, ease: [0.4, 0, 1, 1] } }}
                      variants={{
                        hidden: { opacity: 0 },
                        visible: {
                          opacity: 1,
                          transition: { delay: 3.47, duration: 1.6, ease: [0.4, 0, 0.2, 1] },
                        },
                      }}
                    >
                      {t.index.tagline}
                    </motion.p>
                  </div>
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
                    exit={{ opacity: 0, transition: { duration: 0.35, ease: [0.4, 0, 1, 1] } }}
                    variants={{
                      hidden: { opacity: 0 },
                      visible: {
                        opacity: 1,
                        transition: {
                          delay: 4.07,
                          duration: 1.4,
                          ease: "linear",
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
                    exit={{ opacity: 0, transition: { duration: 0.35, ease: [0.4, 0, 1, 1] } }}
                    variants={{
                      hidden: { opacity: 0 },
                      visible: {
                        opacity: 1,
                        transition: {
                          delay: 4.27,
                          duration: 1.6,
                          ease: [0.4, 0, 0.2, 1],
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
                  <motion.a
                    href="https://t.me/+-QJlOeTl9fZkNzIy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 block text-right text-[10px] tracking-[0.1em] text-muted-foreground/70 hover:text-muted-foreground transition-colors"
                    initial="hidden"
                    animate={controls}
                    exit={{ opacity: 0, transition: { duration: 0.35, ease: [0.4, 0, 1, 1] } }}
                    variants={{
                      hidden: { opacity: 0 },
                      visible: {
                        opacity: 1,
                        transition: {
                          delay: 4.37,
                          duration: 1.6,
                          ease: [0.4, 0, 0.2, 1],
                        },
                      },
                    }}
                  >
                    Telegram Journal →
                  </motion.a>
                </div>
              </motion.div>
            </motion.div>
          )}
        {/* Language switcher — hidden on the hero, visible only when the
            popup is open. */}
        <LanguageSwitcher hidden={!open} />
      </div>
    </LayoutGroup>
  );
};

export default Index;

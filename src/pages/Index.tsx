import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, LayoutGroup } from "motion/react";
import { useIsNative } from "@/hooks/use-native";

const Index = () => {
  const [open, setOpen] = useState(false);
  const [toggled, setToggled] = useState(false);
  const navigate = useNavigate();
  const isNative = useIsNative();

  // In the native iOS app, launch directly into the calculator.
  useEffect(() => {
    if (isNative) navigate("/unocalc", { replace: true });
  }, [isNative, navigate]);

  const handleToggle = () => {
    if (!toggled) {
      setToggled(true);
      setTimeout(() => setOpen(true), 350);
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
          <button
            onClick={handleToggle}
            className="group relative flex items-center bg-primary/70 rounded-full w-[76px] h-9 hover:bg-primary/85 transition-colors cursor-pointer"
          >
            {!open && (
              <motion.div
                layoutId="morph-circle"
                className="absolute w-7 h-7"
                initial={false}
                transition={{ type: "spring", stiffness: 200, damping: 28, mass: 0.8 }}
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
                      <line x1="0" y1="0" x2="0" y2="2.2" stroke="hsl(var(--background))" strokeWidth="1.3" />
                    </pattern>
                  </defs>
                  <circle
                    cx="14"
                    cy="14"
                    r="13"
                    fill="url(#hatch-toggle)"
                    stroke="hsl(var(--background))"
                    strokeWidth="0.8"
                  />
                </svg>
              </motion.div>
            )}
            <span
              className={`text-xs font-semibold text-background transition-all duration-300 ease-in-out ${toggled ? "ml-2" : "ml-9"}`}
            >
              .uno
            </span>
          </button>
        </div>

        {/* Custom overlay popup */}
        <AnimatePresence>
          {open && (
            <motion.div
              data-overlay
              className="fixed inset-0 z-50 flex items-start md:items-center justify-center overflow-y-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={handleOverlayClick}
            >
              {/* Backdrop */}
              <motion.div
                data-overlay
                className="absolute inset-0 bg-background/60 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />

              {/* Content card */}
              <motion.div
                data-popup
                className="relative z-10 w-full max-w-2xl mx-2 md:mx-4 my-4 border border-border/30 bg-background/70 backdrop-blur-sm p-4 md:p-8 overflow-visible max-h-[calc(100vh-2rem)] overflow-y-auto"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2 }}
              >
                {/* Close button — morphing circle */}
                <button
                  onClick={handleClose}
                  className="absolute right-4 top-4 w-5 h-5 flex items-center justify-center cursor-pointer focus:outline-none"
                >
                  <motion.span
                    layoutId="morph-circle"
                    className="block w-5 h-5 rounded-full bg-primary/80"
                    transition={{ type: "spring", stiffness: 200, damping: 28, mass: 0.8 }}
                  />
                </button>

                {/* Circle menu — line from close to unocalc */}
                <div
                  className="hidden md:block absolute pointer-events-none"
                  style={{ top: "8px", right: "8px", width: "160px", height: "110px" }}
                >
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 160 110" fill="none">
                    <line
                      x1="148"
                      y1="12"
                      x2="98"
                      y2="58"
                      stroke="hsl(var(--primary))"
                      strokeWidth="0.75"
                      opacity="0.55"
                    />
                  </svg>
                  <a
                    href="/garden"
                    onClick={(e) => {
                      e.preventDefault();
                      handleClose();
                      navigate("/garden");
                    }}
                    className="pointer-events-auto absolute flex items-center justify-center w-[60px] h-[60px] rounded-full border border-primary/30 text-[10px] tracking-[0.1em] text-primary/70 hover:text-primary hover:border-primary/50 transition-colors cursor-pointer"
                    style={{ left: "52px", top: "38px" }}
                  >
                    garden
                  </a>
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
                          navigate("/gateway");
                        }}
                        className="text-base tracking-[0.15em] font-normal text-foreground hover:text-primary transition-colors"
                      >
                        .uno<span className="text-[9px] tracking-[0.08em] text-muted-foreground">studio</span>
                      </a>
                      <p className="text-foreground tracking-[0.08em] text-[9px] font-light">
                        architect &nbsp;.&nbsp; design &nbsp;.&nbsp; art
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
                        navigate("/gateway");
                      }}
                      className="text-base tracking-[0.15em] font-normal whitespace-nowrap hover:text-primary transition-colors"
                    >
                      .uno<span className="text-[9px] tracking-[0.08em] text-muted-foreground">studio</span>
                    </a>
                    <p className="text-foreground tracking-[0.08em] text-[9px] font-light">
                      architect &nbsp;.&nbsp; design &nbsp;.&nbsp; art
                    </p>
                  </div>
                </div>

                {/* Content */}
                <div className="text-foreground leading-relaxed mt-7 flex flex-col">
                  <div className="text-left text-foreground">
                    <p className="text-[12px] md:text-[13px] font-light text-foreground/80 mt-6 mb-1">
                      нет структуры - нет решения.
                    </p>
                    <p className="text-[14px] md:text-[15px] leading-[1.65]">
                      выявляю структуру и собираю форму, в которой всё становится на место.
                    </p>
                  </div>
                  <a
                    href="/pricing"
                    onClick={(e) => {
                      e.preventDefault();
                      handleClose();
                      navigate("/pricing");
                    }}
                    className="block text-left text-[13px] text-primary/75 hover:text-primary/90 transition-colors mt-7"
                  >
                    Формат и стоимость →
                  </a>
                  <div className="mt-10 pt-4 border-t border-border/20 flex items-baseline gap-2">
                    <span className="text-[9px] tracking-[0.08em] text-muted-foreground">© 2026</span>
                    <a
                      href="/about"
                      onClick={(e) => {
                        e.preventDefault();
                        handleClose();
                        navigate("/about");
                      }}
                      className="text-[11px] tracking-[0.12em] font-normal text-primary hover:text-primary/80 transition-colors"
                    >
                      R.Yury Kolesnikov ⟶
                    </a>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </LayoutGroup>
  );
};

export default Index;

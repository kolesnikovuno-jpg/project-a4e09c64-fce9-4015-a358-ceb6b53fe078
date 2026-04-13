import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, LayoutGroup } from "motion/react";

const Index = () => {
  const [open, setOpen] = useState(false);
  const [toggled, setToggled] = useState(false);
  const navigate = useNavigate();

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
        className="relative min-h-screen flex items-center justify-center bg-white/90 cursor-pointer"
        onClick={handleBackgroundClick}
      >
        {/* Toggle button */}
        <div className="flex items-center justify-center mt-[72px] md:mt-0">
          <button
            onClick={handleToggle}
            className="group relative flex items-center bg-primary border border-primary/60 rounded-full w-[76px] h-9 hover:bg-primary/90 transition-colors cursor-pointer translate-x-[27px]"
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
                    <pattern id="hatch-toggle" patternUnits="userSpaceOnUse" width="3" height="3" patternTransform="rotate(45)">
                      <line x1="0" y1="0" x2="0" y2="3" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8" />
                    </pattern>
                  </defs>
                  <circle cx="14" cy="14" r="13" fill="url(#hatch-toggle)" stroke="rgba(255,255,255,0.6)" strokeWidth="0.8" />
                </svg>
              </motion.div>
            )}
            <span
              className={`text-xs font-semibold text-white transition-all duration-300 ease-in-out ${toggled ? "ml-2" : "ml-9"}`}
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
                className="absolute inset-0 bg-white/60 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />

              {/* Content card */}
              <motion.div
                data-popup
                className="relative z-10 w-full max-w-2xl mx-2 md:mx-4 my-4 border border-white/20 bg-white/60 backdrop-blur-sm p-4 md:p-8 overflow-visible max-h-[calc(100vh-2rem)] overflow-y-auto"
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
                    className="block w-5 h-5 rounded-full"
                    style={{ backgroundColor: "#93D6D0" }}
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
                    href="/unocalc"
                    onClick={(e) => {
                      e.preventDefault();
                      handleClose();
                      navigate("/unocalc");
                    }}
                    className="pointer-events-auto absolute flex items-center justify-center w-[60px] h-[60px] rounded-full border border-primary/30 text-[10px] tracking-[0.1em] text-primary/70 hover:text-primary hover:border-primary/50 transition-colors cursor-pointer"
                    style={{ left: "52px", top: "38px" }}
                  >
                    unocalc
                  </a>
                </div>

                {/* Header */}
                <div className="flex flex-col space-y-1.5 text-left overflow-visible">
                  {/* Mobile header */}
                  <div className="md:hidden overflow-visible">
                    <div className="flex items-baseline gap-3">
                      <a
                        href="/about"
                        onClick={(e) => {
                          e.preventDefault();
                          handleClose();
                          navigate("/about");
                        }}
                        className="text-sm tracking-[0.15em] font-normal text-primary hover:text-primary/80 transition-colors"
                      >
                        R.Yury Kolesnikov
                      </a>
                      <span className="text-sm tracking-[0.15em] font-normal text-foreground">
                        .uno<span className="text-[8px] tracking-[0.08em] text-muted-foreground">studio</span>
                      </span>
                    </div>
                  </div>
                  {/* Desktop header */}
                  <div className="hidden md:flex relative items-baseline overflow-visible">
                    <a
                      href="/about"
                      onClick={(e) => {
                        e.preventDefault();
                        handleClose();
                        navigate("/about");
                      }}
                      className="text-sm tracking-[0.15em] font-normal text-primary hover:text-primary/80 transition-colors"
                    >
                      R.Yury Kolesnikov
                    </a>
                    <span className="absolute left-1/2 -translate-x-1/2 text-sm tracking-[0.15em] font-normal whitespace-nowrap">
                      .uno<span className="text-[8px] tracking-[0.08em] text-muted-foreground">studio</span>
                    </span>
                  </div>
                  <div className="flex items-baseline mt-2">
                    <p className="text-foreground tracking-[0.12em] text-[13px]">
                      architect &nbsp;.&nbsp; design &nbsp;.&nbsp; art
                    </p>
                    <a
                      href="/unocalc"
                      onClick={(e) => {
                        e.preventDefault();
                        handleClose();
                        navigate("/unocalc");
                      }}
                      className="md:hidden ml-auto text-[11px] tracking-[0.1em] text-primary/70 hover:text-primary transition-colors"
                    >
                      unocalc
                    </a>
                  </div>
                  <p className="text-muted-foreground text-[12px] leading-relaxed mt-1">
                    выявляю структуру → формирую идею →<br />
                    разворачиваю в проект → контролирую реализацию.
                  </p>
                </div>

                {/* Content */}
                <div className="text-foreground leading-relaxed md:grid md:grid-cols-2 md:gap-10 mt-4">
                  <div className="flex flex-col">
                    <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/70 mb-1">что это</p>
                    <p className="text-[15px] md:text-[16px] font-medium mb-4 md:mb-6">
                      Проектирование структуры и формы.
                    </p>

                    <div className="md:hidden space-y-4 mb-6">
                      <div>
                        <p className="text-[13px] font-normal text-foreground">Анализ ситуации</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Определение контекста, конфигурации и связей.
                        </p>
                      </div>
                      <div>
                        <p className="text-[13px] font-normal text-foreground">Формирование идеи</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Выбор принципа решения.</p>
                      </div>
                      <div>
                        <p className="text-[13px] font-normal text-foreground">Создание концепции</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Сборка формы и логики.</p>
                      </div>
                      <div>
                        <p className="text-[13px] font-normal text-foreground">Разработка проекта</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Рабочая документация и проекции.</p>
                      </div>
                      <div>
                        <p className="text-[13px] font-normal text-foreground">Контроль реализации</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Проверка соответствия и передача прав.
                        </p>
                      </div>
                    </div>

                    <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/70 mb-1">результат</p>
                    <p className="text-[15px] md:text-[16px] font-medium mb-4 md:mb-6">
                      Структура, которая работает.
                    </p>
                    <a
                      href="https://t.me/kolesnikov_uno"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-[13px] text-primary font-medium hover:text-primary/80 transition-colors mb-1.5"
                    >
                      Написать в Telegram →
                    </a>
                    <a
                      href="/pricing"
                      onClick={(e) => {
                        e.preventDefault();
                        handleClose();
                        navigate("/pricing");
                      }}
                      className="block text-[13px] text-primary/75 hover:text-primary/90 transition-colors"
                    >
                      Формат и стоимость →
                    </a>
                    <div className="flex-1" />
                    <a
                      href="/garden"
                      onClick={(e) => {
                        e.preventDefault();
                        handleClose();
                        navigate("/garden");
                      }}
                      className="block text-[13px] tracking-[0.12em] text-primary hover:text-primary/80 transition-colors mt-4 md:mt-0"
                    >
                      Garden
                    </a>
                  </div>

                  <div className="hidden md:block">
                    <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/70 mb-3">
                      как это происходит
                    </p>
                    <div className="space-y-5">
                      <div>
                        <p className="text-[13px] font-normal text-foreground">Анализ ситуации</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Определение контекста, конфигурации и связей.
                        </p>
                      </div>
                      <div>
                        <p className="text-[13px] font-normal text-foreground">Формирование идеи</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Выбор принципа решения.</p>
                      </div>
                      <div>
                        <p className="text-[13px] font-normal text-foreground">Создание концепции</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Сборка формы и логики.</p>
                      </div>
                      <div>
                        <p className="text-[13px] font-normal text-foreground">Разработка проекта</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Рабочая документация и проекции.</p>
                      </div>
                      <div>
                        <p className="text-[13px] font-normal text-foreground">Контроль реализации</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Проверка соответствия и передача прав.
                        </p>
                      </div>
                    </div>
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

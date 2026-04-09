import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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

  const handleClose = (value: boolean) => {
    if (!value) {
      setOpen(false);
      setToggled(false);
    }
  };

  const handleBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("[role='dialog']")) return;
    navigate("/canvas");
  };

  return (
    <div
      className="relative min-h-screen flex items-center bg-white/90 cursor-pointer justify-start pl-6 md:justify-center md:pl-0"
      onClick={handleBackgroundClick}
    >
      {/* Mobile: left-aligned naturally. Desktop: absolute centered on circle */}
      <div className="flex flex-col items-start md:absolute md:top-1/2 md:left-1/2 md:[-webkit-transform:translate(-18px,-50%)] md:[transform:translate(-18px,-50%)]">
        <p className="text-foreground mb-3 tracking-widest text-base md:text-sm">
          architect &nbsp;.&nbsp; design &nbsp;.&nbsp; art
        </p>
        <p className="text-muted-foreground leading-relaxed text-sm md:text-xs tracking-wider mb-8">
          выявляю структуру → формирую идею →<br />
          разворачиваю в проект → контролирую<br />
          реализацию.
        </p>

        {/* Toggle button */}
        <button
          onClick={handleToggle}
          className="group relative flex items-center bg-primary border border-primary/60 rounded-full w-[90px] h-9 hover:bg-primary/90 transition-colors cursor-pointer"
        >
          <span
            className={`absolute w-7 h-7 rounded-full bg-white/80 shadow-sm transition-all duration-300 ease-in-out ${toggled ? 'left-[55px]' : 'left-1'}`}
          />
          <span className={`text-xs font-semibold text-white tracking-wider transition-all duration-300 ease-in-out ${toggled ? 'ml-3' : 'ml-10'}`}>.uno</span>
        </button>
      </div>


      {/* Popup */}
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-2xl rounded-none border border-white/20 bg-white/60 backdrop-blur-sm shadow-none p-8">
          <DialogHeader className="text-left">
            <DialogTitle className="text-sm tracking-widest font-normal">
              .uno studio
            </DialogTitle>
          </DialogHeader>

          {/* Mobile: vertical stack / Desktop: two columns */}
          <div className="text-foreground leading-relaxed tracking-wide md:grid md:grid-cols-2 md:gap-10">
            {/* Left column: what + result + links */}
            <div>
              <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-1">что это</p>
              <p className="text-[15px] md:text-[17px] font-semibold tracking-tight mb-6 md:mb-10">Проектирование структуры и формы.</p>

              {/* On mobile: steps go here (between what and result) */}
              <div className="md:hidden space-y-4 mb-6">
                <div>
                  <p className="text-[13px] font-normal text-foreground">Анализ ситуации</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Определение контекста, конфигурации и связей.</p>
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
                  <p className="text-[11px] text-muted-foreground mt-0.5">Проверка соответствия и передача прав.</p>
                </div>
              </div>

              <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-1">результат</p>
              <p className="text-[15px] md:text-[17px] font-semibold tracking-tight mb-5 md:mb-8">Структура, которая работает.</p>
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
                onClick={(e) => { e.preventDefault(); handleClose(false); navigate("/pricing"); }}
                className="block text-[13px] text-primary/75 hover:text-primary/90 transition-colors"
              >
                Формат и стоимость →
              </a>
            </div>

            {/* Right column: steps (desktop only) */}
            <div className="hidden md:block">
              <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-4">как это происходит</p>
              <div className="space-y-5">
                <div>
                  <p className="text-[13px] font-normal text-foreground">Анализ ситуации</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Определение контекста, конфигурации и связей.</p>
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
                  <p className="text-[11px] text-muted-foreground mt-0.5">Проверка соответствия и передача прав.</p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;

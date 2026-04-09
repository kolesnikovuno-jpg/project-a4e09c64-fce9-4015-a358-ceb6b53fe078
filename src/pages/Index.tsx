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
        <DialogContent className="sm:max-w-lg rounded-none border border-white/20 bg-white/60 backdrop-blur-sm shadow-none p-8">
          <DialogHeader className="text-left">
            <DialogTitle className="text-sm tracking-widest font-normal">
              .uno studio
            </DialogTitle>
          </DialogHeader>
          <div className="text-sm text-foreground leading-relaxed tracking-wider space-y-0">
            <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1">что это</p>
            <p className="text-base font-medium mb-0.5">Проектирование структуры и формы.</p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-4">как это происходит</p>

            <div className="space-y-0 divide-y divide-muted">
              <div className="py-3">
                <p className="font-medium text-sm">Анализ ситуации</p>
                <p className="text-xs text-muted-foreground">Определение контекста, конфигурации и связей.</p>
              </div>
              <div className="py-3">
                <p className="font-medium text-sm">Формирование идеи</p>
                <p className="text-xs text-muted-foreground">Выбор принципа решения.</p>
              </div>
              <div className="py-3">
                <p className="font-medium text-sm">Создание концепции</p>
                <p className="text-xs text-muted-foreground">Сборка формы и логики.</p>
              </div>
              <div className="py-3">
                <p className="font-medium text-sm">Разработка проекта</p>
                <p className="text-xs text-muted-foreground">Рабочая документация и проекции.</p>
              </div>
              <div className="py-3">
                <p className="font-medium text-sm">Контроль реализации</p>
                <p className="text-xs text-muted-foreground">Проверка соответствия и передача прав.</p>
              </div>
            </div>

            <div className="pt-4">
              <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1">результат</p>
              <p className="text-base font-medium mb-4">Структура, которая работает.</p>
              <a
                href="https://t.me/kolesnikov_uno"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-primary hover:text-primary/80 transition-colors mb-1.5"
              >
                Написать в Telegram →
              </a>
              <a
                href="/pricing"
                onClick={(e) => { e.preventDefault(); handleClose(false); navigate("/pricing"); }}
                className="block text-sm text-primary/60 hover:text-primary/80 transition-colors"
              >
                Формат и стоимость →
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;

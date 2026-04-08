import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const Index = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background">
      {/* Center content */}
      <div className="flex flex-col items-start px-6 max-w-lg">
        <p className="text-foreground mb-3 tracking-widest text-sm">
          architect &nbsp;.&nbsp; design &nbsp;.&nbsp; art
        </p>
        <p className="text-muted-foreground leading-relaxed text-xs tracking-wider mb-8">
          выявляю структуру → формирую идею →<br />
          разворачиваю в проект → контролирую<br />
          реализацию.
        </p>

        {/* Toggle button */}
        <button
          onClick={() => setOpen(!open)}
          className="group flex items-center gap-0 bg-primary/20 rounded-full pr-3 pl-1 py-1 hover:bg-primary/30 transition-colors cursor-pointer"
        >
          <span className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-sm" />
          <span className="text-xs font-medium text-foreground ml-2 tracking-wider">.uno</span>
        </button>
      </div>

      {/* Bottom right dot */}
      <div className="fixed bottom-6 right-6 w-6 h-6 rounded-full bg-foreground/80" />

      {/* Popup */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border bg-background">
          <DialogHeader>
            <DialogTitle className="text-sm tracking-widest font-normal">
              .uno studio
            </DialogTitle>
          </DialogHeader>
          <div className="text-xs text-muted-foreground leading-relaxed tracking-wider space-y-3">
            <p>
              Мы — архитектурное бюро полного цикла. Работаем на стыке архитектуры, дизайна и искусства.
            </p>
            <p>
              Каждый проект начинается с выявления структуры задачи и формирования идеи. 
              Затем мы разворачиваем её в полноценный проект и контролируем реализацию на всех этапах.
            </p>
            <p>
              Наш подход — минимум лишнего, максимум точности.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;

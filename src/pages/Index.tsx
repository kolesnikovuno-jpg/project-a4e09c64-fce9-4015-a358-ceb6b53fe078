import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const Index = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Don't navigate if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("[role='dialog']")) return;
    navigate("/canvas");
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center bg-background cursor-pointer"
      onClick={handleBackgroundClick}
    >
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
          className="group relative flex items-center bg-primary/20 rounded-full w-[90px] h-9 hover:bg-primary/30 transition-colors cursor-pointer"
        >
          <span
            className={`absolute w-7 h-7 rounded-full bg-primary shadow-sm transition-all duration-300 ease-in-out ${open ? 'left-[55px]' : 'left-1'}`}
          />
          <span className={`text-xs font-medium text-foreground tracking-wider transition-all duration-300 ease-in-out ${open ? 'ml-3' : 'ml-10'}`}>.uno</span>
        </button>
      </div>

      {/* Bottom right dot */}
      <div className="fixed bottom-6 right-6 w-6 h-6 rounded-full bg-foreground/80" />

      {/* Popup */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg rounded-[2rem] border bg-background p-8">
          <DialogHeader>
            <DialogTitle className="text-sm tracking-widest font-normal">
              .uno studio
            </DialogTitle>
          </DialogHeader>
          <div className="text-xs text-muted-foreground leading-relaxed tracking-wider space-y-3">
            <p>
              анализ ситуации, формирование идеи, создание концепции, разработка проекции, передача прав, контроль качества.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;

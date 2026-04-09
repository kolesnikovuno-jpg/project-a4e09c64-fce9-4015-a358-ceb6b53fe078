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
          onClick={handleToggle}
          className="group relative flex items-center bg-primary border border-primary/60 rounded-full w-[90px] h-9 hover:bg-primary/90 transition-colors cursor-pointer"
        >
          <span
            className={`absolute w-7 h-7 rounded-full bg-white/80 shadow-sm transition-all duration-300 ease-in-out ${toggled ? 'left-[55px]' : 'left-1'}`}
          />
          <span className={`text-xs font-semibold text-white tracking-wider transition-all duration-300 ease-in-out ${toggled ? 'ml-3' : 'ml-10'}`}>.uno</span>
        </button>
      </div>

      {/* Bottom right dot */}
      <div className="fixed bottom-6 right-6 w-6 h-6 rounded-full bg-foreground/80" />

      {/* Popup */}
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg rounded-none border border-white/20 bg-white/60 backdrop-blur-sm shadow-none p-8">
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

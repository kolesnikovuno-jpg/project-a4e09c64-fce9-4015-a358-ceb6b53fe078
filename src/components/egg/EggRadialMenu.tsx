import { useEffect, useRef, useState, type PointerEvent, type WheelEvent } from "react";
import { ChevronLeft, ChevronRight, CircleDot, Menu, X, type LucideIcon } from "lucide-react";

export type EggMenuAction = {
  id: string;
  label: string;
  icon: LucideIcon;
  onSelect?: () => void;
  children?: EggMenuAction[];
  disabled?: boolean;
  selected?: boolean;
  tint?: string;
};

/** A single tactile, scrollable radial entry point for the EGG workspace. */
export default function EggRadialMenu({ actions, title = "EGG" }: { actions: EggMenuAction[]; title?: string }) {
  const [open, setOpen] = useState(false);
  const [path, setPath] = useState<EggMenuAction[]>([]);
  const [rotation, setRotation] = useState(0);
  const drag = useRef<{ x: number; y: number; index: number; moved: boolean } | null>(null);
  const current = path[path.length - 1];
  const entries = current?.children || actions;
  const count = Math.min(6, entries.length);
  const positions = Array.from({ length: count }, (_, index) => entries[(index + ((rotation % entries.length) + entries.length) % entries.length) % entries.length]);
  const setPage = (direction: number) => {
    if (entries.length < 2) return;
    setRotation(value => (value + direction + entries.length) % entries.length);
  };
  useEffect(() => { setRotation(0); }, [path.length, current?.id]);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { if (path.length) setPath(v => v.slice(0, -1)); else setOpen(false); }
      if (e.key === "ArrowRight") setPage(1);
      if (e.key === "ArrowLeft") setPage(-1);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open, path.length, entries.length]);
  const close = () => { setOpen(false); setPath([]); setRotation(0); };
  const select = (item: EggMenuAction) => {
    if (item.disabled) return;
    if (item.children?.length) { setPath(value => [...value, item]); return; }
    item.onSelect?.();
    close();
  };
  const wheel = (event: WheelEvent<HTMLDivElement>) => {
    event.stopPropagation();
    event.preventDefault();
    if (Math.abs(event.deltaY) + Math.abs(event.deltaX) > 4) setPage(event.deltaY + event.deltaX > 0 ? 1 : -1);
  };
  const down = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest("button")) return;
    drag.current = { x: event.clientX, y: event.clientY, index: rotation, moved: false };
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* optional */ }
    event.stopPropagation();
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const delta = event.clientX - drag.current.x + (drag.current.y - event.clientY);
    const shift = Math.trunc(delta / 42);
    if (Math.abs(delta) >= 18) drag.current.moved = true;
    if (shift) setRotation((drag.current.index - shift + entries.length * 100) % entries.length);
    event.stopPropagation();
  };
  const up = (event: PointerEvent<HTMLDivElement>) => {
    drag.current = null;
    event.stopPropagation();
  };
  if (!open) return (
    <button type="button" aria-label="Открыть круговое меню" title="Меню EGG" onClick={() => setOpen(true)}
      className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-[max(1.25rem,env(safe-area-inset-left))] z-[75] flex h-16 w-16 items-center justify-center rounded-full border border-foreground/10 bg-foreground text-background shadow-[0_10px_30px_rgba(0,0,0,.18)] transition-transform hover:scale-105">
      <CircleDot size={26} strokeWidth={1.25}/>
    </button>
  );
  return (
    <div className="fixed inset-0 z-[75]" aria-label="Круговое меню EGG">
      <button type="button" aria-label="Закрыть круговое меню" className="absolute inset-0 cursor-default bg-background/10 backdrop-blur-[1px]" onClick={close} />
      <div className="absolute bottom-[max(.75rem,env(safe-area-inset-bottom))] left-[max(.5rem,env(safe-area-inset-left))] h-[min(330px,calc(100vw-1rem))] w-[min(330px,calc(100vw-1rem))] select-none touch-none"
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onWheel={wheel}>
        <svg viewBox="0 0 330 330" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
          <circle cx="165" cy="165" r="149" fill="hsl(var(--background))" fillOpacity=".95" stroke="currentColor" strokeOpacity=".13" />
          <circle cx="165" cy="165" r="130" fill="none" stroke="currentColor" strokeOpacity=".09" />
          <circle cx="165" cy="165" r="56" fill="none" stroke="currentColor" strokeOpacity=".14" />
          {Array.from({length:6}, (_,i) => {
            const a = (i * 60 - 120) * Math.PI / 180;
            return <line key={i} x1={165+62*Math.cos(a)} y1={165+62*Math.sin(a)}
              x2={165+143*Math.cos(a)} y2={165+143*Math.sin(a)} stroke="currentColor" strokeOpacity=".08" />;
          })}
        </svg>
        {positions.map((entry, slot) => {
          const angle = (-90 + slot * 360 / Math.max(1, count)) * Math.PI / 180;
          const style = { left: "calc(50% + " + Math.cos(angle)*105 + "px)", top: "calc(50% + " + Math.sin(angle)*105 + "px)" };
          const Icon = entry.icon;
          return <button type="button" key={entry.id} disabled={entry.disabled} aria-label={entry.label}
            onPointerDown={e=>e.stopPropagation()}
            onClick={() => select(entry)} style={style}
            className={"absolute flex h-[76px] w-[76px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-full border bg-background/95 p-1 text-foreground shadow-sm transition-colors hover:bg-foreground/5 disabled:opacity-35 " +
              (entry.selected?"border-foreground/55":"border-foreground/10")}>
            <Icon size={21} strokeWidth={1.5} color={entry.tint}/>
            <span className="max-w-[69px] text-center text-[10px] leading-[1.05rem]">{entry.label}</span>
          </button>;
        })}
        <button type="button" aria-label={path.length ? "Назад к разделам" : "Закрыть меню"}
          onPointerDown={e=>e.stopPropagation()}
          onClick={() => { if (path.length) setPath(v=>v.slice(0,-1)); else close(); }}
          className="absolute left-1/2 top-1/2 flex h-[100px] w-[100px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-full bg-foreground text-background shadow-lg">
          {path.length?<ChevronLeft size={25}/>:<Menu size={25} strokeWidth={1.5}/>}
          <span className="max-w-[83px] text-center text-[12px] font-medium leading-tight">{current?.label || title}</span>
        </button>
        <button type="button" aria-label="Прокрутить меню назад" title="Назад" onPointerDown={e=>e.stopPropagation()} onClick={()=>setPage(-1)}
          className="absolute bottom-2 left-[37%] rounded-full p-2 text-foreground/55 hover:bg-foreground/5"><ChevronLeft size={17}/></button>
        <button type="button" aria-label="Прокрутить меню вперёд" title="Дальше" onPointerDown={e=>e.stopPropagation()} onClick={()=>setPage(1)}
          className="absolute bottom-2 right-[37%] rounded-full p-2 text-foreground/55 hover:bg-foreground/5"><ChevronRight size={17}/></button>
        <button type="button" aria-label="Свернуть меню" title="Свернуть" onPointerDown={e=>e.stopPropagation()} onClick={close}
          className="absolute right-2 top-2 rounded-full bg-background/95 p-2 text-foreground/65"><X size={16}/></button>
      </div>
    </div>
  );
}

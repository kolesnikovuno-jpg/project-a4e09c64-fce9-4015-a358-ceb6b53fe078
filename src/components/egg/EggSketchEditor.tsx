import { useRef, useState, type PointerEvent } from "react";
import { Check, CircleDot, Eraser, Palette, Pencil, RotateCcw, RotateCw, SlidersHorizontal, X } from "lucide-react";
import EggRadialMenu, { type EggMenuAction } from "./EggRadialMenu";

export type SketchPoint = { x: number; y: number };
export type SketchStroke = { points: SketchPoint[]; color: string; strokeWidth: number };

const PALETTE = ["#252525", "#757575", "#B44E48", "#C99539", "#50816B", "#527CA8", "#9166A0"];
const WIDTH = 1000;
const HEIGHT = 700;
const limit = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/**
 * An uninterrupted sketch session. Strokes remain editable until the Author
 * explicitly confirms the sketch; only then does the project field receive
 * one new/updated card. Does not modify project DNA or the Yolk.
 */
export default function EggSketchEditor({
  initialStrokes = [], onSave, onClose,
}: {
  initialStrokes?: SketchStroke[];
  onSave: (strokes: SketchStroke[]) => void;
  onClose: () => void;
}) {
  const [strokes, setStrokes] = useState<SketchStroke[]>(initialStrokes);
  const [draft, setDraft] = useState<SketchStroke | null>(null);
  const [instrument, setInstrument] = useState<"pen" | "eraser">("pen");
  const [color, setColor] = useState(PALETTE[0]);
  const [strokeWidth, setStrokeWidth] = useState(1);
  const [revision, setRevision] = useState(0);
  const previous = useRef<SketchStroke[][]>([]);
  const next = useRef<SketchStroke[][]>([]);
  const liveStroke = useRef<SketchStroke | null>(null);
  const livePointer = useRef<number | null>(null);
  const svg = useRef<SVGSVGElement | null>(null);

  const saveHistory = (updated: SketchStroke[]) => {
    previous.current.push(strokes);
    if (previous.current.length > 80) previous.current.shift();
    next.current = [];
    setStrokes(updated);
    setRevision(n => n + 1);
  };
  const undo = () => {
    const value = previous.current.pop();
    if (!value) return;
    next.current.push(strokes);
    setStrokes(value);
    setRevision(n => n + 1);
  };
  const redo = () => {
    const value = next.current.pop();
    if (!value) return;
    previous.current.push(strokes);
    setStrokes(value);
    setRevision(n => n + 1);
  };
  const position = (event: PointerEvent<SVGSVGElement>): SketchPoint => {
    const element = svg.current;
    if (!element) return { x: 0, y: 0 };
    const matrix = element.getScreenCTM?.();
    if (matrix && typeof element.createSVGPoint === "function") {
      const point = element.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;
      const p = point.matrixTransform(matrix.inverse());
      return { x: limit(p.x, 0, WIDTH), y: limit(p.y, 0, HEIGHT) };
    }
    const bounds = element.getBoundingClientRect();
    const scaleX = bounds.width ? WIDTH / bounds.width : 1;
    const scaleY = bounds.height ? HEIGHT / bounds.height : 1;
    return {
      x: limit((event.clientX - bounds.left) * scaleX, 0, WIDTH),
      y: limit((event.clientY - bounds.top) * scaleY, 0, HEIGHT),
    };
  };
  const distanceToSegment = (p: SketchPoint, a: SketchPoint, b: SketchPoint) => {
    const dx = b.x - a.x, dy = b.y - a.y;
    const t = dx * dx + dy * dy ? limit(((p.x-a.x)*dx + (p.y-a.y)*dy) / (dx*dx + dy*dy), 0, 1) : 0;
    return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
  };
  const eraseAt = (point: SketchPoint) => {
    let index = -1;
    for (let i = strokes.length - 1; i >= 0; i--) {
      const s = strokes[i];
      let d = s.points.length === 1 ? Math.hypot(point.x - s.points[0].x, point.y - s.points[0].y) : Infinity;
      for (let j = 1; j < s.points.length; j++) d = Math.min(d, distanceToSegment(point, s.points[j-1], s.points[j]));
      if (d <= Math.max(13, s.strokeWidth + 8)) { index = i; break; }
    }
    if (index !== -1) saveHistory(strokes.filter((_, i) => i !== index));
  };
  const pointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const point = position(event);
    if (instrument === "eraser") { eraseAt(point); return; }
    if (livePointer.current !== null) return;
    livePointer.current = event.pointerId;
    liveStroke.current = { points: [point], color, strokeWidth };
    setDraft(liveStroke.current);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const pointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (event.pointerId !== livePointer.current || !liveStroke.current) return;
    const point = position(event);
    const current = liveStroke.current;
    const last = current.points[current.points.length - 1];
    if (Math.hypot(point.x - last.x, point.y - last.y) < 0.65) return;
    const updated = { ...current, points: [...current.points, point] };
    liveStroke.current = updated;
    setDraft(updated);
  };
  const pointerEnd = (event: PointerEvent<SVGSVGElement>) => {
    if (event.pointerId !== livePointer.current) return;
    const finished = liveStroke.current;
    liveStroke.current = null;
    livePointer.current = null;
    setDraft(null);
    if (finished?.points.length) saveHistory([...strokes, finished]);
    try { if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* Safari may release automatically */ }
  };
  const close = () => {
    if (revision > 0 && !window.confirm("Закрыть скетч без сохранения изменений?")) return;
    onClose();
  };
  const drawStroke = (stroke: SketchStroke, index: number) => {
    if (!stroke.points.length) return null;
    return stroke.points.length === 1
      ? <circle key={index} cx={stroke.points[0].x} cy={stroke.points[0].y} r={Math.max(.6, stroke.strokeWidth / 2)} fill={stroke.color} />
      : <polyline key={index} points={stroke.points.map(p => p.x + "," + p.y).join(" ")}
          fill="none" stroke={stroke.color} strokeWidth={stroke.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />;
  };
  const wheelActions: EggMenuAction[] = [
    {id:"pen",label:"Перо",icon:Pencil,selected:instrument==="pen",onSelect:()=>setInstrument("pen")},
    {id:"eraser",label:"Ластик",icon:Eraser,selected:instrument==="eraser",onSelect:()=>setInstrument("eraser")},
    {id:"palette",label:"Цвет",icon:Palette,children:PALETTE.map((value,index)=>({
      id:"color"+index,label:["Чёрный","Серый","Красный","Охра","Зелёный","Синий","Фиолетовый"][index],
      icon:CircleDot,tint:value,selected:value===color,
      onSelect:()=>{setColor(value);setInstrument("pen");}
    }))},
    {id:"width",label:"Толщина",icon:SlidersHorizontal,children:[.5,1,2,3,4,6,8,12].map(value=>({
      id:"width"+value,label:value+" px",icon:CircleDot,selected:strokeWidth===value,
      onSelect:()=>{setStrokeWidth(value);setInstrument("pen");}
    }))},
    {id:"history",label:"История",icon:RotateCcw,children:[
      {id:"undo",label:"Отменить",icon:RotateCcw,disabled:!previous.current.length,onSelect:undo},
      {id:"redo",label:"Повторить",icon:RotateCw,disabled:!next.current.length,onSelect:redo},
    ]},
    {id:"finish",label:"Завершить",icon:Check,children:[
      {id:"save",label:"Готово",icon:Check,onSelect:()=>onSave(strokes)},
      {id:"cancel",label:"Без сохранения",icon:X,onSelect:close},
    ]},
  ];
  return (
    <div className="fixed inset-0 z-[110] flex flex-col bg-background" role="dialog" aria-modal="true" aria-label="Редактор скетча">
      <div className="pointer-events-none absolute left-5 top-[max(1.25rem,env(safe-area-inset-top))] z-10">
        <span className="text-lg font-light tracking-tight">Скетч</span>
        <span className="ml-3 text-xs text-foreground/45">{instrument==="pen"?"Перо · "+strokeWidth+" px":"Ластик"} · {strokes.length} штрихов</span>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-foreground/[.025] p-2 sm:p-5">
        <div className="relative aspect-[10/7] max-h-full w-full max-w-[1300px] overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-sm"
          style={{ maxWidth: "min(100%, calc((100dvh - 60px) * 10 / 7))" }}>
          <svg ref={svg} viewBox="0 0 1000 700" className="block h-full w-full select-none"
            style={{touchAction:"none", cursor:instrument==="pen"?"crosshair":"cell"}}
            aria-label="Лист для рисования" role="img"
            onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd}>
            <rect x="0" y="0" width="1000" height="700" fill="transparent"/>
            {strokes.map(drawStroke)}
            {draft && drawStroke(draft, -1)}
          </svg>
        </div>
      </div>
      <EggRadialMenu actions={wheelActions} title="Скетч"/>
    </div>
  );
}

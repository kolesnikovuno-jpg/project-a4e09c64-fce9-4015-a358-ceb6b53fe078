import { useRef, useState, type PointerEvent } from "react";
import { Check, Eraser, Pencil, RotateCcw, RotateCw, X } from "lucide-react";

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
  return (
    <div className="fixed inset-0 z-[110] flex flex-col bg-background" role="dialog" aria-modal="true" aria-label="Редактор скетча">
      <div className="flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-foreground/10 bg-background px-3 py-2 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="mr-2 text-sm font-medium">Скетч</span>
          <button type="button" onClick={() => setInstrument("pen")} aria-label="Перо" aria-pressed={instrument === "pen"}
            className={"rounded-full p-2 " + (instrument === "pen" ? "bg-foreground/10" : "hover:bg-foreground/5")}><Pencil size={19}/></button>
          <button type="button" onClick={() => setInstrument("eraser")} aria-label="Ластик" aria-pressed={instrument === "eraser"}
            className={"rounded-full p-2 " + (instrument === "eraser" ? "bg-foreground/10" : "hover:bg-foreground/5")}><Eraser size={19}/></button>
          <span className="mx-1 h-5 w-px bg-foreground/10" />
          <button type="button" onClick={undo} disabled={!previous.current.length} aria-label="Отменить штрих"
            className="rounded-full p-2 disabled:opacity-25"><RotateCcw size={18}/></button>
          <button type="button" onClick={redo} disabled={!next.current.length} aria-label="Вернуть штрих"
            className="rounded-full p-2 disabled:opacity-25"><RotateCw size={18}/></button>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={close} aria-label="Отменить редактирование" className="rounded-full border border-foreground/15 px-3 py-2 text-xs">Отмена <X size={13} className="inline"/></button>
          <button type="button" onClick={() => { onSave(strokes); }} className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs text-background"><Check size={16}/> Готово</button>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-2 border-b border-foreground/10 bg-background px-4 py-2 sm:px-6">
        <div className="flex items-center gap-2" role="group" aria-label="Палитра пера">
          {PALETTE.map(value => <button key={value} type="button" onClick={() => { setColor(value); setInstrument("pen"); }}
            aria-label={"Цвет " + value} aria-pressed={color === value} className={"h-6 w-6 rounded-full " + (color === value ? "ring-2 ring-offset-2 ring-foreground/60" : "")} style={{backgroundColor:value}} />)}
        </div>
        <label className="flex items-center gap-2 text-xs text-foreground/70">Толщина
          <input type="range" min=".5" max="12" step=".5" value={strokeWidth} onChange={event => setStrokeWidth(Number(event.target.value))} className="w-28 sm:w-40" aria-label="Толщина пера"/>
          <span className="w-10 text-right tabular-nums">{strokeWidth} px</span>
        </label>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-foreground/[.025] p-2 sm:p-5">
        <div className="relative aspect-[10/7] max-h-full w-full max-w-[1300px] overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-sm"
          style={{ maxWidth: "min(100%, calc((100dvh - 160px) * 10 / 7))" }}>
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
      <p className="shrink-0 px-4 py-2 text-center text-[11px] text-foreground/45">
        Несколько линий образуют один скетч. Ластик удаляет отдельные штрихи. Сохранение — по кнопке «Готово».
      </p>
    </div>
  );
}

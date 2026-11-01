import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import {
  convexOutline,
  eggAxisEndpoints,
  eggEquatorArcs,
  eggSectionAxes,
  eggSurface,
  projectEggPoint,
  svgOutline,
  type EggOrientation,
} from "@/lib/unocalcEgg3d";

type Locale = "ru" | "uk" | "en";
type Props = { locale: Locale };

const INITIAL: EggOrientation = { roll: 0, tilt: 0.46 };
const SURFACE = eggSurface();

const text = {
  ru: { label: "Трёхмерная форма яйца с вертикальной осью. Вращайте жестом или стрелками клавиатуры.", hint: "Вращайте форму жестом или мышью" },
  uk: { label: "Тривимірна форма яйця з вертикальною віссю. Обертайте жестом або стрілками клавіатури.", hint: "Обертайте форму жестом або мишею" },
  en: { label: "Three-dimensional egg with a vertical axis. Drag or use arrow keys to rotate.", hint: "Drag to rotate the form" },
};

const UnoEggScene = ({ locale }: Props) => {
  const [orientation, setOrientation] = useState<EggOrientation>(INITIAL);
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const geometry = useMemo(() => {
    const points = SURFACE.map((point) => projectEggPoint(point, orientation));
    return {
      silhouette: svgOutline(convexOutline(points)),
      equator: eggEquatorArcs(orientation),
      axis: eggAxisEndpoints(orientation),
      sectionAxes: eggSectionAxes(orientation),
    };
  }, [orientation]);

  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const active = pointer.current;
    if (!active || active.id !== event.pointerId) return;
    const dx = event.clientX - active.x;
    const dy = event.clientY - active.y;
    pointer.current = { ...active, x: event.clientX, y: event.clientY };
    setOrientation((current) => ({ roll: current.roll + dx * 0.008, tilt: current.tilt + dy * 0.008 }));
  };
  const onPointerEnd = (event: PointerEvent<SVGSVGElement>) => {
    if (pointer.current?.id !== event.pointerId) return;
    pointer.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };
  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key === "Home") {
      event.preventDefault();
      setOrientation(INITIAL);
    } else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      setOrientation((current) => ({
        roll: current.roll + (event.key === "ArrowLeft" ? -0.09 : event.key === "ArrowRight" ? 0.09 : 0),
        tilt: current.tilt + (event.key === "ArrowUp" ? -0.09 : event.key === "ArrowDown" ? 0.09 : 0),
      }));
    }
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-full" data-testid="unocalc-egg-stage">
      <div className="mx-auto w-full min-w-0" style={{ maxWidth: "min(100%, 68vh, 720px)" }}>
        <svg
          data-testid="unocalc-egg-svg"
          viewBox="0 0 760 700"
          className="block h-auto w-full cursor-grab select-none active:cursor-grabbing"
          style={{ touchAction: "none" }}
          role="img"
          aria-label={text[locale].label}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onKeyDown={onKeyDown}
        >
          <line
            data-testid="unocalc-egg-axis"
            x1={geometry.axis.start.x} y1={geometry.axis.start.y}
            x2={geometry.axis.end.x} y2={geometry.axis.end.y}
            stroke="currentColor" strokeWidth="1.05" strokeOpacity=".43"
            strokeDasharray="7 8" vectorEffect="non-scaling-stroke"
          />
          <path d={geometry.equator.back} fill="none"
            stroke="currentColor" strokeWidth=".9" strokeOpacity=".18"
            strokeDasharray="5 6" vectorEffect="non-scaling-stroke" />
          <path d={geometry.equator.front} fill="none"
            stroke="currentColor" strokeWidth=".9" strokeOpacity=".3"
            vectorEffect="non-scaling-stroke" />
          {/* Two perpendicular 3D diameters in the section plane.
              The four endpoint spheres sit exactly on the egg surface. */}
          {geometry.sectionAxes.map((sectionAxis, index) => (
            <line
              key={`section-axis-${index}`}
              data-testid="unocalc-section-axis"
              x1={sectionAxis.start.x}
              y1={sectionAxis.start.y}
              x2={sectionAxis.end.x}
              y2={sectionAxis.end.y}
              stroke="currentColor"
              strokeWidth="1.05"
              strokeOpacity=".42"
              strokeDasharray="7 8"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {geometry.sectionAxes.flatMap((sectionAxis) => sectionAxis.nodes).map((node, index) => (
            <circle
              key={`section-sphere-${index}`}
              data-testid="unocalc-section-sphere"
              cx={node.x}
              cy={node.y}
              r="10.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.1"
              strokeOpacity=".72"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <path
            data-testid="unocalc-egg-outline"
            d={geometry.silhouette}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeOpacity=".65"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
      <p className="mt-1 text-center text-[11px] font-light tracking-[0.025em] text-foreground/50">
        {text[locale].hint}
      </p>
    </div>
  );
};

export default UnoEggScene;

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import {
  convexOutline,
  eggAxisEndpoints,
  eggEquatorArcs,
  eggPoleNodes,
  eggSectionAxes,
  eggSurface,
  projectEggPoint,
  svgOutline,
  visibleEggSectionNodes,
  type EggOrientation,
} from "@/lib/unocalcEgg3d";

type Locale = "ru" | "uk" | "en";
type Props = { locale: Locale };

// Front elevation: the horizontal diameter has two side nodes, while
// the nearer node of the depth diameter hides the fourth node behind it.
const INITIAL: EggOrientation = { yaw: 0, tilt: 0 };
const SURFACE = eggSurface();

const text = {
  ru: {
    label: "Трёхмерная форма яйца с вертикальной осью. Вращайте жестом или стрелками клавиатуры.",
    hint: "Вращайте форму жестом или мышью · коснитесь центральной сферы",
    retail: "Ритейл",
    retailLabel: "Открыть описание узла «Ритейл»",
    retailDescription: "Точка встречи объекта и человека. Здесь созданная форма получает представление, контекст и путь к своему пользователю.",
    node: "Узел / 01",
  },
  uk: {
    label: "Тривимірна форма яйця з вертикальною віссю. Обертайте жестом або стрілками клавіатури.",
    hint: "Обертайте форму жестом або мишею · торкніться центральної сфери",
    retail: "Ритейл",
    retailLabel: "Відкрити опис вузла «Ритейл»",
    retailDescription: "Точка зустрічі об’єкта й людини. Тут створена форма отримує представлення, контекст і шлях до свого користувача.",
    node: "Вузол / 01",
  },
  en: {
    label: "Three-dimensional egg with a vertical axis. Drag or use arrow keys to rotate.",
    hint: "Drag to rotate · tap the central sphere",
    retail: "Retail",
    retailLabel: "Open the Retail node description",
    retailDescription: "Where the object meets the person. Here, a created form gains its presentation, context, and a path to its user.",
    node: "Node / 01",
  },
};

/** One soft click on a deliberate user action. No audio is played on load. */
const playNodeClick = () => {
  try {
    const Context = window.AudioContext;
    if (!Context) return;
    const audio = new Context();
    const oscillator = audio.createOscillator();
    const volume = audio.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(690, audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(420, audio.currentTime + 0.035);
    volume.gain.setValueAtTime(0.0001, audio.currentTime);
    volume.gain.exponentialRampToValueAtTime(0.012, audio.currentTime + 0.004);
    volume.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.048);
    oscillator.connect(volume);
    volume.connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.05);
    oscillator.onended = () => { void audio.close(); };
  } catch {
    // Browser audio permissions and unsupported devices should not block selection.
  }
};

const giveNodeFeedback = () => {
  try { navigator.vibrate?.(9); } catch { /* iPadOS Safari does not expose vibration. */ }
};

const UnoEggScene = ({ locale }: Props) => {
  const [orientation, setOrientation] = useState<EggOrientation>(INITIAL);
  const [retailOpen, setRetailOpen] = useState(false);
  const [typedLength, setTypedLength] = useState(0);
  const pointer = useRef<{ id: number; x: number; y: number; startX: number; startY: number; moved: boolean; targetNode: string | null } | null>(null);
  const retailCopy = text[locale];
  const fullCopy = retailCopy.retail + "\n" + retailCopy.retailDescription;

  useEffect(() => {
    if (!retailOpen) {
      setTypedLength(0);
      return;
    }
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
      setTypedLength(fullCopy.length);
      return;
    }
    setTypedLength(0);
    let index = 0;
    const interval = window.setInterval(() => {
      index = Math.min(fullCopy.length, index + 1);
      setTypedLength(index);
      if (index === fullCopy.length) window.clearInterval(interval);
    }, 26);
    return () => window.clearInterval(interval);
  }, [retailOpen, fullCopy]);

  const activateRetail = () => {
    setRetailOpen((open) => !open);
    giveNodeFeedback();
    playNodeClick();
  };
  const geometry = useMemo(() => {
    const points = SURFACE.map((point) => projectEggPoint(point, orientation));
    const sectionAxes = eggSectionAxes(orientation);
    return {
      silhouette: svgOutline(convexOutline(points)),
      equator: eggEquatorArcs(orientation),
      axis: eggAxisEndpoints(orientation),
      sectionAxes,
      sectionNodes: visibleEggSectionNodes(sectionAxes),
      poleNodes: eggPoleNodes(orientation),
    };
  }, [orientation]);

  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const target = event.target as Element;
    pointer.current = {
      id: event.pointerId, x: event.clientX, y: event.clientY,
      startX: event.clientX, startY: event.clientY, moved: false,
      targetNode: target.getAttribute("data-egg-node"),
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const active = pointer.current;
    if (!active || active.id !== event.pointerId) return;
    const dx = event.clientX - active.x;
    const dy = event.clientY - active.y;
    const moved = active.moved || Math.hypot(event.clientX - active.startX, event.clientY - active.startY) > 7;
    pointer.current = { ...active, x: event.clientX, y: event.clientY, moved };
    if (moved) {
      setOrientation((current) => ({ yaw: current.yaw + dx * 0.008, tilt: current.tilt + dy * 0.008 }));
    }
  };
  const onPointerEnd = (event: PointerEvent<SVGSVGElement>) => {
    const active = pointer.current;
    if (!active || active.id !== event.pointerId) return;
    pointer.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (event.type === "pointerup" && !active.moved && active.targetNode === "retail") {
      activateRetail();
    }
  };
  const onRetailKeyDown = (event: KeyboardEvent<SVGCircleElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      activateRetail();
    }
  };

  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key === "Home") {
      event.preventDefault();
      setOrientation(INITIAL);
    } else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      setOrientation((current) => ({
        yaw: current.yaw + (event.key === "ArrowLeft" ? -0.09 : event.key === "ArrowRight" ? 0.09 : 0),
        tilt: current.tilt + (event.key === "ArrowUp" ? -0.09 : event.key === "ArrowDown" ? 0.09 : 0),
      }));
    }
  };

  return (
    <div className="relative mx-auto w-full min-w-0 max-w-full" data-testid="unocalc-egg-stage">
      <div className="unocalc-egg-canvas mx-auto w-full min-w-0">
        <svg
          data-testid="unocalc-egg-svg"
          viewBox="0 0 760 700"
          className="block h-auto w-full cursor-grab select-none active:cursor-grabbing"
          style={{ touchAction: "none" }}
          role="group"
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
          {geometry.sectionNodes.map((node) => (
            <g key={`section-sphere-${node.id}`}>
              <circle
                data-testid="unocalc-section-sphere"
                cx={node.x}
                cy={node.y}
                r="10.5"
                fill={node.id === "retail" && retailOpen ? "hsl(var(--primary) / 0.22)" : "none"}
                stroke={node.id === "retail" && retailOpen ? "hsl(var(--primary))" : "currentColor"}
                strokeWidth="1.1"
                strokeOpacity={node.id === "retail" && retailOpen ? ".85" : ".72"}
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
              />
              {node.id === "retail" && (
                <circle
                  data-testid="unocalc-retail-hit"
                  data-egg-node="retail"
                  cx={node.x}
                  cy={node.y}
                  r="25"
                  fill="transparent"
                  stroke="none"
                  role="button"
                  tabIndex={0}
                  aria-label={retailCopy.retailLabel}
                  aria-pressed={retailOpen}
                  className="cursor-pointer focus:outline-none focus-visible:stroke-primary focus-visible:stroke-[1.5px]"
                  onKeyDown={onRetailKeyDown}
                />
              )}
            </g>
          ))}
          {geometry.poleNodes.map((node, index) => (
            <circle
              key={`pole-sphere-${index}`}
              data-testid="unocalc-pole-sphere"
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
            strokeWidth=".95"
            strokeOpacity=".50"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
      {retailOpen && (
        <aside
          data-testid="unocalc-retail-panel"
          className="mx-auto mt-4 w-full max-w-[320px] min-h-[100px] text-left min-[900px]:absolute min-[900px]:right-0 min-[900px]:top-[43%] min-[900px]:mt-0 min-[900px]:w-[23%] min-[900px]:max-w-[240px]"
          aria-label={retailCopy.retail}
        >
          <p className="mb-4 text-[10px] font-light tracking-[0.16em] text-foreground/40 uppercase">{retailCopy.node}</p>
          <h2 className="min-h-[32px] text-[24px] font-extralight leading-tight tracking-[-0.03em] text-foreground/85" aria-hidden="true">
            {fullCopy.slice(0, Math.min(typedLength, retailCopy.retail.length))}
          </h2>
          <p className="mt-3 text-[13px] font-light leading-[1.8] tracking-[0.01em] text-foreground/65" aria-hidden="true">
            {fullCopy.slice(retailCopy.retail.length + 1, typedLength)}
            {typedLength < fullCopy.length && typedLength > retailCopy.retail.length && (
              <span className="unocalc-type-caret" aria-hidden="true">▍</span>
            )}
          </p>
          <span className="sr-only" role="status">{retailCopy.retail}. {retailCopy.retailDescription}</span>
        </aside>
      )}
      <p className="mt-1 text-center text-[11px] font-light tracking-[0.025em] text-foreground/50">
        {text[locale].hint}
      </p>
    </div>
  );
};

export default UnoEggScene;

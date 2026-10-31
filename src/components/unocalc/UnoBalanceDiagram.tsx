import { useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import type { ResourcePercentages, ResourceShareId } from "@/lib/unocalcAllocation";
import { BASE_RESOURCE_PERCENTAGES, FLEXIBILITY_PP } from "@/lib/unocalcAllocation";
import {
  RESOURCE_DIAGRAM_CENTER,
  RESOURCE_DIAGRAM_SIZE,
  resourceNodePosition,
  resourceNodeRadius,
  resourceShareFromKey,
  resourceShareFromPointer,
} from "@/lib/unocalcDiagram";

type UnoBalanceDiagramProps = {
  shares: ResourcePercentages;
  labels: Record<ResourceShareId, string>;
  onShareChange: (index: number, value: number) => void;
  dragHint: string;
  adjustLabel: string;
};

const NODES = [
  { id: "retail" },
  { id: "design" },
  { id: "installation" },
  { id: "components" },
] as const;

const PERIMETER_POINTS = [
  { x: 160, y: 40 },
  { x: 280, y: 160 },
  { x: 160, y: 280 },
  { x: 40, y: 160 },
] as const;

const TRACK_START = 53;
const TRACK_END = 107;
const AXIS = [
  { x: -1, y: 0 },
  { x: 0, y: -1 },
  { x: 0, y: 1 },
  { x: 1, y: 0 },
] as const;

export default function UnoBalanceDiagram({
  shares, labels, onShareChange, dragHint, adjustLabel,
}: UnoBalanceDiagramProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const draggingPointer = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const applyPointer = (index: number, event: PointerEvent<SVGGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const bounds = svg.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;
    const x = (event.clientX - bounds.left) / bounds.width * RESOURCE_DIAGRAM_SIZE;
    const y = (event.clientY - bounds.top) / bounds.height * RESOURCE_DIAGRAM_SIZE;
    onShareChange(index, resourceShareFromPointer(index, x, y));
  };

  const startDrag = (index: number, event: PointerEvent<SVGGElement>) => {
    if (draggingPointer.current !== null) return;
    event.preventDefault();
    draggingPointer.current = event.pointerId;
    setActiveIndex(index);
    event.currentTarget.setPointerCapture(event.pointerId);
    applyPointer(index, event);
  };

  const drag = (index: number, event: PointerEvent<SVGGElement>) => {
    if (draggingPointer.current !== event.pointerId) return;
    applyPointer(index, event);
  };

  const endDrag = (event: PointerEvent<SVGGElement>) => {
    if (draggingPointer.current !== event.pointerId) return;
    draggingPointer.current = null;
    setActiveIndex(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onKey = (index: number, event: KeyboardEvent<SVGGElement>) => {
    const requested = resourceShareFromKey(index, shares[index], event.key);
    if (requested === null) return;
    event.preventDefault();
    onShareChange(index, requested);
  };

  const description = NODES.map((node, index) =>
    labels[node.id] + ": " + shares[index] + "%"
  ).join("; ");

  return (
    <div className="w-full">
      <svg
        ref={svgRef}
        viewBox="0 0 320 320"
        xmlns="http://www.w3.org/2000/svg"
        aria-label={description}
        className="mx-auto block h-auto w-full max-w-[350px] overflow-visible text-foreground"
      >
        <circle
          cx="160" cy="160" r="120" fill="none"
          stroke="currentColor" strokeWidth="1.2" opacity="0.57"
        />
        <path
          d="M40 160 H280 M160 40 V280"
          fill="none" stroke="currentColor" strokeWidth="1" opacity="0.42"
        />
        {PERIMETER_POINTS.map(({ x, y }) => (
          <circle
            key={x + "-" + y} cx={x} cy={y} r="2.7"
            fill="none" stroke="currentColor" strokeWidth="1.3" opacity="0.85"
          />
        ))}
        <circle
          cx="160" cy="160" r="11" fill="none"
          stroke="currentColor" strokeWidth="1.4" opacity="0.91"
        />
        {NODES.map((node, index) => {
          const position = resourceNodePosition(index, shares[index]);
          const axis = AXIS[index];
          const active = activeIndex === index;
          const base = BASE_RESOURCE_PERCENTAGES[index];

          return (
            <g
              key={node.id}
              tabIndex={0}
              role="slider"
              aria-label={adjustLabel + ": " + labels[node.id]}
              aria-valuemin={base - FLEXIBILITY_PP}
              aria-valuemax={base + FLEXIBILITY_PP}
              aria-valuenow={shares[index]}
              aria-valuetext={shares[index] + "%"}
              onPointerDown={(event) => startDrag(index, event)}
              onPointerMove={(event) => drag(index, event)}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onLostPointerCapture={(event) => {
                if (draggingPointer.current === event.pointerId) {
                  draggingPointer.current = null;
                  setActiveIndex(null);
                }
              }}
              onKeyDown={(event) => onKey(index, event)}
              style={{ touchAction: "none", cursor: active ? "grabbing" : "grab" }}
            >
              {/* Wider invisible touch rail: tap a position or drag the node. */}
              <path
                d={"M" + (RESOURCE_DIAGRAM_CENTER + axis.x * TRACK_START) +
                  " " + (RESOURCE_DIAGRAM_CENTER + axis.y * TRACK_START) +
                  " L" + (RESOURCE_DIAGRAM_CENTER + axis.x * TRACK_END) +
                  " " + (RESOURCE_DIAGRAM_CENTER + axis.y * TRACK_END)}
                fill="none" stroke="transparent" strokeWidth="32" pointerEvents="stroke"
              />
              <circle
                cx={position.x} cy={position.y} r={active ? 16 : 14}
                fill="none" stroke="currentColor"
                strokeWidth="0.8" opacity={active ? 0.33 : 0}
                className="motion-safe:transition-all motion-safe:duration-150"
                pointerEvents="none"
              />
              <circle
                cx={position.x}
                cy={position.y}
                r={resourceNodeRadius(shares[index])}
                fill="none"
                stroke="currentColor"
                strokeWidth={active ? "2" : "1.5"}
                opacity="0.96"
                className="fill-background motion-safe:transition-all motion-safe:duration-150"
                pointerEvents="none"
              />
              <circle
                cx={position.x} cy={position.y} r="21"
                fill="transparent" pointerEvents="all"
              />
            </g>
          );
        })}
        {/* Readouts outside the fixed perimeter; editable nodes stay uncluttered. */}
        {NODES.map((node, index) => {
          const placed = [
            { x: 19, y: 176 },
            { x: 177, y: 27 },
            { x: 177, y: 309 },
            { x: 292, y: 176 },
          ][index];
          return (
            <text
              key={node.id}
              x={placed.x} y={placed.y}
              textAnchor={index === 0 ? "middle" : index === 3 ? "middle" : "middle"}
              fontSize="10.5"
              fontWeight="300"
              fill="currentColor" opacity="0.75"
              pointerEvents="none"
            >
              {shares[index]}%
            </text>
          );
        })}
      </svg>
      <p className="mt-1 text-center text-[11px] font-light leading-[1.55] text-foreground/70">
        {dragHint}
      </p>
    </div>
  );
}

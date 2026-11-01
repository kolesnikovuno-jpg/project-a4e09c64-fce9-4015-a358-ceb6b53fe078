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
  resourceValueLabelPosition,
} from "@/lib/unocalcDiagram";

type UnoBalanceDiagramProps = {
  shares: ResourcePercentages;
  labels: Record<ResourceShareId, string>;
  onShareChange: (index: number, value: number) => void;
  dragHint: string;
  adjustLabel: string;
  investmentLabel: string;
  investmentHint: string;
  centerHint: string;
  locale: string;
};

const NODES = [
  { id: "retail", x: -1, y: 0 },
  { id: "design", x: 0, y: -1 },
  { id: "installation", x: 0, y: 1 },
] as const;

const PERIMETER_POINTS = [
  { x: 160, y: 40 },
  { x: 280, y: 160 },
  { x: 160, y: 280 },
  { x: 40, y: 160 },
] as const;

const TRACK_START = 60;
const TRACK_MIDDLE = 80;
const TRACK_END = 100;

const formatPercent = (value: number, locale: string): string =>
  value.toLocaleString(locale === "en" ? "en-US" : locale === "uk" ? "uk-UA" : "ru-RU", {
    maximumFractionDigits: 1,
  }) + "%";

/**
 * Three draggable production branches surround the fixed central materials
 * circle. The fourth branch (investment) is an incoming funding source, not
 * a cost share. The central components share is adjustable via keys / buttons.
 * All four production allocations still total 100%.
 */
export default function UnoBalanceDiagram({
  shares, labels, onShareChange, dragHint, adjustLabel, investmentLabel, investmentHint, centerHint, locale,
}: UnoBalanceDiagramProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const draggingPointer = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

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
    if (event.pointerType === "mouse" && event.button !== 0) return;
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

  const finishDrag = (event: PointerEvent<SVGGElement>) => {
    if (draggingPointer.current !== event.pointerId) return;
    draggingPointer.current = null;
    setActiveIndex(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const changeWithKey = (index: number, event: KeyboardEvent<SVGGElement>) => {
    const next = resourceShareFromKey(index, shares[index], event.key);
    if (next === null) return;
    event.preventDefault();
    onShareChange(index, next);
  };

  const description = NODES.map((node, index) =>
    labels[node.id] + ": " + formatPercent(shares[index], locale)
  ).concat(labels.components + ": " + formatPercent(shares[3], locale), investmentLabel + ": " + investmentHint).join("; ");

  return (
    <div className="w-full">
      <svg
        ref={svgRef}
        viewBox="0 0 320 320"
        xmlns="http://www.w3.org/2000/svg"
        aria-label={description}
        className="mx-auto block h-auto w-full max-w-[380px] text-foreground"
      >
        <title>{description}</title>
        <circle
          cx="160" cy="160" r="120"
          fill="none" stroke="currentColor" strokeWidth="1.15" opacity="0.58"
        />
        <path
          d="M40 160 H280 M160 40 V280"
          fill="none" stroke="currentColor" strokeWidth="0.9" opacity="0.3"
        />
        {PERIMETER_POINTS.map(({ x, y }) => (
          <circle
            key={x + "-" + y}
            cx={x} cy={y} r="2.6"
            fill="none" stroke="currentColor" strokeWidth="1.2"
            opacity="0.85"
          />
        ))}

        {/* The investment branch supplies funds but has no allocation percentage. */}
        <path
          d="M 236 160 H 195 m 9 -5 l -9 5 l 9 5"
          fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.66"
          strokeLinecap="round" strokeLinejoin="round" pointerEvents="none"
        />
        <circle
          cx="240" cy="160" r="10"
          fill="hsl(var(--background))" stroke="currentColor"
          strokeWidth="1.3" strokeDasharray="3 2" opacity="0.95" pointerEvents="none"
        />
        <text x="240" y="130" fontSize="10" textAnchor="middle"
          fill="currentColor" opacity="0.82" pointerEvents="none">
          {investmentHint}
        </text>

        {/* Components are the fixed core. Its resource share remains adjustable. */}
        <g
          tabIndex={0}
          role="slider"
          aria-label={adjustLabel + ": " + labels.components}
          aria-valuemin={BASE_RESOURCE_PERCENTAGES[3] - FLEXIBILITY_PP}
          aria-valuemax={BASE_RESOURCE_PERCENTAGES[3] + FLEXIBILITY_PP}
          aria-valuenow={shares[3]}
          aria-valuetext={formatPercent(shares[3], locale)}
          onKeyDown={(event) => changeWithKey(3, event)}
          className="cursor-default focus:outline-none"
        >
          <circle
            cx="160" cy="160" r="31"
            fill="hsl(var(--background))" stroke="currentColor"
            strokeWidth="1.5" opacity="0.98"
          />
          <text
            x="160" y="154" fontSize="15" fontWeight="400"
            textAnchor="middle" dominantBaseline="central"
            fill="currentColor" pointerEvents="none"
          >
            {formatPercent(shares[3], locale)}
          </text>
          <text
            x="160" y="172" fontSize="8.1" textAnchor="middle"
            fill="currentColor" opacity="0.86" pointerEvents="none"
          >
            {labels.components}
          </text>
        </g>

        {NODES.map((node, index) => {
          const position = resourceNodePosition(index, shares[index]);
          const isDragging = activeIndex === index;
          const highlighted = isDragging || focusedIndex === index;
          const center = RESOURCE_DIAGRAM_CENTER;
          const xMin = center + node.x * TRACK_START;
          const yMin = center + node.y * TRACK_START;
          const xMax = center + node.x * TRACK_END;
          const yMax = center + node.y * TRACK_END;
          const midX = center + node.x * TRACK_MIDDLE;
          const midY = center + node.y * TRACK_MIDDLE;
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
              aria-valuetext={formatPercent(shares[index], locale)}
              onPointerDown={(event) => startDrag(index, event)}
              onPointerMove={(event) => drag(index, event)}
              onPointerUp={finishDrag}
              onPointerCancel={finishDrag}
              onLostPointerCapture={(event) => {
                if (draggingPointer.current === event.pointerId) {
                  draggingPointer.current = null;
                  setActiveIndex(null);
                }
              }}
              onFocus={() => setFocusedIndex(index)}
              onBlur={() => setFocusedIndex(null)}
              onKeyDown={(event) => changeWithKey(index, event)}
              style={{ touchAction: "none", cursor: isDragging ? "grabbing" : "grab" }}
            >
              {/* Explicit endpoints communicate the full permitted travel. */}
              <path
                d={"M" + xMin + " " + yMin + " L" + xMax + " " + yMax}
                fill="none" stroke="currentColor"
                strokeWidth={highlighted ? "4" : "2"}
                opacity={highlighted ? 0.27 : 0.12}
                pointerEvents="none"
              />
              <circle cx={xMin} cy={yMin} r="2" fill="currentColor" opacity="0.44" pointerEvents="none" />
              <circle cx={xMax} cy={yMax} r="2" fill="currentColor" opacity="0.44" pointerEvents="none" />
              <circle cx={midX} cy={midY} r="2.2"
                fill="hsl(var(--background))" stroke="currentColor"
                strokeWidth="1" opacity="0.6" pointerEvents="none"
              />

              {highlighted && (
                <circle
                  cx={position.x} cy={position.y} r="22"
                  fill="none" stroke="currentColor"
                  strokeWidth="0.8" opacity="0.4"
                  pointerEvents="none"
                />
              )}
              <circle
                cx={position.x} cy={position.y}
                r={resourceNodeRadius(shares[index])}
                fill="hsl(var(--background))" stroke="currentColor"
                strokeWidth={highlighted ? "2" : "1.5"}
                opacity="0.98"
                style={{
                  transition: isDragging ? "none" :
                    "cx 190ms ease-out, cy 190ms ease-out, r 190ms ease-out",
                }}
                pointerEvents="none"
              />

              {/* 44px touch target; pointer capture keeps drags alive outside. */}
              <circle
                cx={position.x} cy={position.y} r="23"
                fill="transparent" pointerEvents="all"
              />
              <path
                d={"M" + xMin + " " + yMin + " L" + xMax + " " + yMax}
                fill="none" stroke="transparent"
                strokeWidth="32" pointerEvents="stroke"
              />
            </g>
          );
        })}

        {/* Direction captions, outside the fixed outer circle. */}
        <text x="160" y="17" fontSize="9.5" textAnchor="middle"
          fill="currentColor" opacity="0.76" pointerEvents="none">
          {labels.design}
        </text>
        <text x="160" y="313" fontSize="9.5" textAnchor="middle"
          fill="currentColor" opacity="0.76" pointerEvents="none">
          {labels.installation}
        </text>
        <text x="15" y="160" transform="rotate(-90 15 160)"
          fontSize="9.5" textAnchor="middle" fill="currentColor"
          opacity="0.76" pointerEvents="none">
          {labels.retail}
        </text>
        <text x="305" y="160" transform="rotate(90 305 160)"
          fontSize="9.5" textAnchor="middle" fill="currentColor"
          opacity="0.76" pointerEvents="none">
          {investmentLabel}
        </text>

        {/* Values follow the handles so the interaction has instant feedback. */}
        {NODES.map((node, index) => {
          const label = resourceValueLabelPosition(index, shares[index]);
          const selected = activeIndex === index || focusedIndex === index;
          return (
            <text
              key={"value-" + node.id}
              x={label.x} y={label.y}
              fontSize="11.2"
              fontWeight={selected ? "600" : "400"}
              textAnchor={label.anchor}
              fill="currentColor"
              opacity={selected ? "1" : "0.84"}
              pointerEvents="none"
            >
              {formatPercent(shares[index], locale)}
            </text>
          );
        })}
      </svg>
      <div className="mt-2 flex items-center justify-center gap-4 text-[12px]">
        <button
          type="button"
          aria-label={adjustLabel + ": " + labels.components + " −"}
          onClick={() => onShareChange(3, Math.max(BASE_RESOURCE_PERCENTAGES[3] - FLEXIBILITY_PP, shares[3] - 0.5))}
          disabled={shares[3] <= BASE_RESOURCE_PERCENTAGES[3] - FLEXIBILITY_PP}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-foreground/30 text-[20px] font-light transition-colors hover:border-primary disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >−</button>
        <span className="text-[11px] text-foreground/75">{centerHint}</span>
        <button
          type="button"
          aria-label={adjustLabel + ": " + labels.components + " +"}
          onClick={() => onShareChange(3, Math.min(BASE_RESOURCE_PERCENTAGES[3] + FLEXIBILITY_PP, shares[3] + 0.5))}
          disabled={shares[3] >= BASE_RESOURCE_PERCENTAGES[3] + FLEXIBILITY_PP}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-foreground/30 text-[20px] font-light transition-colors hover:border-primary disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >+</button>
      </div>
      <p className="mt-2 text-center text-[11px] font-light leading-[1.55] text-foreground/70">
        {dragHint}
      </p>
    </div>
  );
}

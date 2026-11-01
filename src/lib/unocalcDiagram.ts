import { BASE_RESOURCE_PERCENTAGES, FLEXIBILITY_PP, SHARE_STEP_PP } from "@/lib/unocalcAllocation";

// All geometry uses the same 320 x 320 SVG coordinate system.
// The outer circle is fixed. Node distance and node AREA show the share.
export const RESOURCE_DIAGRAM_SIZE = 320;
export const RESOURCE_DIAGRAM_CENTER = RESOURCE_DIAGRAM_SIZE / 2;
export const RESOURCE_NODE_BASE_RADIUS = 8.5;
export const RESOURCE_NODE_BASE_DISTANCE = 80;
export const RESOURCE_NODE_TRAVEL = 20;

// Retail left, Design up, Installation down, Components right.
const AXIS_DIRECTIONS = [
  [-1, 0],
  [0, -1],
  [0, 1],
  [1, 0],
] as const;

export const resourceNodeRadius = (sharePercent: number): number => {
  if (!Number.isFinite(sharePercent) || sharePercent <= 0) return 0;
  return RESOURCE_NODE_BASE_RADIUS * Math.sqrt(sharePercent / 20);
};

export const resourceNodeDistance = (index: number, sharePercent: number): number => {
  if (!AXIS_DIRECTIONS[index] || !Number.isFinite(sharePercent)) {
    return RESOURCE_NODE_BASE_DISTANCE;
  }
  const deviation = Math.max(-FLEXIBILITY_PP,
    Math.min(FLEXIBILITY_PP, sharePercent - BASE_RESOURCE_PERCENTAGES[index]));
  return RESOURCE_NODE_BASE_DISTANCE + deviation / FLEXIBILITY_PP * RESOURCE_NODE_TRAVEL;
};

export const resourceNodePosition = (index: number, sharePercent: number): { x: number; y: number } => {
  const axis = AXIS_DIRECTIONS[index];
  if (!axis) return { x: RESOURCE_DIAGRAM_CENTER, y: RESOURCE_DIAGRAM_CENTER };
  const distance = resourceNodeDistance(index, sharePercent);
  return {
    x: RESOURCE_DIAGRAM_CENTER + axis[0] * distance,
    y: RESOURCE_DIAGRAM_CENTER + axis[1] * distance,
  };
};

/** Pointer projected onto a single radial axis; perpendicular movement is ignored. */
export const resourceShareFromPointer = (
  index: number,
  x: number,
  y: number,
): number => {
  const axis = AXIS_DIRECTIONS[index];
  if (!axis || !Number.isFinite(x) || !Number.isFinite(y)) {
    return BASE_RESOURCE_PERCENTAGES[index] ?? 0;
  }
  const distance = (x - RESOURCE_DIAGRAM_CENTER) * axis[0] +
    (y - RESOURCE_DIAGRAM_CENTER) * axis[1];
  const raw = BASE_RESOURCE_PERCENTAGES[index] +
    (distance - RESOURCE_NODE_BASE_DISTANCE) / RESOURCE_NODE_TRAVEL * FLEXIBILITY_PP;
  const min = BASE_RESOURCE_PERCENTAGES[index] - FLEXIBILITY_PP;
  const max = BASE_RESOURCE_PERCENTAGES[index] + FLEXIBILITY_PP;
  return Math.max(min, Math.min(max, Math.round(raw / SHARE_STEP_PP) * SHARE_STEP_PP));
};

/** Arrow keys provide fine-grained access independently of pointer devices. */
export const resourceShareFromKey = (index: number, current: number, key: string): number | null => {
  const base = BASE_RESOURCE_PERCENTAGES[index];
  if (base === undefined || !Number.isFinite(current)) return null;
  const min = base - FLEXIBILITY_PP;
  const max = base + FLEXIBILITY_PP;
  if (key === "Home") return min;
  if (key === "End") return max;
  if (key === "ArrowUp" || key === "ArrowRight") return Math.min(max, current + SHARE_STEP_PP);
  if (key === "ArrowDown" || key === "ArrowLeft") return Math.max(min, current - SHARE_STEP_PP);
  return null;
};


/**
 * Label coordinates leave the 23px interactive/focus halo unobstructed.
 * Horizontal node values sit above the handle; vertical values start to its
 * right. All extrema remain within the 320px diagram canvas.
 */
export const resourceValueLabelPosition = (
  index: number,
  share: number,
): { x: number; y: number; anchor: "middle" | "start" } => {
  const p = resourceNodePosition(index, share);
  return index === 0 || index === 3
    ? { x: p.x, y: p.y - 33, anchor: "middle" }
    : { x: p.x + 35, y: p.y + 3.5, anchor: "start" };
};

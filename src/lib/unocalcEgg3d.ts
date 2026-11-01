import { getEggConstruction } from "@/lib/unocalcEgg";

export type Point2 = { x: number; y: number };
export type Point3 = { x: number; y: number; z: number };
export type EggOrientation = { roll: number; tilt: number };

const SQRT2 = Math.SQRT2;
const LOWER_RADIUS = 2 - SQRT2;
const SECTION_BOTTOM = 3 - SQRT2;
const SECTION_CENTER = (SECTION_BOTTOM - 1) / 2;

/** Radial section of Moss's egg (R=1): four mutually tangent circular arcs. */
export const eggRadiusAtSection = (sectionY: number): number => {
  if (sectionY < -1 || sectionY > SECTION_BOTTOM) return 0;
  if (sectionY <= 0) return Math.sqrt(Math.max(0, 1 - sectionY ** 2));
  if (sectionY <= SQRT2) return -1 + Math.sqrt(Math.max(0, 4 - sectionY ** 2));
  return Math.sqrt(Math.max(0, LOWER_RADIUS ** 2 - (sectionY - 1) ** 2));
};

export const EGG_TOP = SECTION_CENTER + 1;
export const EGG_BOTTOM = SECTION_CENTER - SECTION_BOTTOM;
export const EGG_EQUATOR = SECTION_CENTER;

/** Surface of revolution: a real 3D egg, not a flat path. */
export const eggSurface = (rings = 108, sides = 48): Point3[] => {
  const points: Point3[] = [];
  for (let i = 0; i <= rings; i++) {
    const sectionY = -1 + (SECTION_BOTTOM + 1) * i / rings;
    const r = eggRadiusAtSection(sectionY);
    const y = SECTION_CENTER - sectionY;
    for (let j = 0; j < sides; j++) {
      const angle = 2 * Math.PI * j / sides;
      points.push({ x: r * Math.cos(angle), y, z: r * Math.sin(angle) });
    }
  }
  return points;
};

export const rotateEggPoint = (point: Point3, orientation: EggOrientation): Point3 => {
  const { roll, tilt } = orientation;
  // Horizontal gesture rolls the entire axis left/right; vertical gesture
  // tilts the egg in depth. Spinning a symmetric egg around its own axis
  // would not visibly change its outline.
  const x1 = point.x * Math.cos(roll) - point.y * Math.sin(roll);
  const y1 = point.x * Math.sin(roll) + point.y * Math.cos(roll);
  return {
    x: x1,
    y: y1 * Math.cos(tilt) - point.z * Math.sin(tilt),
    z: y1 * Math.sin(tilt) + point.z * Math.cos(tilt),
  };
};

const CENTER_X = 380;
const CENTER_Y = 350;
const SCALE = 212;

export const projectEggPoint = (point: Point3, orientation: EggOrientation): Point2 & { depth: number } => {
  const p = rotateEggPoint(point, orientation);
  return { x: CENTER_X + SCALE * p.x, y: CENTER_Y - SCALE * p.y, depth: p.z };
};

const cross = (o: Point2, a: Point2, b: Point2): number =>
  (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

/** Convex projected silhouette of the 3D surface, including tilted views. */
export const convexOutline = (points: Point2[]): Point2[] => {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (sorted.length <= 2) return sorted;
  const lower: Point2[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Point2[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return [...lower, ...upper];
};

export const svgOutline = (points: Point2[]): string =>
  points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ") + " Z";

/** Back and front semicircles make the cross-section legible in a wireframe. */
export const eggEquatorArcs = (orientation: EggOrientation, steps = 144) => {
  const front: string[] = [];
  const back: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = 2 * Math.PI * i / steps;
    const p = projectEggPoint({ x: Math.cos(angle), y: EGG_EQUATOR, z: Math.sin(angle) }, orientation);
    const point = `${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
    // Independent short segments prevent a spurious bridge when depth changes sign.
    if (i > 0) {
      const previousAngle = 2 * Math.PI * (i - 1) / steps;
      const prev = projectEggPoint({ x: Math.cos(previousAngle), y: EGG_EQUATOR, z: Math.sin(previousAngle) }, orientation);
      const segment = `M ${prev.x.toFixed(2)} ${prev.y.toFixed(2)} L ${point}`;
      (p.depth + prev.depth >= 0 ? front : back).push(segment);
    }
  }
  return { front: front.join(" "), back: back.join(" ") };
};

export const eggAxisEndpoints = (orientation: EggOrientation) => ({
  start: projectEggPoint({ x: 0, y: EGG_TOP + 0.25, z: 0 }, orientation),
  end: projectEggPoint({ x: 0, y: EGG_BOTTOM - 0.25, z: 0 }, orientation),
});

// Keep the 2D Moss construction as the canonical source of proportions.
export const EGG_CONSTRUCTION = getEggConstruction();

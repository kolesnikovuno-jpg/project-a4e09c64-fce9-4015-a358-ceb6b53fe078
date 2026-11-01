import { getEggConstruction } from "@/lib/unocalcEgg";

export type Point2 = { x: number; y: number };
export type Point3 = { x: number; y: number; z: number };
export type EggOrientation = { yaw: number; tilt: number };

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

// Narrow end points up, broad circular end points down.
export const EGG_TOP = SECTION_BOTTOM - SECTION_CENTER;
export const EGG_BOTTOM = -1 - SECTION_CENTER;
export const EGG_EQUATOR = -SECTION_CENTER;

/** Surface of revolution: a real 3D egg, not a flat path. */
export const eggSurface = (rings = 108, sides = 48): Point3[] => {
  const points: Point3[] = [];
  for (let i = 0; i <= rings; i++) {
    const sectionY = -1 + (SECTION_BOTTOM + 1) * i / rings;
    const r = eggRadiusAtSection(sectionY);
    const y = sectionY - SECTION_CENTER;
    for (let j = 0; j < sides; j++) {
      const angle = 2 * Math.PI * j / sides;
      points.push({ x: r * Math.cos(angle), y, z: r * Math.sin(angle) });
    }
  }
  return points;
};

export const rotateEggPoint = (point: Point3, orientation: EggOrientation): Point3 => {
  const { yaw, tilt } = orientation;
  // Horizontal gesture spins around the vertical axis; vertical gesture tilts.
  // Apply the same transform to the shell, plane, nodes and pole spheres.
  const x1 = point.x * Math.cos(yaw) + point.z * Math.sin(yaw);
  const z1 = -point.x * Math.sin(yaw) + point.z * Math.cos(yaw);
  return {
    x: x1,
    y: point.y * Math.cos(tilt) - z1 * Math.sin(tilt),
    z: point.y * Math.sin(tilt) + z1 * Math.cos(tilt),
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

/**
 * Four unnamed lower spheres sit on the egg surface, 0.38 R below the
 * existing equatorial plane and halfway between the four principal nodes
 * in azimuth. Their functions are deliberately left unassigned.
 */
export const LOWER_SPHERE_SECTION_Y = -0.38;
export const LOWER_SPHERE_Y = LOWER_SPHERE_SECTION_Y - SECTION_CENTER;
const LOWER_SPHERE_RADIUS = eggRadiusAtSection(LOWER_SPHERE_SECTION_Y);

export const eggLowerSphereNodes = (orientation: EggOrientation) =>
  Array.from({ length: 4 }, (_, index) => {
    const angle = Math.PI / 4 + index * Math.PI / 2;
    return {
      ...projectEggPoint({
        x: LOWER_SPHERE_RADIUS * Math.cos(angle),
        y: LOWER_SPHERE_Y,
        z: LOWER_SPHERE_RADIUS * Math.sin(angle),
      }, orientation),
      id: `support-${index + 1}`,
      number: index + 5,
      angle,
    };
  });

/** Hide lower spheres that are exactly behind another sphere in projection. */
export const visibleEggLowerSphereNodes = (orientation: EggOrientation, sphereRadius = 10.5) => {
  const nodes = eggLowerSphereNodes(orientation).sort((a, b) => b.depth - a.depth);
  const visible: typeof nodes = [];
  for (const node of nodes) {
    if (!visible.some((front) => Math.hypot(node.x - front.x, node.y - front.y) < sphereRadius * 2)) {
      visible.push(node);
    }
  }
  return visible;
};

/** Back and front arcs make each 3D latitude legible in a wireframe. */
const eggLatitudeArcs = (orientation: EggOrientation, radius: number, y: number, steps: number) => {
  const front: string[] = [];
  const back: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = 2 * Math.PI * i / steps;
    const p = projectEggPoint({ x: radius * Math.cos(angle), y, z: radius * Math.sin(angle) }, orientation);
    const point = `${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
    // Independent short segments prevent a spurious bridge when depth changes sign.
    if (i > 0) {
      const previousAngle = 2 * Math.PI * (i - 1) / steps;
      const prev = projectEggPoint({ x: radius * Math.cos(previousAngle), y, z: radius * Math.sin(previousAngle) }, orientation);
      const segment = `M ${prev.x.toFixed(2)} ${prev.y.toFixed(2)} L ${point}`;
      (p.depth + prev.depth >= 0 ? front : back).push(segment);
    }
  }
  return { front: front.join(" "), back: back.join(" ") };
};

export const eggEquatorArcs = (orientation: EggOrientation, steps = 144) =>
  eggLatitudeArcs(orientation, 1, EGG_EQUATOR, steps);

export const eggLowerRingArcs = (orientation: EggOrientation, steps = 144) =>
  eggLatitudeArcs(orientation, LOWER_SPHERE_RADIUS, LOWER_SPHERE_Y, steps);

/**
 * Two perpendicular diameters of the equatorial plane. Their four nodes lie
 * exactly on the egg surface; a small extension of each axis remains visible
 * beyond the shell. All points use the same 3D transform as the egg.
 */
export const eggSectionAxes = (orientation: EggOrientation) => {
  // X diameter is visible left/right in the front view; the perpendicular
  // Z diameter projects to one central node (front) hiding the rear node.
  const directions = [0, Math.PI / 2];
  const axes = directions.map((angle) => {
    const ux = Math.cos(angle);
    const uz = Math.sin(angle);
    const atRadius = (r: number): Point3 => ({ x: r * ux, y: EGG_EQUATOR, z: r * uz });
    return {
      start: projectEggPoint(atRadius(-1.15), orientation),
      end: projectEggPoint(atRadius(1.15), orientation),
      nodes: [
        { ...projectEggPoint(atRadius(-1), orientation), id: angle === 0 ? "design" : "commerce" },
        { ...projectEggPoint(atRadius(1), orientation), id: angle === 0 ? "production" : "retail" },
      ],
    };
  });
  return axes;
};

/**
 * Opaque contour nodes: if two spheres project onto each other, only the
 * nearest one is visible. They separate naturally as the plane tilts.
 */
export const visibleEggSectionNodes = (
  axes: ReturnType<typeof eggSectionAxes>,
  sphereRadius = 10.5,
) => {
  const nodes = axes.flatMap((axis) => axis.nodes).sort((a, b) => b.depth - a.depth);
  const visible: typeof nodes = [];
  for (const node of nodes) {
    if (!visible.some((front) => Math.hypot(node.x - front.x, node.y - front.y) < sphereRadius * 2)) {
      visible.push(node);
    }
  }
  return visible;
};

/** Spheres at the egg's upper and lower axial poles. */
export const eggPoleNodes = (orientation: EggOrientation) => [
  projectEggPoint({ x: 0, y: EGG_TOP, z: 0 }, orientation),
  projectEggPoint({ x: 0, y: EGG_BOTTOM, z: 0 }, orientation),
];

/**
 * Two explicit 3D relationships from Idea to Marketing and Legal.
 * Project both endpoints with the egg's current orientation, then stop the
 * lines at the circular contours rather than crossing the sphere interiors.
 * The rear link remains present when its destination overlaps a front node.
 */
export const eggIdeaLinks = (orientation: EggOrientation, sphereRadius = 10.5) => {
  const idea = eggPoleNodes(orientation)[0];
  const lower = eggLowerSphereNodes(orientation);
  return [
    { id: "marketing", target: lower[1] },
    { id: "legal", target: lower[3] },
  ].map(({ id, target }) => {
    const dx = target.x - idea.x;
    const dy = target.y - idea.y;
    const distance = Math.hypot(dx, dy);
    const trim = Math.min(sphereRadius, distance / 2);
    const ux = distance > 0 ? dx / distance : 0;
    const uy = distance > 0 ? dy / distance : 0;
    return {
      id,
      x1: idea.x + ux * trim,
      y1: idea.y + uy * trim,
      x2: target.x - ux * trim,
      y2: target.y - uy * trim,
      depth: target.depth,
    };
  });
};

/**
 * Structural links between principal and lower spheres:
 * Marketing (06) → Design, Legal (08) → Production,
 * Design → Test Drive (05), Production → Procurement (07),
 * Test Drive (05) → Commerce, Procurement (07) → Retail.
 * All endpoints are projected from the same 3D egg orientation.
 */
export const eggSupportLinks = (orientation: EggOrientation, sphereRadius = 10.5) => {
  const lower = eggLowerSphereNodes(orientation);
  const axes = eggSectionAxes(orientation);
  const [design, production] = axes[0].nodes;
  const [commerce, retail] = axes[1].nodes;
  return [
    { id: "marketing-design", source: lower[1], target: design },
    { id: "legal-production", source: lower[3], target: production },
    { id: "design-test-drive", source: design, target: lower[0] },
    { id: "production-procurement", source: production, target: lower[2] },
    { id: "test-drive-commerce", source: lower[0], target: commerce },
    { id: "procurement-retail", source: lower[2], target: retail },
  ].map(({ id, source, target }) => {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const distance = Math.hypot(dx, dy);
    const trim = Math.min(sphereRadius, distance / 2);
    const ux = distance > 0 ? dx / distance : 0;
    const uy = distance > 0 ? dy / distance : 0;
    return {
      id,
      x1: source.x + ux * trim,
      y1: source.y + uy * trim,
      x2: target.x - ux * trim,
      y2: target.y - uy * trim,
      depth: (source.depth + target.depth) / 2,
    };
  });
};

export const eggAxisEndpoints = (orientation: EggOrientation) => ({
  start: projectEggPoint({ x: 0, y: EGG_TOP + 0.25, z: 0 }, orientation),
  end: projectEggPoint({ x: 0, y: EGG_BOTTOM - 0.25, z: 0 }, orientation),
});

// Keep the 2D Moss construction as the canonical source of proportions.
export const EGG_CONSTRUCTION = getEggConstruction();

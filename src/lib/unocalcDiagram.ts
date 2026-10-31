// Radius uses the square root, so visible node AREA is proportional to share.
// Equal shares have equal circles; a 40% circle has twice the area of 20%.
export const RESOURCE_NODE_BASE_RADIUS = 8.5;

export const resourceNodeRadius = (sharePercent: number): number => {
  if (!Number.isFinite(sharePercent) || sharePercent <= 0) return 0;
  return RESOURCE_NODE_BASE_RADIUS * Math.sqrt(sharePercent / 20);
};

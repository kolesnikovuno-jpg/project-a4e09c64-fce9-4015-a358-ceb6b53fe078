/**
 * Axisymmetric ovoid section, broad end up.
 * t = -1 at the broad pole, +1 at the narrow pole.
 * The factor (1 - asymmetry * t) moves the maximum width above the midpoint.
 * Unlike an ellipse, the two halves have different widths at equal heights.
 */
export const eggHalfWidthAtHeight = (t: number, radius = 238, asymmetry = 0.3): number => {
  if (t < -1 || t > 1) return 0;
  return radius * Math.sqrt(Math.max(0, 1 - t * t)) * (1 - asymmetry * t);
};

export const buildEggOutline = (
  cx = 380,
  cy = 352,
  halfHeight = 286,
  radius = 238,
  asymmetry = 0.3,
  steps = 96,
): string => {
  const right: string[] = [];
  const left: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = -1 + (2 * i) / steps;
    const y = cy + t * halfHeight;
    const width = eggHalfWidthAtHeight(t, radius, asymmetry);
    right.push(`${(cx + width).toFixed(2)} ${y.toFixed(2)}`);
    left.push(`${(cx - width).toFixed(2)} ${y.toFixed(2)}`);
  }
  return `M ${right[0]} L ${right.slice(1).join(" L ")} L ${left.reverse().slice(1).join(" L ")} Z`;
};

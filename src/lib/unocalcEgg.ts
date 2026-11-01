/**
 * Moss's egg: a compass-and-straightedge ovoid composed of four
 * tangent circular arcs. We orient the large semicircle at the top.
 *
 * Construction: broad semicircle R; two side arcs 2R; lower arc
 * (2 - sqrt(2))R. Every join is tangent, including the narrow pole.
 * The section can later be revolved around its vertical symmetry axis.
 * https://en.wikipedia.org/wiki/Moss%27s_egg
 */
export const getEggConstruction = (
  cx = 380,
  topY = 72,
  radius = 222,
) => {
  const equatorY = topY + radius;
  const joinOffsetX = radius * (Math.SQRT2 - 1);
  const joinY = equatorY + radius * Math.SQRT2;
  const sideRadius = radius * 2;
  const lowerRadius = radius * (2 - Math.SQRT2);
  const bottomY = equatorY + radius + lowerRadius;

  return { cx, topY, radius, equatorY, joinOffsetX, joinY, sideRadius, lowerRadius, bottomY };
};

export const buildEggOutline = (
  cx = 380,
  topY = 72,
  radius = 222,
): string => {
  const g = getEggConstruction(cx, topY, radius);
  const n = (value: number) => value.toFixed(2);
  return [
    `M ${n(cx - radius)} ${n(g.equatorY)}`,
    // Broad upper semicircle, from left shoulder to right shoulder.
    `A ${n(radius)} ${n(radius)} 0 0 1 ${n(cx + radius)} ${n(g.equatorY)}`,
    // Right shoulder and side, with a common tangent at the shoulder.
    `A ${n(g.sideRadius)} ${n(g.sideRadius)} 0 0 1 ${n(cx + g.joinOffsetX)} ${n(g.joinY)}`,
    // Narrow but rounded lower pole.
    `A ${n(g.lowerRadius)} ${n(g.lowerRadius)} 0 0 1 ${n(cx - g.joinOffsetX)} ${n(g.joinY)}`,
    // Left side back to the broad shoulder.
    `A ${n(g.sideRadius)} ${n(g.sideRadius)} 0 0 1 ${n(cx - radius)} ${n(g.equatorY)} Z`,
  ].join(" ");
};

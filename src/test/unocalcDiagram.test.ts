import { describe, expect, it } from "vitest";
import { RESOURCE_NODE_BASE_RADIUS, resourceNodeRadius } from "@/lib/unocalcDiagram";

describe("UNOcalc balance diagram", () => {
  it("renders equal-sized circles for equal shares", () => {
    expect(resourceNodeRadius(20)).toBe(RESOURCE_NODE_BASE_RADIUS);
    expect(resourceNodeRadius(20)).toBe(resourceNodeRadius(20));
  });

  it("uses proportional circle area rather than linear diameter", () => {
    const radius20 = resourceNodeRadius(20);
    const radius40 = resourceNodeRadius(40);
    expect((radius40 * radius40) / (radius20 * radius20)).toBeCloseTo(2, 10);
  });

  it("grows and shrinks monotonically with the slider values", () => {
    expect(resourceNodeRadius(17.5)).toBeLessThan(resourceNodeRadius(20));
    expect(resourceNodeRadius(22.5)).toBeGreaterThan(resourceNodeRadius(20));
    expect(resourceNodeRadius(37.5)).toBeLessThan(resourceNodeRadius(42.5));
  });

  it("guards against invalid or nonpositive values", () => {
    expect(resourceNodeRadius(0)).toBe(0);
    expect(resourceNodeRadius(-1)).toBe(0);
    expect(resourceNodeRadius(Infinity)).toBe(0);
    expect(resourceNodeRadius(NaN)).toBe(0);
  });
});

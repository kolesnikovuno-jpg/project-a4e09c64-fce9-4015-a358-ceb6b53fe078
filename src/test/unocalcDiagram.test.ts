import { describe, expect, it } from "vitest";
import { BASE_RESOURCE_PERCENTAGES } from "@/lib/unocalcAllocation";
import {
  RESOURCE_DIAGRAM_CENTER,
  RESOURCE_NODE_BASE_RADIUS,
  RESOURCE_NODE_BASE_DISTANCE,
  resourceNodeDistance,
  resourceNodePosition,
  resourceNodeRadius,
  resourceShareFromPointer,
  resourceShareFromKey,
} from "@/lib/unocalcDiagram";

describe("UNOcalc interactive balance diagram", () => {
  it("uses proportional circle area rather than diameter", () => {
    expect(resourceNodeRadius(20)).toBe(RESOURCE_NODE_BASE_RADIUS);
    expect((resourceNodeRadius(40) / resourceNodeRadius(20)) ** 2).toBeCloseTo(2, 10);
    expect(resourceNodeRadius(17.5)).toBeLessThan(resourceNodeRadius(22.5));
    expect(resourceNodeRadius(0)).toBe(0);
    expect(resourceNodeRadius(Infinity)).toBe(0);
  });

  it("uses the same baseline position for all four radial axes", () => {
    for (let index = 0; index < 4; index++) {
      expect(resourceNodeDistance(index, BASE_RESOURCE_PERCENTAGES[index]))
        .toBe(RESOURCE_NODE_BASE_DISTANCE);
    }
    expect(resourceNodePosition(0, 20)).toEqual({ x: 80, y: 160 });
    expect(resourceNodePosition(1, 20)).toEqual({ x: 160, y: 80 });
    expect(resourceNodePosition(2, 20)).toEqual({ x: 160, y: 240 });
    expect(resourceNodePosition(3, 40)).toEqual({ x: 240, y: 160 });
  });

  it("maps drag positions to the correct share on each axis", () => {
    for (let index = 0; index < 4; index++) {
      const base = BASE_RESOURCE_PERCENTAGES[index];
      for (let steps = -5; steps <= 5; steps++) {
        const share = base + steps * 0.5;
        const position = resourceNodePosition(index, share);
        expect(resourceShareFromPointer(index, position.x, position.y)).toBe(share);
      }
    }
  });

  it("projects perpendicular movement out of the radial interaction", () => {
    expect(resourceShareFromPointer(0, 80, 290)).toBe(20);
    expect(resourceShareFromPointer(1, 5, 80)).toBe(20);
    expect(resourceShareFromPointer(2, 310, 240)).toBe(20);
    expect(resourceShareFromPointer(3, 240, 5)).toBe(40);
  });

  it("clamps drags beyond the outer circle or center", () => {
    expect(resourceShareFromPointer(0, -100, 160)).toBe(22.5);
    expect(resourceShareFromPointer(0, 160, 160)).toBe(17.5);
    expect(resourceShareFromPointer(1, 160, -100)).toBe(22.5);
    expect(resourceShareFromPointer(2, 160, 400)).toBe(22.5);
    expect(resourceShareFromPointer(3, 400, 160)).toBe(42.5);
    expect(resourceShareFromPointer(3, RESOURCE_DIAGRAM_CENTER, 160)).toBe(37.5);
  });

  it("keeps the inward and outward circular guides within the outer radius", () => {
    for (let index = 0; index < 4; index++) {
      const base = BASE_RESOURCE_PERCENTAGES[index];
      const inner = resourceNodePosition(index, base - 2.5);
      const outer = resourceNodePosition(index, base + 2.5);
      const radius = (point: { x: number; y: number }) =>
        Math.hypot(point.x - RESOURCE_DIAGRAM_CENTER, point.y - RESOURCE_DIAGRAM_CENTER);
      expect(radius(inner)).toBe(60);
      expect(radius(outer)).toBe(100);
      expect(radius(outer)).toBeLessThan(120);
    }
  });

  it("supports keyboard adjustment, Home and End", () => {
    expect(resourceShareFromKey(1, 20, "ArrowRight")).toBe(20.5);
    expect(resourceShareFromKey(1, 20, "ArrowDown")).toBe(19.5);
    expect(resourceShareFromKey(3, 40, "Home")).toBe(37.5);
    expect(resourceShareFromKey(3, 40, "End")).toBe(42.5);
    expect(resourceShareFromKey(3, 42.5, "ArrowUp")).toBe(42.5);
    expect(resourceShareFromKey(1, 20, "Escape")).toBeNull();
  });

  it("ignores invalid inputs without producing NaN or Infinity", () => {
    expect(resourceShareFromPointer(0, NaN, 160)).toBe(20);
    expect(resourceShareFromPointer(3, Infinity, 160)).toBe(40);
    expect(resourceNodeDistance(0, NaN)).toBe(80);
    expect(resourceNodeRadius(NaN)).toBe(0);
  });
});

import { describe, expect, it } from "vitest";
import { allocateResource, RESOURCE_SHARES } from "@/lib/unocalcAllocation";

describe("UNOcalc resource distribution", () => {
  it("always allocates exactly 100% across the four author categories", () => {
    expect(RESOURCE_SHARES.map((s) => s.percent)).toEqual([20, 20, 20, 40]);
    expect(RESOURCE_SHARES.reduce((sum, s) => sum + s.percent, 0)).toBe(100);
  });

  it("allocates the original $15,625 reference exactly", () => {
    const result = allocateResource(15625);
    expect(result?.displayedTotal).toBe(15625);
    expect(result?.parts.map((p) => p.amount)).toEqual([3125, 3125, 3125, 6250]);
  });

  it("preserves total after a city adjustment and avoids independent rounding drift", () => {
    const result = allocateResource(14687.5);
    expect(result?.displayedTotal).toBe(14688);
    expect(result?.parts.reduce((sum, p) => sum + p.amount, 0)).toBe(14688);
  });

  it("allocates a euro benchmark without converting currencies", () => {
    const result = allocateResource(69990);
    expect(result?.parts.map((p) => p.amount)).toEqual([13998, 13998, 13998, 27996]);
  });

  it("keeps useful precision for smaller objects", () => {
    const result = allocateResource(0.193);
    expect(result?.displayedTotal).toBe(0.193);
    expect(result?.parts.reduce((sum, p) => sum + p.amount, 0)).toBeCloseTo(0.193, 9);
  });

  it("does not invent an allocation without a valid total", () => {
    expect(allocateResource(0)).toBeNull();
    expect(allocateResource(-1)).toBeNull();
    expect(allocateResource(Infinity)).toBeNull();
    expect(allocateResource(NaN)).toBeNull();
  });
});

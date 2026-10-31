import { describe, expect, it } from "vitest";
import {
  allocateResource, RESOURCE_SHARES, BASE_RESOURCE_PERCENTAGES, FLEXIBILITY_PP,
  adaptResourcePercentages, isValidResourcePercentages, type ResourcePercentages,
} from "@/lib/unocalcAllocation";

describe("UNOcalc resource distribution", () => {
  it("always allocates exactly 100% across the four author categories", () => {
    expect(RESOURCE_SHARES.map((s) => s.percent)).toEqual([20, 20, 20, 40]);
    expect(RESOURCE_SHARES.reduce((sum, s) => sum + s.percent, 0)).toBe(100);
  });

  it("adjusts individual shares within ±2.5 pp and always sums to 100%", () => {
    expect(FLEXIBILITY_PP).toBe(2.5);
    expect(BASE_RESOURCE_PERCENTAGES).toEqual([20, 20, 20, 40]);
    const shares = adaptResourcePercentages(BASE_RESOURCE_PERCENTAGES, 2, 22.5);
    expect(shares[2]).toBe(22.5);
    expect(shares.reduce((sum, share) => sum + share, 0)).toBe(100);
    expect(isValidResourcePercentages(shares)).toBe(true);
    expect(allocateResource(15625, shares)?.parts.reduce((sum, part) => sum + part.amount, 0)).toBe(15625);
  });

  it("clamps requests outside the allowed 5-point windows", () => {
    expect(adaptResourcePercentages(BASE_RESOURCE_PERCENTAGES, 3, 100)[3]).toBe(42.5);
    expect(adaptResourcePercentages(BASE_RESOURCE_PERCENTAGES, 0, 0)[0]).toBe(17.5);
    expect(adaptResourcePercentages(BASE_RESOURCE_PERCENTAGES, 3, 37.5)[3]).toBe(37.5);
    expect(adaptResourcePercentages(BASE_RESOURCE_PERCENTAGES, 7, 25)).toBe(BASE_RESOURCE_PERCENTAGES);
  });

  it("preserves the invariants across repeated slider changes", () => {
    let shares: ResourcePercentages = BASE_RESOURCE_PERCENTAGES;
    const movements: Array<[number, number]> = [
      [0, 22.5], [1, 17.5], [2, 22.5], [3, 37.5],
      [0, 17.5], [3, 42.5], [1, 22.5], [2, 17.5],
      [0, 20], [1, 20], [2, 20], [3, 40],
    ];
    for (const [index, value] of movements) {
      shares = adaptResourcePercentages(shares, index, value);
      expect(isValidResourcePercentages(shares)).toBe(true);
      expect(allocateResource(14687.5, shares)?.parts.reduce((sum, part) => sum + part.amount, 0)).toBe(14688);
    }
  });

  it("rejects invalid totals or unauthorized shares", () => {
    expect(allocateResource(10000, [20, 20, 20, 41])).toBeNull();
    expect(allocateResource(10000, [12, 28, 20, 40])).toBeNull();
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

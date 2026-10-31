import { describe, expect, it } from "vitest";
import {
  allocateResource, RESOURCE_SHARES, BASE_RESOURCE_PERCENTAGES, FLEXIBILITY_PP,
  adaptResourcePercentages, isValidResourcePercentages, type ResourcePercentages,
  INITIAL_RESOURCE_COUNTERPARTS, linkResourceCounterparts, resourceShareRange,
  resourcePaidMask, resourceCashSummary, DEFAULT_RESOURCE_COST_MODES,
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

  it("spreads one adjustment over all other shares according to their base weights", () => {
    // Before the correction, the algorithm did not account for the 40% base.
    const result = adaptResourcePercentages(BASE_RESOURCE_PERCENTAGES, 0, 22.5);
    expect(result).toEqual([22.5, 19.5, 19.5, 38.5]);
    expect(result.reduce((sum, value) => sum + value, 0)).toBe(100);
  });

  it("reverses the last adjustment back to exact equilibrium", () => {
    for (let selected = 0; selected < 4; selected++) {
      const towardMin = adaptResourcePercentages(BASE_RESOURCE_PERCENTAGES, selected, BASE_RESOURCE_PERCENTAGES[selected] - 2.5);
      const towardMax = adaptResourcePercentages(BASE_RESOURCE_PERCENTAGES, selected, BASE_RESOURCE_PERCENTAGES[selected] + 2.5);
      expect(adaptResourcePercentages(towardMin, selected, BASE_RESOURCE_PERCENTAGES[selected])).toEqual(BASE_RESOURCE_PERCENTAGES);
      expect(adaptResourcePercentages(towardMax, selected, BASE_RESOURCE_PERCENTAGES[selected])).toEqual(BASE_RESOURCE_PERCENTAGES);
    }
  });

  it("lets every slider reach any of its 11 values without a stuck thumb", () => {
    for (let a = -5; a <= 5; a++) {
      for (let b = -5; b <= 5; b++) {
        for (let c = -5; c <= 5; c++) {
          const d = -(a + b + c);
          if (d < -5 || d > 5) continue;
          const current: ResourcePercentages = [20 + a / 2, 20 + b / 2, 20 + c / 2, 40 + d / 2];
          expect(isValidResourcePercentages(current)).toBe(true);
          for (let index = 0; index < 4; index++) {
            for (let requestedTick = -5; requestedTick <= 5; requestedTick++) {
              const requested = BASE_RESOURCE_PERCENTAGES[index] + requestedTick / 2;
              const next = adaptResourcePercentages(current, index, requested);
              expect(next[index]).toBe(requested);
              expect(isValidResourcePercentages(next)).toBe(true);
            }
          }
        }
      }
    }
  });

  it("transfers design only into installation while retail and components stay untouched", () => {
    // User case: Retail 20, Components 42.5, Installation 17.5.
    const start: ResourcePercentages = [20, 20, 17.5, 42.5];
    const paired = adaptResourcePercentages(start, 1, 17.5, 2);
    expect(paired).toEqual([20, 17.5, 20, 42.5]);
    expect(adaptResourcePercentages(paired, 2, 17.5, 1)).toEqual(start);
    expect(resourceShareRange(start, 1, 2)).toEqual({ min: 17.5, max: 20 });
  });

  it("pairs categories bidirectionally and cleanly relinks / unlinks", () => {
    const designInstallation = linkResourceCounterparts(INITIAL_RESOURCE_COUNTERPARTS, 1, 2);
    expect(designInstallation).toEqual([null, 2, 1, null]);
    const retailComponents = linkResourceCounterparts(designInstallation, 0, 3);
    expect(retailComponents).toEqual([3, 2, 1, 0]);
    const switched = linkResourceCounterparts(retailComponents, 1, 0);
    expect(switched).toEqual([1, 0, null, null]);
    expect(linkResourceCounterparts(switched, 0, null)).toEqual(INITIAL_RESOURCE_COUNTERPARTS);
    expect(linkResourceCounterparts(switched, 1, 1)).toBe(switched);
  });

  it("allows every paired slider position reachable from any balanced allocation", () => {
    // There are 891 valid 0.5 pp allocations; check every pair and requested value.
    for (let a = -5; a <= 5; a++) {
      for (let b = -5; b <= 5; b++) {
        for (let c = -5; c <= 5; c++) {
          const d = -(a + b + c);
          if (d < -5 || d > 5) continue;
          const current: ResourcePercentages = [20 + a / 2, 20 + b / 2, 20 + c / 2, 40 + d / 2];
          for (let index = 0; index < 4; index++) {
            for (let partner = 0; partner < 4; partner++) {
              if (index === partner) continue;
              const bounds = resourceShareRange(current, index, partner);
              for (let tick = -5; tick <= 5; tick++) {
                const requested = BASE_RESOURCE_PERCENTAGES[index] + tick / 2;
                const applied = Math.max(bounds.min, Math.min(bounds.max, requested));
                const result = adaptResourcePercentages(current, index, requested, partner);
                expect(result[index]).toBe(applied);
                expect(result.filter((_, row) => row !== index && row !== partner)).toEqual(
                  current.filter((_, row) => row !== index && row !== partner)
                );
                expect(isValidResourcePercentages(result)).toBe(true);
              }
            }
          }
        }
      }
    }
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


  it("separates direct payments from reference resource: personal project without retail and outsourced design", () => {
    const allocation = allocateResource(40000);
    const modes = ["not-needed", "self", "paid", "paid"] as const;
    const cash = resourceCashSummary(allocation, modes);
    expect(cash?.lines.map((line) => line.directPayment)).toEqual([0, 0, 8000, 16000]);
    expect(cash?.paid).toBe(24000);
    expect(cash?.noDirectPayment).toBe(16000);
    expect(cash?.paidPercentOfReference).toBe(60);
    expect(allocation?.displayedTotal).toBe(40000);
  });

  it("retail can be absent while design still carries value but no separate payment", () => {
    const cash = resourceCashSummary(allocateResource(15625),
      ["not-needed", "self", "paid", "paid"]);
    expect(cash?.lines[0].referenceAmount).toBe(3125);
    expect(cash?.lines[0].mode).toBe("not-needed");
    expect(cash?.lines[1].referenceAmount).toBe(3125);
    expect(cash?.lines[1].mode).toBe("self");
    expect(cash?.lines[0].directPayment).toBe(0);
    expect(cash?.lines[1].directPayment).toBe(0);
  });

  it("only paid directions rebalance: without retail and self-design, montage and components exchange only", () => {
    const allowed = resourcePaidMask(["not-needed", "self", "paid", "paid"]);
    expect(allowed).toEqual([false, false, true, true]);
    const change = adaptResourcePercentages(BASE_RESOURCE_PERCENTAGES, 2, 22.5, null, allowed);
    expect(change).toEqual([20, 20, 22.5, 37.5]);
    expect(adaptResourcePercentages(change, 2, 20, null, allowed)).toEqual(BASE_RESOURCE_PERCENTAGES);
    expect(resourceShareRange(BASE_RESOURCE_PERCENTAGES, 0, null, allowed)).toEqual({ min: 20, max: 20 });
    expect(adaptResourcePercentages(BASE_RESOURCE_PERCENTAGES, 1, 22.5, null, allowed))
      .toEqual(BASE_RESOURCE_PERCENTAGES);
  });

  it("cannot change the paid allocation when only one paid category remains", () => {
    const allowed = resourcePaidMask(["not-needed", "self", "not-needed", "paid"]);
    expect(resourceShareRange(BASE_RESOURCE_PERCENTAGES, 3, null, allowed))
      .toEqual({ min: 40, max: 40 });
    expect(adaptResourcePercentages(BASE_RESOURCE_PERCENTAGES, 3, 42.5, null, allowed))
      .toEqual(BASE_RESOURCE_PERCENTAGES);
  });

  it("default payment mode leaves the original four-part monetary allocation intact", () => {
    const allocation = allocateResource(10000);
    expect(resourceCashSummary(allocation, DEFAULT_RESOURCE_COST_MODES)?.paid).toBe(10000);
    expect(resourceCashSummary(allocation, DEFAULT_RESOURCE_COST_MODES)?.noDirectPayment).toBe(0);
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

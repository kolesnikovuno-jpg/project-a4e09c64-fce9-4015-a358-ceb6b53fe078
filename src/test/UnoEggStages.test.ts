import { describe, expect, it } from "vitest";
import { EGG_STAGES, NEW_EGG_MATURITY, nextEggIteration, setEggStage } from "../lib/unocalcEggStages";

describe("Egg translucent maturity matryoshka", () => {
  it("defines five distinct concentric levels from red to blue", () => {
    expect(EGG_STAGES).toHaveLength(5);
    expect(EGG_STAGES.map(s => s.index)).toEqual([1, 2, 3, 4, 5]);
    expect(EGG_STAGES.map(s => s.ru)).toEqual([
      "Идея", "Концепт", "Проект", "Тестовый образец", "Промышленный образец",
    ]);
    expect(EGG_STAGES.map(s => s.radius)).toEqual([16, 23, 30, 37, 45]);
    expect(new Set(EGG_STAGES.map(s => s.color)).size).toBe(5);
  });

  it("can repeat iterations without advancing the maturity level", () => {
    const first = NEW_EGG_MATURITY;
    const next = nextEggIteration(nextEggIteration(first));
    expect(next).toEqual({ stage: 1, iteration: 3 });
    expect(first).toEqual({ stage: 1, iteration: 1 });
  });

  it("changes maturity only by explicit selection and restarts its local iteration count", () => {
    const prepared = nextEggIteration(NEW_EGG_MATURITY);
    expect(setEggStage(prepared, 1)).toBe(prepared);
    expect(setEggStage(prepared, 2)).toEqual({ stage: 2, iteration: 1 });
    expect(setEggStage({stage: 3, iteration: 7}, 2)).toEqual({ stage: 2, iteration: 1 });
  });

  it("caps the displayed count rather than overflowing user-visible states", () => {
    expect(nextEggIteration({ stage: 5, iteration: 999 })).toEqual({ stage: 5, iteration: 999 });
  });
});

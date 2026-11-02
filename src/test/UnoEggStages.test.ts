import { describe, expect, it } from "vitest";
import {
  EGG_POLES, EGG_STAGES, NEW_EGG_MATURITY, eggStageState,
  nextEggIteration, setEggStage,
} from "../lib/unocalcEggStages";

describe("Egg rainbow axis: Idea → 5 stages → Matter", () => {
  it("has two permanent poles and five separate formation stages", () => {
    expect(EGG_POLES.idea.ru).toBe("Идея");
    expect(EGG_POLES.matter.ru).toBe("Материя");
    expect(EGG_STAGES).toHaveLength(5);
    expect(EGG_STAGES.map(s => s.index)).toEqual([1, 2, 3, 4, 5]);
    expect(EGG_STAGES.map(s => s.ru)).toEqual([
      "Замысел", "Концепт", "Проект", "Тестовый образец", "Промышленный образец",
    ]);
    expect(EGG_STAGES.map(s => s.radius)).toEqual([16, 23, 30, 37, 45]);
    expect(new Set([EGG_POLES.idea.color, ...EGG_STAGES.map(s => s.color), EGG_POLES.matter.color]).size).toBe(7);
  });

  it("distinguishes earlier, current and future nested shells", () => {
    const maturity = { stage: 3 as const, iteration: 4 };
    expect(EGG_STAGES.map(stage => eggStageState(maturity, stage.index))).toEqual([
      "completed", "completed", "current", "future", "future",
    ]);
    expect(eggStageState(NEW_EGG_MATURITY, 1)).toBe("current");
    expect(eggStageState(NEW_EGG_MATURITY, 2)).toBe("future");
  });

  it("does not advance stages when iterating inside the same stage", () => {
    const first = NEW_EGG_MATURITY;
    const third = nextEggIteration(nextEggIteration(first));
    expect(third).toEqual({ stage: 1, iteration: 3 });
    expect(first).toEqual({ stage: 1, iteration: 1 });
  });

  it("only changes stage when explicitly selected and resets that stage's iteration", () => {
    const prepared = nextEggIteration(NEW_EGG_MATURITY);
    expect(setEggStage(prepared, 1)).toBe(prepared);
    expect(setEggStage(prepared, 2)).toEqual({ stage: 2, iteration: 1 });
    expect(setEggStage({stage: 4, iteration: 7}, 2)).toEqual({ stage: 2, iteration: 1 });
  });

  it("caps iterations without overflowing the displayed state", () => {
    expect(nextEggIteration({ stage: 5, iteration: 999 })).toEqual({ stage: 5, iteration: 999 });
  });
});

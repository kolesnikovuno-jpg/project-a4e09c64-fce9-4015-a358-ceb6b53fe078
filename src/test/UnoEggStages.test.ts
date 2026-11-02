// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  EGG_POLES, EGG_STAGES, EGG_STAGE_KEY, NEW_EGG_MATURITY,
  eggStageState, nextEggIteration, restoreEggMaturity, setEggStage,
} from "../lib/unocalcEggStages";

afterEach(() => window.localStorage.clear());

describe("Egg rainbow axis: five levels numbered from Matter toward Idea", () => {
  it("has permanent poles and descending 5→1 stage numbers from Idea to Matter", () => {
    expect(EGG_POLES.idea.ru).toBe("Идея");
    expect(EGG_POLES.matter.ru).toBe("Материя");
    expect(EGG_STAGES).toHaveLength(5);
    expect(EGG_STAGES.map(s => s.index)).toEqual([5, 4, 3, 2, 1]);
    expect(EGG_STAGES.map(s => s.ru)).toEqual([
      "Замысел", "Концепт", "Проект", "Тестовый образец", "Промышленный образец",
    ]);
    expect(new Set([EGG_POLES.idea.color, ...EGG_STAGES.map(s => s.color), EGG_POLES.matter.color]).size).toBe(7);
  });

  it("starts at blue level five; previously traversed higher levels are completed", () => {
    expect(NEW_EGG_MATURITY).toEqual({ stage: 5, iteration: 1 });
    expect(EGG_STAGES.map(level => eggStageState(NEW_EGG_MATURITY, level.index))).toEqual([
      "current", "future", "future", "future", "future",
    ]);
    const project = { stage: 3 as const, iteration: 4 };
    expect(EGG_STAGES.map(level => eggStageState(project, level.index))).toEqual([
      "completed", "completed", "current", "future", "future",
    ]);
  });

  it("repeats iterations without changing stage and changes stage only on selection", () => {
    const start = NEW_EGG_MATURITY;
    const third = nextEggIteration(nextEggIteration(start));
    expect(third).toEqual({ stage: 5, iteration: 3 });
    expect(setEggStage(third, 5)).toBe(third);
    expect(setEggStage(third, 4)).toEqual({ stage: 4, iteration: 1 });
    expect(setEggStage({ stage: 2, iteration: 8 }, 3)).toEqual({ stage: 3, iteration: 1 });
    expect(nextEggIteration({ stage: 1, iteration: 999 })).toEqual({ stage: 1, iteration: 999 });
  });

  it("migrates the prior top-down position without losing the iteration", () => {
    window.localStorage.setItem("unocalc.egg.maturity.v1", JSON.stringify({ stage: 2, iteration: 7 }));
    expect(restoreEggMaturity()).toEqual({ stage: 4, iteration: 7 });
    window.localStorage.setItem(EGG_STAGE_KEY, JSON.stringify({ stage: 3, iteration: 9 }));
    expect(restoreEggMaturity()).toEqual({ stage: 3, iteration: 9 });
  });

  it("falls back to the blue starting level for missing or malformed saved data", () => {
    expect(restoreEggMaturity()).toEqual(NEW_EGG_MATURITY);
    window.localStorage.setItem(EGG_STAGE_KEY, JSON.stringify({ stage: 0, iteration: 1 }));
    expect(restoreEggMaturity()).toEqual(NEW_EGG_MATURITY);
  });
});

// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  EGG_POLES, EGG_STAGES, EGG_STAGE_KEY, NEW_EGG_MATURITY,
  eggStageState, nextEggIteration, restoreEggMaturity, setEggStage,
} from "../lib/unocalcEggStages";

afterEach(() => window.localStorage.clear());

describe("Egg axis: bottom-up numbering and start at orange stage 1", () => {
  it("displays violet Idea and red Matter poles around five spectrum stages", () => {
    expect(EGG_POLES.idea.ru).toBe("Идея");
    expect(EGG_POLES.matter.ru).toBe("Материя");
    expect(EGG_STAGES).toHaveLength(5);
    // Rendering order: top -> bottom; stage numbering: bottom -> top.
    expect(EGG_STAGES.map(s => s.index)).toEqual([5, 4, 3, 2, 1]);
    expect(EGG_STAGES.map(s => s.ru)).toEqual([
      "Промышленный образец", "Тестовый образец", "Проект", "Концепт", "Замысел",
    ]);
    const fromBottom = EGG_STAGES.slice().reverse();
    expect(fromBottom.map(s => s.index)).toEqual([1, 2, 3, 4, 5]);
    expect(fromBottom.map(s => s.color)).toEqual([
      "#E79438", "#DFC44F", "#35AF79", "#20AAC9", "#5369CE",
    ]);
    expect(new Set([EGG_POLES.idea.color, ...EGG_STAGES.map(s => s.color), EGG_POLES.matter.color]).size).toBe(7);
  });

  it("starts with orange level 1 active, all later levels future", () => {
    expect(NEW_EGG_MATURITY).toEqual({ stage: 1, iteration: 1 });
    expect(EGG_STAGES.map(level => eggStageState(NEW_EGG_MATURITY, level.index))).toEqual([
      "future", "future", "future", "future", "current",
    ]);
    const progress = { stage: 3 as const, iteration: 4 };
    expect(EGG_STAGES.map(level => eggStageState(progress, level.index))).toEqual([
      "future", "future", "current", "completed", "completed",
    ]);
  });

  it("increments iterations within stage, not stage itself", () => {
    const start = NEW_EGG_MATURITY;
    const third = nextEggIteration(nextEggIteration(start));
    expect(third).toEqual({ stage: 1, iteration: 3 });
    expect(setEggStage(third, 1)).toBe(third);
    expect(setEggStage(third, 2)).toEqual({ stage: 2, iteration: 1 });
    expect(setEggStage({ stage: 3, iteration: 8 }, 4)).toEqual({ stage: 4, iteration: 1 });
    expect(nextEggIteration({ stage: 5, iteration: 999 })).toEqual({ stage: 5, iteration: 999 });
  });

  it("ignores outdated stage keys but keeps valid v3 stage selection", () => {
    window.localStorage.setItem("unocalc.egg.maturity.v1", JSON.stringify({ stage: 5, iteration: 8 }));
    window.localStorage.setItem("unocalc.egg.maturity.v2", JSON.stringify({ stage: 5, iteration: 4 }));
    expect(restoreEggMaturity()).toEqual(NEW_EGG_MATURITY);
    window.localStorage.setItem(EGG_STAGE_KEY, JSON.stringify({ stage: 3, iteration: 9 }));
    expect(restoreEggMaturity()).toEqual({ stage: 3, iteration: 9 });
  });

  it("defaults to orange level for missing or corrupted stage data", () => {
    expect(restoreEggMaturity()).toEqual(NEW_EGG_MATURITY);
    window.localStorage.setItem(EGG_STAGE_KEY, JSON.stringify({ stage: 0, iteration: 1 }));
    expect(restoreEggMaturity()).toEqual(NEW_EGG_MATURITY);
  });
});

import { describe, expect, it } from "vitest";
import { eggFormationStageNodes, eggPoleNodes } from "../lib/unocalcEgg3d";

describe("Egg formation stages on the visible vertical axis", () => {
  it("places exactly five equidistant markers between fixed polar endpoints", () => {
    const orientation = { yaw: 0, tilt: 0 };
    const poles = eggPoleNodes(orientation);
    const stages = eggFormationStageNodes(orientation);
    expect(stages.map((s) => s.index)).toEqual([1, 2, 3, 4, 5]);
    stages.forEach((stage, n) => {
      const ratio = (n + 1) / 6;
      expect(stage.x).toBeCloseTo(poles[0].x + (poles[1].x - poles[0].x) * ratio);
      expect(stage.y).toBeCloseTo(poles[0].y + (poles[1].y - poles[0].y) * ratio);
    });
    expect(stages[2].y).toBeCloseTo((poles[0].y + poles[1].y) / 2);
    expect(stages[0].y).toBeLessThan(stages[1].y);
    expect(stages[4].y).toBeLessThan(poles[1].y);
  });

  it("keeps the five markers between the poles after the egg tilts or rotates", () => {
    const orientation = { yaw: 0.8, tilt: 0.54 };
    const [idea, matter] = eggPoleNodes(orientation);
    for (const stage of eggFormationStageNodes(orientation)) {
      const t = stage.index / 6;
      expect(stage.x).toBeCloseTo(idea.x + (matter.x - idea.x) * t);
      expect(stage.y).toBeCloseTo(idea.y + (matter.y - idea.y) * t);
      expect(stage.depth).toBeCloseTo(idea.depth + (matter.depth - idea.depth) * t);
    }
  });
});

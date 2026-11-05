import { describe, expect, it } from "vitest";
import {
  EGG_EDGES, EGG_SPHERES, canRoute, createEggProject, decideFinding,
  nextIteration, readCore, readSphereStates, returnFinding,
  routeQuestion, setLevel, startSphereWork,
} from "../lib/eggEngine";

const AT = "2026-11-02T20:00:00+02:00";
const create = () => createEggProject({
  id: "self-test-egg", seed: "  Independent product formation engine  ", at: AT,
});

describe("Headless Egg engine v0.1", () => {
  it("keeps eight distinct competences, eight directed links and an original Author seed", () => {
    expect(Object.keys(EGG_SPHERES)).toHaveLength(8);
    expect(EGG_EDGES).toHaveLength(8);
    const project = create();
    expect(project.seed.text).toBe("Independent product formation engine");
    expect(project.seed.source).toBe("author");
    expect(project.level).toBe(1);
    expect(project.iteration).toBe(1);
    expect(project.events).toHaveLength(1);
    expect(readCore(project).accepted).toHaveLength(0);
    expect(readSphereStates(project)).toHaveLength(8);
  });

  it("routes only over existing links unless the Author intervenes directly", () => {
    expect(canRoute("idea", "marketing", "ai")).toBe(true);
    expect(canRoute("idea", "legal", "ai")).toBe(true);
    expect(canRoute("design", "marketing", "ai")).toBe(false);
    expect(canRoute("design", "testDrive", "ai")).toBe(true);
    expect(canRoute("production", "procurement", "ai")).toBe(true);
    expect(canRoute("commerce", "retail", "ai")).toBe(false);
    expect(canRoute("idea", "design", "ai")).toBe(false);
    expect(canRoute("marketing", "legal", "ai")).toBe(false);
    expect(canRoute("author", "retail", "ai")).toBe(false);
    expect(canRoute("author", "retail", "author")).toBe(true);

    expect(() => routeQuestion(create(), {
      actor: "ai", from: "author", to: "retail",
      question: "How is it distributed?", at: AT,
    })).toThrow(/Unpermitted/);
  });

  it("separates question, work, result and Author approval", () => {
    const first = create();
    const routed = routeQuestion(first, {
      actor: "ai", from: "idea", to: "marketing",
      question: "Who might need the product?", at: AT,
    });
    expect(routed.tasks).toHaveLength(1);
    expect(first.tasks).toHaveLength(0);
    const taskId = routed.tasks[0].id;
    expect(readSphereStates(routed).find((s) => s.sphere === "marketing")?.questionCount).toBe(1);
    expect(() => returnFinding(routed, {
      taskId, actor: "ai", text: "Audience hypothesis", evidence: "hypothesis", at: AT,
    })).toThrow(/in progress/);
    const started = startSphereWork(routed, { taskId, actor: "ai", at: AT });
    const returned = returnFinding(started, {
      taskId, actor: "ai", at: AT,
      text: "Might suit niche designers", evidence: "hypothesis",
      sourceRefs: ["author-dialogue"],
    });
    expect(returned.tasks[0].status).toBe("returned");
    expect(returned.tasks[0].findings[0].evidence).toBe("hypothesis");
    expect(returned.tasks[0].findings[0].sourceRefs).toEqual(["author-dialogue"]);
    expect(readCore(returned).accepted).toEqual([]);
    expect(() => decideFinding(returned, {
      taskId, actor: "ai", outcome: "accept", reason: "Looks good", at: AT,
    })).toThrow(/Only the Author/);

    const accepted = decideFinding(returned, {
      taskId, actor: "author", outcome: "accept", reason: "Use as working hypothesis", at: AT,
    });
    expect(accepted.tasks[0].status).toBe("accepted");
    expect(readCore(accepted).accepted).toHaveLength(1);
    expect(readCore(accepted).accepted[0].finding.evidence).toBe("hypothesis");
    expect(readCore(accepted).originalSeed).toBe(first.seed.text);
    expect(new Set(accepted.events.map((event) => event.id)).size).toBe(accepted.events.length);
    expect(new Set([
      ...accepted.events.map((event) => event.id),
      ...accepted.tasks.map((task) => task.id),
      ...accepted.tasks.flatMap((task) => task.findings.map((finding) => finding.id)),
      ...accepted.tasks.flatMap((task) => task.decisions.map((decision) => decision.id)),
    ]).size).toBe(accepted.events.length + 3);
  });

  it("preserves rejected/revised findings in history without presenting them as Core decisions", () => {
    let state = routeQuestion(create(), {
      from: "author", actor: "author", to: "legal",
      question: "Which author rights require checking?", at: AT,
    });
    const taskId = state.tasks[0].id;
    state = startSphereWork(state, { taskId, actor: "ai", at: AT });
    state = returnFinding(state, {
      taskId, actor: "ai", evidence: "question", text: "Needs jurisdiction check", at: AT,
    });
    state = decideFinding(state, {
      taskId, actor: "author", outcome: "revise", reason: "Need more precise scope", at: AT,
    });
    expect(state.tasks[0].status).toBe("revision_requested");
    expect(readCore(state).accepted).toHaveLength(0);
    state = startSphereWork(state, { taskId, actor: "ai", at: AT });
    state = returnFinding(state, {
      taskId, actor: "ai", evidence: "observation",
      text: "Rights question documented, no legal opinion issued", at: AT,
    });
    state = decideFinding(state, {
      taskId, actor: "author", outcome: "accept", reason: "Keep the unresolved limitation visible", at: AT,
    });
    expect(state.tasks[0].findings).toHaveLength(2);
    expect(state.tasks[0].decisions).toHaveLength(2);
    expect(readCore(state).accepted).toHaveLength(1);
    expect(readCore(state).accepted[0].finding.text).toContain("no legal opinion");
    expect(state.seed.text).toBe("Independent product formation engine");
  });

  it("only Author controls upward maturity, iteration and backwards revision", () => {
    const start = create();
    expect(() => setLevel(start, {
      actor: "ai", level: 2, at: AT, reason: "AI thinks it is ready",
    })).toThrow(/Only the Author/);
    expect(() => setLevel(start, {
      actor: "author", level: 4, at: AT, reason: "Skip",
    })).toThrow(/Cannot skip/);
    const level2 = setLevel(start, { actor: "author", level: 2, reason: "Concept approved for further work", at: AT });
    expect(level2.level).toBe(2);
    const next = nextIteration(level2, { actor: "author", at: AT, reason: "Re-evaluate design" });
    expect(next.level).toBe(2);
    expect(next.iteration).toBe(2);
    const back = setLevel(next, { actor: "author", level: 1, at: AT, reason: "Revisit original constraints" });
    expect(back.level).toBe(1);
    expect(back.iteration).toBe(1);
    expect(back.events.map((event) => event.kind)).toEqual([
      "seed_recorded", "level_changed", "iteration_started", "level_changed",
    ]);
    expect(back.seed.text).toBe(start.seed.text);
    expect(start.level).toBe(1);
  });

  it("can record work across all eight spheres without fabricating results or costs", () => {
    let state = create();
    for (const sphere of Object.keys(EGG_SPHERES) as Array<keyof typeof EGG_SPHERES>) {
      state = routeQuestion(state, {
        from: "author", actor: "author", to: sphere, at: AT,
        question: EGG_SPHERES[sphere].question,
      });
    }
    expect(state.tasks).toHaveLength(8);
    expect(state.tasks.every((task) => task.status === "question")).toBe(true);
    expect(readCore(state).accepted).toHaveLength(0);
    expect(state.events).toHaveLength(9);
    expect(readSphereStates(state).every((sphere) => sphere.questionCount === 1)).toBe(true);
  });
});

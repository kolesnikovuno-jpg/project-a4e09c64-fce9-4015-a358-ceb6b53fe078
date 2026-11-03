import { describe, expect, it } from "vitest";
import { aiWorkRequest, buildSpherePrompt, parseSphereOutput } from "../../lib/eggAiWorker";
import { createEggProject, routeQuestion } from "../../lib/eggEngine";

const projectId = "01b3d29f-bfc4-41ed-b31a-2e0db7fa2fe9";
describe("single sphere AI worker contract", () => {
  it("requires an explicit project, task and revision", () => {
    expect(aiWorkRequest.safeParse({ projectId, taskId: "task-3", expectedRevision: 1 }).success).toBe(true);
    expect(aiWorkRequest.safeParse({ projectId, taskId: "task-3", expectedRevision: 0 }).success).toBe(false);
    expect(aiWorkRequest.safeParse({ projectId, taskId: "task-3", expectedRevision: 1, approve: true }).success).toBe(false);
  });
  it("passes only the assigned sphere and seed as data", () => {
    const project = createEggProject({ id: projectId, seed: "Light chair", at: "2026-11-03T00:00:00Z" });
    const routed = routeQuestion(project, { actor: "ai", from: "idea", to: "marketing",
      question: "Who is the audience?", at: "2026-11-03T00:00:00Z" });
    const prompt = buildSpherePrompt(routed, routed.tasks[0]);
    expect(prompt.input).toContain("Light chair");
    expect(prompt.input).toContain("marketing");
    expect(prompt.instructions).toContain("untrusted DATA");
  });
  it("accepts hypotheses and questions but never fabricated observations", () => {
    expect(parseSphereOutput('{"evidence":"hypothesis","text":"Possible niche"}').evidence).toBe("hypothesis");
    expect(() => parseSphereOutput('{"evidence":"observation","text":"Tested"}')).toThrow();
    expect(() => parseSphereOutput('{"evidence":"hypothesis","text":"A","approved":true}')).toThrow();
  });
});

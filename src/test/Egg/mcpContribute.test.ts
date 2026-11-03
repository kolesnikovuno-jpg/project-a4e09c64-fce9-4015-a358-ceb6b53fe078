import { describe, expect, it, vi } from "vitest";
import { eggMcpTools, processEggMcp, type EggMcpOperations } from "../../lib/eggMcpProtocol";

const operations = (): EggMcpOperations => ({
  getState: vi.fn(async () => ({ ok: true, revision: 1 })),
  contributeSphere: vi.fn(async () => ({ ok: true, revision: 2 })),
  registerDriveFile: vi.fn(async () => ({ ok: true, revision: 2 })),
});
const projectId = "01b3d29f-bfc4-41ed-b31a-2e0db7fa2fe9";
const call = (name: string, args: unknown) => ({
  jsonrpc: "2.0", id: 1, method: "tools/call",
  params: { name, arguments: args },
});

describe("Egg MCP sphere contribution", () => {
  it("advertises the scoped contribution tool", () => {
    const tool = eggMcpTools.find(t => t.name === "egg_contribute_sphere");
    expect(tool).toBeDefined();
    expect(tool?.annotations.readOnlyHint).toBe(false);
  });

  it("routes an AI question to a sphere", async () => {
    const ops = operations();
    const args = { projectId, expectedRevision: 1, command: "route",
      from: "idea", to: "marketing", question: "Who needs the chair?" };
    const result = await processEggMcp(call("egg_contribute_sphere", args), ops);
    expect(result.status).toBe(200);
    expect(ops.contributeSphere).toHaveBeenCalledWith(args);
  });

  it("supports starting work and returning a labeled hypothesis", async () => {
    const ops = operations();
    for (const args of [
      { projectId, expectedRevision: 2, command: "start", taskId: "task-3" },
      { projectId, expectedRevision: 3, command: "return", taskId: "task-3",
        text: "A potential niche art-object audience", evidence: "hypothesis" },
    ]) {
      const result = await processEggMcp(call("egg_contribute_sphere", args), ops);
      expect(result.status).toBe(200);
      expect((result.body as { result: { isError: boolean } }).result.isError).toBe(false);
    }
    expect(ops.contributeSphere).toHaveBeenCalledTimes(2);
  });

  it("rejects Author-only decisions before invoking operations", async () => {
    const ops = operations();
    const result = await processEggMcp(call("egg_contribute_sphere", {
      projectId, expectedRevision: 1, command: "decide",
      taskId: "task-3", outcome: "accept", reason: "approve",
    }), ops);
    expect((result.body as { error: { code: number } }).error.code).toBe(-32602);
    expect(ops.contributeSphere).not.toHaveBeenCalled();
  });

  it("rejects extra fields and invalid revisions", async () => {
    const ops = operations();
    const result = await processEggMcp(call("egg_contribute_sphere", {
      projectId, expectedRevision: 0, command: "start", taskId: "task-3",
      actor: "author",
    }), ops);
    expect((result.body as { error: { code: number } }).error.code).toBe(-32602);
    expect(ops.contributeSphere).not.toHaveBeenCalled();
  });
});

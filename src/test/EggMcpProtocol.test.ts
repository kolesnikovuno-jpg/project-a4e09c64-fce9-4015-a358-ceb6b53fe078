import { describe, expect, it, vi } from "vitest";
import { eggMcpTools, processEggMcp } from "../lib/eggMcpProtocol";
const id = "04f246c5-e73a-4c66-9b99-36dfcb7074a0";
const fileId = "1X4SaJX6d_Uh9y7S2H3lHIM4Gie4alYcY";
const operationId = "save-sketch-v1";
const obj = (method: string, params: unknown, reqId: number | string = 1) =>
  ({ jsonrpc: "2.0", id: reqId, method, params });
const operations = () => ({
  getState: vi.fn(async (projectId: string) => ({ ok: true, projectId, revision: 6 })),
  proposeConcept: vi.fn(async (args: unknown) => ({ok:true,approved:false,text:(args as {text:string}).text})),
  registerDriveFile: vi.fn(async (args: unknown) => ({
    ok: true, revision: 7,
    artifact: { status: "reported", fileId: (args as { fileId: string }).fileId },
  })),
});

describe("MCP protocol and external AI handoff", () => {
  it("initializes a stateless tool server", async () => {
    const result = await processEggMcp(obj("initialize", {
      protocolVersion: "2025-06-18",
      clientInfo: { name: "test-client", version: "1.0" },
      capabilities: {},
    }), operations());
    expect(result.status).toBe(200);
    expect((result.body as any).result.serverInfo.name).toBe("egg-engine");
    expect((result.body as any).result.capabilities.tools).toBeTruthy();
    expect((result.body as any).result.instructions).toContain("Google Drive");
    expect((await processEggMcp({
      jsonrpc: "2.0", method: "notifications/initialized",
    }, operations())).status).toBe(202);
  });

  it("discloses scoped research and proposal tools, never approval tools", async () => {
    const result = await processEggMcp(obj("tools/list", {}), operations());
    expect(result.status).toBe(200);
    const tools = (result.body as any).result.tools;
    expect(tools.map((tool: any) => tool.name)).toEqual([
      "egg_get_onboarding_protocol", "egg_get_project_state", "egg_contribute_sphere", "egg_propose_seed",
      "egg_propose_concept", "egg_register_field_item", "egg_register_drive_file",
    ]);
    expect(tools.some((tool: any) => /confirm|approve|delete/i.test(tool.name))).toBe(false);
    expect(eggMcpTools.find(tool=>tool.name==="egg_propose_concept")?.annotations.readOnlyHint).toBe(false);
    expect(eggMcpTools.find(tool=>tool.name==="egg_register_drive_file")?.annotations.idempotentHint).toBe(true);
    expect(eggMcpTools[0].annotations.readOnlyHint).toBe(true);
  });

  it("gives the user's AI a first-contact checklist but makes no claim about private cloud access", async()=>{
    const ops=operations();
    const result=await processEggMcp(obj("tools/call",{
      name:"egg_get_onboarding_protocol",arguments:{},
    }),ops as any);
    expect(result.status).toBe(200);
    const protocol=JSON.parse((result.body as any).result.content[0].text);
    expect(protocol.ok).toBe(true);
    expect(protocol.schema).toBe("egg.ai-onboarding/0.1");
    expect(protocol.storageChecked).toBe(false);
    expect(protocol.status).toBe("pending_ai_side_verification");
    expect(protocol.storage.connectedTo).toBe("user_ai_client");
    expect(protocol.storage.notConnectedTo).toBe("egg_engine");
    expect(protocol.reporting.defaultStorageState).toBe("unknown");
    expect(protocol.firstContact.map((step:any)=>step.id)).toContain("check_cloud_storage");
    expect(protocol.product.spheres).toHaveLength(8);
    expect(ops.getState).not.toHaveBeenCalled();
    const invalid=await processEggMcp(obj("tools/call",{
      name:"egg_get_onboarding_protocol",arguments:{projectId:id}
    }),ops as any);
    expect((invalid.body as any).error.code).toBe(-32602);
  });

  it("records AI concept drafts without approving them or inventing files", async()=>{
    const ops=operations();
    const result=await processEggMcp(obj("tools/call",{
      name:"egg_propose_concept",arguments:{projectId:id,expectedRevision:6,
        text:"Форма как пространственная оболочка",
        questions:[{sphere:"production",question:"Как построить каркас?"}]
      },
    }),ops as any);
    expect(ops.proposeConcept).toHaveBeenCalledOnce();
    const value=JSON.parse((result.body as any).result.content[0].text);
    expect(value.approved).toBe(false);
    const invalid=await processEggMcp(obj("tools/call",{
      name:"egg_propose_concept",arguments:{projectId:id,expectedRevision:6,
        text:"Концепция",actor:"author"}
    }),ops as any);
    expect((invalid.body as any).error.code).toBe(-32602);
  });

  it("validates read arguments before touching project state", async () => {
    const ops = operations();
    const ok = await processEggMcp(obj("tools/call", {
      name: "egg_get_project_state", arguments: { projectId: id },
    }), ops);
    expect(ops.getState).toHaveBeenCalledWith(id);
    expect(JSON.parse((ok.body as any).result.content[0].text)).toEqual({
      ok: true, projectId: id, revision: 6,
    });
    const bad = await processEggMcp(obj("tools/call", {
      name: "egg_get_project_state", arguments: { projectId: id, actor: "author" },
    }), ops);
    expect((bad.body as any).error.code).toBe(-32602);
    expect(ops.getState).toHaveBeenCalledTimes(1);
  });

  it("registers returned Drive IDs without assuming upload or Author confirmation", async () => {
    const ops = operations();
    const response = await processEggMcp(obj("tools/call", {
      name: "egg_register_drive_file", arguments: {
        projectId: id, expectedRevision: 6, operationId,
        fileId, title: "Design sketches", mimeType: "application/pdf",
        collectionKey: "design/sketches", sphere: "design",
      },
    }), ops);
    expect(ops.registerDriveFile).toHaveBeenCalledOnce();
    const returned = JSON.parse((response.body as any).result.content[0].text);
    expect(returned.artifact.status).toBe("reported");
    expect(returned.artifact.fileId).toBe(fileId);
    expect((response.body as any).result.isError).toBe(false);
  });

  it("rejects invented file IDs and wrong schema without calling backend", async () => {
    const ops = operations();
    const bad = await processEggMcp(obj("tools/call", {
      name: "egg_register_drive_file", arguments: {
        projectId: id, expectedRevision: 6, operationId,
        fileId: "fake", title: "Sketch", mimeType: "image/png",
        collectionKey: "design",
      },
    }), ops);
    expect((bad.body as any).error.code).toBe(-32602);
    expect(ops.registerDriveFile).not.toHaveBeenCalled();
    const injected = await processEggMcp(obj("tools/call", {
      name: "egg_register_drive_file", arguments: {
        projectId: id, expectedRevision: 6, operationId, fileId, title: "Sketch",
        mimeType: "image/png", collectionKey: "design", actor: "author",
      },
    }), ops);
    expect((injected.body as any).error.code).toBe(-32602);
    expect(ops.registerDriveFile).not.toHaveBeenCalled();
  });

  it("returns bounded error codes to tool callers, not private diagnostics", async () => {
    const ops = operations();
    ops.registerDriveFile.mockRejectedValueOnce({
      code: "revision_conflict", message: "contains secret private project text",
    });
    const result = await processEggMcp(obj("tools/call", {
      name: "egg_register_drive_file", arguments: {
        projectId: id, expectedRevision: 6, operationId, fileId,
        title: "Sketch", mimeType: "image/png", collectionKey: "design",
      },
    }), ops);
    expect((result.body as any).result.isError).toBe(true);
    expect(JSON.parse((result.body as any).result.content[0].text).error).toBe("revision_conflict");
    expect(JSON.stringify(result.body)).not.toContain("secret private project text");
  });

  it("handles unknown methods and malformed messages deterministically", async () => {
    expect((await processEggMcp(obj("evil/delete", {}), operations())).body)
      .toMatchObject({ error: { code: -32601 } });
    expect((await processEggMcp({ jsonrpc: "2.0", method: "tools/list" }, operations())).status)
      .toBe(400);
    expect((await processEggMcp(["batch-not-supported"], operations())).status)
      .toBe(400);
  });
});

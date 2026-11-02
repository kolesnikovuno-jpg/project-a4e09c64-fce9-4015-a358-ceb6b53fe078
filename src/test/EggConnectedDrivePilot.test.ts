/**
 * Optional connected-Drive E2E handoff test.
 *
 * Inputs come from a *real Google Drive connector readback* provided in the
 * sandbox command environment, never checked into the repository.
 * This runs the actual MCP protocol and Egg transition code with in-memory
 * persistence: it DOES NOT claim the hosted Supabase/MCP endpoint is live.
 */
import { describe, expect, it } from "vitest";
import { createEggProject } from "../lib/eggEngine";
import { confirmDriveReference, exportEggManifest, validDriveWebUrl } from "../lib/eggArtifacts";
import { runEggMutation, readEggState } from "../lib/eggCommands";
import { processEggMcp } from "../lib/eggMcpProtocol";

const realId = process.env.EGG_PILOT_DRIVE_FILE_ID;
const realUrl = process.env.EGG_PILOT_DRIVE_URL;
const enabled = Boolean(realId && realUrl && validDriveWebUrl(realUrl, realId!));

const pilot = enabled ? it : it.skip;
describe("Connected Drive → MCP → Egg → portable manifest pilot", () => {
  pilot("registers actual returned Google metadata and resists lost-response retries", async () => {
    const id = "fdd1c6f2-f48a-4e4c-96ac-d43b9ad7d2ed";
    const ownerId = "test-owner";
    const agent = { kind: "agent" as const, projectId: id, ownerId,
      scopes: ["read" as const, "contribute" as const] };
    let project = createEggProject({
      id, seed: "Test transfer of a real Google Drive document to Egg",
      at: "2026-11-03T00:00:00.000Z",
    });
    let revision = 1;
    const ops = {
      getState: async (projectId: string) => {
        if (projectId !== id) throw { code: "forbidden" };
        return { ok: true, revision, project: readEggState(project) };
      },
      registerDriveFile: async (params: {
        projectId: string; expectedRevision: number; operationId: string;
        fileId: string; title: string; mimeType: string; collectionKey: string;
        sphere?: "design"; webUrl?: string;
      }) => {
        if (params.projectId !== id) throw { code: "forbidden" };
        const identity = project.artifacts?.find(item => item.operationId === params.operationId);
        if (!identity && params.expectedRevision !== revision) throw { code: "revision_conflict" };
        const next = runEggMutation(project, {
          command: "register_file", provider: "google_drive", ...params,
        }, agent, ownerId, "2026-11-03T00:10:00.000Z");
        if (next !== project) { project = next; revision++; }
        return { ok: true, revision,
          artifact: project.artifacts?.find(item => item.operationId === params.operationId) };
      },
    };
    const invoke = (reqId: number, name: string, args: unknown) =>
      processEggMcp({
        jsonrpc: "2.0", id: reqId, method: "tools/call", params: { name, arguments: args },
      }, ops);

    const get = await invoke(1, "egg_get_project_state", { projectId: id });
    const initial = JSON.parse((get.body as any).result.content[0].text);
    expect(initial.revision).toBe(1);
    expect(initial.project.files).toEqual([]);

    const saved = {
      projectId: id,
      expectedRevision: 1,
      operationId: "pilot-drive-connector-20261103",
      fileId: realId!,
      webUrl: realUrl!,
      mimeType: "application/vnd.google-apps.document",
      title: "EGG test integration via connected Drive",
      collectionKey: "integration/drive",
      sphere: "design" as const,
    };
    const first = await invoke(2, "egg_register_drive_file", saved);
    const firstResult = JSON.parse((first.body as any).result.content[0].text);
    expect(firstResult.ok).toBe(true);
    expect(firstResult.artifact.fileId).toBe(realId);
    expect(firstResult.artifact.status).toBe("reported");
    expect(revision).toBe(2);

    // Simulate a lost response: same ID and old expectedRevision.
    const replay = await invoke(3, "egg_register_drive_file", saved);
    const replayResult = JSON.parse((replay.body as any).result.content[0].text);
    expect(replayResult.ok).toBe(true);
    expect(replayResult.revision).toBe(2);
    expect(project.artifacts).toHaveLength(1);
    expect(project.events).toHaveLength(2);

    const manifest = exportEggManifest(project, "2026-11-03T00:15:00.000Z");
    expect(manifest.filesEmbedded).toBe(false);
    expect(manifest.project.artifacts?.[0].fileId).toBe(realId);
    expect(manifest.project.artifacts?.[0].status).toBe("reported");

    const afterAuthor = confirmDriveReference(project, {
      actor: "author", artifactId: manifest.project.artifacts![0].id,
      at: "2026-11-03T00:20:00.000Z",
    });
    expect(afterAuthor.artifacts?.[0].status).toBe("author_confirmed");
    // The author confirmation is a simulated author action, not actually
    // submitted by the user. Persisted author confirmation is NOT claimed.
  });
});

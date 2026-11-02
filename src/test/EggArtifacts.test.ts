import { describe, expect, it } from "vitest";
import { createEggProject, routeQuestion } from "../lib/eggEngine";
import {
  confirmDriveReference, exportEggManifest, registerDriveReference, validDriveWebUrl,
} from "../lib/eggArtifacts";
import {
  eggMutationSchema, readEggState, runEggMutation,
} from "../lib/eggCommands";

const at = "2026-11-03T12:00:00.000Z";
const projectId = "a950cc68-ce9f-4e1e-a6d2-2f6e4c322dbf";
const ownerId = "verified-owner";
const fileId = "1X4SaJX6d_Uh9y7S2H3lHIM4Gie4alYcY";
const url = "https://drive.google.com/file/d/" + fileId + "/view";
const googleDocUrl = "https://docs.google.com/document/d/" + fileId + "/edit";
const create = () => createEggProject({ id: projectId, seed: "My original design", at });
const author = { kind: "author" as const, ownerId };
const agent = {
  kind: "agent" as const, projectId, ownerId,
  scopes: ["read" as const, "contribute" as const],
};

const fileInput = {
  actor: "ai" as const, at,
  title: "Sketches v1", fileId,
  mimeType: "application/pdf",
  webUrl: url, collectionKey: "design/sketches",
};

describe("Bring-your-own-Drive artifact registry", () => {
  it("registers an unverified link and preserves seed and event history", () => {
    const first = create();
    const second = registerDriveReference(first, fileInput);
    expect(first.artifacts).toEqual([]);
    expect(second.artifacts).toHaveLength(1);
    expect(second.artifacts?.[0]).toMatchObject({
      fileId, provider: "google_drive", status: "reported", version: 1,
      registeredBy: "ai", collectionKey: "design/sketches",
    });
    expect(second.events.at(-1)?.kind).toBe("artifact_registered");
    expect(second.seed).toEqual(first.seed);
    expect(second.level).toBe(1);
    expect(second.iteration).toBe(1);
  });

  it("separates registration versions from Google Drive document revisions", () => {
    let state = registerDriveReference(create(), fileInput);
    state = registerDriveReference(state, { ...fileInput, title: "Sketches v2", at });
    expect(state.artifacts?.map(a => a.version)).toEqual([1, 2]);
    expect(state.artifacts?.map(a => a.status)).toEqual(["reported", "reported"]);
    expect(state.artifacts?.map(a => a.fileId)).toEqual([fileId, fileId]);
  });

  it("links a reference only to an existing task in the same project", () => {
    expect(() => registerDriveReference(create(), {
      ...fileInput, taskId: "task-404",
    })).toThrow(/same project/);
    const state = routeQuestion(create(), {
      actor: "author", from: "author", to: "design",
      question: "Create three variants", at,
    });
    const next = registerDriveReference(state, {
      ...fileInput, taskId: state.tasks[0].id,
    });
    expect(next.artifacts?.[0].taskId).toBe(state.tasks[0].id);
    expect(next.artifacts?.[0].sphere).toBe("design");
  });

  it("rejects links that do not point to the same Google Drive file", () => {
    expect(validDriveWebUrl(url, fileId)).toBe(true);
    expect(validDriveWebUrl(googleDocUrl, fileId)).toBe(true);
    expect(validDriveWebUrl("https://drive.google.com/open?id=" + fileId, fileId)).toBe(true);
    const unsafe = [
      "https://evil.example/file/d/" + fileId,
      "https://drive.google.com.evil.example/file/d/" + fileId,
      "http://drive.google.com/file/d/" + fileId,
      "https://drive.google.com/file/d/another-file-id/view",
      "https://user:secret@drive.google.com/file/d/" + fileId,
    ];
    for (const link of unsafe) {
      expect(validDriveWebUrl(link, fileId)).toBe(false);
      expect(() => registerDriveReference(create(), {
        ...fileInput, webUrl: link,
      })).toThrow(/same Google Drive file/);
    }
    expect(() => registerDriveReference(create(), {
      ...fileInput, fileId: "https://drive.google.com/file/d/abc",
    })).toThrow(/Invalid Google Drive file ID/);
  });

  it("only Author can confirm; confirming does not assert Drive API verification", () => {
    const state = registerDriveReference(create(), fileInput);
    const artifactId = state.artifacts![0].id;
    expect(() => confirmDriveReference(state, {
      actor: "ai", artifactId, at,
    })).toThrow(/Only the Author/);
    const confirmed = confirmDriveReference(state, {
      actor: "author", artifactId, at,
    });
    expect(confirmed.artifacts?.[0]).toMatchObject({
      status: "author_confirmed", confirmedAt: at,
    });
    expect(confirmed.events.at(-1)?.kind).toBe("artifact_confirmed");
    expect(confirmDriveReference(confirmed, {
      actor: "author", artifactId, at,
    })).toBe(confirmed);
    expect(state.artifacts?.[0].status).toBe("reported");
  });

  it("strict external commands prevent AI from claiming Author identity", () => {
    const mutation = {
      command: "register_file" as const, projectId, expectedRevision: 1,
      provider: "google_drive" as const, fileId,
      title: "Concept plan", mimeType: "application/pdf",
      collectionKey: "design/sketches",
    };
    expect(eggMutationSchema.safeParse(mutation).success).toBe(true);
    expect(eggMutationSchema.safeParse({ ...mutation, actor: "author" }).success).toBe(false);
    const state = runEggMutation(create(), mutation, agent, ownerId, at);
    expect(readEggState(state).files).toHaveLength(1);
    expect(readEggState(state).files[0].status).toBe("reported");
    const confirm = {
      command: "confirm_file" as const, projectId, expectedRevision: 2,
      artifactId: state.artifacts![0].id,
    };
    expect(() => runEggMutation(state, confirm, agent, ownerId, at)).toThrow(/Forbidden/);
    const approved = runEggMutation(state, confirm, author, ownerId, at);
    expect(approved.artifacts?.[0].status).toBe("author_confirmed");
  });

  it("exports readable, provider-neutral JSON manifest with references, not file content", () => {
    const state = registerDriveReference(create(), fileInput);
    const result = exportEggManifest(state, at);
    expect(result.schema).toBe("egg.export/0.1");
    expect(result.content).toBe("project-state-and-external-file-references");
    expect(result.filesEmbedded).toBe(false);
    expect(result.project.artifacts?.[0].fileId).toBe(fileId);
    expect(result.project.seed.text).toBe("My original design");
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
    expect(JSON.stringify(result)).not.toContain("accessKey");
  });

  it("can read legacy v0.1 project snapshots with no artifacts field", () => {
    const original = create();
    const legacy = { ...original, artifacts: undefined };
    expect(readEggState(legacy).files).toEqual([]);
    expect(exportEggManifest(legacy, at).project.artifacts).toEqual([]);
  });
});

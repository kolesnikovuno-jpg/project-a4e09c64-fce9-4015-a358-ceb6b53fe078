// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { createEggProject } from "../lib/eggEngine";
import { registerDriveReference } from "../lib/eggArtifacts";
import {
  createLocalEggBundle, EGG_LOCAL_PROJECTS_KEY, loadLocalEggProject,
  parseGoogleDriveFileLink, saveLocalEggProject, startLocalEggProject,
} from "../lib/eggLocalPreview";

const seed = "Light linen chair for contemplative rest";
const at = "2026-11-03T08:00:00.000Z";
const fileId = "1X4SaJX6d_Uh9y7S2H3lHIM4Gie4alYcY";

beforeEach(() => localStorage.clear());

describe("Egg browser preview and external file links", () => {
  it("parses Drive files, Google Docs, Sheets and strips tracking parameters", () => {
    expect(parseGoogleDriveFileLink(
      "https://drive.google.com/file/d/" + fileId + "/view?usp=sharing#section",
    )).toEqual({
      fileId, webUrl: "https://drive.google.com/file/d/" + fileId + "/view",
      mimeType: "application/octet-stream",
    });
    expect(parseGoogleDriveFileLink(
      "https://docs.google.com/document/d/" + fileId + "/edit?tab=t.0",
    )).toEqual({
      fileId, webUrl: "https://docs.google.com/document/d/" + fileId + "/edit",
      mimeType: "application/vnd.google-apps.document",
    });
    expect(parseGoogleDriveFileLink(
      "https://docs.google.com/spreadsheets/d/" + fileId + "/edit",
    )?.mimeType).toBe("application/vnd.google-apps.spreadsheet");
    expect(parseGoogleDriveFileLink(
      "https://drive.google.com/open?id=" + fileId,
    )?.fileId).toBe(fileId);
  });

  it("rejects folders, lookalike domains and unsafe links", () => {
    const invalid = [
      "https://drive.google.com/drive/folders/" + fileId,
      "https://drive.google.com.evil.example/file/d/" + fileId + "/view",
      "http://drive.google.com/file/d/" + fileId + "/view",
      "javascript:alert(1)",
      "https://docs.google.com/document/d/short/edit",
      "https://example.org/file/d/" + fileId,
      "https://user:pwd@docs.google.com/document/d/" + fileId,
    ];
    for (const candidate of invalid) expect(parseGoogleDriveFileLink(candidate)).toBeNull();
  });

  it("persists local projects by seed and retains earlier project when starting new seed", () => {
    const a = startLocalEggProject(seed, at);
    expect(loadLocalEggProject(seed)?.id).toBe(a.id);
    const updated = registerDriveReference(a, {
      actor: "author", at, fileId, title: "Study",
      mimeType: "application/pdf", collectionKey: "design", sphere: "design",
    });
    expect(saveLocalEggProject(updated)).toBe(true);
    expect(loadLocalEggProject(seed)?.artifacts?.[0].sphere).toBe("design");
    const b = startLocalEggProject("Second concept", at);
    expect(b.id).not.toBe(a.id);
    expect(loadLocalEggProject("Second concept")?.id).toBe(b.id);
    expect(loadLocalEggProject(seed)?.id).toBe(a.id);
    expect(JSON.parse(localStorage.getItem(EGG_LOCAL_PROJECTS_KEY) || "[]")).toHaveLength(2);
  });

  it("exports real browser project context as readable JSON without file binaries", () => {
    let project = createEggProject({ id: "egg-preview", seed, at });
    project = registerDriveReference(project, {
      actor: "author", at, fileId, title: "Sketch one",
      mimeType: "application/pdf", collectionKey: "design",
    });
    const ideaCycle = { seed, phase: "seed", marketing: "", legal: "" };
    const preview = createLocalEggBundle({
      project, maturity: { stage: 2, iteration: 3 },
      ideaCycle, designLoop: { description: "Early seating concept" },
      brief: { purpose: "Rest" }, sketches: [{ id: "sketch-1", name: "Perspective" }],
      exportedAt: at,
    });
    expect(preview.schema).toBe("egg.browser-bundle/0.1");
    expect(preview.filesEmbedded).toBe(false);
    expect(preview.sketchBinariesEmbedded).toBe(false);
    expect(preview.engine.project.level).toBe(2);
    expect(preview.engine.project.iteration).toBe(3);
    expect(preview.engine.project.artifacts?.[0].fileId).toBe(fileId);
    expect(preview.preview.ideaCycle).toEqual(ideaCycle);
    expect(preview.preview.sketchIndex[0].name).toBe("Perspective");
    expect(JSON.stringify(preview)).not.toContain("accessKey");
  });
});

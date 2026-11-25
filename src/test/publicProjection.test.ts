import { describe, expect, it } from "vitest";
import { parseProjection } from "../lib/publicProjection";
const copy = { caption: "Lyra", detail: "3D", description: "Description", actionLabel: "Request" };
const base = { schemaVersion: 1, slug: "lyra", revision: 1, status: "published", stage: "object", interaction: "request", copy: { uk: copy, ru: copy, en: copy } };
describe("public EGG projection", () => {
  it("accepts a complete published snapshot", () => expect(parseProjection(base, "lyra")).not.toBeNull());
  it("rejects drafts and mismatched objects", () => {
    expect(parseProjection({...base, status: "draft"}, "lyra")).toBeNull();
    expect(parseProjection(base, "nava")).toBeNull();
  });
  it("does not enable ordering before object level", () => {
    expect(parseProjection({...base, stage: "prototype"}, "lyra")).toBeNull();
    expect(parseProjection({...base, stage: "prototype", interaction: "collaboration"}, "lyra")).not.toBeNull();
  });
  it("rejects private fields and incomplete translations", () => {
    expect(parseProjection({...base, privateNotes: "internal"}, "lyra")).toBeNull();
    expect(parseProjection({...base, copy: {en: copy}}, "lyra")).toBeNull();
  });
});

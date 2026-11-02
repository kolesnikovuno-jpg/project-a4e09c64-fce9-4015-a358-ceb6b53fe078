import { describe, expect, it } from "vitest";
import {
  canMarkDesignReady, canSendDesign, createDesignLoop, createDesignSketchPrompt,
  hasMarketingReturn, hasTestReturn, markDesignReady, returnDesignFeedback, sendDesign,
} from "../lib/unocalcEggDesignLoop";

describe("Egg Design ↔ Marketing ↔ Test Drive", () => {
  const base = () => createDesignLoop("A light chair for quiet rest", "Functional art object; verify audience");

  it("keeps seed and source layer distinct from later design descriptions", () => {
    const loop = base();
    const result = sendDesign({ ...loop, description: "Version 1 curved frame" }, "marketing", 1000);
    expect(result.seed).toBe(loop.seed);
    expect(result.layer).toBe(loop.layer);
    expect(result.submissions).toHaveLength(1);
    expect(result.submissions[0].description).toBe("Version 1 curved frame");
    expect(result.submissions[0].destination).toBe("marketing");
  });

  it("does not send blank designs or bypass the initial Marketing return", () => {
    const loop = base();
    expect(canSendDesign(loop, "marketing")).toBe(false);
    expect(canSendDesign({ ...loop, description: "Sketch A" }, "testDrive")).toBe(false);
    expect(sendDesign({ ...loop, description: "Sketch A" }, "testDrive", 1000).submissions).toHaveLength(0);
  });

  it("allows image-only design variants and snapshots attachments", () => {
    const loop = { ...base(), imageIds: ["a", "b"] };
    const sent = sendDesign(loop, "marketing", 1000);
    expect(sent.submissions[0].imageIds).toEqual(["a", "b"]);
    sent.imageIds.push("c");
    expect(sent.submissions[0].imageIds).toEqual(["a", "b"]);
  });

  it("holds Marketing and Test Drive reviews on separate immutable revisions", () => {
    let loop = sendDesign({ ...base(), description: "Version 1" }, "marketing", 1000);
    expect(returnDesignFeedback(loop, 1200)).toBe(loop);
    loop = returnDesignFeedback({ ...loop, marketingDraft: "Positioning still hypothetical" }, 1200);
    expect(loop.status).toBe("design");
    expect(hasMarketingReturn(loop)).toBe(true);
    expect(canSendDesign(loop, "testDrive")).toBe(true);
    loop = sendDesign({ ...loop, description: "Version 2", changeNote: "Seat angle adjusted" }, "testDrive", 2000);
    expect(loop.submissions).toHaveLength(2);
    expect(loop.submissions[0].description).toBe("Version 1");
    expect(loop.submissions[1].changeNote).toBe("Seat angle adjusted");
    expect(loop.feedback[0].submissionId).toBe("v1");
    expect(canMarkDesignReady(loop)).toBe(false);
    loop = returnDesignFeedback({ ...loop, testDraft: "Stability requires a physical prototype", testEvidence: "question" }, 2100);
    expect(hasTestReturn(loop)).toBe(true);
    expect(loop.feedback[1].submissionId).toBe("v2");
    expect(loop.feedback[1].evidence).toBe("question");
    expect(canMarkDesignReady(loop)).toBe(true);
    expect(markDesignReady(loop).status).toBe("ready");
  });

  it("does not allow unreviewed changes to be marked ready", () => {
    let loop = sendDesign({ ...base(), description: "Sketch" }, "marketing", 1000);
    loop = returnDesignFeedback({ ...loop, marketingDraft: "Test audience match" }, 1200);
    loop = sendDesign({ ...loop, description: "Sketch 2" }, "testDrive", 1300);
    loop = returnDesignFeedback({ ...loop, testDraft: "Question ergonomics" }, 1400);
    const changed = { ...loop, description: "Sketch 3" };
    expect(canMarkDesignReady(changed)).toBe(false);
    expect(markDesignReady(changed).status).toBe("design");
    expect(canSendDesign(changed, "marketing")).toBe(true);
  });

  it("creates a useful external sketch brief without asserting verified properties", () => {
    const prompt = createDesignSketchPrompt({ ...base(), description: "Unresolved shape" }, "ru");
    expect(prompt).toContain("три альтернативных");
    expect(prompt).toContain("A light chair for quiet rest");
    expect(prompt).toContain("Unresolved shape");
    expect(prompt).toContain("не проверенные чертежи");
  });
});

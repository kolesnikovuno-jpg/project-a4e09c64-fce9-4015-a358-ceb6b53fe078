import { describe, expect, it } from "vitest";
import { newIdeaCycle, returnIdeaReport } from "../components/unocalc/UnoEggIdeaCyclePanel";

describe("Egg first feedback cycle", () => {
  it("preserves the original seed while branching", () => {
    const cycle = newIdeaCycle("  A quiet, low-slung functional art chair  ");
    expect(cycle.seed).toBe("A quiet, low-slung functional art chair");
    expect(cycle.marketingReturned).toBe(false);
    expect(cycle.legalReturned).toBe(false);
  });

  it("does not fabricate a return when no report was entered", () => {
    const cycle = { ...newIdeaCycle("Seed"), phase: "research" as const };
    expect(returnIdeaReport(cycle, "marketing")).toBe(cycle);
  });

  it("waits for both independent returns before enabling synthesis", () => {
    const start = {
      ...newIdeaCycle("Seed"),
      phase: "research" as const,
      marketing: "Niche art-object positioning (hypothesis)",
      legal: "Check authorship and jurisdiction (question)",
    };
    const first = returnIdeaReport(start, "legal");
    expect(first.legalReturned).toBe(true);
    expect(first.marketingReturned).toBe(false);
    expect(first.phase).toBe("research");
    const second = returnIdeaReport(first, "marketing");
    expect(second.marketingReturned).toBe(true);
    expect(second.phase).toBe("synthesis");
    expect(second.seed).toBe("Seed");
    expect(second.marketing).toContain("hypothesis");
    expect(second.legal).toContain("question");
  });

  it("cannot change a report after the cycle has moved to synthesis", () => {
    const cycle = {
      ...newIdeaCycle("Seed"),
      phase: "synthesis" as const,
      marketing: "A", legal: "B",
      marketingReturned: true, legalReturned: true,
    };
    expect(returnIdeaReport(cycle, "marketing")).toBe(cycle);
  });
});

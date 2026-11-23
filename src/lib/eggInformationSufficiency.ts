/** Information sufficiency is relative to a specific next action, not an entire project's completeness. */
export type EggEvidenceKind = "verified" | "estimate" | "hypothesis" | "missing";
export type EggInformationItem = {
  id: string;
  sphereId: string;
  question: string;
  kind: EggEvidenceKind;
  value?: string;
  sourceRefs?: string[];
  /** The action this information enables or blocks. */
  requiredFor: string[];
  /** Missing data blocks only when the proposed action cannot safely proceed. */
  blocking?: boolean;
  verificationAction?: string;
};
export type EggInformationAssessment = {
  action: string;
  readiness: "ready" | "conditional" | "blocked";
  available: EggInformationItem[];
  assumptions: EggInformationItem[];
  gaps: EggInformationItem[];
  blockingGaps: EggInformationItem[];
  nextResearch: { sphereId: string; question: string; action: string }[];
};

/** Pure, provider-neutral diagnostic. Does not fetch sources, approve decisions or schedule actions. */
export function assessEggInformation(action: string, items: readonly EggInformationItem[]): EggInformationAssessment {
  if (!action.trim()) throw new Error("EGG action is required");
  const relevant = items.filter(item => item.requiredFor.includes(action));
  const available = relevant.filter(item => item.kind === "verified");
  const assumptions = relevant.filter(item => item.kind === "estimate" || item.kind === "hypothesis");
  const gaps = relevant.filter(item => item.kind === "missing");
  const blockingGaps = gaps.filter(item => item.blocking);
  const readiness = blockingGaps.length ? "blocked" : (gaps.length || assumptions.length ? "conditional" : "ready");
  return {
    action, readiness, available, assumptions, gaps, blockingGaps,
    nextResearch: gaps.concat(assumptions).filter(item => item.verificationAction).map(item => ({
      sphereId: item.sphereId, question: item.question, action: item.verificationAction!,
    })),
  };
}

/** Preserve unknowns and scenario branches instead of converting them to false certainty. */
export type EggScenario = { id: string; condition: string; ownerSphereId: string; nextAction: string; authorDecisionRequired: boolean };
export function selectEggScenario(scenarios: readonly EggScenario[], observedScenarioIds: readonly string[]): EggScenario[] {
  return scenarios.filter(scenario => observedScenarioIds.includes(scenario.id));
}

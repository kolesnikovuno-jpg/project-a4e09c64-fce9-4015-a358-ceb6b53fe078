/** Reproducible sphere packages. No AI calls or production mutations occur here. */
export type SpherePackage = {
  id: string;
  version: number;
  role: string;
  instructions: string;
  inputSchema: string;
  outputSchema: string;
  sequentialTarget?: string;
  yolkTarget: string;
  invariants: string[];
  examples: string[];
};
export type Evaluation = {
  passed: boolean;
  checks: Record<string, boolean>;
  qualityScore?: number;
  iterationCount?: number;
  tokensUsed?: number;
  notes?: string;
};
export type Candidate = {
  parent: Readonly<SpherePackage>;
  proposed: SpherePackage;
  evaluation?: Evaluation;
  approvedBy?: string;
};
export function validateSphere(s: SpherePackage): string[] {
  const errors: string[] = [];
  if (!s.id.trim()) errors.push("missing id");
  if (!s.role.trim()) errors.push("missing role");
  if (!s.instructions.trim()) errors.push("missing instructions");
  if (!s.inputSchema.trim() || !s.outputSchema.trim()) errors.push("missing schema");
  if (!s.yolkTarget.trim()) errors.push("missing yolk target");
  if (!Number.isSafeInteger(s.version) || s.version < 1) errors.push("invalid version");
  if (!s.invariants.length) errors.push("missing invariants");
  return errors;
}
export function cloneCandidate(parent: SpherePackage, patch: Partial<Omit<SpherePackage, "id" | "version">> = {}): Candidate {
  if (validateSphere(parent).length) throw new Error("Invalid parent sphere");
  const proposed: SpherePackage = {
    ...structuredClone(parent),
    ...structuredClone(patch),
    id: parent.id,
    version: parent.version + 1,
  };
  const errors = validateSphere(proposed);
  if (errors.length) throw new Error(errors.join("; "));
  return { parent: structuredClone(parent), proposed };
}
export function evaluateCandidate(candidate: Candidate, evaluation: Evaluation): Candidate {
  if (candidate.approvedBy) throw new Error("Already approved");
  if (!evaluation.checks || !Object.keys(evaluation.checks).length) throw new Error("No checks");
  const passed = evaluation.passed && Object.values(evaluation.checks).every(Boolean);
  return { ...candidate, evaluation: { ...evaluation, passed } };
}
export function approvePromotion(candidate: Candidate, approver: string): Candidate {
  if (!approver.trim()) throw new Error("Approval identity required");
  if (!candidate.evaluation?.passed) throw new Error("Candidate must pass evaluation");
  return { ...candidate, approvedBy: approver };
}
export function promote(candidate: Candidate): SpherePackage {
  if (!candidate.approvedBy || !candidate.evaluation?.passed) throw new Error("Unapproved candidate");
  return structuredClone(candidate.proposed);
}
export function rollback(candidate: Candidate): SpherePackage {
  return structuredClone(candidate.parent);
}
/** Compute one result; pass the same result to the next sphere and to yolk. */
export function dispatchSphereResult<T>(result: T): { sequential: T; radial: T } {
  return { sequential: result, radial: result };
}

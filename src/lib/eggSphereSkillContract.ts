/**
 * EGG Sphere Skill / Executor contract v0.1 (ADR-029).
 *
 * The skill belongs to the sphere, not to a human account or an AI provider.
 * This module models a proposed, provider-neutral execution boundary. It does
 * NOT itself grant permissions, load ChatGPT Skills, connect provider accounts,
 * schedule AI calls, or persist delegation. Servers must enforce authenticated
 * user identity, membership, RLS, budgets, and tool permissions separately.
 */
import type {SphereId} from "./eggEngine.js";
import {
  EGG_ENTRY_MANIFESTS,
  EGG_SPHERE_MANIFESTS,
  EGG_SPHERE_PROTOCOL_VERSION,
  type EggSphereManifest,
} from "./eggSphereProtocol.js";

export const EGG_SPHERE_SKILL_CONTRACT_VERSION = "0.1" as const;
export type EggSkillSphereId = SphereId | "idea" | "matter";
export type EggSkillMode = "human" | "symbiosis" | "auto";

export type EggSkillDescriptor = {
  skillId: string;
  skillVersion: string;
  sphereId: EggSkillSphereId;
  manifest: EggSphereManifest;
};

/** No model-specific skill is installed or shared by this resolver. */
export function getEggSphereSkill(sphereId: EggSkillSphereId): EggSkillDescriptor {
  const manifest = sphereId === "idea" || sphereId === "matter"
    ? EGG_ENTRY_MANIFESTS[sphereId]
    : EGG_SPHERE_MANIFESTS[sphereId];
  if (!manifest) throw new Error("Unknown EGG sphere skill");
  return {
    skillId: "egg.sphere." + sphereId,
    skillVersion: EGG_SPHERE_PROTOCOL_VERSION,
    sphereId,
    manifest,
  };
}

export type EggSphereAiPresence = {
  aiPercent: number;
  humanPercent: number;
  mode: EggSkillMode;
  aiCallsAllowed: boolean;
};

/** Percent expresses responsibility/initiative policy, not generated words. */
export function eggSphereAiPresence(aiPercent: number): EggSphereAiPresence {
  if (!Number.isInteger(aiPercent) || aiPercent < 0 || aiPercent > 100) {
    throw new RangeError("EGG AI participation must be an integer from 0 to 100");
  }
  return {
    aiPercent,
    humanPercent: 100 - aiPercent,
    mode: aiPercent === 0 ? "human" : aiPercent === 100 ? "auto" : "symbiosis",
    aiCallsAllowed: aiPercent !== 0,
  };
}

/** One invitation/delegation is scoped to ONE sphere in ONE project.
 * Multiple spheres require independently scoped assignments.
 */
export type EggSphereDelegation = {
  assignmentId: string;
  projectId: string;
  sphereId: EggSkillSphereId;
  assignedUserId: string;
  assignedByOwnerId: string;
  status: "invited" | "active" | "revoked";
};

/** This is a server-owned reference, never an API key or chat session token. */
export type EggSphereProviderRef = {
  connectionId: string;
  ownerUserId: string;
  active: boolean;
};

export type EggSphereExecutionRequest = {
  projectId: string;
  sphereId: EggSkillSphereId;
  /** Must come from the verified EGG auth session, not the request body. */
  actorUserId: string;
  /** Must come from the verified server-side project owner record. */
  projectOwnerId: string;
  delegation?: EggSphereDelegation | null;
  aiPercent: number;
  provider?: EggSphereProviderRef | null;
};

export type EggSphereExecutionBoundary = {
  projectId: string;
  sphereId: EggSkillSphereId;
  skillId: string;
  skillVersion: string;
  executorUserId: string;
  assignmentId: string | null;
  participation: EggSphereAiPresence;
  /** Internal provider reference; never include this in a model prompt. */
  providerConnectionId: string | null;
  contributionPolicy: "one-versioned-result";
  /** A result is forwarded without a second independent AI pass. */
  destinations: readonly ["fixed-next-sphere-or-endpoint", "yolk"];
  /** A run, including 100% AI, has no Author approval authority. */
  mayApproveDna: false;
  mayAdvanceLevel: false;
};

const nonempty = (value: string) => typeof value === "string" && Boolean(value.trim());

/** Pure policy check for server use AFTER authenticating the actor.
 * It does not replace RLS, invite-acceptance or AI-connection ownership checks
 * on the storage/API layer.
 */
export function resolveEggSphereExecution(input: EggSphereExecutionRequest): EggSphereExecutionBoundary {
  for (const value of [input.projectId, input.actorUserId, input.projectOwnerId]) {
    if (!nonempty(value)) throw new Error("EGG execution requires verified project and actor identifiers");
  }
  const skill = getEggSphereSkill(input.sphereId);
  const participation = eggSphereAiPresence(input.aiPercent);
  const assignment = input.delegation;
  if (assignment && (
    assignment.projectId !== input.projectId ||
    assignment.sphereId !== input.sphereId ||
    assignment.assignedByOwnerId !== input.projectOwnerId
  )) {
    throw new Error("EGG delegation does not match the project and sphere");
  }
  const isDelegated = assignment?.status === "active";
  const executorUserId = isDelegated ? assignment.assignedUserId : input.projectOwnerId;
  if (!nonempty(executorUserId) || input.actorUserId !== executorUserId) {
    throw new Error("This actor does not control the assigned EGG sphere");
  }

  if (participation.aiCallsAllowed) {
    if (!input.provider?.active || !nonempty(input.provider.connectionId) ||
        input.provider.ownerUserId !== executorUserId) {
      throw new Error("The sphere executor has no active, personal AI connection");
    }
  }
  return {
    projectId: input.projectId,
    sphereId: input.sphereId,
    skillId: skill.skillId,
    skillVersion: skill.skillVersion,
    executorUserId,
    assignmentId: isDelegated ? assignment.assignmentId : null,
    participation,
    providerConnectionId: participation.aiCallsAllowed ? input.provider!.connectionId : null,
    contributionPolicy: "one-versioned-result",
    destinations: ["fixed-next-sphere-or-endpoint", "yolk"],
    mayApproveDna: false,
    mayAdvanceLevel: false,
  };
}

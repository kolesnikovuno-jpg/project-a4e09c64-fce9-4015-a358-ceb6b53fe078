/**
 * Transport-agnostic contract for external AI commands. The caller NEVER
 * supplies actor: it comes from the verified session or scoped API key.
 *
 * This module does not provide authentication. See api/egg.ts.
 */
import { z } from "zod";
import {
  decideFinding, nextIteration, readCore, readSphereStates, returnFinding,
  routeQuestion, setLevel, startSphereWork,
  type EggProject, type EggActor,
} from "./eggEngine.js";

const identifier = z.string().min(1).max(100);
const valueText = z.string().trim().min(1).max(10000);
const source = z.enum(["idea", "author", "marketing", "legal", "design", "production",
  "testDrive", "procurement", "commerce", "retail"]);
const sphere = z.enum(["marketing", "legal", "design", "production", "testDrive",
  "procurement", "commerce", "retail"]);
const shared = z.object({
  projectId: z.string().uuid(),
  expectedRevision: z.number().int().positive(),
});
export const eggMutationSchema = z.discriminatedUnion("command", [
  shared.extend({
    command: z.literal("route"),
    from: source, to: sphere, question: valueText,
  }).strict(),
  shared.extend({
    command: z.literal("start"),
    taskId: identifier,
  }).strict(),
  shared.extend({
    command: z.literal("return"),
    taskId: identifier, text: valueText,
    evidence: z.enum(["observation", "hypothesis", "question"]),
    sourceRefs: z.array(z.string().min(1).max(600)).max(20).optional(),
  }).strict(),
  shared.extend({
    command: z.literal("decide"),
    taskId: identifier, outcome: z.enum(["accept", "revise", "reject"]),
    reason: valueText,
  }).strict(),
  shared.extend({
    command: z.literal("set_level"),
    level: z.union([
      z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5),
    ]), reason: valueText,
  }).strict(),
  shared.extend({
    command: z.literal("next_iteration"), reason: valueText,
  }).strict(),
]);
export type EggMutation = z.infer<typeof eggMutationSchema>;
export type EggPermission = { kind: "author"; ownerId: string } |
  { kind: "agent"; projectId: string; ownerId: string; scopes: Array<"read" | "contribute"> };

export const isAuthorCommand = (command: EggMutation["command"]) =>
  command === "decide" || command === "set_level" || command === "next_iteration";

export const mayAccessEgg = (
  identity: EggPermission, projectId: string, ownerId: string, action: "read" | "contribute" | "author",
): boolean => {
  if (identity.ownerId !== ownerId) return false;
  if (identity.kind === "author") return true;
  if (action === "author") return false;
  return identity.projectId === projectId && identity.scopes.includes(action);
};

export const runEggMutation = (
  state: EggProject, mutation: EggMutation, identity: EggPermission, projectOwnerId: string, at: string,
): EggProject => {
  const actor: EggActor = identity.kind === "author" ? "author" : "ai";
  if (mutation.projectId !== state.id ||
      !mayAccessEgg(identity, state.id, projectOwnerId,
        isAuthorCommand(mutation.command) ? "author" : "contribute")) {
    throw new Error("Forbidden");
  }
  switch (mutation.command) {
    case "route":
      return routeQuestion(state, {
        actor, from: mutation.from, to: mutation.to, question: mutation.question, at,
      });
    case "start":
      return startSphereWork(state, { taskId: mutation.taskId, actor, at });
    case "return":
      return returnFinding(state, {
        taskId: mutation.taskId, actor, at,
        text: mutation.text, evidence: mutation.evidence, sourceRefs: mutation.sourceRefs,
      });
    case "decide":
      return decideFinding(state, {
        taskId: mutation.taskId, actor, at,
        outcome: mutation.outcome, reason: mutation.reason,
      });
    case "set_level":
      return setLevel(state, {
        actor, level: mutation.level, at, reason: mutation.reason,
      });
    case "next_iteration":
      return nextIteration(state, { actor, at, reason: mutation.reason });
  }
};

export const readEggState = (state: EggProject) => ({
  core: readCore(state),
  spheres: readSphereStates(state),
  tasks: state.tasks,
  events: state.events,
});

export const eggCreateSchema = z.object({
  command: z.literal("create"),
  seed: valueText,
}).strict();

export const eggIssueKeySchema = z.object({
  command: z.literal("issue_key"),
  projectId: z.string().uuid(),
  label: z.string().trim().min(1).max(60),
  expiresInDays: z.number().int().min(1).max(30),
}).strict();

export const eggRevokeKeySchema = z.object({
  command: z.literal("revoke_key"),
  projectId: z.string().uuid(),
  keyId: z.string().uuid(),
}).strict();

export const eggCommandSchema = z.union([
  eggCreateSchema, eggIssueKeySchema, eggRevokeKeySchema, eggMutationSchema,
]);

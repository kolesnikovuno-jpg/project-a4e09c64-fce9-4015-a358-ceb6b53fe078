/**
 * Transport-agnostic contract for external AI commands. The caller NEVER
 * supplies actor: it comes from the verified session or scoped API key.
 *
 * This module does not provide authentication. See api/egg.ts.
 */
import { z } from "zod";
import { confirmDriveReference, registerDriveReference } from "./eggArtifacts.js";
import { startEggFlowCycle, contributeEggFlowSphere, decideEggFlowCycle, EGG_FLOW_ROUTES } from "./eggFlowCycle.js";
import {buildEggSphereBrief} from "./eggSphereIntelligence.js";
import {buildEggBalanceOverview,registerEggBalanceTension,decideEggBalanceTension} from "./eggDynamicBalance.js";
import {buildEggEvolutionOverview,recordEggEvolutionAssessment} from "./eggEvolution.js";
import {eggLegalSimilaritySchema,type EggLegalSimilarityDraft} from "./eggLegalSimilarity.js";
import {eggYolkReviewDraftSchema,contributeEggYolkReview,buildEggYolkReviewBrief,
  type EggYolkReviewDraft} from "./eggYolkSemantic.js";
import {
  decideFinding, nextIteration, readCore, readSphereStates, returnFinding, recordAuthorSeed, proposeEggSeed,
  routeQuestion, setLevel, startSphereWork,
  proposeEggConcept, decideEggConcept, routeConceptQuestion,
  type EggProject, type EggActor,
} from "./eggEngine.js";

const identifier = z.string().min(1).max(100);
const valueText = z.string().trim().min(1).max(10000);
const source = z.enum(["idea", "author", "marketing", "legal", "design", "production",
  "testDrive", "procurement", "commerce", "retail"]);
const sphere = z.enum(["marketing", "legal", "design", "production", "testDrive",
  "procurement", "commerce", "retail"]);
const diagnosticQuestions=z.array(z.object({
  domain:z.string().trim().min(1).max(90),
  question:z.string().trim().min(8).max(1000),
  basis:z.string().trim().max(1200).optional(),
  sourceRefs:z.array(z.string().trim().min(1).max(600)).max(8).optional(),
}).strict()).max(6);
const shared = z.object({
  projectId: z.string().uuid(),
  expectedRevision: z.number().int().positive(),
});
export const eggMutationSchema = z.discriminatedUnion("command", [
  shared.extend({ command: z.literal("set_seed"), seed: valueText }).strict(),
  shared.extend({ command: z.literal("propose_seed"), seed: valueText }).strict(),
  shared.extend({ command: z.literal("propose_concept"), text: valueText,
    visualUrl: z.string().url().max(1200).refine(u=>u.startsWith("https://")||u.startsWith("http://")).optional(),
    questions: z.array(z.object({sphere, question:z.string().trim().min(1).max(1000)}).strict()).max(8).optional(),
  }).strict(),
  shared.extend({ command: z.literal("decide_concept"), conceptId: identifier,
    outcome: z.enum(["accept","revise","reject"]), reason: valueText,
  }).strict(),
  shared.extend({ command: z.literal("route_concept_question"), conceptId: identifier,
    questionIndex: z.number().int().min(0).max(7),
  }).strict(),
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
  shared.extend({command:z.literal("start_flow_cycle"),brief:z.string().trim().max(3000).optional()}).strict(),
  shared.extend({command:z.literal("complete_flow_sphere"),
    sphere,text:valueText,evidence:z.enum(["observation","hypothesis","question"]),
    sourceRefs:z.array(z.string().min(1).max(600)).max(20).optional(),
    discoveredQuestions:diagnosticQuestions.optional(),
    legalSimilarity:eggLegalSimilaritySchema.optional(),
  }).strict(),
  shared.extend({command:z.literal("decide_flow_cycle"),
    outcome:z.enum(["accept","revise"]),reason:valueText,
    addressedSpheres:z.array(sphere).max(8).optional(),
  }).strict(),
  shared.extend({command:z.literal("record_balance_tension"),
    key:z.string().trim().min(3).max(160),
  }).strict(),
  shared.extend({command:z.literal("decide_balance_tension"),
    tensionId:identifier,
    outcome:z.enum(["track","resolve","dismiss","reopen"]),
    reason:z.string().trim().min(8).max(2000),
    severity:z.enum(["unassessed","low","medium","high"]).optional(),
    verificationRefs:z.array(identifier).max(8).optional(),
  }).strict(),
  shared.extend({command:z.literal("assess_evolution"),
    toCycleId:identifier,fromCycleId:identifier.nullable(),
    outcome:z.enum(["improved","compromise","no_change","inconclusive"]),
    dnaImpact:z.enum(["preserved_by_author","at_risk","not_assessed"]),
    reason:z.string().trim().min(12).max(2500),
    evidenceResultIds:z.array(identifier).max(8),
  }).strict(),
  shared.extend({command:z.literal("contribute_yolk_review"),
    synthesisId:identifier,
    summary:eggYolkReviewDraftSchema.shape.summary,
    interpretations:eggYolkReviewDraftSchema.shape.interpretations,
    limitations:eggYolkReviewDraftSchema.shape.limitations,
  }).strict(),
  shared.extend({
    command: z.literal("register_file"),
    provider: z.literal("google_drive"),
    operationId: z.string().regex(/^[A-Za-z0-9_-]{8,100}$/).optional(),
    fileId: z.string().regex(/^[a-zA-Z0-9_-]{10,256}$/),
    title: z.string().trim().min(1).max(250),
    mimeType: z.string().trim().min(1).max(140),
    collectionKey: z.string().trim().min(1).max(80),
    webUrl: z.string().url().max(1200).optional(),
    taskId: identifier.optional(),
    sphere: sphere.optional(),
  }).strict(),
  shared.extend({
    command: z.literal("confirm_file"),
    artifactId: identifier,
  }).strict(),
]);
export type EggMutation = z.infer<typeof eggMutationSchema>;
export type EggPermission = { kind: "author"; ownerId: string } |
  { kind: "agent"; projectId: string; ownerId: string; scopes: Array<"read" | "contribute"> };

export const isAuthorCommand = (command: EggMutation["command"]) =>
  command === "set_seed" || command === "decide" || command === "set_level" || command === "next_iteration" ||
  command === "confirm_file" || command === "decide_concept" || command === "route_concept_question" ||
  command === "start_flow_cycle" || command === "decide_flow_cycle" ||
  command === "decide_balance_tension" || command === "assess_evolution";

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
  if ((state.flowCycles??[]).length && ["route","start","return","decide"].includes(mutation.command))
    throw new Error("Legacy task mutations are disabled after fixed-flow cycles begin");
  const currentCycle=state.flowCycles?.[state.flowCycles.length-1];
  if (currentCycle&&["running","awaiting_author"].includes(currentCycle.status) &&
      ["propose_concept","decide_concept","route_concept_question"].includes(mutation.command))
    throw new Error("Concept DNA is locked during a running flow; the Author intervenes after Yolk synthesis");
  switch (mutation.command) {
    case "start_flow_cycle":
      return startEggFlowCycle(state,{actor,at,brief:mutation.brief});
    case "complete_flow_sphere":
      return contributeEggFlowSphere(state,{actor,at,
        sphere:mutation.sphere,text:mutation.text,evidence:mutation.evidence,
        sourceRefs:mutation.sourceRefs,
        discoveredQuestions:mutation.discoveredQuestions?.map(q=>({
          domain:q.domain!,question:q.question!,basis:q.basis,sourceRefs:q.sourceRefs,
        })),
        // Zod has already validated every required nested field at runtime.
        // NodeNext's non-strict optional inference widens them in the parsed type.
        legalSimilarity:mutation.legalSimilarity as EggLegalSimilarityDraft | undefined});
    case "decide_flow_cycle":
      return decideEggFlowCycle(state,{actor,at,outcome:mutation.outcome,
        reason:mutation.reason,addressedSpheres:mutation.addressedSpheres});
    case "record_balance_tension":
      return registerEggBalanceTension(state,{actor,at,key:mutation.key});
    case "decide_balance_tension":
      return decideEggBalanceTension(state,{actor,at,
        tensionId:mutation.tensionId,outcome:mutation.outcome,
        reason:mutation.reason,severity:mutation.severity,
        verificationRefs:mutation.verificationRefs});
    case "assess_evolution":
      return recordEggEvolutionAssessment(state,{
        actor,at,toCycleId:mutation.toCycleId,fromCycleId:mutation.fromCycleId,
        outcome:mutation.outcome,dnaImpact:mutation.dnaImpact,
        reason:mutation.reason,evidenceResultIds:mutation.evidenceResultIds,
      });
    case "contribute_yolk_review":
      return contributeEggYolkReview(state,{actor,at,draft:{
        synthesisId:mutation.synthesisId,summary:mutation.summary,
        interpretations:mutation.interpretations,
        limitations:mutation.limitations,
      } as EggYolkReviewDraft});
    case "propose_seed":
      return proposeEggSeed(state, mutation.seed, at);
    case "set_seed":
      return recordAuthorSeed(state, mutation.seed, at);
    case "propose_concept":
      return proposeEggConcept(state,{actor,text:mutation.text,visualUrl:mutation.visualUrl,questions:mutation.questions?.map(q=>({sphere:q.sphere!,question:q.question!})),at});
    case "decide_concept":
      return decideEggConcept(state,{actor,conceptId:mutation.conceptId,outcome:mutation.outcome,reason:mutation.reason,at});
    case "route_concept_question":
      return routeConceptQuestion(state,{actor,conceptId:mutation.conceptId,questionIndex:mutation.questionIndex,at});
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
    case "register_file":
      return registerDriveReference(state, {
        actor, at, operationId: mutation.operationId,
        fileId: mutation.fileId, title: mutation.title,
        mimeType: mutation.mimeType, collectionKey: mutation.collectionKey,
        webUrl: mutation.webUrl, taskId: mutation.taskId, sphere: mutation.sphere,
      });
    case "confirm_file":
      return confirmDriveReference(state, {
        actor, at, artifactId: mutation.artifactId,
      });
  }
};

export const readEggState = (state: EggProject) => ({
  core: readCore(state),
  title: state.title ?? state.seed.text,
  seedProposal: state.seedProposal ?? null,
  concepts: state.concepts ?? [],
  spheres: readSphereStates(state),
  tasks: state.tasks,
  files: state.artifacts ?? [],
  events: state.events,
  flowCycles: state.flowCycles??[],
  dynamicBalance:buildEggBalanceOverview(state),
  evolution:buildEggEvolutionOverview(state),
  flowModel: {levels:5,poles:["idea","matter"],branches:EGG_FLOW_ROUTES},
  yolkReviewCompatibility: {
    description:"After both branches reach Yolk, one assigned AI may submit a grounded semantic REVIEW DRAFT using egg_contribute_yolk_review. Only the Author decides the cycle; no autonomous run is performed.",
    awaiting:buildEggYolkReviewBrief(state),
  },
  flowCompatibility: {
    description: "Existing egg_contribute_sphere supports command=return for the next active flow visit using the taskId shown here. This is a versioned cycle result, not a legacy task approval.",
    awaiting: (state.flowCycles?.[state.flowCycles.length-1]?.status==="running"
      ? [ ...(state.flowCycles[state.flowCycles.length-1].first),
          ...(state.flowCycles[state.flowCycles.length-1].second)]
        .filter(v=>v.status==="awaiting_result")
        .map(v=>({sphere:v.sphere,command:"return" as const,
          taskId:"flow:"+state.flowCycles![state.flowCycles!.length-1].id+":"+v.sphere,
          brief:buildEggSphereBrief(state,v.sphere)}))
      : []),
  },
});

export const eggCreateSchema = z.object({
  command: z.literal("create"),
  title: z.string().trim().min(1).max(120).optional(),
  seed: valueText.optional(),
}).strict().refine(value => Boolean(value.title || value.seed));

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

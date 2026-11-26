import { EGG_SPHERES, type SphereId } from "./eggEngine.js";
import { EGG_SPHERE_MANIFESTS } from "./eggSphereProtocol.js";
import { EGG_FLOW_ROUTES } from "./eggFlowCycle.js";

/** Versioned replication adapter for the ACTUAL eight EGG runtime spheres.
 * Read-only by default: never modifies a live project or runs AI.
 */
export type SphereGenome = {
 id: SphereId;
 version: number;
 role: string;
 mission: string;
 objective: string;
 instructions: string;
 expectedContribution: string;
 hardBoundary: string;
 sequentialTarget: SphereId | "yolk";
 radialTarget: "yolk";
 parentVersion?: number;
};
export type SphereReplicationCandidate = {
 parent: SphereGenome;
 proposed: SphereGenome;
 checks?: Readonly<Record<string, boolean>>;
 approvedBy?: string;
};
export const EGG_SPHERE_IDS = Object.keys(EGG_SPHERES) as SphereId[];
export function getSphereGenome(id: SphereId): SphereGenome {
 const m = EGG_SPHERE_MANIFESTS[id];
 const branch = EGG_FLOW_ROUTES.first.includes(id as never) ? EGG_FLOW_ROUTES.first : EGG_FLOW_ROUTES.second;
 const position = branch.indexOf(id as never);
 return {
  id, version: 1, role: m.role, mission: m.mission, objective: m.objective,
  instructions: [m.mission,m.objective,m.hardBoundary].join("\n"),
  expectedContribution: m.expectedContribution, hardBoundary: m.hardBoundary,
  sequentialTarget: branch[position+1] ?? "yolk", radialTarget: "yolk",
 };
}
export const EGG_SPHERE_GENOMES: Readonly<Record<SphereId,SphereGenome>> =
 Object.fromEntries(EGG_SPHERE_IDS.map(id => [id, getSphereGenome(id)])) as Record<SphereId,SphereGenome>;

export function cloneSphereGenome(parent: SphereGenome, changes: Partial<Pick<SphereGenome,"instructions"|"objective"|"expectedContribution">>): SphereReplicationCandidate {
 if (!EGG_SPHERE_IDS.includes(parent.id)) throw Error("Unknown sphere");
 const proposed = {...parent,...changes,version:parent.version+1,parentVersion:parent.version};
 if (!proposed.instructions.trim() || !proposed.objective.trim() || !proposed.expectedContribution.trim()) throw Error("Incomplete candidate");
 return {parent:{...parent},proposed};
}
export function evaluateSphereCandidate(candidate: SphereReplicationCandidate, checks: Readonly<Record<string,boolean>>): SphereReplicationCandidate {
 if (!Object.keys(checks).length) throw Error("Checks required");
 return {...candidate,checks:{...checks}};
}
export function approveSphereCandidate(candidate: SphereReplicationCandidate, authorId: string): SphereReplicationCandidate {
 if (!authorId.trim() || !candidate.checks || !Object.keys(candidate.checks).length || !Object.values(candidate.checks).every(Boolean))
  throw Error("Author approval requires passing checks");
 return {...candidate,approvedBy:authorId};
}
export function replicateSphere(candidate: SphereReplicationCandidate): SphereGenome {
 if (!candidate.approvedBy || !candidate.checks || !Object.values(candidate.checks).every(Boolean)) throw Error("Unapproved sphere");
 return {...candidate.proposed};
}
export function rollbackSphere(candidate: SphereReplicationCandidate): SphereGenome { return {...candidate.parent}; }
/** Same contribution travels sequentially and radially; no duplicate AI call. */
export function distributeSphereContribution<T>(contribution:T):{sequential:T;radial:T} {
 return {sequential:contribution,radial:contribution};
}

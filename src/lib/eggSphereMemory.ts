/** Project-embedded, serializable replication memory. No AI calls or autonomous promotions. */
import type {EggProject,SphereId} from "./eggEngine.js";
import type {SphereGenome,SphereReplicationCandidate} from "./eggSphereReplication.js";
import {EGG_SPHERE_GENOMES,cloneSphereGenome,evaluateSphereCandidate,approveSphereCandidate,replicateSphere} from "./eggSphereReplication.js";
import {buildEggEvolutionOverview} from "./eggEvolution.js";
export type SphereObservation={
 cycleId:string;iteration:number;level:number;resultId:string|null;
 status:"new_result"|"text_changed"|"resubmitted_same_text"|"inherited"|"same_source"|"awaiting_result"|"pending_transit"|"no_result";
 authorOutcome:"improved"|"worsened"|"compromise"|"no_change"|"inconclusive"|null;
};
export type SphereMemoryEntry={
 sphere:SphereId; active:SphereGenome;
 history:Array<{genome:SphereGenome;at:string;approvedBy:string}>;
 observations:SphereObservation[];
 proposals:Array<{id:string;candidate:SphereReplicationCandidate;createdAt:string;reason:string}>;
};
export type SphereMemory={schema:"egg.sphere-memory/1";spheres:Partial<Record<SphereId,SphereMemoryEntry>>};
export type ProjectWithSphereMemory=EggProject & {sphereMemory?:SphereMemory};
const copy=<T>(value:T):T=>JSON.parse(JSON.stringify(value)) as T;
const getEntry=(project:ProjectWithSphereMemory,id:SphereId):SphereMemoryEntry=>
 project.sphereMemory?.spheres[id]??{sphere:id,active:copy(EGG_SPHERE_GENOMES[id]),history:[],observations:[],proposals:[]};
const put=(project:ProjectWithSphereMemory,entry:SphereMemoryEntry):ProjectWithSphereMemory=>({
 ...project,sphereMemory:{schema:"egg.sphere-memory/1",spheres:{...project.sphereMemory?.spheres,[entry.sphere]:entry}},
});
/** Rebuild source-linked diagnostics from existing immutable cycle history. No quality inferred from text changes. */
export function observeSphereIterations(project:ProjectWithSphereMemory,id:SphereId):ProjectWithSphereMemory {
 const entry=getEntry(project,id);
 const comparisons=buildEggEvolutionOverview(project).comparisons;
 const observations:SphereObservation[]=comparisons.map(c=>{
  const d=c.deltas.find(x=>x.sphere===id)!;
  const cycle=project.flowCycles?.find(x=>x.id===c.toCycleId);
  return {cycleId:c.toCycleId,iteration:cycle?.iteration??0,level:cycle?.level??0,
   resultId:d.after?.id??null,status:d.status,authorOutcome:c.assessment?.outcome??null};
 });
 return put(project,{...entry,observations});
}
export function proposeSphereImprovement(project:ProjectWithSphereMemory,id:SphereId,params:{
 id:string;at:string;reason:string;changes:Parameters<typeof cloneSphereGenome>[1];
}):ProjectWithSphereMemory {
 if(!params.id.trim()||!params.reason.trim()||!Number.isFinite(Date.parse(params.at)))throw Error("Proposal provenance required");
 const entry=getEntry(project,id);
 if(entry.proposals.some(p=>p.id===params.id))throw Error("Duplicate proposal");
 const candidate=cloneSphereGenome(entry.active,params.changes);
 return put(project,{...entry,proposals:[...entry.proposals,{id:params.id,candidate,createdAt:params.at,reason:params.reason}]});
}
export function assessSphereImprovement(project:ProjectWithSphereMemory,id:SphereId,proposalId:string,checks:Record<string,boolean>):ProjectWithSphereMemory {
 const entry=getEntry(project,id);
 if(!entry.proposals.some(p=>p.id===proposalId))throw Error("Proposal not found");
 return put(project,{...entry,proposals:entry.proposals.map(p=>p.id===proposalId?
  {...p,candidate:evaluateSphereCandidate(p.candidate,checks)}:p)});
}
export function approveSphereImprovement(project:ProjectWithSphereMemory,id:SphereId,proposalId:string,actor:"author",at:string):ProjectWithSphereMemory {
 if(actor!=="author"||!Number.isFinite(Date.parse(at)))throw Error("Author approval and timestamp required");
 const entry=getEntry(project,id);
 const proposal=entry.proposals.find(p=>p.id===proposalId);
 if(!proposal)throw Error("Proposal not found");
 if(proposal.candidate.parent.version!==entry.active.version)throw Error("Stale proposal");
 const approved=approveSphereCandidate(proposal.candidate,actor);
 const active=replicateSphere(approved);
 return put(project,{...entry,active,history:[...entry.history,{genome:entry.active,at,approvedBy:actor}],
  proposals:entry.proposals.filter(p=>p.id!==proposalId)});
}
export function rollbackSphereImprovement(project:ProjectWithSphereMemory,id:SphereId,actor:"author",at:string):ProjectWithSphereMemory {
 if(actor!=="author"||!Number.isFinite(Date.parse(at)))throw Error("Author rollback required");
 const entry=getEntry(project,id),previous=entry.history.at(-1);
 if(!previous)throw Error("No previous version");
 return put(project,{...entry,active:copy(previous.genome),history:entry.history.slice(0,-1),proposals:[]});
}
export function getSphereMemory(project:ProjectWithSphereMemory,id:SphereId):SphereMemoryEntry {return copy(getEntry(project,id));}

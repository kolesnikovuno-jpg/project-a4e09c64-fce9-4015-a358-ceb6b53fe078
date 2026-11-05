/**
 * EGG Change Map / iteration provenance. Dynamic Balance stage 2.
 *
 * This is a source-based TEXT AND RECORD comparison, not a quality/meaning
 * classifier. No automatic conclusions of improvement, deterioration or
 * preservation of Author DNA are made.
 *
 * A cycle can still be running. Missing outputs mean PENDING, not removed.
 * A transit uses its exact historical source, not a fresh achievement.
 */
import {
  EggEngineError,getActiveConcept,type EggActor,type EggProject,type SphereId,
} from "./eggEngine.js";
import {EGG_FIXED_ROUTE,type EggFlowCycle,type EggSphereVisit} from "./eggFlowCycle.js";
import {EGG_YOLK_SPHERE_NAMES} from "./eggYolkState.js";

export type EggEvolutionDeltaStatus=
  "awaiting_result"|"pending_transit"|"new_result"|"text_changed"|"resubmitted_same_text"|
  "inherited"|"same_source"|"no_result";
export type EggEvolutionSource={
  id:string;cycleId:string|null;recordType:"cycle_result"|"legacy_finding";
  sphere:SphereId;text:string;evidence:"observation"|"hypothesis"|"question";
};
export type EggEvolutionDelta={
  sphere:SphereId;label:string;status:EggEvolutionDeltaStatus;
  before:EggEvolutionSource|null;after:EggEvolutionSource|null;
  authorRequested:boolean;pendingVerification:boolean;
};
export type EggEvolutionAssessment={
  id:string;fromCycleId:string|null;toCycleId:string;
  createdAt:string;by:"author";
  outcome:"improved"|"compromise"|"no_change"|"inconclusive";
  dnaImpact:"preserved_by_author"|"at_risk"|"not_assessed";
  reason:string;
  evidenceResultIds:string[];
};
export type EggEvolutionComparison={
  fromCycleId:string|null;toCycleId:string;
  fromLabel:string;toLabel:string;
  toStatus:EggFlowCycle["status"];
  reason:string|null;requestedTargets:SphereId[];
  baselineKind:"legacy"|"previous_cycle";
  deltas:EggEvolutionDelta[];
  counts:{changedText:number;newSources:number;inherited:number;awaiting:number;pendingTransit:number};
  core:{
    originalSeed:string;approvedConceptId:string|null;
    workingConceptId:string|null;dnaMeaningAssessedAutomatically:false;
  };
  linkedTensions:Array<{
    id:string;title:string;status:string;
    source:"registered";events:Array<{at:string;action:string;reason:string}>;
  }>;
  assessment:EggEvolutionAssessment|null;
};
export type EggEvolutionOverview={
  hasCycles:boolean;current:EggEvolutionComparison|null;
  comparisons:EggEvolutionComparison[];
  baseline:{
    source:"author_seed_and_unapproved_historical_work";
    seed:string;approvedConceptId:string|null;workingConceptId:string|null;
    legacySources:EggEvolutionSource[];
    unresolvedQuestions:number;
  };
  disclaimer:"text_differences_are_not_product_improvements";
};
const normalize=(t:string)=>t.trim().replace(/\s+/g," ");
function legacySources(project:EggProject):EggEvolutionSource[]{
  const found=new Map<SphereId,EggEvolutionSource>();
  for(const task of project.tasks){
    for(const finding of task.findings){
      // Author-unapproved legacy findings stay historical, not certified.
      found.set(task.sphere,{
        id:finding.id,cycleId:null,recordType:"legacy_finding",
        sphere:task.sphere,text:finding.text,evidence:finding.evidence,
      });
    }
  }
  return [...found.values()];
}
function fromVisit(
  project:EggProject,cycle:EggFlowCycle,visit:EggSphereVisit,
):EggEvolutionSource|null{
  if(visit.result)return {
    id:visit.result.id,cycleId:cycle.id,recordType:"cycle_result",
    sphere:visit.sphere,text:visit.result.text,evidence:visit.result.evidence,
  };
  if(!visit.inherited)return null;
  // Find exact inherited result; never substitute latest sphere result.
  const original=(project.flowCycles??[]).find(c=>c.id===visit.inherited?.cycleId);
  const previous=original&&[...original.first,...original.second]
    .find(v=>v.sphere===visit.sphere&&v.result?.id===visit.inherited?.resultId);
  if(!previous?.result)return null;
  return {
    id:previous.result.id,cycleId:original!.id,recordType:"cycle_result",
    sphere:visit.sphere,text:previous.result.text,evidence:previous.result.evidence,
  };
}
const getVisit=(cycle:EggFlowCycle,sphere:SphereId)=>
  [...cycle.first,...cycle.second].find(v=>v.sphere===sphere);

function snapshot(project:EggProject,cycle:EggFlowCycle):Map<SphereId,EggEvolutionSource>{
  const sources=new Map<SphereId,EggEvolutionSource>();
  for(const v of [...cycle.first,...cycle.second]){
    const source=fromVisit(project,cycle,v);
    if(source)sources.set(v.sphere,source);
  }
  return sources;
}
function compareOne(
  project:EggProject,previous:EggFlowCycle|null,now:EggFlowCycle,
  baseline:EggEvolutionSource[],
):EggEvolutionComparison{
  const before=previous?snapshot(project,previous):
    new Map(baseline.map(s=>[s.sphere,s]));
  const after=snapshot(project,now);
  const requestedTargets=previous?.decision?.outcome==="revise"
    ?[...previous.decision.addressedSpheres]:[];
  const authorReason=previous?.decision?.outcome==="revise"
    ?previous.decision.reason:now.authorBrief||null;
  const deltas:EggEvolutionDelta[]=EGG_FIXED_ROUTE.map(sphere=>{
    const visit=getVisit(now,sphere);
    const prior=before.get(sphere)??null;
    const latest=after.get(sphere)??null;
    let status:EggEvolutionDeltaStatus;
    if(!latest){
      status=visit?.mode==="transit"&&visit?.status==="pending"
        ?"pending_transit":visit?.status==="pending"||visit?.status==="awaiting_result"
          ?"awaiting_result":"no_result";
    }else if(prior?.id===latest.id){
      status=visit?.status==="transited"?"inherited":"same_source";
    }else if(!prior){
      status="new_result";
    }else if(normalize(prior.text)===normalize(latest.text)){
      status="resubmitted_same_text";
    }else status="text_changed";
    return {
      sphere,label:EGG_YOLK_SPHERE_NAMES[sphere],status,
      before:prior,after:latest,
      authorRequested:requestedTargets.includes(sphere),
      pendingVerification:true,
    };
  });
  const active=getActiveConcept(project);
  const working=active??[...(project.concepts??[])].reverse()
    .find(c=>c.status==="proposed");
  const startTime=Date.parse(now.startedAt);
  // Only events in the actual chronological interval; history is never
  // rewritten to make a present closed tension appear resolved in the past.
  const endTime=now.decision?.at??now.synthesis?.at??null;
  const until=endTime?Date.parse(endTime):Infinity;
  const linkedTensions=(project.balanceTensions??[]).flatMap(t=>{
    const known=t.history.filter(e=>Date.parse(e.at)<=until);
    const last=known.at(-1);
    if(!last)return [];
    const active=["registered","tracked","reopened"].includes(last.action);
    const during=known.filter(e=>Date.parse(e.at)>=startTime);
    // Open tensions persist even without an event in this specific cycle.
    // Resolved and dismissed tensions appear only when their status changed here.
    if(!active&&!during.length)return [];
    return [{
      id:t.id,title:t.title,source:"registered" as const,
      status:last.action,
      events:during.map(e=>({at:e.at,action:e.action,reason:e.reason})),
    }];
  });
  const assessment=[...(project.evolutionAssessments??[])].reverse()
    .find(a=>a.toCycleId===now.id&&a.fromCycleId===(previous?.id??null))??null;
  return {
    fromCycleId:previous?.id??null,toCycleId:now.id,
    fromLabel:previous?"Итерация "+previous.iteration+" / уровень "+previous.level
      :"Исходные исторические выводы",
    toLabel:"Итерация "+now.iteration+" / уровень "+now.level,
    toStatus:now.status,
    reason:authorReason,requestedTargets,
    baselineKind:previous?"previous_cycle":"legacy",
    deltas,
    counts:{
      changedText:deltas.filter(d=>d.status==="text_changed").length,
      newSources:deltas.filter(d=>d.status==="new_result"||d.status==="resubmitted_same_text").length,
      inherited:deltas.filter(d=>d.status==="inherited"||d.status==="same_source").length,
      awaiting:deltas.filter(d=>d.status==="awaiting_result"||d.status==="no_result").length,
      pendingTransit:deltas.filter(d=>d.status==="pending_transit").length,
    },
    core:{
      originalSeed:project.seed.text,approvedConceptId:active?.id??null,
      workingConceptId:working?.id??null,dnaMeaningAssessedAutomatically:false,
    },
    linkedTensions,assessment,
  };
}
export function buildEggEvolutionOverview(project:EggProject):EggEvolutionOverview{
  const cycles=project.flowCycles??[];
  const legacy=legacySources(project);
  const approved=getActiveConcept(project);
  const working=approved??[...(project.concepts??[])].reverse()
    .find(c=>c.status==="proposed");
  const comparisons=cycles.map((cycle,i)=>
    compareOne(project,i?cycles[i-1]:null,cycle,legacy));
  return {
    hasCycles:!!cycles.length,current:comparisons.at(-1)??null,
    comparisons,
    baseline:{
      source:"author_seed_and_unapproved_historical_work",
      seed:project.seed.text,approvedConceptId:approved?.id??null,
      workingConceptId:working?.id??null,legacySources:legacy,
      unresolvedQuestions:project.tasks.flatMap(t=>t.findings)
        .filter(f=>f.evidence==="hypothesis"||f.evidence==="question").length,
    },
    disclaimer:"text_differences_are_not_product_improvements",
  };
}

/** Optional Author judgment. Must refer to this comparison and to actual
 * evidence in the current project. No automatic level/flow/DNA mutation.
 */
export function recordEggEvolutionAssessment(project:EggProject,input:{
  actor:EggActor;toCycleId:string;fromCycleId:string|null;
  outcome:EggEvolutionAssessment["outcome"];
  dnaImpact:EggEvolutionAssessment["dnaImpact"];
  reason:string;evidenceResultIds:string[];at:string;
}):EggProject{
  if(input.actor!=="author")throw new EggEngineError("Only Author may assess iteration changes");
  if(!Number.isFinite(Date.parse(input.at)))throw new EggEngineError("Invalid assessment date");
  const overview=buildEggEvolutionOverview(project);
  const comparison=overview.comparisons.find(c=>c.toCycleId===input.toCycleId&&
    c.fromCycleId===input.fromCycleId);
  if(!comparison)throw new EggEngineError("Comparison does not match project cycle history");
  if(comparison.toStatus==="running")
    throw new EggEngineError("Wait for Yolk synthesis before assessing a cycle");
  if((project.evolutionAssessments??[]).some(a=>a.toCycleId===input.toCycleId))
    throw new EggEngineError("Cycle already has an Author assessment");
  if(!["improved","compromise","no_change","inconclusive"].includes(input.outcome)||
    !["preserved_by_author","at_risk","not_assessed"].includes(input.dnaImpact))
    throw new EggEngineError("Invalid assessment classification");
  if(typeof input.reason!=="string"||input.reason.trim().length<12||input.reason.length>2500)
    throw new EggEngineError("Explain the assessment with at least 12 characters");
  const ids=input.evidenceResultIds;
  const real=new Set(comparison.deltas.flatMap(d=>[d.before?.id,d.after?.id]
    .filter((x):x is string=>!!x)));
  if(!Array.isArray(ids)||ids.length>8||new Set(ids).size!==ids.length||
    ids.some(id=>!real.has(id)))throw new EggEngineError("Assessment IDs must reference compared sources");
  // A declared improvement must cite at least one new output. Even then,
  // it remains explicitly the Author's judgment, not independent verification.
  if(input.outcome==="improved"&&!ids.some(id=>comparison.deltas.some(d=>
    d.after?.id===id&&["new_result","resubmitted_same_text","text_changed"].includes(d.status))))
    throw new EggEngineError("Improvement claim needs a new result linked to this comparison");
  const assessment:EggEvolutionAssessment={
    id:"evolution-"+project.nextSequence,
    fromCycleId:input.fromCycleId,toCycleId:input.toCycleId,by:"author",
    createdAt:input.at,outcome:input.outcome,dnaImpact:input.dnaImpact,
    reason:input.reason.trim(),evidenceResultIds:[...ids],
  };
  return {...project,
    evolutionAssessments:[...(project.evolutionAssessments??[]),assessment],
    nextSequence:project.nextSequence+1,
    events:[...project.events,{
      id:"event-"+project.nextSequence,kind:"evolution_assessed",
      actor:"author",at:input.at,
      detail:assessment.id+" / "+input.toCycleId+" / "+input.outcome,
    }],
  };
}

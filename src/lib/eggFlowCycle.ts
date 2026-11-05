/**
 * EGG Flow Engine v1 — immutable two-branch circulation through eight spheres.
 *
 * Both branches are visited in the SAME fixed order every iteration.
 * A pass is either worked or transparently transited. Transit is a real,
 * auditable visit and never creates invented findings. The Yolk assembles
 * data from BOTH finished branches and the fixed DNA. Only an Author's
 * whole-cycle decision moves to the next of five levels or starts a revision.
 *
 * This is a deterministic process/data synthesis. It is NOT an AI judgment
 * of real-world feasibility or a declaration that contradictions were solved.
 */
import {
  type EggProject,type EggActor,type EggEvidence,type EggEventKind,type SphereId,
  EggEngineError,getActiveConcept,
} from "./eggEngine.js";

export const EGG_FLOW_ROUTES={
  first:["marketing","design","testDrive","commerce"],
  second:["legal","production","procurement","retail"],
} as const satisfies Record<string,readonly SphereId[]>;
export type EggFlowBranch=keyof typeof EGG_FLOW_ROUTES;
export const EGG_FIVE_LEVELS=[1,2,3,4,5] as const;
export const EGG_POLES=["idea","matter"] as const;
export const EGG_FIXED_ROUTE=Object.values(EGG_FLOW_ROUTES).flat() as SphereId[];

export type EggFlowResult={
  id:string; text:string; evidence:EggEvidence; sourceRefs:string[];
  submittedBy:EggActor; at:string;
};
export type EggSphereVisit={
  sphere:SphereId; branch:EggFlowBranch; position:number;
  mode:"work"|"transit";
  status:"pending"|"awaiting_result"|"completed"|"transited";
  instruction?:string; completedAt?:string;
  result?:EggFlowResult;
  inherited?:{cycleId:string;resultId:string;status:"historical_unverified"};
  requiresRecheck?:boolean;
};
export type EggSynthesisItem={
  sphere:SphereId; branch:EggFlowBranch; sourceCycleId:string|null;
  resultId:string|null; evidence:EggEvidence|null;
  text:string|null; status:"new"|"inherited"|"missing";
  requiresRecheck:boolean;
};
export type EggYolkSynthesis={
  id:string; at:string;
  dna:{seed:string;conceptId:string|null;conceptText:string|null};
  first:EggSynthesisItem[];
  second:EggSynthesisItem[];
  endpoints:{commerce:EggSynthesisItem;retail:EggSynthesisItem};
  gaps:string[];
  status:"structural_not_expert_verified";
};
export type EggFlowCycle={
  id:string;level:number;iteration:number;startedAt:string;
  source:"idea"; authorBrief:string;
  status:"running"|"awaiting_author"|"accepted"|"revision_requested";
  first:EggSphereVisit[];second:EggSphereVisit[];
  synthesis?:EggYolkSynthesis;
  decision?:{outcome:"accept"|"revise";reason:string;at:string;addressedSpheres:SphereId[]};
};
export type EggFlowProject=EggProject & {flowCycles?:EggFlowCycle[]};

const needed=(value:string,label:string)=>{
  if(typeof value!=="string"||!value.trim())throw new EggEngineError(label+" is required");
  return value.trim();
};
const date=(at:string)=>{if(!Number.isFinite(Date.parse(at)))throw new EggEngineError("Invalid timestamp");return at};
const assertAuthor=(actor:EggActor)=>{if(actor!=="author")throw new EggEngineError("Only Author may decide a cycle")};
const event=(p:EggFlowProject,kind:EggEventKind,actor:EggActor,at:string,detail:string)=>{
  return {...p,nextSequence:p.nextSequence+1,events:[...p.events,{
    id:"event-"+p.nextSequence,kind,actor,at,detail,
  }]};
};
const current=(p:EggFlowProject):EggFlowCycle=>{
  const cycle=p.flowCycles?.[p.flowCycles.length-1];
  if(!cycle)throw new EggEngineError("No flow cycle exists");
  return cycle;
};
const replace=(p:EggFlowProject,cycle:EggFlowCycle):EggFlowProject=>({
  ...p,flowCycles:[...(p.flowCycles??[]).slice(0,-1),cycle],
});
const priorResult=(p:EggFlowProject,sphere:SphereId)=>{
  for(const cycle of [...(p.flowCycles??[])].reverse()){
    const pass=[...cycle.first,...cycle.second].find(v=>v.sphere===sphere&&v.result);
    if(pass?.result)return {cycleId:cycle.id,result:pass.result};
  }
  return null;
};
const uniqueSpheres=(values:SphereId[])=>{
  if(!Array.isArray(values)||new Set(values).size!==values.length||
     values.some(s=>!EGG_FIXED_ROUTE.includes(s)))throw new EggEngineError("Invalid sphere addresses");
  return values;
};
function makeCycle(p:EggFlowProject,at:string,authorBrief:string,active:SphereId[]):EggFlowCycle{
  const make=(branch:EggFlowBranch):EggSphereVisit[]=>
    EGG_FLOW_ROUTES[branch].map((sphere,position)=>({
      sphere,branch,position,mode:active.includes(sphere)?"work":"transit",
      status:"pending",...(active.includes(sphere)&&authorBrief?{instruction:authorBrief}:{}),
    }));
  return {
    id:"cycle-"+p.nextSequence,level:p.level,iteration:p.iteration,
    startedAt:at,source:"idea",authorBrief,
    status:"running",first:make("first"),second:make("second"),
  };
}
function toItem(p:EggFlowProject,cycle:EggFlowCycle,visit:EggSphereVisit):EggSynthesisItem{
  if(visit.result)return {
    sphere:visit.sphere,branch:visit.branch,sourceCycleId:cycle.id,
    resultId:visit.result.id,evidence:visit.result.evidence,text:visit.result.text,
    status:"new",requiresRecheck:false,
  };
  const old=priorResult({
    ...p,flowCycles:(p.flowCycles??[]).filter(c=>c.id!==cycle.id),
  },visit.sphere);
  return {
    sphere:visit.sphere,branch:visit.branch,
    sourceCycleId:old?.cycleId??null,resultId:old?.result.id??null,
    evidence:old?.result.evidence??null,text:old?.result.text??null,
    status:old?"inherited":"missing",requiresRecheck:!!visit.requiresRecheck,
  };
}
function synthesize(p:EggFlowProject,cycle:EggFlowCycle,at:string):EggYolkSynthesis{
  const active=getActiveConcept(p);
  const proposed=[...(p.concepts??[])].reverse().find(c=>c.status==="proposed");
  const concept=active??proposed;
  const first=cycle.first.map(v=>toItem(p,cycle,v));
  const second=cycle.second.map(v=>toItem(p,cycle,v));
  const gaps=[
    ...[...first,...second].filter(i=>i.status==="missing").map(i=>"Нет результатов: "+i.sphere),
    ...[...first,...second].filter(i=>i.requiresRecheck).map(i=>"Проверить актуальность: "+i.sphere),
  ];
  if(!active)gaps.push("Утверждённая концепция отсутствует; использовано исходное зерно и доступный черновик.");
  gaps.push("Согласование смысловых и экономических противоречий не подтверждено автоматическим синтезом.");
  return {
    id:"synthesis-"+p.nextSequence,at,
    dna:{seed:p.seed.text,conceptId:concept?.id??null,conceptText:concept?.text??null},
    first,second,
    endpoints:{commerce:first[3],retail:second[3]},
    gaps,status:"structural_not_expert_verified",
  };
}
/** Advance all consecutive non-relevant spheres. Both routes remain intact and
 * the transit event is recorded for every single passed sphere.
 */
function moveTransits(p:EggFlowProject,at:string):EggFlowProject{
  let result=p,cycle=current(result);
  for(const branch of ["first","second"] as EggFlowBranch[]){
    const visits=cycle[branch].map(v=>({...v}));
    let changed=false;
    let priorChanged=false;
    for(let i=0;i<visits.length;i++){
      const v=visits[i];
      if(v.status==="completed"){priorChanged=true;continue;}
      if(v.status==="transited"){if(v.requiresRecheck)priorChanged=true;continue;}
      if(v.mode==="work"){
        if(v.status==="pending"){visits[i]={...v,status:"awaiting_result"};changed=true;}
        break;
      }
      // Only transit reached after prior sphere has completed.
      const inherited=priorResult({...result,flowCycles:(result.flowCycles??[]).slice(0,-1)},v.sphere);
      visits[i]={
        ...v,status:"transited",completedAt:at,requiresRecheck:priorChanged&&Boolean(inherited),
        ...(inherited?{inherited:{cycleId:inherited.cycleId,resultId:inherited.result.id,
          status:"historical_unverified" as const}}:{}),
      };
      changed=true;
      result=replace(result,{...cycle,[branch]:visits});
      result=event(result,"sphere_transited","ai",at,cycle.id+" / "+v.sphere);
      cycle=current(result);
    }
    if(changed){result=replace(result,{...cycle,[branch]:visits});cycle=current(result);}
  }
  const done=[...cycle.first,...cycle.second].every(v=>v.status==="completed"||v.status==="transited");
  if(done && cycle.status==="running"){
    const synthesis=synthesize(result,cycle,at);
    result=replace(result,{...cycle,status:"awaiting_author",synthesis});
    result=event(result,"cycle_synthesized","ai",at,cycle.id);
  }
  return result;
}
/** Author initiates a first/full cycle on the current level. */
export function startEggFlowCycle(p:EggFlowProject,input:{
  actor:EggActor;at:string;brief?:string;
}):EggFlowProject{
  assertAuthor(input.actor);date(input.at);
  if(!p.seed.text.trim())throw new EggEngineError("Concept DNA / Author seed is required");
  if(!EGG_FIVE_LEVELS.includes(p.level as typeof EGG_FIVE_LEVELS[number]))
    throw new EggEngineError("Only five product levels are supported");
  if((p.flowCycles??[]).length && current(p).status!=="accepted")
    throw new EggEngineError("Current cycle needs Author decision");
  if((p.flowCycles??[]).length&&current(p).level===5&&current(p).status==="accepted")
    throw new EggEngineError("Final level already accepted");
  const at=input.at,brief=input.brief?.trim()??"";
  const cycle=makeCycle(p,at,brief,[...EGG_FIXED_ROUTE]);
  let next={...p,flowCycles:[...(p.flowCycles??[]),cycle]};
  next=event(next,"cycle_started","author",at,cycle.id+" / full");
  return moveTransits(next,at);
}
/** AI submits actual sphere output. Both branches move in their own order. */
export function contributeEggFlowSphere(p:EggFlowProject,input:{
  actor:EggActor;sphere:SphereId;text:string;evidence:EggEvidence;
  sourceRefs?:string[];at:string;
}):EggFlowProject{
  if(input.actor!=="ai")throw new EggEngineError("Sphere work belongs to AI/assigned sphere agents");
  const at=date(input.at),cycle=current(p);
  if(cycle.status!=="running")throw new EggEngineError("Cycle is not running");
  const branch=(Object.keys(EGG_FLOW_ROUTES) as EggFlowBranch[])
    .find(k=>(EGG_FLOW_ROUTES[k] as readonly SphereId[]).includes(input.sphere));
  if(!branch)throw new EggEngineError("Unknown sphere");
  const visits=cycle[branch];
  const index=visits.findIndex(v=>v.sphere===input.sphere);
  const visit=visits[index];
  if(visit.status!=="awaiting_result"||visit.mode!=="work")
    throw new EggEngineError("Sphere is not next active station in its fixed route");
  if(visits.slice(0,index).some(v=>v.status!=="completed"&&v.status!=="transited"))
    throw new EggEngineError("Prior sphere has not passed the flow");
  const text=needed(input.text,"Sphere finding");
  const refs=input.sourceRefs??[];
  if(!["observation","hypothesis","question"].includes(input.evidence)||
    !Array.isArray(refs)||refs.length>20||refs.some(r=>typeof r!=="string"||!r.trim()))
    throw new EggEngineError("Invalid evidence or sources");
  const result:EggFlowResult={
    id:"cycle-result-"+p.nextSequence,text,evidence:input.evidence,
    sourceRefs:refs,submittedBy:input.actor,at,
  };
  const changed=visits.map((v,i)=>i===index?{
    ...v,status:"completed" as const,completedAt:at,result,
  }:v);
  let next=replace(p,{...cycle,[branch]:changed});
  next=event(next,"cycle_sphere_completed","ai",at,cycle.id+" / "+input.sphere+" / "+result.id);
  return moveTransits(next,at);
}
/** Author receives one integrated state, never eight separate approval prompts. */
export function decideEggFlowCycle(p:EggFlowProject,input:{
  actor:EggActor;outcome:"accept"|"revise";reason:string;
  addressedSpheres?:SphereId[];at:string;
}):EggFlowProject{
  assertAuthor(input.actor);const at=date(input.at);
  const reason=needed(input.reason,"Author cycle decision");
  const cycle=current(p);
  if(cycle.status!=="awaiting_author"||!cycle.synthesis)
    throw new EggEngineError("Both complete flows and Yolk synthesis are required");
  const addressed=uniqueSpheres(input.addressedSpheres??[]);
  if(input.outcome==="accept"&&addressed.length)
    throw new EggEngineError("Accepted cycle cannot contain revision targets");
  if(input.outcome==="revise"&&!addressed.length)
    throw new EggEngineError("Address at least one sphere for revision");
  const updated={...cycle,status:input.outcome==="accept"?"accepted" as const:"revision_requested" as const,
    decision:{outcome:input.outcome,reason,at,addressedSpheres:addressed}};
  let next=replace(p,updated);
  next=event(next,"cycle_decided","author",at,cycle.id+" / "+input.outcome);
  if(input.outcome==="accept"){
    if(p.level<5){
      next={...next,level:(p.level+1) as typeof p.level,iteration:1};
      next=event(next,"level_changed","author",at,p.level+" → "+next.level+" / "+cycle.id);
    }
    return next;
  }
  if(!Number.isSafeInteger(p.iteration+1))
    throw new EggEngineError("Iteration exceeds safe range");
  next={...next,iteration:p.iteration+1};
  const revisionCycle=makeCycle(next,at,reason,addressed);
  next={...next,flowCycles:[...(next.flowCycles??[]),revisionCycle]};
  next=event(next,"cycle_started","author",at,revisionCycle.id+" / addressed: "+addressed.join(","));
  return moveTransits(next,at);
}

export const currentEggFlowCycle=(p:EggFlowProject)=>p.flowCycles?.[p.flowCycles.length-1]??null;

/**
 * EGG Dynamic Balance v1.
 *
 * Dynamic balance is an ANALYTICAL LAYER, not a sphere or new flow edge.
 * Two conservative text cues identify questions worth checking, not defects.
 * A source-linked semantic Yolk interpretation may also become a candidate.
 *
 * Persistent tension history can only be changed via versioned Egg mutation:
 * AI/Author may record a candidate, ONLY Author tracks/resolves/dismisses.
 * Core DNA, topology and maturity never change as a side effect.
 */
import {EggEngineError,getActiveConcept,type EggActor,type EggProject,type SphereId} from "./eggEngine.js";

export type EggBalanceSeverity="unassessed"|"low"|"medium"|"high";
export type EggBalanceStatus="proposed"|"tracked"|"resolved"|"dismissed";
export type EggBalanceAction="registered"|"tracked"|"resolved"|"dismissed"|"reopened";
export type EggBalanceEvent={
  at:string;actor:EggActor;action:EggBalanceAction;reason:string;
  verificationRefs:string[];
};
export type EggBalanceCandidate={
  key:string;
  title:string;
  hypothesis:string;
  relatedSpheres:SphereId[];
  sourceRefs:string[];
  verification:string;
  suggestedTargets:SphereId[];
  source:"source_cue"|"semantic_review";
  priority:"needs_evidence";
  coreStatus:"author_review_required";
};
export type EggBalanceTension=EggBalanceCandidate&{
  id:string;status:EggBalanceStatus;severity:EggBalanceSeverity;
  history:EggBalanceEvent[];createdAt:string;
};
export type EggBalanceOverview={
  core:{
    originalSeed:string;
    approvedConceptId:string|null;
    workingConceptId:string|null;
    workingConceptApproved:boolean;
    assessment:"not_automatically_verified";
  };
  candidates:EggBalanceCandidate[];
  recorded:EggBalanceTension[];
  counts:{potential:number;tracked:number;resolved:number;dismissed:number};
  /** No invented numeric harmony score; everything needs verifiable evidence. */
  equilibrium:"under_review"|"no_evidence_yet";
};

const validAt=(at:string)=>{if(!Number.isFinite(Date.parse(at)))throw new EggEngineError("Invalid balance timestamp");return at};
const requireReason=(s:string)=>{
  if(typeof s!=="string"||s.trim().length<8||s.length>2000)
    throw new EggEngineError("Explain the balance decision in 8–2000 characters");
  return s.trim();
};
const unique=<T,>(items:T[])=>[...new Set(items)];
const activeConcept=(p:EggProject)=>getActiveConcept(p)??[...(p.concepts??[])].reverse()
  .find(c=>c.status==="proposed");
/** Resolve only INTERNAL project references. External documents are not
 * evidence unless registered separately, and their links alone prove nothing.
 */
const availableRefs=(project:EggProject)=>new Set([
  "seed",
  ...(project.concepts??[]).map(c=>c.id),
  ...project.tasks.flatMap(task=>[task.id,...task.findings.map(f=>f.id)]),
  ...(project.flowCycles??[]).flatMap(cycle=>[
    cycle.id,
    ...(cycle.synthesis?[cycle.synthesis.id]:[]),
    ...[...cycle.first,...cycle.second].flatMap(v=>v.result?[v.result.id]:[]),
  ]),
  ...(project.artifacts??[]).map(file=>file.id),
]);
function assertRefs(p:EggProject,refs:string[]){
  const all=availableRefs(p);
  if(!Array.isArray(refs)||!refs.length||new Set(refs).size!==refs.length||
     refs.some(r=>!all.has(r)))throw new EggEngineError("Balance source references must exist in this project");
}

/** Conservative candidate extraction from the exact supplied product text.
 * For the real chair A: the proposed concept and Design finding are sources.
 * These are NEVER interpreted as actual manufacturing or ergonomic failures.
 */
export function detectEggBalanceCandidates(p:EggProject):EggBalanceCandidate[]{
  const concept=activeConcept(p);
  const design=[...p.tasks].reverse().find(t=>t.sphere==="design"&&t.findings.length);
  const designFinding=design?.findings[design.findings.length-1];
  const latestDesign=[...(p.flowCycles??[])].reverse().flatMap(c=>c.first)
    .find(v=>v.sphere==="design"&&!!v.result)?.result;
  const designText=latestDesign?.text??designFinding?.text??"";
  const evidenceText=[p.seed.text,concept?.text??"",designText].join("\n");
  const sourceRefs=unique([
    ...(concept?[concept.id]:[]),
    ...(latestDesign?[latestDesign.id]:designFinding?[designFinding.id]:[]),
  ]);
  const hasUncertainty=/не провер|не подтвержд|не определен|не определён|пока открыт|требу(ет|ют) провер|испытан|нужна провер/i.test(evidenceText);
  const result:EggBalanceCandidate[]=[];
  if(sourceRefs.length && hasUncertainty &&
    /воздуш|визуальн.{0,35}л[её]гк|л[её]гк.{0,30}(форм|контур|образ)|открыт.{0,25}контур/i.test(evidenceText) &&
    /конструкц|силов|нагрузк|устойчив|сечен|узл/i.test(evidenceText)){
    result.push({
      key:"structural_lightness",title:"Лёгкость формы ↔ конструктивная опора",
      hypothesis:"Усиление несущей схемы может повлиять на выразительность и визуальную лёгкость. Это вопрос совместимости, а не обнаруженный дефект.",
      relatedSpheres:["design","production"],sourceRefs,
      verification:"Сопоставить эскиз с предварительной силовой схемой; проверить узлы и сечения расчётом или прототипом.",
      suggestedTargets:["design","production","testDrive"],source:"source_cue",
      priority:"needs_evidence",coreStatus:"author_review_required",
    });
  }
  if(sourceRefs.length && hasUncertainty &&
    /ткан|л[её]н|текстил|подвес/i.test(evidenceText) &&
    /эргоном|посадк|поддержк|комфорт|контакт с тел/i.test(evidenceText)){
    result.push({
      key:"textile_support_ergonomics",title:"Тканевая поддержка ↔ проверка эргономики",
      hypothesis:"Гибкая тканевая опора задумана для комфорта, но фактическая поддержка тела и посадка не подтверждены испытаниями. Это открытый вопрос, не доказанная неудобная конструкция.",
      relatedSpheres:["design","testDrive"],sourceRefs,
      verification:"Создать пробный посадочный макет и проверить поддержку плеч, поясницы и устойчивость при входе/выходе.",
      suggestedTargets:["design","testDrive"],source:"source_cue",
      priority:"needs_evidence",coreStatus:"author_review_required",
    });
  }
  for(const cycle of p.flowCycles??[]){
    const review=cycle.semanticReview;
    if(!review)continue;
    for(const item of review.interpretations){
      if(item.kind!=="tension"&&item.kind!=="gap")continue;
      if(!item.sourceResultIds.length)continue;
      result.push({
        key:"semantic:"+review.id+":"+item.id,
        title:item.title,hypothesis:item.explanation,
        relatedSpheres:item.sourceSpheres,sourceRefs:item.sourceResultIds,
        verification:item.verificationNeeded,
        suggestedTargets:item.suggestedSphereTargets,
        source:"semantic_review",priority:"needs_evidence",
        coreStatus:"author_review_required",
      });
    }
  }
  return result;
}

export function buildEggBalanceOverview(p:EggProject):EggBalanceOverview{
  const approved=getActiveConcept(p);
  const working=activeConcept(p);
  const recorded=p.balanceTensions??[];
  const keys=new Set(recorded.map(t=>t.key));
  const candidates=detectEggBalanceCandidates(p).filter(c=>!keys.has(c.key));
  return {
    core:{
      originalSeed:p.seed.text,
      approvedConceptId:approved?.id??null,
      workingConceptId:working?.id??null,
      workingConceptApproved:!!approved,
      assessment:"not_automatically_verified",
    },
    candidates,recorded,
    counts:{
      potential:candidates.length+recorded.filter(t=>t.status==="proposed").length,
      tracked:recorded.filter(t=>t.status==="tracked").length,
      resolved:recorded.filter(t=>t.status==="resolved").length,
      dismissed:recorded.filter(t=>t.status==="dismissed").length,
    },
    equilibrium:candidates.length||recorded.some(t=>t.status==="proposed"||t.status==="tracked")
      ?"under_review":"no_evidence_yet",
  };
}
export function registerEggBalanceTension(p:EggProject,input:{
  actor:EggActor;key:string;at:string;
}):EggProject{
  const at=validAt(input.at);
  if(input.actor!=="ai"&&input.actor!=="author")throw new EggEngineError("Unknown balance contributor");
  const match=detectEggBalanceCandidates(p).find(c=>c.key===input.key);
  if(!match)throw new EggEngineError("No source-backed balance candidate with this key");
  if((p.balanceTensions??[]).some(t=>t.key===match.key))
    throw new EggEngineError("Balance tension is already registered");
  assertRefs(p,match.sourceRefs);
  const tension:EggBalanceTension={
    ...match,id:"balance-"+p.nextSequence,status:"proposed",severity:"unassessed",
    createdAt:at,history:[{
      at,actor:input.actor,action:"registered",
      reason:"Зарегистрировано как непроверенная гипотеза по исходным данным проекта.",
      verificationRefs:[],
    }],
  };
  return {...p,nextSequence:p.nextSequence+1,
    balanceTensions:[...(p.balanceTensions??[]),tension],
    events:[...p.events,{id:"event-"+p.nextSequence,
      kind:"balance_tension_recorded",actor:input.actor,at,
      detail:tension.id+" / "+match.key}],
  };
}
export type EggBalanceVerificationSource={id:string;label:string};
/** A later observation in a relevant sphere, or an Author-acknowledged
 * file registered later. Even these records are NOT independent certification.
 */
export function eligibleEggBalanceVerificationSources(
  p:EggProject,tension:EggBalanceTension,
):EggBalanceVerificationSource[]{
  const related=new Set([...tension.relatedSpheres,...tension.suggestedTargets]);
  const newer=(s:string)=>Number.isFinite(Date.parse(s)) &&
    Date.parse(s)>Date.parse(tension.createdAt);
  return [
    ...p.tasks.flatMap(t=>related.has(t.sphere)?t.findings
      .filter(f=>f.evidence==="observation"&&newer(f.submittedAt)&&
        !tension.sourceRefs.includes(f.id))
      .map(f=>({id:f.id,label:"Наблюдение · "+t.sphere})) : []),
    ...(p.flowCycles??[]).flatMap(cycle=>
      [...cycle.first,...cycle.second].flatMap(v=>related.has(v.sphere)&&v.result &&
        v.result.evidence==="observation"&&newer(v.result.at)&&
        !tension.sourceRefs.includes(v.result.id)
        ?[{id:v.result.id,label:"Наблюдение · "+v.sphere+" · цикл "+cycle.iteration}]
        :[])),
    ...(p.artifacts??[]).filter(file=>file.status==="author_confirmed" &&
      newer(file.confirmedAt??"") && !tension.sourceRefs.includes(file.id))
      .map(file=>({id:file.id,label:"Подтверждённая Автором ссылка · "+file.title})),
  ];
}
export function decideEggBalanceTension(p:EggProject,input:{
  actor:EggActor;tensionId:string;
  outcome:"track"|"resolve"|"dismiss"|"reopen";
  reason:string;at:string;severity?:EggBalanceSeverity;
  verificationRefs?:string[];
}):EggProject{
  if(input.actor!=="author")throw new EggEngineError("Only Author may decide a balance tension");
  const at=validAt(input.at),reason=requireReason(input.reason);
  const idx=(p.balanceTensions??[]).findIndex(t=>t.id===input.tensionId);
  if(idx<0)throw new EggEngineError("Unknown balance tension");
  const current=p.balanceTensions![idx];
  const severity=input.severity??current.severity;
  if(!["unassessed","low","medium","high"].includes(severity))
    throw new EggEngineError("Invalid balance criticality");
  const refs=input.verificationRefs??[];
  if(refs.length){
    if(refs.length>8)throw new EggEngineError("Too many verification sources");
    assertRefs(p,refs);
  }
  if(input.outcome==="resolve"){
    if(current.status!=="tracked")
      throw new EggEngineError("Author must first track the hypothesis before resolving it");
    const eligible=new Set(eligibleEggBalanceVerificationSources(p,current).map(x=>x.id));
    if(!refs.length||refs.some(ref=>!eligible.has(ref)))
      throw new EggEngineError("Resolution needs a later observation from a relevant sphere or an Author-confirmed new file reference");
  }else if(refs.length){
    throw new EggEngineError("Verification sources are accepted only for a resolution");
  }
  if(input.outcome==="track"&&current.status!=="proposed")
    throw new EggEngineError("Only an unverified candidate can be tracked");
  if(input.outcome==="dismiss"&&!["proposed","tracked"].includes(current.status))
    throw new EggEngineError("Cannot dismiss a closed hypothesis");
  if(input.outcome==="reopen"&&!["resolved","dismissed"].includes(current.status))
    throw new EggEngineError("Only a closed hypothesis can be reopened");
  const action:EggBalanceAction=input.outcome==="track"?"tracked":
    input.outcome==="resolve"?"resolved":input.outcome==="dismiss"?"dismissed":"reopened";
  const status:EggBalanceStatus=action==="reopened"?"tracked":action==="tracked"?"tracked":
    action==="resolved"?"resolved":"dismissed";
  const changed:EggBalanceTension={
    ...current,status,severity,
    history:[...current.history,{at,actor:"author",action,reason,verificationRefs:refs}],
  };
  return {...p,nextSequence:p.nextSequence+1,
    balanceTensions:p.balanceTensions!.map((t,i)=>i===idx?changed:t),
    events:[...p.events,{id:"event-"+p.nextSequence,
      kind:"balance_tension_decided",actor:"author",at,
      detail:current.id+" / "+action+" / "+reason.slice(0,200)}],
  };
}

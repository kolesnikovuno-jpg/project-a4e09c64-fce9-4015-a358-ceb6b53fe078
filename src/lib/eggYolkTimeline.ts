/**
 * Read-only time-sliced Yolk orbit. Selection is an existing cycle id
 * or "baseline", never a generated future state.
 *
 * Text provenance, material provenance, status and Author decisions are
 * projected from a single selected cycle. No late synthesis may leak into
 * an older cycle; no numerical balance score, physical test or approval
 * is inferred from text or image references.
 */
import type {EggProject,SphereId} from "./eggEngine.js";
import {EGG_FIXED_ROUTE,type EggFlowCycle,type EggFlowResult} from "./eggFlowCycle.js";
import {EGG_YOLK_SPHERE_NAMES} from "./eggYolkState.js";
import {buildEggVisualHistory,type EggVisualSnapshot} from "./eggVisualHistory.js";

export type EggYolkTimeSphere={
  sphere:SphereId;name:string;
  status:"historical"|"new"|"inherited"|"pending_work"|"pending_transit"|"missing";
  summary:string|null;resultId:string|null;sourceCycleId:string|null;
  evidence:"observation"|"hypothesis"|"question"|null;requiresRecheck:boolean;
};
export type EggYolkTimeTension={
  id:string;title:string;status:"proposed"|"tracked"|"resolved"|"dismissed";
  lastReason:string;lastActionAt:string;
};
export type EggYolkTimeSnapshot={
  key:string;label:string;cycleId:string|null;
  level:number;iteration:number;status:EggFlowCycle["status"]|"baseline";
  authorBrief:string|null;
  authorDecision:EggFlowCycle["decision"]|null;
  semanticReviewStatus:"unverified"|"not_recorded";
  visual:EggVisualSnapshot|null;
  visualProvenance:"selected_cycle"|"carried_from_previous"|"baseline"|"none";
  visualNote:string;
  spheres:EggYolkTimeSphere[];
  tensions:EggYolkTimeTension[];
  synthesisId:string|null;
  disclaimer:"read_only_time_slice_not_physical_verification";
};
export type EggYolkTimeOption={
  key:string;label:string;status:EggYolkTimeSnapshot["status"];
};
export const EGG_YOLK_BASELINE="baseline";

function resolveInherited(p:EggProject,id:string,sphere:SphereId):
  {result:EggFlowResult;sourceCycleId:string}|null{
  // Exact inherited source; do not silently choose the latest finding.
  for(const c of p.flowCycles??[]){
    const v=[...c.first,...c.second].find(v=>v.sphere===sphere&&v.result?.id===id);
    if(v?.result)return {result:v.result,sourceCycleId:c.id};
  }
  return null;
}
const statusFromAction=(action:string):EggYolkTimeTension["status"]=>
  action==="resolved"?"resolved":action==="dismissed"?"dismissed":
  action==="tracked"||action==="reopened"?"tracked":"proposed";

function selectVisual(p:EggProject,index:number){
  const history=buildEggVisualHistory(p);
  if(index<0){
    return {visual:history.baseline,provenance:history.baseline?"baseline" as const:"none" as const};
  }
  const cycles=p.flowCycles??[];
  for(let i=index;i>=0;i--){
    const bound=history.snapshots.filter(v=>v.cycleId===cycles[i].id).at(-1);
    if(bound)return {visual:bound,provenance:i===index?"selected_cycle" as const:
      "carried_from_previous" as const};
  }
  if(history.baseline)return {visual:history.baseline,provenance:"carried_from_previous" as const};
  return {visual:null,provenance:"none" as const};
}
export function eggYolkTimeOptions(p:EggProject):EggYolkTimeOption[]{
  return [
    {key:EGG_YOLK_BASELINE,label:"Исходное состояние · ДНК и исторические выводы",
      status:"baseline"},
    ...(p.flowCycles??[]).map(c=>({
      key:c.id,label:"Уровень "+c.level+" · итерация "+c.iteration+" · "+c.id,
      status:c.status,
    })),
  ];
}
export function buildEggYolkTimeSnapshot(
  p:EggProject,requested:string=EGG_YOLK_BASELINE,
):EggYolkTimeSnapshot{
  const cycles=p.flowCycles??[];
  const index=cycles.findIndex(c=>c.id===requested);
  if(requested!==EGG_YOLK_BASELINE&&index<0)
    throw Error("Unknown Yolk time selection");
  const cycle=index>=0?cycles[index]:null;
  const visual=selectVisual(p,index);
  const lastTime=index>=0
    ?(cycles[index+1]?.startedAt??null):cycles[0]?.startedAt??null;
  const cutoff=lastTime?Date.parse(lastTime):index>=0||!cycles.length?Infinity:
    Date.parse(cycles[0].startedAt);
  // A baseline is not an assertion that latest findings existed before
  // the first flow started. Use their recorded timestamp and strict cutoff.
  const spheres:EggYolkTimeSphere[]=EGG_FIXED_ROUTE.map(sphere=>{
    if(!cycle){
      const findings=p.tasks.flatMap(task=>task.sphere===sphere?
        task.findings.map(f=>({f})):[])
        .filter(x=>Date.parse(x.f.submittedAt)<=cutoff);
      const last=findings.at(-1)?.f;
      return {
        sphere,name:EGG_YOLK_SPHERE_NAMES[sphere],
        status:last?"historical":"missing",
        summary:last?.text??null,resultId:last?.id??null,sourceCycleId:null,
        evidence:last?.evidence??null,requiresRecheck:!!last,
      };
    }
    const visit=[...cycle.first,...cycle.second].find(v=>v.sphere===sphere);
    if(visit?.result)return {
      sphere,name:EGG_YOLK_SPHERE_NAMES[sphere],status:"new",
      summary:visit.result.text,resultId:visit.result.id,sourceCycleId:cycle.id,
      evidence:visit.result.evidence,requiresRecheck:false,
    };
    if(visit?.inherited){
      const original=resolveInherited(p,visit.inherited.resultId,sphere);
      if(original)return {
        sphere,name:EGG_YOLK_SPHERE_NAMES[sphere],status:"inherited",
        summary:original.result.text,resultId:original.result.id,
        sourceCycleId:original.sourceCycleId,evidence:original.result.evidence,
        requiresRecheck:!!visit.requiresRecheck,
      };
    }
    return {
      sphere,name:EGG_YOLK_SPHERE_NAMES[sphere],
      status:visit?.status==="awaiting_result"||visit?.mode==="work"&&visit.status==="pending"
        ?"pending_work":visit?.mode==="transit"&&visit.status==="pending"
        ?"pending_transit":"missing",
      summary:null,resultId:null,sourceCycleId:null,evidence:null,
      requiresRecheck:false,
    };
  });
  const tensions=(p.balanceTensions??[]).flatMap(t=>{
    const events=t.history.filter(e=>Date.parse(e.at)<=cutoff);
    const last=events.at(-1);
    return last?[{
      id:t.id,title:t.title,status:statusFromAction(last.action),
      lastReason:last.reason,lastActionAt:last.at,
    }]:[];
  });
  const provenance=visual.provenance;
  const visualNote=!visual.visual
    ?"Связанной визуальной версии нет. Центральная форма — исследовательский эскиз, не модель кресла."
    :provenance==="carried_from_previous"
      ?"Показан прежний источник без новой визуальной версии в выбранном цикле."
      :provenance==="baseline"
        ?"Показана исходная визуальная версия, закреплённая Автором."
        :"Показана визуальная версия, закреплённая Автором за выбранным циклом.";
  return {
    key:cycle?.id??EGG_YOLK_BASELINE,
    label:cycle?"Уровень "+cycle.level+" · итерация "+cycle.iteration:"Исходное состояние",
    cycleId:cycle?.id??null,level:cycle?.level??p.level,iteration:cycle?.iteration??p.iteration,
    status:cycle?.status??"baseline",
    authorBrief:cycle?.authorBrief||null,authorDecision:cycle?.decision??null,
    semanticReviewStatus:cycle?.semanticReview?"unverified":"not_recorded",
    visual:visual.visual,visualProvenance:visual.provenance,visualNote,
    spheres,tensions,synthesisId:cycle?.synthesis?.id??null,
    disclaimer:"read_only_time_slice_not_physical_verification",
  };
}

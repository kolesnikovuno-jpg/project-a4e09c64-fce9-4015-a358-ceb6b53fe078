/**
 * Experimental projection of a COMPLETED eight-sphere Yolk synthesis into
 * abstract geometry parameters. This is deterministic visualization, NOT
 * semantic 3D generation, design approval or a manufactured object.
 * No result from a single sphere can advance the displayed model.
 */
import type {EggProject} from "./eggEngine.js";
import type {EggFlowCycle} from "./eggFlowCycle.js";
import type {SpatialVariant} from "./eggSpatialGenerator.js";

export type EggCycleSpatialProjection={
  cycleId:string;synthesisId:string;level:number;iteration:number;
  variant:SpatialVariant;detail:number;
  method:"deterministic_experimental_mapping";
};

function complete(c:EggFlowCycle):boolean{
  if(!c.synthesis||c.status==="running")return false;
  const items=[...c.synthesis.first,...c.synthesis.second];
  return items.length===8 &&
    new Set(items.map(item=>item.sphere)).size===8 &&
    items.every(item=>item.status!=="missing"&&!!item.resultId&&!!item.text?.trim());
}
function signature(c:EggFlowCycle):string{
  if(!c.synthesis)return "";
  return [...c.synthesis.first,...c.synthesis.second]
    .map(i=>[i.sphere,i.status,i.text??""].join(":")).join("|");
}
function hash(value:string):number{
  let h=2166136261;
  for(let i=0;i<value.length;i++){
    h=Math.imul(h^value.charCodeAt(i),16777619);
  }
  return h>>>0;
}
/** Supplying current Author intent prevents an unrelated historic cycle from
 * changing the visible field. Missing handoff never counts as a match.
 */
export function projectCompleteEggCycleToSpatial(
  project:EggProject,
  authorIntent?:string,
):EggCycleSpatialProjection|null{
  const cycles=project.flowCycles??[];
  const normalized=authorIntent?.trim().toLocaleLowerCase();
  const cycle=[...cycles].reverse().find(c=>complete(c)&&
    (!normalized||(
      (c.ideaHandoff?.intent??c.synthesis?.dna.authorIntent??"")
        .trim().toLocaleLowerCase()===normalized
    )));
  if(!cycle||!cycle.synthesis)return null;
  const h=hash(signature(cycle));
  const variants:SpatialVariant[]=["A","B","C"];
  return {
    cycleId:cycle.id,synthesisId:cycle.synthesis.id,
    level:cycle.level,iteration:cycle.iteration,
    variant:variants[h%3],detail:Math.min(4,Math.max(1,cycle.iteration)),
    method:"deterministic_experimental_mapping",
  };
}

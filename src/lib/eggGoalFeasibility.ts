/** ADR-033: a goal is specified before any budget. Scenario ranges are evidence-bound, not promises. */
import type {EggChannelPreparation} from "./eggChannelResources.js";
import {planEggChannelResources} from "./eggChannelResources.js";
export type EggGoalScenario={
 id:string;label:string;channelIds:string[];
 strategy:"minimum"|"balanced"|"expanded";
 timeDays:{min:number|null;max:number|null};
 assumptions:string[];verification:string[];
};
export type EggFeasibilityScenario={
 id:string;label:string;strategy:EggGoalScenario["strategy"];
 readiness:"unassessed"|"incomplete"|"costed";
 costUah:{verifiedFloor:number;estimatedAdditional:number;upperBound:number|null};
 missingCosts:string[];missingPrerequisites:string[];
 resourceReuse:string[];timeDays:EggGoalScenario["timeDays"];
 assumptions:string[];verification:string[];
 /** Cost completeness does not prove the goal is achievable. */
 feasibility:"unverified";
 spendingAuthorized:false;
};
export function buildEggGoalFeasibilityMap(input:{
 goal:string;channels:readonly EggChannelPreparation[];
 scenarios:readonly EggGoalScenario[];
}):{goal:string;budgetRequiredForResearch:false;scenarios:EggFeasibilityScenario[]}{
 if(!input.goal.trim())throw Error("Goal required");
 const seen=new Set<string>();
 return {goal:input.goal,budgetRequiredForResearch:false,scenarios:input.scenarios.map(s=>{
  if(seen.has(s.id))throw Error("Duplicate scenario");seen.add(s.id);
  const selected=s.channelIds.map(id=>{
   const channel=input.channels.find(c=>c.id===id);
   if(!channel)throw Error("Unknown channel "+id);
   return channel;
  });
  if(s.timeDays.min!==null&&(!Number.isFinite(s.timeDays.min)||s.timeDays.min<0))throw Error("Invalid duration");
  if(s.timeDays.max!==null&&(!Number.isFinite(s.timeDays.max)||s.timeDays.max<0))throw Error("Invalid duration");
  if(s.timeDays.min!==null&&s.timeDays.max!==null&&s.timeDays.min>s.timeDays.max)throw Error("Invalid duration range");
  const resources=planEggChannelResources(selected,null);
  const incomplete=resources.unknownCosts.length>0;
  return {id:s.id,label:s.label,strategy:s.strategy,readiness:resources.readiness,
   costUah:{verifiedFloor:resources.knownMinimumUah,estimatedAdditional:resources.estimatedAdditionalUah,
    upperBound:incomplete?null:resources.knownMinimumUah+resources.estimatedAdditionalUah},
   missingCosts:resources.unknownCosts.map(n=>n.label),
   missingPrerequisites:resources.unresolved.map(n=>n.label),
   resourceReuse:resources.reusable.map(n=>n.key),
   timeDays:s.timeDays,assumptions:s.assumptions,verification:s.verification,
   feasibility:"unverified" as const,spendingAuthorized:false as const};
 })};
}

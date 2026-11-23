import {describe,it,expect} from "vitest";
import {buildEggGoalFeasibilityMap} from "../../lib/eggGoalFeasibility.js";
import type {EggChannelPreparation} from "../../lib/eggChannelResources.js";
const channel:EggChannelPreparation={id:"search",name:"Search",sphere:"marketing",status:"researching",audience:"buyers",presentation:"landing",evidenceRefs:[],nextExperiment:"verify",requirements:[{id:"media",label:"Media kit",ownerSphere:"design",amountUah:null,amountKind:"unknown",alreadyAvailable:false,blocking:true}]};
const scenario={id:"min",label:"Minimum",channelIds:["search"],strategy:"minimum" as const,timeDays:{min:null,max:null},assumptions:[],verification:["first verified inquiry"]};
describe("ADR-033 goal feasibility",()=>{
 it("starts with a goal and no budget, retaining unknown costs",()=>{
  const m=buildEggGoalFeasibilityMap({goal:"Two confirmed orders monthly",channels:[channel],scenarios:[scenario]});
  expect(m.budgetRequiredForResearch).toBe(false);
  expect(m.scenarios[0].costUah.upperBound).toBeNull();
  expect(m.scenarios[0].feasibility).toBe("unverified");
  expect(m.scenarios[0].spendingAuthorized).toBe(false);
 });
 it("does not fabricate a scenario for an unknown channel",()=>{
  expect(()=>buildEggGoalFeasibilityMap({goal:"Goal",channels:[],scenarios:[scenario]})).toThrow("Unknown channel");
 });
});

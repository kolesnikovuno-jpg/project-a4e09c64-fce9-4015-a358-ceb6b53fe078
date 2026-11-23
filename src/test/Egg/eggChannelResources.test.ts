import {describe,it,expect} from "vitest";
import {planEggChannelResources,type EggChannelPreparation} from "../../lib/eggChannelResources.js";
const shared={id:"photos",label:"Photo set",ownerSphere:"design",amountUah:2000,amountKind:"estimate" as const,alreadyAvailable:false,sharedKey:"lyra-photos",blocking:false};
const channel=(id:string):EggChannelPreparation=>({id,name:id,sphere:"marketing",status:"researching",audience:"designers",presentation:"product",requirements:[shared],evidenceRefs:[],nextExperiment:"review"});
describe("EGG channel resource planning",()=>{
 it("deduplicates reusable preparation across channels",()=>{
  const p=planEggChannelResources([channel("instagram"),channel("press")],5000);
  expect(p.estimatedAdditionalUah).toBe(2000);expect(p.reusable[0].channelIds).toHaveLength(2);
 });
 it("never invents unknown prices or approves spending",()=>{
  const c=channel("viber");c.requirements=[{...shared,sharedKey:undefined,amountUah:null,amountKind:"unknown",blocking:true}];
  const p=planEggChannelResources([c],10000);
  expect(p.readiness).toBe("incomplete");expect(p.unknownCosts).toHaveLength(1);
  expect(p.spendingAuthorized).toBe(false);
 });
 it("flags conflicting shared cost quotes as unknown",()=>{
  const c=channel("press");c.requirements=[{...shared,amountUah:3500}];
  expect(planEggChannelResources([channel("instagram"),c],null).unknownCosts).toHaveLength(1);
 });
});

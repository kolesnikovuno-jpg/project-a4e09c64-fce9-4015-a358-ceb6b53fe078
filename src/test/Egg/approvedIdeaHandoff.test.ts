import {describe,expect,it} from "vitest";
import {createEggProject} from "../../lib/eggEngine";
import {eggMutationSchema,runEggMutation} from "../../lib/eggCommands";
import {eggIdeaHandoffSchema} from "../../lib/eggIdeaHandoff";
import {startEggFlowCycle,contributeEggFlowSphere,decideEggFlowCycle,
 currentEggFlowCycle,EGG_FIXED_ROUTE} from "../../lib/eggFlowCycle";
import {buildEggSphereBrief} from "../../lib/eggSphereIntelligence";
import {buildEggAutomationPrompt,nextEggAutomationStep,EGG_AUTOMATION_ORDER} from "../../lib/eggFlowAutomation";

const projectId="01b3d29f-bfc4-41ed-b31a-2e0db7fa2fe9",ownerId="owner-1";
const at="2026-11-16T07:30:00.000Z";
const original=()=>createEggProject({id:projectId,title:"Объект в комнате",
 seed:"Исходная неизменяемая авторская идея",at});
const packet=()=>eggIdeaHandoffSchema.parse({
 intent:"Тихий пространственный акцент в существующей комнате",
 workingDna:"Лёгкая линия, пауза, ощущение воздушности",
 constraints:"Не приписывать неизвестных размеров",
 materialInsight:"Предполагаемый контраст массивного и воздушного",
 materials:[
  {id:"m-1",type:"thought",text:"Лёгкость",visualStatus:"text"},
  {id:"m-2",type:"image",text:"Референс пластики",visualStatus:"metadata_only"},
 ],
 spatialContext:{role:"spatial_context",caption:"Фото существующего помещения, не прототип объекта",
  imageData:"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ"},
});

describe("Author-approved Idea handoff through both branches and Yolk",()=>{
 it("accepts an Author-only versioned packet without rewriting the original seed",()=>{
  const parsed=eggMutationSchema.parse({
   command:"start_flow_cycle",projectId,expectedRevision:1,
   brief:"Исследовать пространственный акцент",ideaHandoff:packet(),
  });
  const state=runEggMutation(original(),parsed,
   {kind:"author",ownerId},ownerId,at);
  const cycle=currentEggFlowCycle(state)!;
  expect(state.seed.text).toBe("Исходная неизменяемая авторская идея");
  expect(cycle.ideaHandoff?.workingDna).toContain("воздушности");
  expect(cycle.first.map(v=>v.sphere)).toEqual(EGG_FIXED_ROUTE.slice(0,4));
  expect(cycle.second.map(v=>v.sphere)).toEqual(EGG_FIXED_ROUTE.slice(4));
  expect(cycle.first[0].status).toBe("awaiting_result");
  expect(cycle.second[0].status).toBe("awaiting_result");
  const marketing=buildEggSphereBrief(state,"marketing");
  expect(marketing.dna.originalSeed).toContain("неизменяемая");
  expect(marketing.approvedIdeaHandoff?.workingDna).toContain("воздушности");
  expect(marketing.approvedIdeaHandoff?.materials[1].visualStatus).toBe("metadata_only");
  const textPrompt=buildEggAutomationPrompt(state,{kind:"sphere",sphere:"marketing",cycleId:cycle.id});
  expect("imageData" in textPrompt).toBe(false);
  expect(textPrompt.input).toContain("spatial_context");
  expect(nextEggAutomationStep(state)).toMatchObject({kind:"sphere",sphere:"marketing"});
  expect(()=>runEggMutation(original(),parsed,
   {kind:"agent",projectId,ownerId,scopes:["read","contribute"]},ownerId,at)).toThrow();
 });
 it("actually passes one environment photo to spatial roles and never to Legal",()=>{
  let state=startEggFlowCycle(original(),{actor:"author",at,ideaHandoff:packet()});
  state=contributeEggFlowSphere(state,{actor:"ai",sphere:"marketing",at,text:"Предполагаемая ценность в спокойном интерьере",
   evidence:"hypothesis",sourceRefs:[]});
  const active=currentEggFlowCycle(state)!;
  const design=buildEggAutomationPrompt(state,{kind:"sphere",sphere:"design",cycleId:active.id});
  const legal=buildEggAutomationPrompt(state,{kind:"sphere",sphere:"legal",cycleId:active.id});
  expect("imageData" in design && design.imageData).toBe(packet().spatialContext!.imageData);
  expect("imageData" in legal).toBe(false);
  expect(design.input).toContain('"sphere":"marketing"');
  expect(design.input).toContain("Лёгкость");
  expect(legal.input).not.toContain("Предполагаемая ценность в спокойном интерьере");
 });
 it("completes eight stations, records two contributions to Yolk and retains provenance on revision",()=>{
  let p=startEggFlowCycle(original(),{actor:"author",at,ideaHandoff:packet()});
  for(const sphere of EGG_AUTOMATION_ORDER){
   expect(nextEggAutomationStep(p)).toMatchObject({kind:"sphere",sphere});
   p=contributeEggFlowSphere(p,{actor:"ai",sphere,at,
    text:"Гипотеза "+sphere+" требует проверки исходных данных",
    evidence:"hypothesis",sourceRefs:[]});
  }
  const cycle=currentEggFlowCycle(p)!;
  expect(cycle.status).toBe("awaiting_author");
  expect(cycle.synthesis?.first).toHaveLength(4);
  expect(cycle.synthesis?.second).toHaveLength(4);
  expect(cycle.synthesis?.endpoints.commerce.resultId).toBeTruthy();
  expect(cycle.synthesis?.endpoints.retail.resultId).toBeTruthy();
  expect(cycle.synthesis?.dna.seed).toBe(original().seed.text);
  expect(nextEggAutomationStep(p).kind).toBe("yolk");
  const revised=decideEggFlowCycle(p,{actor:"author",outcome:"revise",
   reason:"Уточнить пространственный принцип",addressedSpheres:["design"],at});
  const next=currentEggFlowCycle(revised)!;
  expect(next.iteration).toBe(2);
  expect(next.ideaHandoff).toEqual(packet());
  expect(next.first.find(v=>v.sphere==="design")?.status).toBe("awaiting_result");
  expect(next.second.every(v=>v.status==="transited")).toBe(true);
  expect(revised.seed.text).toBe(original().seed.text);
 });
 it("rejects unapproved or malformed image material handoffs",()=>{
  expect(eggIdeaHandoffSchema.safeParse({...packet(),intent:""}).success).toBe(false);
  expect(eggIdeaHandoffSchema.safeParse({...packet(),spatialContext:{
   role:"spatial_context",caption:"Фото",imageData:"https://example.test/image.jpg"
  }}).success).toBe(false);
 });
});

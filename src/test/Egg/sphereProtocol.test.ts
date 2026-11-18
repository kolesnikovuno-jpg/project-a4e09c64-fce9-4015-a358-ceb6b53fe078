import {describe,expect,it} from "vitest";
import {createEggProject} from "../../lib/eggEngine";
import {startEggFlowCycle} from "../../lib/eggFlowCycle";
import {EGG_SPHERE_MANIFESTS,EGG_ENTRY_MANIFESTS,EGG_SPHERE_PROTOCOL_VERSION,EGG_MATERIAL_RESONANCE_INSTRUCTIONS,EGG_LEVEL_DEPTH,EGG_LEVEL_BREADTH,getEggLevelResearchPolicy,buildEggSpherePerceptionInstruction,buildEggSphereRoleInstruction} from "../../lib/eggSphereProtocol";
import {buildEggSphereIntelligencePrompt} from "../../lib/eggSphereIntelligence";

describe("EGG Sphere Protocol v1.0",()=>{
 it("defines eight distinct functional roles, not a generic chat personality",()=>{
  expect(EGG_SPHERE_PROTOCOL_VERSION).toBe("1.0");
  expect(Object.keys(EGG_SPHERE_MANIFESTS)).toHaveLength(8);
  expect(Object.keys(EGG_ENTRY_MANIFESTS)).toEqual(["matter","idea"]);
  expect(EGG_ENTRY_MANIFESTS.matter.mission).toContain("базовую обработку");
  expect(EGG_ENTRY_MANIFESTS.idea.humanRole).toContain("Автор инициирует идею");
  const roles=Object.values(EGG_SPHERE_MANIFESTS).map(m=>m.role);
  expect(new Set(roles).size).toBe(8);
  for(const manifest of Object.values(EGG_SPHERE_MANIFESTS)){
   expect(manifest.mission.length).toBeGreaterThan(20);
   expect(manifest.candidateCapabilities.length).toBeGreaterThan(0);
   expect(manifest.hardBoundary.length).toBeGreaterThan(12);
  }
 });
 it("treats the resonance field as an interpretive author-calibrated process",()=>{
  expect(EGG_ENTRY_MANIFESTS.matter.role).toContain("резонансного поля");
  expect(EGG_ENTRY_MANIFESTS.matter.expectedContribution).toContain("карта поля");
  expect(EGG_ENTRY_MANIFESTS.matter.expectedContribution).toContain("без инициированной идеи");
  expect(EGG_ENTRY_MANIFESTS.idea.humanRole).toContain("Автор инициирует идею");
  const guide=EGG_MATERIAL_RESONANCE_INSTRUCTIONS.join(" ");
  expect(guide).toContain("аккорд");
  expect(guide).toContain("потенциала");
  expect(guide).toContain("только Автором");
  expect(guide).toContain("а не измерение физических частот");
  expect(guide).toContain("не обязательно готовый предмет");
 });
 it("separates current depth from backward/present/forward perception for all five levels",()=>{
  expect(Object.keys(EGG_LEVEL_DEPTH)).toHaveLength(5);
  expect(EGG_LEVEL_DEPTH[1].name).toBe("Идея");
  expect(EGG_LEVEL_DEPTH[5].name).toBe("Продукт");
  for(const level of [1,2,3,4,5]){
   const policy=buildEggSpherePerceptionInstruction(level);
   expect(policy).toContain("Рабочая глубина");
   expect(policy).toContain("смотри назад");
   expect(policy).toContain("в настоящий момент");
   expect(policy).toContain("вперёд");
   expect(policy).toContain("не обязывает сейчас");
  }
  expect(()=>buildEggSpherePerceptionInstruction(6)).toThrow("Unsupported");
 });
 it("scopes breadth, evidence and stop conditions to each maturity level",()=>{
  expect(Object.keys(EGG_LEVEL_BREADTH)).toHaveLength(5);
  const scopes=[1,2,3,4,5].map(level=>getEggLevelResearchPolicy(level));
  expect(scopes.map(s=>s.name)).toEqual(["Идея","Концепт","Прототип","Образец","Продукт"]);
  expect(new Set(scopes.map(s=>s.scope)).size).toBe(5);
  for(const level of [1,2,3,4,5]){
   const policy=getEggLevelResearchPolicy(level);
   const instruction=buildEggSpherePerceptionInstruction(level);
   expect(instruction).toContain(policy.scope);
   expect(instruction).toContain(policy.evidence);
   expect(instruction).toContain(policy.stop);
  }
  expect(()=>getEggLevelResearchPolicy(0)).toThrow("Unsupported");
 });
 it("includes the specific role and explicit capability limits when AI connects",()=>{
  const project=createEggProject({id:"739b6b30-73c1-41aa-9412-0c5dbe8ce5aa",title:"Кресло",seed:"Лёгкое кресло",at:"2026-11-15T10:00:00Z"});
  const cycle=startEggFlowCycle(project,{actor:"author",at:"2026-11-15T10:00:00Z"});
  const prompt=buildEggSphereIntelligencePrompt(cycle,"marketing");
  expect(prompt.instructions).toContain(buildEggSphereRoleInstruction("marketing"));
  expect(prompt.instructions).toContain("ТОЛЬКО если");
  expect(prompt.instructions).toContain("EGG уровень 1 / 5 — Идея");
  expect(prompt.instructions).toContain("ОХВАТ ВОСПРИЯТИЯ");
  expect(JSON.parse(prompt.input).diagnostics.depth.name).toBe("Идея");
  expect(JSON.parse(prompt.input).diagnostics.levelResearchPolicy.scope).toBe(EGG_LEVEL_BREADTH[1].scope);
  expect(prompt.instructions).toContain("не обрабатывай его повторно");
  expect(JSON.parse(prompt.input).protocolVersion).toBe("1.0");
  expect(prompt.instructions).not.toContain(EGG_SPHERE_MANIFESTS.legal.mission);
 });
});

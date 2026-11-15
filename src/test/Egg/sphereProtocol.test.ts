import {describe,expect,it} from "vitest";
import {createEggProject} from "../../lib/eggEngine";
import {startEggFlowCycle} from "../../lib/eggFlowCycle";
import {EGG_SPHERE_MANIFESTS,EGG_ENTRY_MANIFESTS,EGG_SPHERE_PROTOCOL_VERSION,EGG_MATERIAL_RESONANCE_INSTRUCTIONS,buildEggSphereRoleInstruction} from "../../lib/eggSphereProtocol";
import {buildEggSphereIntelligencePrompt} from "../../lib/eggSphereIntelligence";

describe("EGG Sphere Protocol v1.0",()=>{
 it("defines eight distinct functional roles, not a generic chat personality",()=>{
  expect(EGG_SPHERE_PROTOCOL_VERSION).toBe("1.0");
  expect(Object.keys(EGG_SPHERE_MANIFESTS)).toHaveLength(8);
  expect(Object.keys(EGG_ENTRY_MANIFESTS)).toEqual(["matter","idea"]);
  expect(EGG_ENTRY_MANIFESTS.matter.mission).toContain("подборки");
  expect(EGG_ENTRY_MANIFESTS.idea.humanRole).toContain("Только Автор");
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
  const guide=EGG_MATERIAL_RESONANCE_INSTRUCTIONS.join(" ");
  expect(guide).toContain("аккорд");
  expect(guide).toContain("потенциала");
  expect(guide).toContain("Только Автор");
  expect(guide).toContain("а не измерение физических частот");
  expect(guide).toContain("не обязательно готовый предмет");
 });
 it("includes the specific role and explicit capability limits when AI connects",()=>{
  const project=createEggProject({id:"739b6b30-73c1-41aa-9412-0c5dbe8ce5aa",title:"Кресло",seed:"Лёгкое кресло",at:"2026-11-15T10:00:00Z"});
  const cycle=startEggFlowCycle(project,{actor:"author",at:"2026-11-15T10:00:00Z"});
  const prompt=buildEggSphereIntelligencePrompt(cycle,"marketing");
  expect(prompt.instructions).toContain(buildEggSphereRoleInstruction("marketing"));
  expect(prompt.instructions).toContain("ТОЛЬКО если");
  expect(prompt.instructions).toContain("не обрабатывай его повторно");
  expect(JSON.parse(prompt.input).protocolVersion).toBe("1.0");
  expect(prompt.instructions).not.toContain(EGG_SPHERE_MANIFESTS.legal.mission);
 });
});

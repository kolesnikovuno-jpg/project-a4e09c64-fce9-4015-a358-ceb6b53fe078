import {describe,expect,it} from "vitest";
import {createEggProject} from "../../lib/eggEngine";
import {startEggFlowCycle} from "../../lib/eggFlowCycle";
import {EGG_SPHERE_MANIFESTS,EGG_SPHERE_PROTOCOL_VERSION,buildEggSphereRoleInstruction} from "../../lib/eggSphereProtocol";
import {buildEggSphereIntelligencePrompt} from "../../lib/eggSphereIntelligence";

describe("EGG Sphere Protocol v1.0",()=>{
 it("defines eight distinct functional roles, not a generic chat personality",()=>{
  expect(EGG_SPHERE_PROTOCOL_VERSION).toBe("1.0");
  expect(Object.keys(EGG_SPHERE_MANIFESTS)).toHaveLength(8);
  const roles=Object.values(EGG_SPHERE_MANIFESTS).map(m=>m.role);
  expect(new Set(roles).size).toBe(8);
  for(const manifest of Object.values(EGG_SPHERE_MANIFESTS)){
   expect(manifest.mission.length).toBeGreaterThan(20);
   expect(manifest.candidateCapabilities.length).toBeGreaterThan(0);
   expect(manifest.hardBoundary.length).toBeGreaterThan(12);
  }
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

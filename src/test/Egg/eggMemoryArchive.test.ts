import {describe,it,expect} from "vitest";
import {createEggProject} from "../../lib/eggEngine";
import {exportEggMemory,importEggMemory} from "../../lib/eggMemoryArchive";
describe("EGG Drive-compatible archive",()=>{
 const project=()=>createEggProject({id:"memory-test",title:"Test",seed:"Author seed",at:"2026-11-17T00:00:00Z"});
 it("round trips all eight sphere genomes",()=>{
  const p=project(),archive=exportEggMemory(p,"2026-11-17T00:00:00Z");
  expect(archive.spheres).toHaveLength(8);
  expect(importEggMemory(p,archive).sphereMemory?.spheres.design?.active.version).toBe(1);
 });
 it("rejects foreign project and destructive import",()=>{
  const p=project(),archive=exportEggMemory(p,"2026-11-17T00:00:00Z");
  expect(()=>importEggMemory({...p,id:"other"},archive)).toThrow();
  expect(()=>importEggMemory(importEggMemory(p,archive),archive)).toThrow();
 });
});

import {describe,it,expect} from "vitest";
import {createEggProject} from "../../lib/eggEngine";
import {getSphereMemory,observeSphereIterations,proposeSphereImprovement,assessSphereImprovement,approveSphereImprovement,rollbackSphereImprovement} from "../../lib/eggSphereMemory";
const initial=()=>createEggProject({id:"p1",title:"Test",seed:"Original idea",at:"2026-11-17T00:00:00Z"});
describe("persistable sphere evolution memory",()=>{
 it("retains original project and initializes a sphere genome",()=>{
  const p=initial(),next=observeSphereIterations(p,"design");
  expect(p.sphereMemory).toBeUndefined();
  expect(getSphereMemory(next,"design").observations).toEqual([]);
  expect(JSON.parse(JSON.stringify(next)).sphereMemory.schema).toBe("egg.sphere-memory/1");
 });
 it("requires evidence checks and author approval to evolve",()=>{
  const p=proposeSphereImprovement(initial(),"design",{id:"change1",at:"2026-11-17T00:00:00Z",reason:"Improve clarity",changes:{objective:"Clarified"}});
  expect(()=>approveSphereImprovement(p,"design","change1","author","2026-11-17T01:00:00Z")).toThrow();
  const assessed=assessSphereImprovement(p,"design","change1",{regression:true,quality:true});
  const approved=approveSphereImprovement(assessed,"design","change1","author","2026-11-17T01:00:00Z");
  expect(getSphereMemory(approved,"design").active.version).toBe(2);
  expect(getSphereMemory(rollbackSphereImprovement(approved,"design","author","2026-11-17T02:00:00Z"),"design").active.version).toBe(1);
 });
 it("does not accept failed checks",()=>{
  const p=proposeSphereImprovement(initial(),"legal",{id:"x",at:"2026-11-17T00:00:00Z",reason:"Test",changes:{objective:"New"}});
  const assessed=assessSphereImprovement(p,"legal","x",{regression:false});
  expect(()=>approveSphereImprovement(assessed,"legal","x","author","2026-11-17T00:00:00Z")).toThrow();
 });
});

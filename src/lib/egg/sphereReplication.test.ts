import { describe, expect, it } from "vitest";
import { approvePromotion, cloneCandidate, dispatchSphereResult, evaluateCandidate, promote, rollback, type SpherePackage } from "./sphereReplication";
const base: SpherePackage = {
 id:"idea",version:1,role:"Idea",instructions:"Explore idea",inputSchema:"input-v1",outputSchema:"output-v1",sequentialTarget:"concept",yolkTarget:"yolk",invariants:["preserve author intent"],examples:[]
};
describe("sphere replication",()=>{
 it("clones without changing parent",()=>{
  const c=cloneCandidate(base,{instructions:"Refine idea"});
  expect(base.version).toBe(1);
  expect(c.proposed.version).toBe(2);
  expect(c.proposed.instructions).toBe("Refine idea");
 });
 it("rejects untested promotion",()=>expect(()=>promote(cloneCandidate(base))).toThrow());
 it("rejects failed checks",()=>{
  const c=evaluateCandidate(cloneCandidate(base),{passed:true,checks:{regression:false}});
  expect(()=>approvePromotion(c,"author")).toThrow();
 });
 it("promotes only evaluated and approved candidates; can roll back",()=>{
  const c=approvePromotion(evaluateCandidate(cloneCandidate(base),{passed:true,checks:{regression:true,contract:true}}),"author");
  expect(promote(c).version).toBe(2);
  expect(rollback(c)).toEqual(base);
 });
 it("shares a single evaluated result across both routes",()=>{
  const result={idea:"a"};
  const outputs=dispatchSphereResult(result);
  expect(outputs.sequential).toBe(outputs.radial);
 });
});

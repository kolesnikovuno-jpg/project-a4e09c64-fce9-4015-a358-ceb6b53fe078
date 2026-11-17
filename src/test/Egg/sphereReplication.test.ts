import {describe,it,expect} from "vitest";
import {EGG_SPHERE_IDS,EGG_SPHERE_GENOMES,cloneSphereGenome,evaluateSphereCandidate,approveSphereCandidate,replicateSphere,rollbackSphere,distributeSphereContribution} from "../../lib/eggSphereReplication";
describe("EGG eight-sphere replication",()=>{
 it("binds all eight real spheres to both routes",()=>{
  expect(EGG_SPHERE_IDS).toHaveLength(8);
  for(const id of EGG_SPHERE_IDS){
   const genome=EGG_SPHERE_GENOMES[id];
   expect(genome.id).toBe(id);
   expect(genome.radialTarget).toBe("yolk");
   expect(genome.instructions).toContain(genome.hardBoundary);
  }
 });
 it("requires checks and author approval, supports rollback",()=>{
  const original=EGG_SPHERE_GENOMES.design;
  const candidate=cloneSphereGenome(original,{objective:"Refined objective"});
  expect(()=>replicateSphere(candidate)).toThrow();
  expect(()=>approveSphereCandidate(evaluateSphereCandidate(candidate,{quality:false}),"author")).toThrow();
  const approved=approveSphereCandidate(evaluateSphereCandidate(candidate,{quality:true,regression:true}),"author");
  expect(replicateSphere(approved).version).toBe(2);
  expect(rollbackSphere(approved)).toEqual(original);
 });
 it("sends one object to both channels",()=>{
  const result={text:"contribution"};
  const streams=distributeSphereContribution(result);
  expect(streams.sequential).toBe(streams.radial);
 });
});

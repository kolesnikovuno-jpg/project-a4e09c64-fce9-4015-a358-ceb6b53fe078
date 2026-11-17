import {describe,expect,it} from "vitest";
import {createEggProject} from "../../lib/eggEngine";
import {startEggFlowCycle,contributeEggFlowSphere} from "../../lib/eggFlowCycle";
import {
 eggYolkMorphologySchema,hasGroundedEggYolkMorphology,
 prepareGroundedEggYolkReview,contributeEggYolkReview,
} from "../../lib/eggYolkSemantic";
import {
 visualSeedFromText,blendEggYolkVisualSeed,buildEggYolkField,
} from "../../lib/eggYolkField";
import {buildEggAutomationPrompt,nextEggAutomationStep} from "../../lib/eggFlowAutomation";
import {buildEggYolkGeminiResponseSchema,eggOpenAiYolkSchema} from "../../../api/egg-flow-ai";

const at="2026-11-17T16:00:00.000Z";
function finished(){
 let p=startEggFlowCycle(createEggProject({
  id:"e509262f-38d5-4458-beb7-ac2f9fa6a284",
  title:"Неутилитарная нота",seed:"Неутилитарный элемент пространства — отдельная нота",
  at,
 }),{actor:"author",at});
 for(const sphere of ["marketing","legal","design","production","testDrive",
  "procurement","commerce","retail"] as const){
  p=contributeEggFlowSphere(p,{actor:"ai",at,sphere,evidence:"hypothesis",
   text:"Гипотеза сферы "+sphere+" о плотности, пустотах и отношениях в пространстве."});
 }
 return p;
}
const coefficients={
 density:.63,openness:.79,verticality:.52,tension:.48,
 asymmetry:.70,rotation:.33,pulse:.61,softness:.58,
};
function draft(p=finished()){
 const syn=p.flowCycles![0].synthesis!;
 const d=syn.first.find(s=>s.sphere==="design")!.resultId!;
 const pr=syn.second.find(s=>s.sphere==="production")!.resultId!;
 return {
  synthesisId:syn.id,
  summary:"Сферические выводы пока допускают лишь гипотезу морфологии без реальной проверки.",
  interpretations:[],
  limitations:["Отсутствуют подтверждённые пластические свойства и инженерная проверка."],
  morphology:{
   rationale:"Открытая асимметричная пространственная форма с локальным напряжением и пустотами.",
   sourceResultIds:[d,pr],coefficients,
  },
 };
}
describe("EGG Yolk: grounded semantic morphology",()=>{
 it("stores morph coordinates with real citations from both completed branches",()=>{
  const p=finished(),input=draft(p);
  expect(hasGroundedEggYolkMorphology(p.flowCycles![0].synthesis!,input.morphology)).toBe(true);
  const clean=prepareGroundedEggYolkReview(p.flowCycles![0].synthesis!,input);
  expect(clean.discarded).toBe(0);
  const next=contributeEggYolkReview(p,{actor:"ai",at,draft:clean.draft});
  const review=next.flowCycles![0].semanticReview!;
  expect(review.morphology?.coefficients).toEqual(coefficients);
  expect(review.authorApproved).toBe(false);
  expect(review.dnaChanged).toBe(false);
  expect(next.level).toBe(1);
  const base=visualSeedFromText(p.seed.text);
  const target=blendEggYolkVisualSeed(base,coefficients,.62);
  expect(target.openness).not.toBe(base.openness);
  const before=buildEggYolkField({
   seed:base,identitySeed:base,manifestation:.3,variation:0,status:"manifested_field",
  });
  const after=buildEggYolkField({
   seed:target,identitySeed:base,manifestation:.3,variation:0,status:"manifested_field",
  });
  expect(before.particles).toHaveLength(after.particles.length);
  expect(before.particles[0].id).toBe(after.particles[0].id);
  expect(before.particles[0].position).not.toEqual(after.particles[0].position);
 });
 it("rejects single-branch, invented IDs and incomplete cycles without inventing evidence",()=>{
  const p=finished(),syn=p.flowCycles![0].synthesis!,valid=draft(p);
  const sameBranch={
   ...valid.morphology,
   sourceResultIds:syn.first.slice(0,2).map(s=>s.resultId!),
  };
  expect(hasGroundedEggYolkMorphology(syn,sameBranch)).toBe(false);
  expect(()=>contributeEggYolkReview(p,{actor:"ai",at,draft:{
    ...valid,morphology:sameBranch,
  }})).toThrow(/Morphology/);
  const bogus={...valid.morphology,sourceResultIds:["fake-result",syn.first[0].resultId!]};
  expect(hasGroundedEggYolkMorphology(syn,bogus)).toBe(false);
  const safe=prepareGroundedEggYolkReview(syn,{...valid,morphology:bogus});
  expect(safe.draft.morphology).toBeNull();
  expect(safe.draft.limitations.join(" ")).toMatch(/Морфология исключена/);
  expect(hasGroundedEggYolkMorphology({...syn,second:[...syn.second.slice(0,3),
    {...syn.second[3],resultId:null,status:"missing"}]},valid.morphology)).toBe(false);
  expect(eggYolkMorphologySchema.safeParse({...valid.morphology,
    coefficients:{...coefficients,density:1.9}}).success).toBe(false);
 });
 it("uses the EXISTING Yolk AI step and includes morphology in both provider schemas",()=>{
  const p=finished(),step=nextEggAutomationStep(p);
  expect(step.kind).toBe("yolk");
  if(step.kind!=="yolk")return;
  const prompt=buildEggAutomationPrompt(p,step);
  expect(prompt.instructions).toMatch(/MORPHOLOGY/);
  expect(prompt.instructions).toContain("EACH of the two completed flows");
  expect(JSON.stringify(buildEggYolkGeminiResponseSchema(p))).toContain("morphology");
  expect(JSON.stringify(eggOpenAiYolkSchema(p))).toContain("morphology");
 });
});

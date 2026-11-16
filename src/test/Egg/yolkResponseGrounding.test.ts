import {describe,it,expect} from "vitest";
import {createEggProject} from "../../lib/eggEngine";
import {startEggFlowCycle,contributeEggFlowSphere} from "../../lib/eggFlowCycle";
import {contributeEggYolkReview,prepareGroundedEggYolkReview} from "../../lib/eggYolkSemantic";
import {buildEggYolkGeminiResponseSchema} from "../../../api/egg-flow-ai";

const at="2026-11-16T12:00:00.000Z";
const base=()=>{
 let p=startEggFlowCycle(createEggProject({
  id:"f0841bf8-528f-4afe-a225-de53204faf0b",
  title:"Неутилитарный элемент пространства",
  seed:"Сохранить авторскую выразительность и связь с пространством",
  at,
 }),{actor:"author",at});
 for(const sphere of ["marketing","legal","design","production","testDrive","procurement","commerce","retail"] as const)
  p=contributeEggFlowSphere(p,{actor:"ai",sphere,at,
   text:"Требует проверки гипотеза для "+sphere,evidence:"hypothesis"});
 return p;
};
const makeDraft=(p:ReturnType<typeof base>)=>{
 const s=p.flowCycles!.at(-1)!.synthesis!;
 const first=s.first[0].resultId!,second=s.second[0].resultId!;
 return {synthesisId:s.id,summary:"Сводный черновик ИИ. Совпадения и напряжения требуют проверки Автором.",
  interpretations:[
   {kind:"tension" as const,title:"Несовпадение ориентира и способа воплощения",
    explanation:"Два разных потока дают основания проверить соответствие конструкции замыслу, но не доказывают невозможность реализации.",
    sourceResultIds:[first,second],suggestedSphereTargets:["design" as const],
    verificationNeeded:"Уточнить пространственную версию и проверить конструкцию"},
  ],limitations:["Внутренние тексты не являются результатом независимой экспертизы."]};
};
describe("Gemini Yolk JSON schema and grounded import",()=>{
 it("constrains the actual synthesis ID and all reference IDs before generation",()=>{
  const p=base(),s=p.flowCycles!.at(-1)!.synthesis!;
  const schema=buildEggYolkGeminiResponseSchema(p);
  expect(schema.properties.synthesisId.enum).toEqual([s.id]);
  const sourceItems=schema.properties.interpretations.items.properties.sourceResultIds.items.enum;
  expect(sourceItems).toHaveLength(8);
  expect(sourceItems).toContain(s.first[0].resultId);
  expect(sourceItems).toContain(s.second[3].resultId);
  expect(schema.properties.interpretations.items.required).toContain("verificationNeeded");
 });
 it("accepts a review citing one real ID from each branch without changing Author decisions",()=>{
  const p=base(),draft=makeDraft(p);
  const prepared=prepareGroundedEggYolkReview(p.flowCycles!.at(-1)!.synthesis!,draft);
  expect(prepared.discarded).toBe(0);
  const updated=contributeEggYolkReview(p,{actor:"ai",at,draft:prepared.draft});
  expect(updated.flowCycles!.at(-1)!.semanticReview?.interpretations).toHaveLength(1);
  expect(updated.flowCycles!.at(-1)!.status).toBe("awaiting_author");
  expect(updated.seed.text).toBe(p.seed.text);
  expect(updated.level).toBe(1);
 });
 it("drops references not grounded in the original synthesis and discloses exclusion",()=>{
  const p=base(),s=p.flowCycles!.at(-1)!.synthesis!,draft=makeDraft(p);
  draft.interpretations.push({
   kind:"tension",title:"Вымышленное сопоставление",
   explanation:"Это сопоставление использует недопустимый идентификатор несуществующего результата.",
   sourceResultIds:["invented-result-id",s.first[1].resultId!],
   suggestedSphereTargets:[],verificationNeeded:"Найти действительные источники",
  });
  const result=prepareGroundedEggYolkReview(s,draft);
  expect(result.discarded).toBe(1);
  expect(result.draft.interpretations).toHaveLength(1);
  expect(result.draft.limitations.join(" ")).toContain("Отклонено интерпретаций");
  const saved=contributeEggYolkReview(p,{actor:"ai",at,draft:result.draft});
  expect(saved.flowCycles!.at(-1)!.semanticReview?.interpretations).toHaveLength(1);
 });
 it("does not create a false two-flow claim from only one branch",()=>{
  const p=base(),s=p.flowCycles!.at(-1)!.synthesis!,draft=makeDraft(p);
  draft.interpretations[0].sourceResultIds=[s.first[0].resultId!,s.first[1].resultId!];
  expect(()=>prepareGroundedEggYolkReview(s,draft)).toThrow("No grounded");
  expect(p.flowCycles!.at(-1)!.semanticReview).toBeUndefined();
 });
 it("will not salvage a review from the wrong synthesis",()=>{
  const p=base(),draft=makeDraft(p);
  expect(()=>prepareGroundedEggYolkReview(p.flowCycles!.at(-1)!.synthesis!,{
   ...draft,synthesisId:"synthesis-incorrect",
  })).toThrow("another synthesis");
 });
});

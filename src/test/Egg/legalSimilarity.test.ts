import {describe,it,expect} from "vitest";
import {createEggProject,proposeEggConcept,decideEggConcept} from "../../lib/eggEngine";
import {
  startEggFlowCycle,contributeEggFlowSphere,decideEggFlowCycle,currentEggFlowCycle,
} from "../../lib/eggFlowCycle";
import {
  EGG_IP_SEARCH_CATALOG,getEggLegalSimilaritySubject,
  validateEggLegalSimilarity,getEggLegalScreeningGaps,
} from "../../lib/eggLegalSimilarity";
import {buildEggSphereBrief,buildEggSphereIntelligencePrompt} from "../../lib/eggSphereIntelligence";
import {eggMutationSchema,readEggState,runEggMutation} from "../../lib/eggCommands";
import {eggMcpTools} from "../../lib/eggMcpProtocol";
import {buildEggDocumentationBundle} from "../../lib/eggDocumentation";
const at="2026-11-05T08:00:00Z";
const id="5935214a-2b2c-452f-b237-e65d4cac02ff";
const base=()=>createEggProject({id,title:"Light chair",seed:"Лёгкое кресло из дерева и льна",at});
const sphereOutput=(p:ReturnType<typeof base>,sphere:"marketing"|"design"|"testDrive"|"commerce"|"legal"|"production"|"procurement"|"retail")=>
  contributeEggFlowSphere(p,{actor:"ai",at,sphere,text:"Вывод "+sphere,evidence:"hypothesis"});
function finishFirst(){
 let p=startEggFlowCycle(base(),{actor:"author",at});
 for(const sphere of ["marketing","legal","design","production","testDrive","procurement","commerce","retail"] as const)
  p=sphereOutput(p,sphere);
 return p;
}
const reviewed={
 territories:["Украина"],
 searches:[{
   category:"registered_designs" as const,
   sourceName:"WIPO Global Design Database",
   sourceUrl:"https://www.wipo.int/en/web/global-design-database/index",
   query:"chair plywood sling",
   searchedAt:"2026-11-04T15:30:00Z",
   scopeNote:"Поиск опубликованных образцов с близкой формой кресла",
 }],
 candidates:[{
   kind:"industrial_design" as const,
   title:"Проверяемый образец (фиктивный тест)",
   sourceUrl:"https://example.org/design/123",
   similarity:"Сходство изгиба боковых элементов и силуэта опоры",
   differences:"Различается форма сиденья и узел крепления ткани",
 }],
 limitations:["Пример моделирует запись, а не подтверждает реальные регистрационные сведения."],
};
describe("EGG Legal prior-art and form overlap screening",()=>{
 it("offers official source links and never labels this as an automatic registry scan",()=>{
  expect(EGG_IP_SEARCH_CATALOG.map(s=>s.id)).toEqual(["wipo_designs","wipo_brands","epo_patents"]);
  expect(EGG_IP_SEARCH_CATALOG.every(s=>s.url.startsWith("https://"))).toBe(true);
  const p=startEggFlowCycle(base(),{actor:"author",at});
  const legal=buildEggSphereBrief(p,"legal");
  expect(legal.legalSimilarity?.searchStatus).toBe("not_started_by_egg");
  expect(legal.legalSimilarity?.designResultId).toBeNull();
  expect(legal.legalSimilarity?.sourceCatalog).toHaveLength(3);
  expect(buildEggSphereIntelligencePrompt(p,"legal").instructions).toContain("prior-art");
 });
 it("keeps this-cycle new Design invisible to parallel Legal, flags missing screening in Yolk",()=>{
  let p=startEggFlowCycle(base(),{actor:"author",at});
  p=sphereOutput(p,"marketing");
  p=sphereOutput(p,"design");
  expect(getEggLegalSimilaritySubject(p).designResultId).toBeNull();
  expect(buildEggSphereBrief(p,"legal").legalSimilarity?.designResultId).toBeNull();
  for(const sphere of ["legal","production","testDrive","procurement","commerce","retail"] as const)
    p=sphereOutput(p,sphere);
  const synth=currentEggFlowCycle(p)!.synthesis!;
  expect(synth.gaps.some(g=>g.includes("структурированная проверка сходства"))).toBe(true);
  expect(synth.second[0].requiresRecheck).toBe(true);
  expect(p.level).toBe(1);
 });
 it("only prior Yolk-synthesized version can be screened and linked candidate is not a legal verdict",()=>{
  let p=finishFirst();
  const originalDesign=currentEggFlowCycle(p)!.first[1].result!.id;
  p=decideEggFlowCycle(p,{actor:"author",at,outcome:"revise",reason:"Проверить схожесть кресла",addressedSpheres:["legal"]});
  const subject=getEggLegalSimilaritySubject(p);
  expect(subject.designResultId).toBe(originalDesign);
  expect(subject.designCycleId).toBe(p.flowCycles![0].id);
  expect(buildEggSphereBrief(p,"legal").legalSimilarity?.designResultId).toBe(originalDesign);
  p=contributeEggFlowSphere(p,{actor:"ai",at,sphere:"legal",
    text:"Сообщено о потенциальном сходстве с существующим дизайном",
    evidence:"hypothesis",legalSimilarity:reviewed});
  const review=currentEggFlowCycle(p)!.second[0].result!.legalSimilarity!;
  expect(review.subject.designResultId).toBe(originalDesign);
  expect(review.status).toBe("research_reported_unverified");
  expect(review.candidates[0].status).toBe("possible_overlap_unverified");
  expect(review.conclusion).toBe("not_a_legal_clearance");
  expect(currentEggFlowCycle(p)?.synthesis?.second[0].legalSimilarity).toEqual(review);
  expect(currentEggFlowCycle(p)?.synthesis?.gaps.some(g=>g.includes("правовая оценка"))).toBe(true);
  const bundle=buildEggDocumentationBundle({project:p,revision:42,origin:"yolk",generatedAt:at});
  const report=new TextDecoder().decode(bundle.files.find(x=>x.path==="docs/06-flow-cycles.md")!.bytes);
  expect(report).toContain("Проверяемый образец");
  expect(report).toContain("Сходство изгиба");
  expect(report).toContain("Отличия");
  expect(report).toContain("не означает нарушение");
 });
 it("marks a previous Legal similarity review as outdated after a new parallel Design",()=>{
  let p=finishFirst();
  p=decideEggFlowCycle(p,{actor:"author",at,outcome:"revise",reason:"Уточнить форму и защиту",
    addressedSpheres:["design","legal"]});
  const priorDesign=getEggLegalSimilaritySubject(p).designResultId;
  p=contributeEggFlowSphere(p,{actor:"ai",at,sphere:"legal",
     text:"Предварительное сравнение старой формы",evidence:"hypothesis",legalSimilarity:reviewed});
  p=contributeEggFlowSphere(p,{actor:"ai",at,sphere:"design",
    text:"Обновлённая форма",evidence:"hypothesis"});
  const synth=currentEggFlowCycle(p)!.synthesis!;
  expect(synth.first[1].resultId).not.toBe(priorDesign);
  expect(synth.second[0].legalSimilarity?.subject.designResultId).toBe(priorDesign);
  expect(synth.second[0].requiresRecheck).toBe(true);
  expect(synth.gaps.some(g=>g.includes("актуальная версия Дизайна"))).toBe(true);
 });
 it("prevents unsupported results, malicious URLs and use by non-Legal spheres",()=>{
  const p=startEggFlowCycle(base(),{actor:"author",at});
  const noSearch=validateEggLegalSimilarity({
    territories:[],limitations:["Нужно определить территорию и загрузить модель."],
  },p);
  expect(noSearch.status).toBe("no_search_reported");
  expect(getEggLegalScreeningGaps("cycle-result-9",noSearch).length).toBeGreaterThan(0);
  expect(()=>validateEggLegalSimilarity({...reviewed,
    candidates:[{...reviewed.candidates[0],sourceUrl:"javascript:alert(1)"}]},p)).toThrow();
  expect(()=>validateEggLegalSimilarity({...reviewed,searches:[]},p)).toThrow(/documented search/);
  expect(()=>contributeEggFlowSphere(p,{
    actor:"ai",at,sphere:"marketing",text:"abc",evidence:"hypothesis",legalSimilarity:reviewed,
  })).toThrow(/Only Legal/);
  expect(p.flowCycles?.[0].first[0].result).toBeUndefined();
 });
 it("accepts authenticated MCP Legal data, rejects fabricated clearance fields, preserves prior state",()=>{
  const command={command:"complete_flow_sphere",projectId:id,expectedRevision:1,
    sphere:"legal",text:"Имеется сходство для исследования",evidence:"hypothesis",legalSimilarity:reviewed};
  expect(eggMutationSchema.safeParse(command).success).toBe(true);
  expect(eggMutationSchema.safeParse({...command,
    legalSimilarity:{...reviewed,clearance:"no_infringement"}}).success).toBe(false);
  const p=startEggFlowCycle(base(),{actor:"author",at});
  const a={kind:"agent" as const,projectId:id,ownerId:"owner",
    scopes:["contribute" as const]};
  const updated=runEggMutation(p,eggMutationSchema.parse(command),a,"owner",at);
  expect(readEggState(updated).flowCycles[0].second[0].result?.legalSimilarity?.conclusion).toBe("not_a_legal_clearance");
  expect(p.flowCycles![0].second[0].result).toBeUndefined();
  const mcp=eggMcpTools.find(t=>t.name==="egg_contribute_sphere");
  expect(mcp?.inputSchema.properties.legalSimilarity).toBeDefined();
 });
 it("first-cycle approved concept image can be used without inventing a physical model",()=>{
  let p=base();
  p=proposeEggConcept(p,{actor:"ai",at,text:"Лёгкое кресло",
    visualUrl:"https://example.org/form.png",questions:[]});
  const conceptId=p.concepts![0].id;
  p=decideEggConcept(p,{actor:"author",at,conceptId,outcome:"accept",reason:"Основа принята"});
  p=startEggFlowCycle(p,{actor:"author",at});
  const subject=getEggLegalSimilaritySubject(p);
  expect(subject.conceptVisualUrl).toBe("https://example.org/form.png");
  expect(subject.designResultId).toBeNull();
 });
});

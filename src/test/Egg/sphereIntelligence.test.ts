import {describe,expect,it} from "vitest";
import {createEggProject} from "../../lib/eggEngine";
import {
 startEggFlowCycle,contributeEggFlowSphere,decideEggFlowCycle,currentEggFlowCycle,
} from "../../lib/eggFlowCycle";
import {
 EGG_SPHERE_LENSES,buildEggSphereBrief,buildEggSphereIntelligencePrompt,
} from "../../lib/eggSphereIntelligence";
import {eggMutationSchema,runEggMutation,readEggState} from "../../lib/eggCommands";
import {buildEggDocumentationBundle} from "../../lib/eggDocumentation";
import {eggMcpTools} from "../../lib/eggMcpProtocol";
const id="739b6b30-73c1-41aa-9412-0c5dbe8ce5aa",at="2026-11-05T16:15:00Z";
const seed="Лёгкое кресло из дерева и льна. Низкая посадка, отдых";
const base=()=>createEggProject({id,title:"Кресло",seed,at});
const issue={
 domain:"Защита потребителя",
 question:"Какая юрисдикция и какие правила безопасности применимы к будущему креслу?",
 basis:"Страна реализации и тип производства пока не указаны.",
 sourceRefs:[],
};
const contribute=(p:ReturnType<typeof base>,sphere: "marketing"|"legal"|"design"|"production"|"testDrive"|"procurement"|"commerce"|"retail",extra?:{discoveredQuestions?:Array<typeof issue>})=>
 contributeEggFlowSphere(p,{actor:"ai",at,sphere,text:"Предварительный результат "+sphere,
 evidence:"hypothesis",...extra});
function all(){
 let p=startEggFlowCycle(base(),{actor:"author",at});
 for(const sphere of ["marketing","legal","design","production","testDrive","procurement","commerce","retail"] as const)
  p=contribute(p,sphere,sphere==="legal"?{discoveredQuestions:[issue]}:undefined);
 return p;
}
describe("Independent questions in each EGG sphere",()=>{
 it("specifies domain-focused curiosity without claiming automatic model training",()=>{
  expect(Object.keys(EGG_SPHERE_LENSES)).toHaveLength(8);
  expect(EGG_SPHERE_LENSES.legal.focus).toContain("договоры и ответственность");
  expect(EGG_SPHERE_LENSES.legal.focus).toContain("юрисдикция и дата действия норм");
  expect(EGG_SPHERE_LENSES.commerce.focus).toContain("три уровня качества UNOcalc");
  expect(EGG_SPHERE_LENSES.design.boundary).toContain("Один");
  const p=startEggFlowCycle(base(),{actor:"author",at});
  const prompt=buildEggSphereIntelligencePrompt(p,"legal");
  expect(prompt.instructions).toContain("Independently detect");
  expect(prompt.instructions).toContain("jurisdiction");
  expect(prompt.input).toContain(seed);
  expect(prompt.input).toContain("model retraining");
 });
 it("never leaks the other branch before Yolk synthesis",()=>{
  let p=startEggFlowCycle(base(),{actor:"author",at});
  p=contribute(p,"marketing");
  p=contribute(p,"legal",{discoveredQuestions:[issue]});
  const brief=buildEggSphereBrief(p,"design");
  expect(brief.sameBranchContext).toHaveLength(1);
  expect(brief.sameBranchContext[0].sphere).toBe("marketing");
  expect(JSON.stringify(brief)).not.toContain("Защита потребителя");
  expect(()=>buildEggSphereBrief(p,"retail")).toThrow(/not the next active/);
 });
 it("records a legal question as unverified and exposes it once after both flows finish",()=>{
  const p=all();
  const cycle=currentEggFlowCycle(p)!;
  expect(cycle.status).toBe("awaiting_author");
  const q=cycle.second[0].result!.discoveredQuestions![0];
  expect(q).toMatchObject({
    domain:"Защита потребителя",question:issue.question,origin:"sphere",status:"unverified",
  });
  expect(cycle.synthesis?.openQuestions).toHaveLength(1);
  expect(cycle.synthesis?.openQuestions![0]).toMatchObject({
    sphere:"legal",provenance:"new",question:issue.question,
  });
  expect(cycle.synthesis?.dna.seed).toBe(seed);
  expect(p.level).toBe(1);
  expect(p.tasks).toHaveLength(0);
 });
 it("rejects invented confirmation, empty or repeated questions, and wrong sphere visits",()=>{
  let p=startEggFlowCycle(base(),{actor:"author",at});
  expect(()=>contributeEggFlowSphere(p,{actor:"ai",at,sphere:"legal",text:"x",
    evidence:"hypothesis",discoveredQuestions:[{...issue,question:"A"}]})).toThrow(/Invalid independently/);
  expect(()=>contributeEggFlowSphere(p,{actor:"ai",at,sphere:"legal",text:"x",
    evidence:"hypothesis",discoveredQuestions:[issue,issue]})).toThrow(/Duplicate discovered/);
  expect(()=>contributeEggFlowSphere(p,{actor:"ai",at,sphere:"legal",text:"x",
    evidence:"hypothesis",discoveredQuestions:Array(7).fill(issue)})).toThrow(/up to six/);
  expect(()=>contributeEggFlowSphere(p,{actor:"author",at,sphere:"legal",text:"x",
    evidence:"hypothesis",discoveredQuestions:[issue]})).toThrow(/belongs to AI/);
  expect(()=>contributeEggFlowSphere(p,{actor:"ai",at,sphere:"production",text:"x",
    evidence:"hypothesis",discoveredQuestions:[issue]})).toThrow(/next active station/);
  expect(p.flowCycles?.[0].second[0].result).toBeUndefined();
 });
 it("preserves question provenance on addressed subsequent iterations, without rerunning Legal",()=>{
  let p=all();
  p=decideEggFlowCycle(p,{actor:"author",at,outcome:"revise",
    reason:"Уточнить конструкцию кресла",addressedSpheres:["design"]});
  expect(currentEggFlowCycle(p)?.second.every(s=>s.status==="transited")).toBe(true);
  p=contribute(p,"design");
  const synth=currentEggFlowCycle(p)?.synthesis;
  expect(synth?.openQuestions).toHaveLength(1);
  expect(synth?.openQuestions?.[0]).toMatchObject({
    sphere:"legal",provenance:"inherited",sourceCycleId:p.flowCycles![0].id,
  });
  expect(p.level).toBe(1);
  expect(p.iteration).toBe(2);
  const doc=buildEggDocumentationBundle({project:p,revision:21,generatedAt:at,origin:"yolk"});
  const content=new TextDecoder().decode(doc.files.find(f=>f.path==="docs/06-flow-cycles.md")!.bytes);
  expect(content).toContain(issue.question);
  expect(content).toContain("не подтверждены");
 });
 it("accepts bounded questions in scoped REST and MCP contracts",()=>{
  const command={command:"complete_flow_sphere",projectId:id,expectedRevision:1,
    sphere:"legal",text:"Есть открытый вопрос",evidence:"hypothesis",discoveredQuestions:[issue]};
  expect(eggMutationSchema.safeParse(command).success).toBe(true);
  expect(eggMutationSchema.safeParse({...command,discoveredQuestions:[{...issue,status:"verified"}]}).success).toBe(false);
  let p=startEggFlowCycle(base(),{actor:"author",at});
  const asAI={kind:"agent" as const,projectId:id,ownerId:"owner",scopes:["contribute" as const]};
  p=runEggMutation(p,eggMutationSchema.parse(command),asAI,"owner",at);
  expect(readEggState(p).flowCycles[0].second[0].result?.discoveredQuestions).toHaveLength(1);
  const tool=eggMcpTools.find(t=>t.name==="egg_contribute_sphere");
  expect(tool?.inputSchema.properties.discoveredQuestions).toBeDefined();
 });
});
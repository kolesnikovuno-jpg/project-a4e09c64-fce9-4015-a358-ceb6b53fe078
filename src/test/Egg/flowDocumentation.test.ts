import {describe,expect,it} from "vitest";
import {createEggProject} from "../../lib/eggEngine";
import {startEggFlowCycle,contributeEggFlowSphere,decideEggFlowCycle} from "../../lib/eggFlowCycle";
import {buildEggDocumentationBundle,buildEggProductMemory,findDocumentationGaps} from "../../lib/eggDocumentation";

const at="2026-11-05T12:00:00.000Z";
const project=()=>createEggProject({id:"efc6e273-7f82-45ae-bb24-b2ac16e1a7ca",seed:"Лёгкое кресло",at});
const text=new TextDecoder();
describe("EGG new flow history in both documentation archives",()=>{
  it("contains all eight stations, metadata, transit and author decisions",()=>{
    let p=startEggFlowCycle(project(),{actor:"author",at});
    for(const sphere of ["marketing","legal","design","production","testDrive","procurement","commerce","retail"] as const){
      p=contributeEggFlowSphere(p,{actor:"ai",sphere,text:"Вывод "+sphere,evidence:"hypothesis",at});
    }
    p=decideEggFlowCycle(p,{actor:"author",outcome:"revise",reason:"Уточнить форму",addressedSpheres:["design"],at});
    p=contributeEggFlowSphere(p,{actor:"ai",sphere:"design",text:"Уточнённый эскиз",evidence:"hypothesis",at});
    const memory=buildEggProductMemory(p);
    expect(memory.some(e=>e.description==="Уточнённый эскиз"&&e.iteration===2)).toBe(true);
    expect(memory.some(e=>e.description==="Уточнить форму"&&e.level===1)).toBe(true);
    expect(findDocumentationGaps(p).some(g=>g.includes("решения Автора"))).toBe(true);
    const author=buildEggDocumentationBundle({project:p,revision:17,generatedAt:at,origin:"author"});
    const yolk=buildEggDocumentationBundle({project:p,revision:17,generatedAt:at,origin:"yolk"});
    const doc=author.files.find(f=>f.path==="docs/06-flow-cycles.md");
    const other=yolk.files.find(f=>f.path==="docs/06-flow-cycles.md");
    expect(doc).toBeDefined();
    expect(text.decode(doc!.bytes)).toBe(text.decode(other!.bytes));
    const report=text.decode(doc!.bytes);
    expect(report).toContain("Маркетинг → Дизайн → Тестдрайв → Коммерция");
    expect(report).toContain("Право → Производство → Комплектация → Ритейл");
    expect(report).toContain("Транзит");
    expect(report).toContain("Уточнённый эскиз");
    expect(report).toContain("Уточнить форму");
    expect(report).toContain("Желток / встреча потоков");
    const source=JSON.parse(text.decode(author.files.find(f=>f.path==="data/project-snapshot.json")!.bytes));
    expect(source.flowCycles).toHaveLength(2);
    expect(author.manifest.sourceCounts.findings).toBe(9);
    expect(author.manifest.sourceCounts.decisions).toBe(1);
    expect(author.manifest.documentStatus).toBe("draft_not_approved");
  });
});
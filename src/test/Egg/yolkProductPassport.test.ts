import {describe,expect,it} from "vitest";
import {createEggProject,proposeEggConcept,decideEggConcept} from "../../lib/eggEngine";
import {startEggFlowCycle,contributeEggFlowSphere,decideEggFlowCycle} from "../../lib/eggFlowCycle";
import {buildEggYolkProductProjection} from "../../lib/eggYolkState";
import {buildEggDocumentationBundle} from "../../lib/eggDocumentation";
const at="2026-11-05T17:00:00Z",id="01b3d29f-bfc4-41ed-b31a-2e0db7fa2fe9";
const original=()=>createEggProject({id,seed:"Лёгкое кресло для отдыха; фанера, лён.",title:"Кресло",at});
function complete(p=original()){
  p=startEggFlowCycle(p,{actor:"author",at});
  for(const sphere of ["marketing","legal","design","production","testDrive","procurement","commerce","retail"] as const)
    p=contributeEggFlowSphere(p,{actor:"ai",sphere,evidence:"hypothesis",
      text:"Исследование "+sphere,at,
      discoveredQuestions:sphere==="testDrive"
        ?[{domain:"Эргономика",question:"Нужна физическая проверка посадки",
            basis:"Оценка пока виртуальна."}]:[]});
  return p;
}
describe("Yolk product passport / source integrity",()=>{
  it("does not invent conclusions, results or an approved 3D model before a cycle",()=>{
    const p=original(),y=buildEggYolkProductProjection(p);
    expect(y.phase).toBe("not_started");
    expect(y.synthesisOrigin).toBe("none");
    expect(y.dna.text).toBe(p.seed.text);
    expect(y.counts).toMatchObject({missing:8,new:0,inherited:0,questionCount:0});
    expect(y.visual).toMatchObject({type:"local_preview_only",url:null,approvedForProject:false});
    expect(y.checks).toHaveLength(0);
    expect(y.conclusion).toBe("projection_not_a_certification");
  });
  it("maps all eight results with source ids; raises explicit checks, not invented contradictions",()=>{
    const p=complete(),y=buildEggYolkProductProjection(p);
    expect(y.cycleId).toBe(p.flowCycles![0].id);
    expect(y.phase).toBe("awaiting_author");
    expect(y.synthesisOrigin).toBe("current");
    expect(y.counts).toMatchObject({missing:0,new:8,questionCount:1});
    expect(y.spheres).toHaveLength(8);
    expect(y.spheres.every(s=>s.sourceCycleId===y.cycleId&&s.resultId?.startsWith("cycle-result-"))).toBe(true);
    expect(y.checks.map(x=>x.id)).toEqual(["legal_form","production_form","market_retail","cost_resources"]);
    expect(y.checks.find(x=>x.id==="legal_form")?.status).toBe("attention");
    expect(y.checks.find(x=>x.id==="production_form")?.status).toBe("to_compare");
    expect(y.checks.find(x=>x.id==="market_retail")?.note).toContain("не устанавливается");
    expect(y.checks.find(x=>x.id==="cost_resources")?.note).toContain("свободный текст");
    expect(y.questions[0]).toMatchObject({sphere:"testDrive",domain:"Эргономика",provenance:"new"});
    expect(p.level).toBe(1);
    const doc=buildEggDocumentationBundle({project:p,revision:18,origin:"yolk",generatedAt:at});
    const txt=new TextDecoder().decode(doc.files.find(x=>x.path==="docs/06-flow-cycles.md")!.bytes);
    expect(txt).toContain("Паспорт состояния продукта");
    expect(txt).toContain("Форма ↔ Производство");
    expect(txt).toContain("Исследование retail");
  });
  it("distinguishes previous synthesized version from a new running targeted iteration",()=>{
    let p=complete();
    p=decideEggFlowCycle(p,{actor:"author",outcome:"revise",reason:"Уточнить форму",
      addressedSpheres:["design"],at});
    const y=buildEggYolkProductProjection(p);
    expect(y.phase).toBe("in_progress");
    expect(y.synthesisOrigin).toBe("previous");
    expect(y.counts.new).toBe(8);
    expect(y.cycleId).toBe(p.flowCycles![0].id);
    expect(y.spheres.find(s=>s.sphere==="design")?.summary).toContain("Исследование design");
    expect(p.flowCycles![1].first[1].status).toBe("awaiting_result");
  });
  it("respects approved concept visual reference, refuses provisional proposal as approved",()=>{
    let p=original();
    p=proposeEggConcept(p,{actor:"ai",text:"Кресло из ткани и фанеры",
      visualUrl:"https://example.com/concept.png",questions:[],at});
    expect(buildEggYolkProductProjection(p).visual.type).toBe("local_preview_only");
    p=decideEggConcept(p,{actor:"author",conceptId:p.concepts![0].id,outcome:"accept",reason:"Принял",at});
    const y=buildEggYolkProductProjection(p);
    expect(y.visual.type).toBe("approved_concept_image");
    expect(y.visual.url).toBe("https://example.com/concept.png");
    expect(y.visual.approvedForProject).toBe(true);
    expect(y.visual.warning).toContain("Не является утверждённой 3D-моделью");
  });
  it("retains immutable DNA and requires Author decision for level progression",()=>{
    const p=complete();
    const y=buildEggYolkProductProjection(p);
    expect(y.dna.text).toBe(original().seed.text);
    expect(p.level).toBe(1);
    expect(p.flowCycles![0].status).toBe("awaiting_author");
    const next=decideEggFlowCycle(p,{actor:"author",outcome:"accept",reason:"Утверждаю",at});
    expect(next.level).toBe(2);
    expect(buildEggYolkProductProjection(next).phase).toBe("accepted");
    expect(y.dna.text).toBe(buildEggYolkProductProjection(next).dna.text);
  });
});
// @vitest-environment jsdom
import {afterEach,describe,expect,it} from "vitest";
import {cleanup,render,screen} from "@testing-library/react";
import {createEggProject,type EggProject,type EggTask,type SphereId} from "../../lib/eggEngine";
import {
  startEggFlowCycle,contributeEggFlowSphere,decideEggFlowCycle,
} from "../../lib/eggFlowCycle";
import {buildEggEvolutionOverview} from "../../lib/eggEvolution";
import {eggMutationSchema,readEggState,runEggMutation} from "../../lib/eggCommands";
import {buildEggDocumentationBundle} from "../../lib/eggDocumentation";
import EggFlowCyclePanel from "../../components/egg/EggFlowCyclePanel";

const id="01b3d29f-bfc4-41ed-b31a-2e0db7fa2fe9";
const t0="2026-11-05T10:00:00Z",t1="2026-11-05T12:00:00Z",t2="2026-11-06T10:00:00Z";
const ownerId="owner-local-test";
const author={kind:"author" as const,ownerId};
const agent={kind:"agent" as const,ownerId,projectId:id,scopes:["read" as const,"contribute" as const]};
const routes=["marketing","legal","design","production","testDrive","procurement","commerce","retail"] as const;
const base=():EggProject=>{
  const p=createEggProject({
    id,title:"Кресло A «Объятие»",seed:"Лёгкое кресло для отдыха, медитации и расслабления; воздушная форма, натуральный лён.",at:t0,
  });
  const old:EggTask={id:"task-8",status:"returned",from:"marketing",sphere:"design",
    question:"Исследовать открытый силуэт",initiatedBy:"ai",openedAt:t0,level:1,iteration:1,
    findings:[{id:"finding-10",taskId:"task-8",
      text:"Исходный дизайн: открытый контур, тканевая чаша — свойства не проверены.",
      evidence:"hypothesis",sourceRefs:[],submittedBy:"ai",submittedAt:t0}],decisions:[]};
  return {...p,tasks:[old],
    concepts:[{id:"concept-12",text:"Кресло A «Объятие» из фанеры и льна, конструктивные вопросы открыты.",
      proposedBy:"ai",createdAt:t0,level:1,iteration:1,status:"proposed",questions:[]}],
    nextSequence:20};
};
function first(){
  let p=startEggFlowCycle(base(),{actor:"author",at:t1});
  for(const sphere of routes)
    p=contributeEggFlowSphere(p,{actor:"ai",sphere,at:t1,
      text:"Исследовательский вывод "+sphere+" в первой итерации (проверка впереди).",
      evidence:"hypothesis"});
  return p;
}
function revised(){
  let p=first();
  p=decideEggFlowCycle(p,{actor:"author",outcome:"revise",
    reason:"Уточнить форму кресла и конструктивные ограничения",
    addressedSpheres:["design","production","testDrive"],at:t2});
  return p;
}
function completedRevision(){
  let p=revised();
  p=contributeEggFlowSphere(p,{actor:"ai",sphere:"design",at:t2,
    evidence:"hypothesis",text:"Пересмотренный дизайн с уточнённым открытым контуром."});
  p=contributeEggFlowSphere(p,{actor:"ai",sphere:"production",at:t2,
    evidence:"question",text:"Силовая схема требует прототипа и дополнительных испытаний."});
  p=contributeEggFlowSphere(p,{actor:"ai",sphere:"testDrive",at:t2,
    evidence:"question",text:"Физических испытаний эргономики ещё не проводилось."});
  return p;
}
function assessment(p:EggProject,change:Record<string,unknown>,identity=author){
  return runEggMutation(p,eggMutationSchema.parse({
    command:"assess_evolution",projectId:id,expectedRevision:23,
    fromCycleId:p.flowCycles?.[p.flowCycles.length-2]?.id??null,
    toCycleId:p.flowCycles?.[p.flowCycles.length-1]?.id,
    outcome:"inconclusive",dnaImpact:"not_assessed",
    reason:"Конструкция и эргономика пока не подтверждены испытаниями.",
    evidenceResultIds:[],...change,
  }),identity,ownerId,t2);
}
afterEach(cleanup);
describe("EGG / iteration Change Map / dynamic balance stage 2",()=>{
  it("shows only a source-grounded baseline for chair A before starting a cycle",()=>{
    const p=base(),view=buildEggEvolutionOverview(p);
    expect(view.hasCycles).toBe(false);
    expect(view.current).toBeNull();
    expect(view.baseline.workingConceptId).toBe("concept-12");
    expect(view.baseline.approvedConceptId).toBeNull();
    expect(view.baseline.legacySources).toMatchObject([{
      sphere:"design",id:"finding-10",recordType:"legacy_finding",
    }]);
    expect(p.evolutionAssessments).toBeUndefined();
    render(<EggFlowCyclePanel project={p} revision={13}/>);
    const el=screen.getByTestId("egg-evolution-baseline");
    expect(el.textContent).toContain("concept-12");
    expect(screen.queryByTestId("egg-evolution-save")).toBeNull();
  });
  it("compares cycle one with real historical findings, not invented improvement",()=>{
    const p=first(),overview=buildEggEvolutionOverview(p),c=overview.current!;
    expect(c.baselineKind).toBe("legacy");
    expect(c.deltas).toHaveLength(8);
    expect(c.deltas.find(d=>d.sphere==="design")).toMatchObject({
      status:"text_changed",
      before:{id:"finding-10",recordType:"legacy_finding"},
      after:{recordType:"cycle_result"},
      pendingVerification:true,
    });
    expect(c.deltas.find(d=>d.sphere==="retail")?.status).toBe("new_result");
    expect(c.assessment).toBeNull();
    expect(c.core.dnaMeaningAssessedAutomatically).toBe(false);
    expect(p.level).toBe(1);
  });
  it("preserves fixed routes, distinguishes ongoing changes from missing evidence",()=>{
    const p=revised(),c=buildEggEvolutionOverview(p).current!;
    expect(c.baselineKind).toBe("previous_cycle");
    expect(c.reason).toBe("Уточнить форму кресла и конструктивные ограничения");
    expect(c.requestedTargets).toEqual(["design","production","testDrive"]);
    expect(c.toStatus).toBe("running");
    expect(c.deltas.find(d=>d.sphere==="design")).toMatchObject({
      status:"awaiting_result",before:{recordType:"cycle_result"},
      after:null,authorRequested:true,
    });
    expect(c.deltas.find(d=>d.sphere==="production")?.status).toBe("awaiting_result");
    expect(c.deltas.find(d=>d.sphere==="marketing")?.status).toBe("inherited");
    expect(c.deltas.find(d=>d.sphere==="legal")?.status).toBe("inherited");
    expect(c.counts.changedText).toBe(0);
    expect(c.counts.awaiting).toBe(3);
    expect(()=>assessment(p,{})).toThrow(/Wait for Yolk/);
    expect(p.flowCycles![1].status).toBe("running");
  });
  it("compares only actual current and prior result IDs, never claims that new wording is better",()=>{
    const p=completedRevision(),c=buildEggEvolutionOverview(p).current!;
    expect(c.toStatus).toBe("awaiting_author");
    expect(c.deltas.find(d=>d.sphere==="design")).toMatchObject({
      status:"text_changed",authorRequested:true,
    });
    expect(c.deltas.find(d=>d.sphere==="testDrive")?.status).toBe("text_changed");
    expect(c.deltas.find(d=>d.sphere==="marketing")?.status).toBe("inherited");
    expect(c.deltas.find(d=>d.sphere==="retail")?.status).toBe("inherited");
    expect(c.counts.changedText).toBe(3);
    expect(c.counts.inherited).toBe(5);
    expect(c.assessment).toBeNull();
    expect(readEggState(p).evolution.current?.counts.changedText).toBe(3);
    render(<EggFlowCyclePanel project={p} revision={23} authorControls/>);
    const panel=screen.getByTestId("egg-evolution-map");
    expect(panel.textContent).toContain("Карта изменений");
    expect(screen.getByTestId("egg-evolution-provenance").textContent)
      .toContain("Уточнить форму кресла");
    expect(screen.getByTestId("egg-evolution-design").textContent)
      .toContain("Изменён текст вывода");
    expect(screen.getByTestId("egg-evolution-save")).toBeTruthy();
  });
  it("restricts judgments to Author, actual cycle IDs and linked new findings",()=>{
    const old=completedRevision();
    const comparison=buildEggEvolutionOverview(old).current!;
    const source=comparison.deltas.find(d=>d.sphere==="design")!.after!.id;
    expect(()=>assessment(old,{outcome:"improved",evidenceResultIds:[source]},agent))
      .toThrow(/Forbidden/);
    expect(()=>assessment(old,{outcome:"improved",evidenceResultIds:[]}))
      .toThrow(/new result/);
    expect(()=>assessment(old,{outcome:"improved",evidenceResultIds:["invalid-result"]}))
      .toThrow(/compared sources/);
    expect(()=>assessment(old,{toCycleId:"fake-cycle"})).toThrow(/does not match/);
    const p=assessment(old,{outcome:"improved",evidenceResultIds:[source],
      dnaImpact:"at_risk",
      reason:"Форма стала ближе к замыслу по мнению Автора, но устойчивость требует проверки."});
    expect(p.evolutionAssessments).toHaveLength(1);
    expect(p.evolutionAssessments![0]).toMatchObject({
      by:"author",outcome:"improved",dnaImpact:"at_risk",evidenceResultIds:[source],
    });
    expect(p.events.at(-1)?.kind).toBe("evolution_assessed");
    expect(p.seed.text).toBe(old.seed.text);
    expect(p.concepts?.[0].status).toBe("proposed");
    expect(p.flowCycles![1].status).toBe("awaiting_author");
    expect(p.level).toBe(1);
    expect(buildEggEvolutionOverview(p).current?.assessment?.id)
      .toBe(p.evolutionAssessments![0].id);
    expect(()=>assessment(p,{})).toThrow(/already has/);
    const report=buildEggDocumentationBundle({
      project:p,revision:24,origin:"yolk",generatedAt:t2,
    });
    const text=new TextDecoder().decode(report.files.find(f=>f.path==="docs/06-flow-cycles.md")!.bytes);
    expect(text).toContain("Карта изменений");
    expect(text).not.toContain("Автор рассмотрел");
    expect(text).toContain("Форма стала ближе");
    expect(text).toContain("finding-10");
    expect(text).toContain("Источник сравнения");
  });
  it("accepts honest inconclusive Author judgment without claiming a better product",()=>{
    const p=assessment(completedRevision(),{});
    expect(p.evolutionAssessments![0].outcome).toBe("inconclusive");
    expect(p.evolutionAssessments![0].dnaImpact).toBe("not_assessed");
    expect(p.evolutionAssessments![0].evidenceResultIds).toEqual([]);
  });
});

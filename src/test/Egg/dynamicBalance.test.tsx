// @vitest-environment jsdom
import {describe,expect,it,afterEach} from "vitest";
import {render,screen,cleanup} from "@testing-library/react";
import {
  createEggProject,EGG_EDGES,getActiveConcept,type EggProject,
  type EggTask,type EggConceptVersion,
} from "../../lib/eggEngine";
import {
  detectEggBalanceCandidates,buildEggBalanceOverview,
  eligibleEggBalanceVerificationSources,
} from "../../lib/eggDynamicBalance";
import {eggMutationSchema,readEggState,runEggMutation} from "../../lib/eggCommands";
import {startEggFlowCycle,contributeEggFlowSphere,decideEggFlowCycle} from "../../lib/eggFlowCycle";
import {buildEggDocumentationBundle} from "../../lib/eggDocumentation";
import EggFlowCyclePanel from "../../components/egg/EggFlowCyclePanel";

const at="2026-11-05T16:30:00Z",later="2026-11-06T12:00:00Z";
const projectId="01b3d29f-bfc4-41ed-b31a-2e0db7fa2fe9",ownerId="test-owner";
const agent={kind:"agent" as const,projectId,ownerId,scopes:["contribute" as const]};
const author={kind:"author" as const,ownerId};

function chairA():EggProject{
  const base=createEggProject({
    id:projectId,title:"Кресло A «Объятие»",
    seed:"Лёгкое кресло для отдыха, расслабления и медитации. Материалы: дерево, фанера, натуральный лён, латунные детали. Воздушная форма, мягкий контур, низкая посадка. Неизвестные размеры и конструктивные решения оставить открытыми.",
    at,
  });
  const concept:EggConceptVersion={
    id:"concept-12",text:"Кресло A «Объятие» — воздушная лёгкая форма с мягким открытым контуром и полулежачей низкой посадкой. Тканевая поддержка для расслабления. Размеры, конструктивная схема, узлы, натяжение ткани и эргономика пока открыты и требуют проверки.",
    status:"proposed",proposedBy:"ai",createdAt:at,level:1,iteration:1,questions:[],
  };
  const task:EggTask={
    id:"task-8",from:"marketing",sphere:"design",initiatedBy:"ai",
    question:"Исследовать направление A «Объятие», не изменяя исходную ДНК.",
    openedAt:at,level:1,iteration:1,status:"returned",decisions:[],
    findings:[{
      id:"finding-10",taskId:"task-8",submittedBy:"ai",submittedAt:at,
      evidence:"hypothesis",sourceRefs:[],
      text:"Дизайн A: визуальная лёгкость и открытый контур. Реальные конструктивные узлы, пути нагрузки и устойчивость ещё НЕ проверены. Тканевая поддержка и эргономика полулежачей посадки требуют макета и испытаний. Сечение элементов не определено.",
    }],
  };
  return {...base,concepts:[concept],tasks:[task],nextSequence:20};
}
const cmd=(p:EggProject,body:Record<string,unknown>,identity=author)=>
  runEggMutation(p,eggMutationSchema.parse({
    projectId:p.id,expectedRevision:13,...body,
  }),identity,ownerId,at);

afterEach(cleanup);
describe("Dynamic Balance v1 · chair A «Объятие»",()=>{
  it("detects two source-grounded *unverified* tensions without approving concept A",()=>{
    const p=chairA();
    const candidates=detectEggBalanceCandidates(p);
    expect(candidates.map(x=>x.key)).toEqual([
      "structural_lightness","textile_support_ergonomics",
    ]);
    expect(candidates[0]).toMatchObject({
      relatedSpheres:["design","production"],
      suggestedTargets:["design","production","testDrive"],
      sourceRefs:["concept-12","finding-10"],
      coreStatus:"author_review_required",
      priority:"needs_evidence",
    });
    expect(candidates[1]).toMatchObject({
      relatedSpheres:["design","testDrive"],
      sourceRefs:["concept-12","finding-10"],
    });
    expect(candidates[0].hypothesis).toContain("не обнаруженный дефект");
    expect(candidates[1].hypothesis).toContain("не доказанная");
    const overview=buildEggBalanceOverview(p);
    expect(overview.counts).toEqual({
      potential:2,tracked:0,resolved:0,dismissed:0,
    });
    expect(overview.core).toMatchObject({
      workingConceptId:"concept-12",approvedConceptId:null,
      assessment:"not_automatically_verified",
    });
    expect(getActiveConcept(p)).toBeUndefined();
    expect(readEggState(p).dynamicBalance.candidates).toHaveLength(2);
    expect(p.balanceTensions).toBeUndefined();
    expect(p.flowCycles).toBeUndefined();
    expect(p.level).toBe(1);
  });
  it("records a versioned hypothesis without accepting it; only Author changes status",()=>{
    const old=chairA();
    const p=cmd(old,{command:"record_balance_tension",key:"structural_lightness"},agent);
    expect(p.balanceTensions).toHaveLength(1);
    expect(p.balanceTensions![0]).toMatchObject({
      status:"proposed",severity:"unassessed",sourceRefs:["concept-12","finding-10"],
    });
    expect(p.balanceTensions![0].history).toHaveLength(1);
    expect(p.events.at(-1)?.kind).toBe("balance_tension_recorded");
    expect(p.seed.text).toBe(old.seed.text);
    expect(p.concepts?.[0].status).toBe("proposed");
    expect(p.level).toBe(1);
    expect(buildEggBalanceOverview(p).counts.potential).toBe(2);
    expect(()=>cmd(p,{command:"record_balance_tension",key:"structural_lightness"},agent))
      .toThrow(/already registered/);
    expect(()=>cmd(p,{command:"record_balance_tension",key:"invented_tension"},agent))
      .toThrow(/No source-backed/);
    expect(()=>cmd(p,{command:"decide_balance_tension",
      tensionId:p.balanceTensions![0].id,outcome:"track",
      severity:"high",reason:"Проверить силовую схему перед выбором формы."},agent)).toThrow(/Forbidden/);
    const next=cmd(p,{command:"decide_balance_tension",
      tensionId:p.balanceTensions![0].id,outcome:"track",
      severity:"medium",reason:"Проверить соответствие формы и силовой схемы."});
    expect(next.balanceTensions![0]).toMatchObject({status:"tracked",severity:"medium"});
    expect(next.balanceTensions![0].history.map(h=>h.action))
      .toEqual(["registered","tracked"]);
    expect(next.events.at(-1)?.kind).toBe("balance_tension_decided");
    const doc=buildEggDocumentationBundle({project:next,revision:15,origin:"yolk",generatedAt:at});
    const text=new TextDecoder().decode(doc.files.find(x=>x.path==="docs/06-flow-cycles.md")!.bytes);
    expect(text).toContain("Dynamic Balance v1");
    expect(text).toContain("Проверить соответствие формы и силовой схемы");
    expect(text).toContain("finding-10");
  });
  it("requires a LATER relevant observation before Author can resolve a tracked tension",()=>{
    let p=chairA();
    p=cmd(p,{command:"record_balance_tension",key:"structural_lightness"},agent);
    const tension=p.balanceTensions![0];
    expect(()=>cmd(p,{command:"decide_balance_tension",tensionId:tension.id,
      outcome:"resolve",reason:"Гипотеза закрыта без проверки.",
      verificationRefs:["finding-10"]})).toThrow(/first track/);
    p=cmd(p,{command:"decide_balance_tension",tensionId:tension.id,
      outcome:"track",reason:"Нужно исследовать конструктивную совместимость."});
    expect(eligibleEggBalanceVerificationSources(p,p.balanceTensions![0])).toHaveLength(0);
    expect(()=>cmd(p,{command:"decide_balance_tension",tensionId:tension.id,
      outcome:"resolve",reason:"Достаточно старого рисунка.",
      verificationRefs:["finding-10"]})).toThrow(/later observation/);
    p=startEggFlowCycle(p,{actor:"author",at:later});
    p=contributeEggFlowSphere(p,{actor:"ai",sphere:"marketing",at:later,
      text:"Маркетинговые предположения требуют проверки.",evidence:"hypothesis"});
    p=contributeEggFlowSphere(p,{actor:"ai",sphere:"legal",at:later,
      text:"Правовые вопросы требуют проверки.",evidence:"question"});
    p=contributeEggFlowSphere(p,{actor:"ai",sphere:"design",at:later,
      text:"Нужен натурный макет и силовой расчёт.",evidence:"hypothesis"});
    // A synthetic observation fixture stands in for a later recorded physical check.
    const observedAt="2026-11-06T12:10:00Z";
    p=contributeEggFlowSphere(p,{actor:"ai",sphere:"production",at:observedAt,
      text:"Наблюдение на проверочном макете, заданное тестовыми данными.",
      evidence:"observation"});
    const source=p.flowCycles![0].second[1].result!.id;
    expect(eligibleEggBalanceVerificationSources(p,p.balanceTensions![0])
      .map(x=>x.id)).toContain(source);
    const changed=decideFlowGuard(p,tension.id,source);
    expect(changed.balanceTensions![0].status).toBe("resolved");
    expect(changed.balanceTensions![0].history.at(-1)?.verificationRefs).toEqual([source]);
    expect(changed.flowCycles![0].status).toBe("running");
    expect(changed.level).toBe(1);
    expect(changed.seed.text).toBe(p.seed.text);
    expect(()=>cmd(changed,{command:"decide_balance_tension",tensionId:tension.id,
      outcome:"resolve",reason:"Повторно закрыть без причины.",verificationRefs:[source]}))
      .toThrow(/first track/);
  });
  it("keeps fixed topology: suggested cross-branch checks are only Author-selected revisit targets",()=>{
    const edges=JSON.stringify(EGG_EDGES);
    let p=chairA();
    const targets=detectEggBalanceCandidates(p)[0].suggestedTargets;
    p=startEggFlowCycle(p,{actor:"author",at:later});
    for(const sphere of ["marketing","legal","design","production","testDrive","procurement","commerce","retail"] as const)
      p=contributeEggFlowSphere(p,{actor:"ai",sphere,at:later,text:"Предварительный вывод "+sphere,
        evidence:"hypothesis"});
    expect(p.flowCycles![0].status).toBe("awaiting_author");
    p=decideEggFlowCycle(p,{actor:"author",outcome:"revise",reason:"Проверить форму и силовую схему",
      addressedSpheres:targets,at:later});
    expect(p.flowCycles![1].first.filter(v=>v.mode==="work").map(v=>v.sphere))
      .toEqual(["design","testDrive"]);
    expect(p.flowCycles![1].second.filter(v=>v.mode==="work").map(v=>v.sphere))
      .toEqual(["production"]);
    expect(JSON.stringify(EGG_EDGES)).toBe(edges);
    expect(p.level).toBe(1);
  });
  it("shows both chair tensions in the real Yolk panel before any cycle; never as confirmed",()=>{
    const p=chairA();
    render(<EggFlowCyclePanel project={p} revision={13} authorControls/>);
    const view=screen.getByTestId("egg-dynamic-balance");
    expect(view.textContent).toContain("Лёгкость формы ↔ конструктивная опора");
    expect(view.textContent).toContain("Тканевая поддержка ↔ проверка эргономики");
    expect(view.textContent).toContain("concept-12");
    expect(view.textContent).toContain("finding-10");
    expect(view.textContent).toContain("не доказанные дефекты");
    expect(screen.getByTestId("egg-balance-register-structural_lightness")).toBeTruthy();
    expect(screen.getByTestId("egg-balance-register-textile_support_ergonomics")).toBeTruthy();
    expect(p.balanceTensions).toBeUndefined();
  });
  it("keeps the Yolk read-only and prohibits Author-only controls in non-Author view",()=>{
    render(<EggFlowCyclePanel project={chairA()} revision={13}/>);
    expect(screen.getByTestId("egg-dynamic-balance")).toBeTruthy();
    expect(screen.queryByTestId("egg-balance-register-structural_lightness")).toBeNull();
  });
});
function decideFlowGuard(p:EggProject,tensionId:string,source:string){
  return runEggMutation(p,eggMutationSchema.parse({
    command:"decide_balance_tension",projectId:p.id,expectedRevision:27,
    tensionId,outcome:"resolve",reason:"Автор рассмотрел новый прототипный источник.",
    verificationRefs:[source],
  }),author,ownerId,"2026-11-06T12:11:00Z");
}

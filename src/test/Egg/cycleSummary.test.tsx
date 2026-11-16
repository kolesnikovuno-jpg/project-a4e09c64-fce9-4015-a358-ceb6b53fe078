// @vitest-environment jsdom
import {afterEach,describe,expect,it} from "vitest";
import {cleanup,render,screen} from "@testing-library/react";
import {createEggProject} from "../../lib/eggEngine";
import {startEggFlowCycle,contributeEggFlowSphere,currentEggFlowCycle} from "../../lib/eggFlowCycle";
import {readEggCycleSummary} from "../../components/egg/EggCycleSummary";
import EggCycleSummary from "../../components/egg/EggCycleSummary";

afterEach(cleanup);
const at="2026-11-14T17:17:12.879Z";
const create=()=>createEggProject({id:"01b3d29f-bfc4-41ed-b31a-2e0db7fa2fe9",
 title:"Кресло A",seed:"Лёгкое кресло для отдыха. Размеры и конструкция не подтверждены.",at});
const order=["marketing","legal","design","production","testDrive","procurement","commerce","retail"] as const;
const finish=(approved=false)=>{
 let p=startEggFlowCycle(create(),{actor:"author",at,
  ...(approved?{ideaHandoff:{
   intent:"Авторское намерение",workingDna:"Воздушная форма и уединение",
   constraints:"Без выдуманных размеров",materialInsight:"Мягкость и пустота",
   materials:[],
  }}:{})});
 for(const sphere of order){
  p=contributeEggFlowSphere(p,{actor:"ai",sphere,at,
   text:"Предположение из "+sphere+"; техническая проверка не проводилась.",
   evidence:"hypothesis",
   discoveredQuestions:[{domain:sphere,question:"Какие параметры требуется проверить для "+sphere+"?"}],
  });
 }
 return p;
};

describe("Readable EGG cycle summary",()=>{
 it("clearly marks the old eight-sphere cycle as not originating from the new Idea handoff",()=>{
  const p=finish(),c=currentEggFlowCycle(p)!;
  const view=readEggCycleSummary(p,c);
  expect(view).toMatchObject({
   source:"legacy_cycle",completed:8,total:8,questionsCount:8,
   hasSynthesis:true,started:"2026-11-14",
  });
  expect(view.review).toBeUndefined();
  expect(view.tensions).toHaveLength(0);
  expect(view.examples).toHaveLength(3);
  render(<EggCycleSummary project={p} cycle={c}/>);
  expect(screen.getByTestId("egg-cycle-progress").textContent).toContain("8/8");
  expect(screen.getByTestId("egg-cycle-legacy-warning").textContent).toContain("не содержит");
  expect(screen.getByTestId("egg-cycle-review-status").textContent).toContain("ещё не зарегистрирован");
  expect(screen.getByTestId("egg-cycle-tensions").textContent).toContain("структурные пробелы");
  expect(screen.getByTestId("egg-cycle-open-questions").textContent).toContain("8 открытых вопросов");
  expect(screen.getByTestId("egg-cycle-next-step").textContent).toContain("Решение Автора");
 });
 it("marks an approved Idea packet separately from the original project seed",()=>{
  const p=finish(true),c=currentEggFlowCycle(p)!;
  const view=readEggCycleSummary(p,c);
  expect(view.source).toBe("author_handoff");
  expect(view.reference).toBe("Воздушная форма и уединение");
  expect(p.seed.text).toContain("Лёгкое кресло");
  render(<EggCycleSummary project={p} cycle={c}/>);
  expect(screen.queryByTestId("egg-cycle-legacy-warning")).toBeNull();
  expect(screen.getByText(/Рабочая версия утверждена Автором/)).toBeTruthy();
 });
 it("shows honestly incomplete processing without invented synthesis or contradictions",()=>{
  const p=startEggFlowCycle(create(),{actor:"author",at}),c=currentEggFlowCycle(p)!;
  const view=readEggCycleSummary(p,c);
  expect(view.completed).toBe(0);
  expect(view.hasSynthesis).toBe(false);
  expect(view.tensions).toHaveLength(0);
  render(<EggCycleSummary project={p} cycle={c}/>);
  expect(screen.getByTestId("egg-cycle-review-status").textContent).toContain("Ожидаем завершения");
  expect(screen.getByTestId("egg-cycle-open-questions").textContent).toContain("0 открытых вопросов");
 });
});

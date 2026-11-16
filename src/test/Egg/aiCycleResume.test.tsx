// @vitest-environment jsdom
import {afterEach,describe,it,expect,vi} from "vitest";
import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import {createEggProject} from "../../lib/eggEngine";
import {startEggFlowCycle,contributeEggFlowSphere,decideEggFlowCycle} from "../../lib/eggFlowCycle";
import EggFlowCyclePanel from "../../components/egg/EggFlowCyclePanel";

vi.mock("@supabase/supabase-js",()=>({createClient:vi.fn(()=>({
 auth:{getSession:async()=>({data:{session:{access_token:"test-session"}}})},
}))}));
vi.mock("../../lib/eggAiPacing",()=>({
 waitForEggAiRequest:vi.fn(async()=>true),
 postponeEggAiRequests:vi.fn(),
}));

afterEach(()=>{cleanup();vi.unstubAllGlobals();});
const projectId="f0841bf8-528f-4afe-a225-de53204faf0b";
const at="2026-11-16T12:00:00.000Z";
const finished=()=>{
 let project=startEggFlowCycle(createEggProject({id:projectId,
  title:"Новая пространственная нота",seed:"Неутилитарный элемент пространства",at
 }),{actor:"author",at});
 for(const sphere of ["marketing","legal","design","production","testDrive","procurement","commerce","retail"] as const){
  project=contributeEggFlowSphere(project,{actor:"ai",sphere,at,
   text:"Гипотеза "+sphere,evidence:"hypothesis"});
 }
 return project;
};
describe("Resume completed EGG branches without charging Gemini for preflight",()=>{
 it("sends only the missing Yolk step; never re-starts or repeats 8 saved sphere calls",async()=>{
  const calls:Array<{url:string;body?:Record<string,unknown>}>=[]; 
  vi.stubGlobal("fetch",vi.fn(async(url:string,init?:{body?:string})=>{
   const body=init?.body?JSON.parse(init.body) as Record<string,unknown>:undefined;
   calls.push({url,body});
   if(url==="/api/egg-config")return {ok:true,json:async()=>({supabaseUrl:"https://example.test",publishableKey:"anon"})};
   if(url==="/api/egg-flow-ai")return {ok:true,status:200,json:async()=>({
    ok:true,revision:11,done:true,completed:{kind:"yolk"},next:{kind:"done"}
   })};
   throw Error("Unexpected "+url);
  }));
  render(<EggFlowCyclePanel project={finished()} revision={10} authorControls/>);
  fireEvent.click(screen.getByTestId("egg-ai-run-cycle"));
  await waitFor(()=>expect(calls.filter(x=>x.url==="/api/egg-flow-ai")).toHaveLength(1));
  expect(calls.find(x=>x.url==="/api/egg-flow-ai")?.body).toEqual({
   projectId,expectedRevision:10,
  });
  expect(calls.every(x=>x.body?.mode!=="preflight")).toBe(true);
  expect(calls.every(x=>x.url!=="/api/egg")).toBe(true);
 });
 it("keeps results safe and reports provider 429 without repeated requests",async()=>{
  const calls:Array<{url:string;body?:Record<string,unknown>}>=[]; 
  vi.stubGlobal("fetch",vi.fn(async(url:string,init?:{body?:string})=>{
   const body=init?.body?JSON.parse(init.body) as Record<string,unknown>:undefined;
   calls.push({url,body});
   if(url==="/api/egg-config")return {ok:true,json:async()=>({supabaseUrl:"https://example.test",publishableKey:"anon"})};
   if(url==="/api/egg-flow-ai")return {ok:false,status:429,json:async()=>({
    ok:false,error:"ai_rate_limited",rateLimitScope:"daily"
   })};
   throw Error("Unexpected "+url);
  }));
  const {rerender}=render(<EggFlowCyclePanel project={finished()} revision={10} authorControls/>);
  fireEvent.click(screen.getByTestId("egg-ai-run-cycle"));
  await waitFor(()=>expect(screen.getByTestId("egg-ai-flow-status").textContent).toContain("суточная квота"));
  expect(calls.filter(x=>x.url==="/api/egg-flow-ai")).toHaveLength(1);
  expect(calls.every(x=>x.url!=="/api/egg")).toBe(true);
  // A newly created addressed revision must not inherit the old AI failure
  // or the stale "finished Yolk" message.
  const next=decideEggFlowCycle(finished(),{
    actor:"author",outcome:"revise",
    reason:"Не утверждать форму, проверить Дизайн, Тестдрайв и Производство",
    addressedSpheres:["design","testDrive","production"],at,
  });
  rerender(<EggFlowCyclePanel project={next} revision={11} authorControls/>);
  await waitFor(()=>expect(screen.queryByTestId("egg-ai-flow-status")).toBeNull());
  expect(screen.getByTestId("egg-cycle-progress").textContent).toContain("2/8");
  expect(screen.getByTestId("egg-ai-run-cycle").textContent).toContain("Продолжить цикл ИИ");
 });
});

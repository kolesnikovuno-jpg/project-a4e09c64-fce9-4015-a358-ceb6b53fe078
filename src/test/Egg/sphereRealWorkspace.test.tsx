import {afterEach,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import EggSpherePanel from "../../components/egg/EggSpherePanel";
import {createEggProject} from "../../lib/eggEngine";
import {startEggFlowCycle,contributeEggFlowSphere,currentEggFlowCycle} from "../../lib/eggFlowCycle";
import {eggAutomationRequestSchema} from "../../lib/eggFlowAutomation";

vi.mock("@supabase/supabase-js",()=>({createClient:vi.fn(()=>({
 auth:{getSession:async()=>({data:{session:{access_token:"session-token"}}})}
}))}));
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
const id="01b3d29f-bfc4-41ed-b31a-2e0db7fa2fe9",at="2026-11-16T09:15:00Z";
const initial=()=>startEggFlowCycle(createEggProject({
 id,title:"Пространственный объект",seed:"Лёгкая авторская идея",at,
}),{actor:"author",at});
const props={sphere:"marketing" as const,name:"Маркетинг",summary:"Анализ возможной ценности",status:"open",projectId:id,onClose:()=>{}};
const initFetch=(project=initial())=>{
 const calls:Array<{url:string;body?:Record<string,unknown>}>=[]; 
 const fetch=vi.fn(async(input:string,request?:{body?:string})=>{
  const body=request?.body?JSON.parse(request.body) as Record<string,unknown>:undefined;
  calls.push({url:input,body});
  if(input==="/api/egg-config")return {ok:true,json:async()=>({supabaseUrl:"https://example.test",publishableKey:"anon"})};
  if(input.startsWith("/api/egg-project-state?"))return {ok:true,json:async()=>({revision:1,project})};
  if(input==="/api/egg-flow-ai")return {ok:true,json:async()=>({ok:true,revision:1,sphere:"marketing",
   saved:false,draft:{text:"Гипотеза ценности требует проверки",evidence:"hypothesis"}})};
  if(input==="/api/egg")return {ok:true,json:async()=>({ok:true,revision:2})};
  throw Error("unexpected url "+input);
 });
 vi.stubGlobal("fetch",fetch);
 return {fetch,calls};
};

describe("Real EGG sphere workspaces",()=>{
 it("shows the authoritative visit and allows a genuine manual Author contribution",async()=>{
  const {calls}=initFetch();
  render(<EggSpherePanel {...props}/>);
  await screen.findByTestId("egg-sphere-real-status");
  expect(screen.getByText(/Готова к работе/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button",{name:"Ручной"}));
  fireEvent.change(screen.getByRole("textbox",{name:"Авторский вклад сферы"}),
   {target:{value:"Гипотеза аудитории и ситуаций требует проверки"}});
  fireEvent.click(screen.getByTestId("egg-sphere-author-submit"));
  await waitFor(()=>expect(calls.some(x=>x.body?.command==="complete_flow_sphere")).toBe(true));
  const sent=calls.find(x=>x.body?.command==="complete_flow_sphere")!;
  expect(sent.body).toMatchObject({mode:"manual",sphere:"marketing",projectId:id,evidence:"hypothesis"});
 });
 it("shows an AI proposal without saving until Author explicitly accepts it",async()=>{
  const {calls}=initFetch();
  render(<EggSpherePanel {...props}/>);
  await screen.findByTestId("egg-sphere-real-status");
  fireEvent.click(screen.getByTestId("egg-sphere-ai-draft"));
  await waitFor(()=>expect(screen.getByRole("textbox",{name:"Авторский вклад сферы"})).toHaveValue(
   "Гипотеза ценности требует проверки"));
  expect(calls.filter(x=>x.url==="/api/egg")).toHaveLength(0);
  fireEvent.click(screen.getByTestId("egg-sphere-author-submit"));
  await waitFor(()=>expect(calls.some(x=>x.body?.command==="complete_flow_sphere")).toBe(true));
  const sent=calls.find(x=>x.body?.command==="complete_flow_sphere")!;
  expect(sent.body?.mode).toBe("symbiosis");
 });
 it("author-written results travel to the same branch and Yolk; auto draft mode is schema-valid",()=>{
  const p=initial();
  expect(eggAutomationRequestSchema.parse({projectId:id,expectedRevision:1,mode:"draft"}).mode).toBe("draft");
  expect(()=>contributeEggFlowSphere(p,{
   actor:"author",sphere:"marketing",text:"Авторская гипотеза",evidence:"hypothesis",at,
  })).toThrow();
  const completed=contributeEggFlowSphere(p,{
   actor:"author",mode:"manual",sphere:"marketing",text:"Авторская гипотеза",
   evidence:"hypothesis",at,
  });
  const cycle=currentEggFlowCycle(completed)!;
  expect(cycle.first[0].result?.inputMode).toBe("manual");
  expect(cycle.first[0].result?.submittedBy).toBe("author");
  expect(cycle.first[1].status).toBe("awaiting_result");
  expect(cycle.second[0].status).toBe("awaiting_result");
 });
});

// @vitest-environment jsdom
import {afterEach,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import {createEggProject,recordAuthorSeed} from "../../lib/eggEngine";
import EggIterationBridge from "../../components/egg/EggIterationBridge";

vi.mock("@supabase/supabase-js",()=>({
 createClient:vi.fn(()=>({auth:{getSession:async()=>({data:{session:{access_token:"test-auth"}}})}})),
}));
vi.mock("../../components/egg/EggFlowCyclePanel",()=>({
 default:()=> <div data-testid="mock-internal-cycle">Internal cycle</div>,
}));
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
const id="da5d7c12-16e3-4a63-bb34-cb0fce6019af",at="2026-11-20T13:00:00Z";
const dna="Опорная функция и художественное присутствие рождаются из единого принципа формы.";
const props={projectId:id,intent:"Столик как арт-объект и подставка",constraints:"",
 savedDraft:"",spacePhoto:"",materials:[],materialInsight:"",
 dnaCandidate:dna,approvedIdea:"Столик как целостная форма"};

describe("Final Author DNA approval is explicit and visible",()=>{
 it("displays the direct action, saves only on click, then links to Yolk",async()=>{
  const initial=createEggProject({id,title:"Новый 3",at});
  let project=initial, revision=1;
  const commands:string[]=[];
  vi.stubGlobal("fetch",vi.fn(async(url:string,init?:{body?:string})=>{
   if(url==="/api/egg-config")return {ok:true,json:async()=>({
    supabaseUrl:"https://example.test",publishableKey:"anon",
   })};
   if(url.startsWith("/api/egg-project-state"))return {ok:true,json:async()=>({revision,project})};
   if(url==="/api/egg"){
    const body=JSON.parse(init?.body||"{}") as {command:string;seed:string};
    commands.push(body.command);
    expect(body.seed).toBe(dna);
    project=recordAuthorSeed(project,body.seed,at);revision++;
    return {ok:true,json:async()=>({ok:true})};
   }
   throw Error("Unexpected API request");
  }));
  const view=render(<EggIterationBridge {...props} dnaReviewed={false}/>);
  await waitFor(()=>expect(screen.getByText(/Сначала заполните и подтвердите/)).toBeTruthy());
  expect(screen.queryByTestId("egg-approve-original-seed")).toBeNull();
  expect(commands).toEqual([]);
  view.rerender(<EggIterationBridge {...props} dnaReviewed/>);
  await waitFor(()=>expect(screen.getByTestId("egg-approve-original-seed")).toBeTruthy());
  expect(commands).toEqual([]);
  expect(screen.queryByTestId("mock-internal-cycle")).toBeNull();
  fireEvent.click(screen.getByTestId("egg-approve-original-seed"));
  await waitFor(()=>expect(screen.getByTestId("egg-dna-in-yolk")).toBeTruthy());
  expect(commands).toEqual(["set_seed"]);
  expect(screen.getByTestId("egg-go-to-yolk-after-dna").getAttribute("href"))
   .toBe("/egg/yolk?project="+id);
  expect(screen.getByTestId("mock-internal-cycle")).toBeTruthy();
 });
});

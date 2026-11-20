// @vitest-environment jsdom
import {afterEach,describe,expect,it,vi} from "vitest";
import {cleanup,render,screen,waitFor} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {createEggProject,recordAuthorSeed} from "../../lib/eggEngine";
import EggYolkExperience from "../../components/egg/EggYolkExperience";

vi.mock("@supabase/supabase-js",()=>({
 createClient:vi.fn(()=>({auth:{getSession:async()=>({data:{session:{access_token:"test-auth"}}})}})),
}));
vi.mock("../../components/egg/EggYolkViewer",()=>({
 default:()=> <div data-testid="mock-yolk-spatial">Unapproved field</div>,
}));
vi.mock("../../components/egg/EggYolkIdeaVisual",()=>({
 default:({children}:{children:React.ReactNode})=><div>{children}</div>,
}));
afterEach(()=>{cleanup();localStorage.clear();vi.unstubAllGlobals();});
const id="01b3d29f-bfc4-41ed-b31a-2e0db7fa2fe9";
const at="2026-11-20T10:00:00Z";
function show(serverApproved:boolean){
 const blank=createEggProject({id,title:"Новый тест",at});
 const project=serverApproved?
  recordAuthorSeed(blank,"Символическое ядро Идеи, принятое Автором",at):blank;
 vi.stubGlobal("fetch",vi.fn(async(url:string)=>{
  if(url==="/api/egg-config")return {ok:true,json:async()=>({
   supabaseUrl:"https://example.test",publishableKey:"anon",
  })};
  if(url.startsWith("/api/egg-project-state?"))return {ok:true,json:async()=>({
   revision:2,project,
  })};
  return {ok:false};
 }));
 return render(<MemoryRouter initialEntries={["/egg/yolk?project="+id]}>
  <EggYolkExperience view="yolk"/>
 </MemoryRouter>);
}
describe("Yolk DNA reception in the actual project route",()=>{
 it("displays animated egg, not generic cloud, for approved DNA without a cycle",async()=>{
  show(true);
  await waitFor(()=>expect(screen.getByTestId("yolk-dna-received")).toBeTruthy());
  expect(screen.queryByTestId("mock-yolk-spatial")).toBeNull();
  expect(screen.getByText("ДНК получена")).toBeTruthy();
 });
 it("does not falsely signal DNA receipt for a draft-only project",async()=>{
  show(false);
  await waitFor(()=>expect(screen.getByTestId("mock-yolk-spatial")).toBeTruthy());
  expect(screen.queryByTestId("yolk-dna-received")).toBeNull();
 });
});

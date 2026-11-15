import {describe,expect,it,vi,afterEach} from "vitest";
import {render,screen,fireEvent,cleanup,waitFor} from "@testing-library/react";
import EggIdeaWorkspace from "@/components/egg/EggIdeaWorkspace";
vi.mock("@supabase/supabase-js",()=>({createClient:vi.fn(()=>({auth:{getSession:async()=>({data:{session:{access_token:"token"}}})}}))}));
afterEach(()=>{cleanup();localStorage.clear();vi.unstubAllGlobals();});
const project="01b3d29f-bfc4-41ed-b31a-2e0db7fa2fe9";
describe("EGG Idea initiation",()=>{
 it("receives selected Material cards and keeps Author intention as an unapproved draft",()=>{
  localStorage.setItem("egg:project-field:v1:"+project,JSON.stringify([
   {id:"a",type:"thought",text:"Аккорд импульса",location:"matter"},
   {id:"b",type:"thought",text:"Не выбран",location:"field"}
  ]));
  localStorage.setItem("egg:matter-dialogue:v1:"+project,JSON.stringify([{role:"assistant",content:"Поле: тлеющий минимализм"}]));
  const onMatter=vi.fn();
  render(<EggIdeaWorkspace projectId={project} onClose={()=>{}} onOpenMatter={onMatter}/>);
  expect(screen.getByText("Аккорд импульса")).toBeTruthy();
  expect(screen.queryByText("Не выбран")).toBeNull();
  expect(screen.getByText("Поле: тлеющий минимализм")).toBeTruthy();
  const intent=screen.getByRole("textbox",{name:"Намерение Автора"});
  fireEvent.change(intent,{target:{value:"Неутилитарный объект — нота пространства"}});
  const saved=JSON.parse(localStorage.getItem("egg:idea-workspace:v1:"+project)??"{}");
  expect(saved.intent).toContain("Неутилитарный объект");
  fireEvent.click(screen.getByRole("button",{name:/Материальное/}));
  expect(onMatter).toHaveBeenCalledTimes(1);
 });
 it("passes author initiation and Material insight only to Idea AI endpoint",async()=>{
  localStorage.setItem("egg:project-field:v1:"+project,JSON.stringify([{id:"a",type:"thought",text:"Световой аккорд",location:"matter"}]));
  localStorage.setItem("egg:matter-dialogue:v1:"+project,JSON.stringify([{role:"assistant",content:"Гипотеза поля"}]));
  const fetchMock=vi.fn(async(url:string)=>url==="/api/egg-config"?
   {ok:true,json:async()=>({supabaseUrl:"https://example.test",publishableKey:"anon"})}:
   {ok:true,json:async()=>({ok:true,reply:"Предварительная идея без утверждения"})});
  vi.stubGlobal("fetch",fetchMock);
  render(<EggIdeaWorkspace projectId={project} onClose={()=>{}} onOpenMatter={()=>{}}/>);
  fireEvent.change(screen.getByRole("textbox",{name:"Намерение Автора"}),{target:{value:"Нота в пространстве"}});
  fireEvent.click(screen.getByRole("button",{name:"Проявить идею"}));
  await waitFor(()=>expect(screen.getByText("Предварительная идея без утверждения")).toBeTruthy());
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(fetchMock.mock.calls[1][0]).toBe("/api/egg-flow-ai?op=idea-dialogue");
  const request=JSON.parse((fetchMock.mock.calls[1] as unknown as [string,{body:string}])[1].body);
  expect(request.intent).toBe("Нота в пространстве");
  expect(request.materialInsight).toBe("Гипотеза поля");
  expect(request.materials[0].text).toBe("Световой аккорд");
  fireEvent.click(screen.getByRole("button",{name:/Сохранить ответ как черновик идеи/}));
  expect(screen.getByText("Сохранённый черновик · не утверждён")).toBeTruthy();
 });
});

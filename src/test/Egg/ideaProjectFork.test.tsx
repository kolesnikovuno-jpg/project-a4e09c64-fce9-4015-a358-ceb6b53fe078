// @vitest-environment jsdom
import {afterEach,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import EggIdeaProjectFork,{copyIdeaForkToLocalProject,type IdeaForkDraft} from "../../components/egg/EggIdeaProjectFork";
import EggIterationBridge from "../../components/egg/EggIterationBridge";
import {createEggProject} from "../../lib/eggEngine";
import {startEggFlowCycle} from "../../lib/eggFlowCycle";

vi.mock("@supabase/supabase-js",()=>({createClient:vi.fn(()=>({
 auth:{getSession:async()=>({data:{session:{access_token:"mock-token"}}})}
}))}));
afterEach(()=>{cleanup();localStorage.clear();vi.unstubAllGlobals();});
const originalId="01b3d29f-bfc4-41ed-b31a-2e0db7fa2fe9";
const createdId="6f3f6b71-954d-4ab3-9ec3-84d59451671d";
const draft:IdeaForkDraft={
 intent:"Авторское намерение — пространственная нота",constraints:"Без выдуманных размеров",
 savedDraft:"Рабочая гипотеза ИИ, не утверждена",
 spacePhoto:"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ",
 messages:[{role:"user",content:"Пространство"},{role:"assistant",content:"Предварительная гипотеза"}],
 materials:[{id:"selected",type:"image",text:"Эскиз пространства",
  src:"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ",location:"matter"}],
 materialInsight:"Наблюдение из отобранного Материального",
};
describe("Separate EGG project initiated from Idea",()=>{
 it("creates a server project WITHOUT approving DNA, copies only chosen materials, and preserves original state",async()=>{
  const oldIdea=JSON.stringify({intent:"Задумка старого кресла",messages:[],spacePhoto:""});
  const oldField=JSON.stringify([
   {id:"selected",type:"image",text:"Эскиз",location:"matter"},
   {id:"unselected",type:"thought",text:"Архивный материал",location:"field"}
  ]);
  localStorage.setItem("egg:idea-workspace:v1:"+originalId,oldIdea);
  localStorage.setItem("egg:project-field:v1:"+originalId,oldField);
  const calls:{path:string;body?:Record<string,unknown>}[]=[];
  vi.stubGlobal("fetch",vi.fn(async(path:string,options?:{body?:string})=>{
   calls.push({path,body:options?.body?JSON.parse(options.body):undefined});
   if(path==="/api/egg-config")return {ok:true,json:async()=>({supabaseUrl:"https://example.test",publishableKey:"anon"})};
   if(path==="/api/egg")return {ok:true,json:async()=>({ok:true,projectId:createdId,revision:1})};
   throw Error("Unexpected "+path);
  }));
  const created=vi.fn();
  render(<EggIdeaProjectFork draft={draft} onCreated={created}/>);
  fireEvent.click(screen.getByTestId("egg-fork-open"));
  expect(screen.getByText(/Исходная ДНК, результаты сфер и старые итерации/)).toBeTruthy();
  expect(screen.getByRole("textbox",{name:"Название нового проекта"})).toHaveValue(draft.intent);
  fireEvent.click(screen.getByTestId("egg-fork-create"));
  await waitFor(()=>expect(created).toHaveBeenCalledWith(createdId));
  expect(calls.find(c=>c.path==="/api/egg")?.body).toEqual({
   command:"create",title:draft.intent,
  });
  expect(localStorage.getItem("egg:idea-workspace:v1:"+originalId)).toBe(oldIdea);
  expect(localStorage.getItem("egg:project-field:v1:"+originalId)).toBe(oldField);
  const freshIdea=JSON.parse(localStorage.getItem("egg:idea-workspace:v1:"+createdId)??"{}");
  expect(freshIdea).toMatchObject({intent:draft.intent,spacePhoto:draft.spacePhoto,
   savedDraft:draft.savedDraft,messages:draft.messages});
  const freshField=JSON.parse(localStorage.getItem("egg:project-field:v1:"+createdId)??"[]");
  expect(freshField).toHaveLength(1);
  expect(freshField[0]).toMatchObject({id:"selected",location:"matter"});
  expect(JSON.stringify(freshField)).not.toContain("unselected");
  expect(localStorage.getItem("egg:matter-dialogue:v1:"+createdId)).toContain(draft.materialInsight);
  expect(localStorage.getItem("egg:concept-workspace:v1:"+createdId)).toBeNull();
 });
 it("does not create without intent or automatic DNA approval",()=>{
  const created=vi.fn();
  const fetch=vi.fn();
  vi.stubGlobal("fetch",fetch);
  render(<EggIdeaProjectFork draft={{...draft,intent:""}} onCreated={created}/>);
  fireEvent.click(screen.getByTestId("egg-fork-open"));
  expect((screen.getByTestId("egg-fork-create") as HTMLButtonElement).disabled).toBe(true);
  expect(fetch).not.toHaveBeenCalled();
 });
 it("refuses to overwrite a destination and retains both copies on failure",()=>{
  localStorage.setItem("egg:project-field:v1:"+createdId,"existing");
  expect(()=>copyIdeaForkToLocalProject(createdId,draft)).toThrow();
  expect(localStorage.getItem("egg:idea-workspace:v1:"+createdId)).toBeNull();
  expect(localStorage.getItem("egg:project-field:v1:"+createdId)).toBe("existing");
 });
});
describe("Active cycle survives local Safari draft reset",()=>{
 it("shows current authorized server cycle and offers explicit snapshot recovery rather than archiving it",async()=>{
  const approved={
   intent:draft.intent,workingDna:"Рабочая ДНК — утверждённый инвариант",
   constraints:draft.constraints,materialInsight:draft.materialInsight,
   materials:[{id:"selected",type:"thought" as const,text:"Реальный выбранный материал",visualStatus:"text" as const}],
   spatialContext:{role:"spatial_context" as const,caption:"Фото существующего помещения",imageData:draft.spacePhoto}
  };
  const current=startEggFlowCycle(createEggProject({
   id:originalId,title:"Пространственный объект",seed:"Сохранённая исходная ДНК",
   at:"2026-11-16T10:00:00Z",
  }),{actor:"author",at:"2026-11-16T10:00:00Z",ideaHandoff:approved});
  vi.stubGlobal("fetch",vi.fn(async(path:string)=>{
   if(path==="/api/egg-config")return {ok:true,json:async()=>({supabaseUrl:"https://example.test",publishableKey:"anon"})};
   if(path.startsWith("/api/egg-project-state?"))return {ok:true,json:async()=>({project:current,revision:2})};
   throw Error("Unexpected "+path);
  }));
  const restore=vi.fn();
  render(<EggIterationBridge projectId={originalId} intent="" constraints="" savedDraft=""
   spacePhoto="" materials={[]} materialInsight="" onRestoreApproved={restore}/>);
  await screen.findByTestId("egg-current-cycle-recovery");
  expect(screen.queryByTestId("egg-idea-history-not-current")).toBeNull();
  expect(screen.getByTestId("egg-ai-run-cycle").textContent).toContain("Продолжить цикл ИИ");
  expect(screen.getByTestId("egg-cycle-progress").textContent).toContain("0/8");
  fireEvent.click(screen.getByTestId("egg-restore-approved-handoff"));
  expect(restore).toHaveBeenCalledWith(approved);
 });
});
describe("Old completed cycle cannot be mistaken for the live Idea canvas",()=>{
 it("moves legacy cycle into a collapsed read-only history",async()=>{
  const old=startEggFlowCycle(createEggProject({
   id:originalId,title:"Кресло",seed:"Старый замысел кресла",at:"2026-11-14T10:00:00Z"
  }),{actor:"author",at:"2026-11-14T10:00:00Z"});
  vi.stubGlobal("fetch",vi.fn(async(path:string)=>{
   if(path==="/api/egg-config")return {ok:true,json:async()=>({supabaseUrl:"https://example.test",publishableKey:"anon"})};
   if(path.startsWith("/api/egg-project-state?"))return {ok:true,json:async()=>({project:old,revision:2})};
   throw Error("Unexpected "+path);
  }));
  render(<EggIterationBridge projectId={originalId} intent={draft.intent}
   constraints="" savedDraft="" spacePhoto="" materials={[]} materialInsight=""/>);
  const warning=await screen.findByTestId("egg-idea-history-not-current");
  expect(warning.textContent).toContain("не являются анализом текущего холста");
  expect(screen.getByTestId("egg-idea-archived-cycle").hasAttribute("open")).toBe(false);
  expect(screen.queryByTestId("egg-ai-run-cycle")).toBeNull();
  expect(screen.queryByTestId("egg-approve-original-seed")).toBeNull();
 });
});

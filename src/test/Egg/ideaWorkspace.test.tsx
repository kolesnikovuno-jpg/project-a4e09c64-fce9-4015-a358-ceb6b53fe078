import {describe,expect,it,vi,afterEach} from "vitest";
import {render,screen,fireEvent,cleanup,waitFor} from "@testing-library/react";
import EggIdeaWorkspace from "@/components/egg/EggIdeaWorkspace";
import {createEggMaterialMapRecord,eggMaterialMapKey} from "../../lib/eggMaterialMap";
vi.mock("@supabase/supabase-js",()=>({createClient:vi.fn(()=>({auth:{getSession:async()=>({data:{session:{access_token:"token"}}})}}))}));
afterEach(()=>{cleanup();localStorage.clear();vi.unstubAllGlobals();});
const project="01b3d29f-bfc4-41ed-b31a-2e0db7fa2fe9";
describe("EGG Idea initiation",()=>{
 it("shows correct project identity and distinguishes browser draft from server state",()=>{
  render(<EggIdeaWorkspace projectId={project} onClose={()=>{}} onOpenMatter={()=>{}}/>);
  const passport=screen.getByTestId("egg-project-passport");
  expect(passport).toBeTruthy();
  fireEvent.click(screen.getByText("Паспорт проекта · версия и сохранение"));
  expect(screen.getByText(project)).toBeTruthy();
  expect(screen.getByText(/локальный черновик с отдельной серверной синхронизацией/)).toBeTruthy();
  expect(screen.getByText("integration/egg-unified-2026-11-12")).toBeTruthy();
 });
 it("routes the current Author Idea to Yolk, not to an image generator",()=>{
  const openYolk=vi.fn();
  render(<EggIdeaWorkspace projectId={project} onClose={()=>{}}
    onOpenMatter={()=>{}} onOpenYolk={openYolk}/>);
  expect(screen.queryByTestId("egg-idea-form-access")).toBeNull();
  const go=screen.getByRole("button",{name:"Желток · 3D-поле"});
  expect((go as HTMLButtonElement).disabled).toBe(true);
  fireEvent.change(screen.getByRole("textbox",{name:"Намерение Автора"}),{
    target:{value:"Неутилитарный элемент пространства — отдельная нота"},
  });
  expect((go as HTMLButtonElement).disabled).toBe(false);
  expect(screen.getByTestId("egg-idea-form-access")).toBeTruthy();
  fireEvent.click(go);
  expect(openYolk).toHaveBeenCalledOnce();
  const current=JSON.parse(localStorage.getItem("egg:idea-workspace:v1:"+project)??"{}");
  expect(current.intent).toBe("Неутилитарный элемент пространства — отдельная нота");
 });
 it("saves the Author intention directly before any AI response",()=>{
  render(<EggIdeaWorkspace projectId={project} onClose={()=>{}} onOpenMatter={()=>{}}/>);
  const save=screen.getByRole("button",{name:"Сохранить черновик идеи"});
  expect((save as HTMLButtonElement).disabled).toBe(true);
  fireEvent.change(screen.getByRole("textbox",{name:"Намерение Автора"}),{
   target:{value:"Неутилитарный элемент пространства — отдельная нота"},
  });
  expect((save as HTMLButtonElement).disabled).toBe(false);
  fireEvent.click(save);
  expect(screen.getByText("Сохранено в этом браузере · не утверждено")).toBeTruthy();
  expect(screen.getByText("Сохранённый черновик · не утверждён")).toBeTruthy();
  const stored=JSON.parse(localStorage.getItem("egg:idea-workspace:v1:"+project)??"{}");
  expect(stored.savedDraft).toBe("Неутилитарный элемент пространства — отдельная нота");
 });
 it("receives selected Material cards and keeps Author intention as an unapproved draft",()=>{
  localStorage.setItem("egg:project-field:v1:"+project,JSON.stringify([
   {id:"a",type:"thought",text:"Аккорд импульса",location:"matter"},
   {id:"b",type:"thought",text:"Не выбран",location:"field"}
  ]));
  localStorage.setItem("egg:matter-dialogue:v1:"+project,JSON.stringify([{role:"assistant",content:"Поле: тлеющий минимализм"}]));
  const onMatter=vi.fn();
  render(<EggIdeaWorkspace projectId={project} onClose={()=>{}} onOpenMatter={onMatter}/>);
  expect(screen.getByText("Аккорд импульса")).toBeTruthy();
  expect(screen.getByRole("button",{name:"Открыть круговое меню"})).toBeTruthy();
  expect(screen.queryByText("Не выбран")).toBeNull();
  expect(screen.queryByText("Поле: тлеющий минимализм")).toBeNull();
  expect(screen.getByText(/Принятой карты исследования ещё нет/)).toBeTruthy();
  const intent=screen.getByRole("textbox",{name:"Намерение Автора"});
  fireEvent.change(intent,{target:{value:"Неутилитарный объект — нота пространства"}});
  const saved=JSON.parse(localStorage.getItem("egg:idea-workspace:v1:"+project)??"{}");
  expect(saved.intent).toContain("Неутилитарный объект");
  fireEvent.click(screen.getByRole("button",{name:/Материальное/}));
  expect(onMatter).toHaveBeenCalledTimes(1);
 });
 it("passes a separate space photo as context rather than a Design reference",async()=>{
  const spacePhoto="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ";
  localStorage.setItem("egg:idea-workspace:v1:"+project,JSON.stringify({
   intent:"Лёгкий пространственный акцент",constraints:"",messages:[],savedDraft:"",spacePhoto
  }));
  localStorage.setItem("egg:project-field:v1:"+project,JSON.stringify([
   {id:"ref",type:"thought",text:"Лёгкость",location:"matter"}
  ]));
  const fetchMock=vi.fn(async(url:string)=>url==="/api/egg-config"?
   {ok:true,json:async()=>({supabaseUrl:"https://example.test",publishableKey:"anon"})}:
   {ok:true,json:async()=>({ok:true,reply:"Уточнение идеи"})});
  vi.stubGlobal("fetch",fetchMock);
  render(<EggIdeaWorkspace projectId={project} onClose={()=>{}} onOpenMatter={()=>{}}/>);
  expect(screen.getByAltText("Загруженное фото пространства")).toBeTruthy();
  fireEvent.click(screen.getByRole("button",{name:"Проявить идею"}));
  await waitFor(()=>expect(fetchMock.mock.calls.filter(([url])=>url==="/api/egg-flow-ai?op=idea-dialogue")).toHaveLength(1));
  const request=JSON.parse((fetchMock.mock.calls.find(([url])=>url==="/api/egg-flow-ai?op=idea-dialogue") as unknown as [string,{body:string}])[1].body);
  expect(request.materials[0]).toMatchObject({
   id:"space-context-photo",type:"image",imageData:spacePhoto
  });
  expect(request.materials[0].text).toContain("НЕ референс формы");
  expect(request.materials[1].id).toBe("ref");
  fireEvent.click(screen.getByText(/Материалы и инструменты/));
  fireEvent.click(screen.getByRole("button",{name:"Удалить фото пространства"}));
  await waitFor(()=>expect(screen.queryByAltText("Загруженное фото пространства")).toBeNull());
 });
 it("passes author initiation and Material insight only to Idea AI endpoint",async()=>{
  const selected=[{id:"a",type:"thought",text:"Световой аккорд",location:"matter"}];
  localStorage.setItem("egg:project-field:v1:"+project,JSON.stringify(selected));
  localStorage.setItem("egg:matter-dialogue:v1:"+project,JSON.stringify([{role:"assistant",content:"Гипотеза поля без утверждения"}]));
  const record=createEggMaterialMapRecord({
   observations:[{text:"Слова свет и аккорд прямо указаны на карточке.",sourceIds:["a"]}],
   connections:[],tensions:[],
   hypotheses:[{text:"Возможно, это станет пространственным акцентом.",sourceIds:["a"]}],
   questions:["Каким будет настроение формы?"],
  },selected,new Date().toISOString());
  localStorage.setItem(eggMaterialMapKey(project),JSON.stringify({...record,status:"accepted",acceptedAt:new Date().toISOString()}));
  const fetchMock=vi.fn(async(url:string)=>url==="/api/egg-config"?
   {ok:true,json:async()=>({supabaseUrl:"https://example.test",publishableKey:"anon"})}:
   {ok:true,json:async()=>({ok:true,reply:"Предварительная идея без утверждения"})});
  vi.stubGlobal("fetch",fetchMock);
  render(<EggIdeaWorkspace projectId={project} onClose={()=>{}} onOpenMatter={()=>{}}/>);
  fireEvent.change(screen.getByRole("textbox",{name:"Намерение Автора"}),{target:{value:"Нота в пространстве"}});
  fireEvent.click(screen.getByRole("button",{name:"Проявить идею"}));
  await waitFor(()=>expect(screen.getByText("Предварительная идея без утверждения")).toBeTruthy());
  expect(fetchMock.mock.calls.filter(([url])=>url==="/api/egg-flow-ai?op=idea-dialogue")).toHaveLength(1);
  const request=JSON.parse((fetchMock.mock.calls.find(([url])=>url==="/api/egg-flow-ai?op=idea-dialogue") as unknown as [string,{body:string}])[1].body);
  expect(request.intent).toBe("Нота в пространстве");
  expect(request.materialInsight).toContain("НАБЛЮДЕНИЯ");
  expect(request.materialInsight).toContain("ГИПОТЕЗЫ");
  expect(request.materialInsight).not.toContain("Гипотеза поля без утверждения");
  expect(request.materials[0].text).toBe("Световой аккорд");
  fireEvent.click(screen.getByRole("button",{name:/Сохранить ответ как черновик идеи/}));
  expect(screen.getByText("Сохранённый черновик · не утверждён")).toBeTruthy();
 });
});

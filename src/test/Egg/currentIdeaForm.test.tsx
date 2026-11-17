import {afterEach,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import EggFormStudyAccess from "@/components/egg/EggFormStudyAccess";
import {eggIdeaFormSourceId} from "@/lib/eggIdeaFormSource";

vi.mock("@supabase/supabase-js",()=>({
 createClient:vi.fn(()=>({auth:{getSession:async()=>({
  data:{session:{access_token:"test-token"}},
 })}})),
}));
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
const projectId="01b3d29f-bfc4-41ed-b31a-2e0db7fa2fe9";
describe("EGG current Idea form study",()=>{
 it("never sends unrelated completed chair cycle as the current Idea",async()=>{
  const calls:{url:string;body?:Record<string,unknown>}[]=[];
  vi.stubGlobal("fetch",vi.fn(async(url:string,options?:{body?:string})=>{
   calls.push({url,body:options?.body?JSON.parse(options.body):undefined});
   if(url==="/api/egg-config")return {ok:true,json:async()=>({
    supabaseUrl:"https://example.test",publishableKey:"public-key",
   })};
   if(url.startsWith("/api/egg-project-state"))return {ok:true,json:async()=>({
    revision:12,project:{id:projectId,seed:{text:"Old unrelated chair"}},
   })};
   if(options?.body)return {ok:true,json:async()=>({ok:true,study:{
    id:"study-1",imageUrl:"https://example.test/study.webp",
    prompt:"Source-faithful experimental form",model:"gpt-image-1-mini",
   }})};
   return {ok:true,json:async()=>({ok:true,study:null})};
  }));
  render(<EggFormStudyAccess projectId={projectId}
   intent="Неутилитарный элемент пространства — отдельная нота"
   constraints="" savedDraft="" materialInsight="Лёгкость и присутствие"
   materials={[{type:"thought",text:"Обособленное присутствие"}]}/>);
  const action=await screen.findByRole("button",{name:"Создать образ"});
  await waitFor(()=>expect(action.hasAttribute("disabled")).toBe(false));
  fireEvent.click(action);
  await waitFor(()=>expect(screen.getByAltText("Пробный образ формы по текущему замыслу Автора")).toBeTruthy());
  const post=calls.find(x=>x.url==="/api/egg-flow-ai?op=form-study"&&x.body);
  expect(post).toBeDefined();
  expect(post?.body?.projectId).toBe(projectId);
  expect(post?.body?.synthesisId).toBeUndefined();
  expect((post?.body?.idea as {intent:string}).intent).toContain("отдельная нота");
  expect((post?.body?.idea as {materials:{text:string}[]}).materials[0].text)
   .toBe("Обособленное присутствие");
 });
 it("distinguishes two separate local Idea sources",()=>{
  const original={intent:"Неутилитарная пространственная нота",constraints:"",
   draft:"",materialInsight:"",materials:[]};
  expect(eggIdeaFormSourceId(original)).not.toBe(
   eggIdeaFormSourceId({...original,intent:"Лёгкое кресло для отдыха"}));
 });
});

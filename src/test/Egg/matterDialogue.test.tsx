import { describe, expect, it, vi, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import EggProjectField from "@/components/egg/EggProjectField";
import EggMatterDialogue from "@/components/egg/EggMatterDialogue";

vi.mock("@supabase/supabase-js",()=>({
 createClient:vi.fn(()=>({auth:{getSession:vi.fn(async()=>({data:{session:{access_token:"session-token"}}}))}}))
}));
afterEach(()=>{cleanup();localStorage.clear();vi.unstubAllGlobals();});

describe("Material research workspace",()=>{
 it("places the conversation to the right of the selected-material canvas and focuses a chosen card",()=>{
  const projectId="matter-experiment-01";
  localStorage.setItem("egg:project-field:v1:"+projectId,JSON.stringify([
   {id:"material1",type:"thought",text:"Тихая лёгкая форма",location:"matter",x:0,y:0}
  ]));
  const {container}=render(<EggProjectField workspace="matter" projectId={projectId}><div>EGG form</div></EggProjectField>);
  expect(screen.getByTestId("egg-matter-dialogue")).toBeTruthy();
  const card=container.querySelector('[data-field-item="material1"]') as HTMLElement;
  expect(card).toBeTruthy();
  fireEvent.pointerEnter(card,{pointerType:"mouse"});
  expect(screen.getByText("Фокус: Тихая лёгкая форма")).toBeTruthy();
  fireEvent.click(screen.getByRole("button",{name:"Сбросить фокус"}));
  fireEvent.click(screen.getByRole("button",{name:"Обсудить материал Тихая лёгкая форма"}));
  expect(screen.getByText("Фокус: Тихая лёгкая форма")).toBeTruthy();
  fireEvent.click(screen.getByRole("button",{name:"Скрыть диалог"}));
  expect(screen.queryByTestId("egg-matter-dialogue")).toBeNull();
  fireEvent.click(screen.getByRole("button",{name:"Открыть диалог Материальное"}));
  expect(screen.getByTestId("egg-matter-dialogue")).toBeTruthy();
 });
 it("sends the full current board once author requests research and stores the real response",async()=>{
  const fetchMock=vi.fn(async(input:string)=>input==="/api/egg-config"?
   {ok:true,status:200,json:async()=>({supabaseUrl:"https://example.supabase.co",publishableKey:"anon-test"})}:
   {ok:true,status:200,json:async()=>({ok:true,reply:"Наблюдение: повторяется лёгкость. Вопрос: это цель формы?"})});
  vi.stubGlobal("fetch",fetchMock);
  const cards=[
   {id:"ref-1",type:"thought" as const,text:"Лёгкость и воздух"},
   {id:"ref-2",type:"link" as const,text:"https://example.org/inspiration"},
   {id:"ref-3",type:"video" as const,text:"model-video.mp4"},
  ];
  render(<EggMatterDialogue projectId="1b3d29f0-fbc4-41ed-b31a-2e0db7fa2fe9" cards={cards}
    focusId={null} onClearFocus={()=>{}} onClose={()=>{}} onBack={()=>{}}/>);
  expect(fetchMock).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button",{name:"Начать исследование"}));
  await waitFor(()=>expect(fetchMock).toHaveBeenCalledTimes(2));
  const [url,request]=fetchMock.mock.calls[1] as unknown as [string,RequestInit];
  expect(url).toBe("/api/egg-flow-ai?op=matter-dialogue");
  expect((request.headers as Record<string,string>).Authorization).toBe("Bearer session-token");
  const body=JSON.parse(String(request.body)) as {materials:Array<{id:string;url?:string}>;messages:Array<{content:string}>};
  expect(body.materials).toHaveLength(3);
  expect(body.materials[1].url).toBe("https://example.org/inspiration");
  expect(body.messages[0].content).toContain("Изучи весь состав");
  expect(await screen.findByText("Наблюдение: повторяется лёгкость. Вопрос: это цель формы?")).toBeTruthy();
  await waitFor(()=>expect(localStorage.getItem("egg:matter-dialogue:v1:1b3d29f0-fbc4-41ed-b31a-2e0db7fa2fe9"))
   .toContain("Наблюдение: повторяется лёгкость"));
 });
});

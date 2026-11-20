import {afterEach,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import EggIdeaExteriorRound from "../../components/egg/EggIdeaExteriorRound";
import {EGG_IDEA_EXTERIOR_ORDER,eggIdeaExteriorSourceKey} from "../../lib/eggIdeaExterior";
vi.mock("../../components/egg/EggWorkspaceSync",()=>({default:()=>null}));
vi.mock("@supabase/supabase-js",()=>({
 createClient:vi.fn(()=>({auth:{getSession:async()=>({data:{session:{access_token:"test-auth"}}})}})),
}));
vi.mock("../../lib/eggAiPacing",()=>({
 waitForEggAiRequest:async()=>{},postponeEggAiRequests:vi.fn(),
}));
afterEach(()=>{cleanup();localStorage.clear();vi.unstubAllGlobals();});
describe("External research in the Author Idea workspace",()=>{
 it("runs eight independent roles before proposing the formed Idea, never approves DNA",async()=>{
  const requests:Array<Record<string,unknown>>=[];
  const fetchMock=vi.fn(async(url:string,init?:{body?:string})=>{
   if(url==="/api/egg-config")return {ok:true,json:async()=>({supabaseUrl:"https://example.test",publishableKey:"anon"})};
   const payload=JSON.parse(init?.body||"{}") as Record<string,unknown>;
   requests.push(payload);
   const name=typeof payload.externalSphere==="string"?payload.externalSphere:"synthesis";
   return {ok:true,json:async()=>({ok:true,reply:name==="synthesis"?
    "Идея: пространственная опора для тела, свободная от привычной типологии кресла.":
    "НАБЛЮДЕНИЕ: передан замысел. ГИПОТЕЗА: "+name+". ВОПРОС: что проверить?"})};
  });
  vi.stubGlobal("fetch",fetchMock);
  const onIdeaReady=vi.fn();
  render(<EggIdeaExteriorRound
    projectId="01b3d29f-bfc4-41ed-b31a-2e0db7fa2fe9"
    intent="Физическая опора для тела, не обязательно кресло" constraints=""
    materials={[{id:"m1",type:"thought",location:"matter",text:"Линия поддержки"}]}
    fieldCards={[
     {id:"m1",type:"thought",location:"matter",text:"Линия поддержки"},
     {id:"f1",type:"thought",location:"field",text:"Плавающий объём"},
    ]}
    materialInsight="" sketchImage="" spacePhoto="" visualKey="visual:a"
    onIdeaReady={onIdeaReady}/>);
  fireEvent.click(screen.getByTestId("egg-idea-start-research"));
  await waitFor(()=>expect(screen.getByTestId("egg-exterior-formed-idea")).toBeTruthy(),{timeout:12000});
  expect(requests).toHaveLength(9);
  expect(requests.slice(0,8).map(r=>r.externalSphere)).toEqual([...EGG_IDEA_EXTERIOR_ORDER]);
  for(const req of requests.slice(0,8)){
   expect(req).not.toHaveProperty("externalFindings");
   expect(req.intent).toBe("Физическая опора для тела, не обязательно кресло");
   expect(req.materials).toEqual([expect.objectContaining({id:"m1"})]);
   expect(req.externalField).toEqual([expect.objectContaining({id:"f1"})]);
  }
  expect(requests[8].externalFindings).toHaveLength(8);
  expect(requests[8]).not.toHaveProperty("externalSphere");
  expect(onIdeaReady).toHaveBeenCalledWith(expect.stringContaining("пространственная опора"));
  expect(screen.getByText(/Интернет и содержимое ссылок/)).toBeTruthy();
  const stored=JSON.parse(localStorage.getItem("egg:idea-exterior:v1:01b3d29f-bfc4-41ed-b31a-2e0db7fa2fe9")||"{}");
  expect(stored.findings).toHaveLength(8);
  expect(stored).not.toHaveProperty("approvedDna");
 });

 it("shows an existing completed round as one idea and exposes a single action without spending more tokens",async()=>{
  const id="01b3d29f-bfc4-41ed-b31a-2e0db7fa2fe9";
  const intent="Небольшой столик-подставка как пространственный арт-акцент";
  const sourceKey=eggIdeaExteriorSourceKey({intent,constraints:"",materialInsight:"",selected:[],field:[],visualKey:"v"});
  const idea="**Рабочая Идея:** небольшой столик-подставка, который одновременно существует как самостоятельный арт-акцент: его практическая роль понятна, но выразительность не сводится к функции. В Материальном (ID m1, m2) заметен интересный контраст.\n\n**Главное напряжение:** не потерять выразительность при сохранении пользы.\n\n**Вопрос:** что должно считываться первым?";
  localStorage.setItem("egg:idea-exterior:v1:"+id,JSON.stringify({
   sourceKey,updatedAt:"2026-11-20T09:00:00Z",idea,
   findings:EGG_IDEA_EXTERIOR_ORDER.map(sphere=>({sphere,text:"Наблюдение: текст инициации подтверждён; вопрос остаётся."}))
  }));
  const onProceed=vi.fn(), onIdeaReady=vi.fn(), fetchMock=vi.fn();
  vi.stubGlobal("fetch",fetchMock);
  render(<EggIdeaExteriorRound projectId={id} intent={intent} constraints="" materials={[]}
    fieldCards={[]} materialInsight="" sketchImage="" spacePhoto="" visualKey="v"
    onIdeaReady={onIdeaReady} onProceed={onProceed}/>);
  await waitFor(()=>expect(screen.getByTestId("egg-formed-idea-core").textContent).toContain("столик-подставка"));
  expect(screen.getByTestId("egg-formed-idea-core").textContent).not.toContain("В Материальном");
  expect(screen.getByTestId("egg-idea-research-details")).not.toHaveAttribute("open");
  fireEvent.click(screen.getByTestId("egg-proceed-to-dna"));
  expect(onProceed).toHaveBeenCalledWith(expect.stringContaining("самостоятельный арт-акцент"));
  expect(onProceed.mock.calls[0][0]).not.toContain("ID m1");
  expect(fetchMock).not.toHaveBeenCalled();
 });
 it("re-synthesizes saved eight findings with one request and retains old Idea",async()=>{
  const id="01b3d29f-bfc4-41ed-b31a-2e0db7fa2fe9",intent="Столик как цельная арт-функция";
  const sourceKey=eggIdeaExteriorSourceKey({intent,constraints:"",materialInsight:"",
    selected:[],field:[],visualKey:"v"});
  localStorage.setItem("egg:idea-exterior:v1:"+id,JSON.stringify({
   sourceKey,updatedAt:"2026-11-20T10:00:00Z",
   idea:"ИДЕЯ: Старый сформированный столик.",
   findings:EGG_IDEA_EXTERIOR_ORDER.map(sphere=>({sphere,
    text:"ВКЛАД: уточнить "+sphere+". ОПОРА: намерение Автора. ГИПОТЕЗА: проверить. ПРОВЕРКА: наблюдать."}))
  }));
  let researchCalls=0;
  vi.stubGlobal("fetch",vi.fn(async(url:string,init?:{body?:string})=>{
   if(url==="/api/egg-config")return {ok:true,json:async()=>({supabaseUrl:"https://example.test",publishableKey:"anon"})};
   researchCalls++;
   const input=JSON.parse(init?.body||"{}");
   expect(input.externalFindings).toHaveLength(8);
   expect(input.externalSphere).toBeUndefined();
   return {ok:true,json:async()=>({ok:true,reply:
    "ИДЕЯ: Новая версия с объединением опоры и образа.\\nПРИРОСТ: Уточнена пространственная связь.\\nОСНОВАНИЯ: только инициация Автора.\\nНАПРЯЖЕНИЕ: требуется проверка.\\nВОПРОС: что проверить?"})};
  }));
  render(<EggIdeaExteriorRound projectId={id} intent={intent} constraints="" materials={[]}
    fieldCards={[]} materialInsight="" sketchImage="" spacePhoto="" visualKey="v"
    onIdeaReady={vi.fn()}/>);
  fireEvent.click(screen.getByText(/Анализ · напряжение, вопрос, основания/));
  fireEvent.click(screen.getByTestId("egg-rethink-existing-eight"));
  await waitFor(()=>expect(screen.getByTestId("egg-formed-idea-core").textContent).toContain("Новая версия"));
  expect(researchCalls).toBe(1);
  const stored=JSON.parse(localStorage.getItem("egg:idea-exterior:v1:"+id)||"{}");
  expect(stored.findings).toHaveLength(8);
  expect(stored.history).toEqual(["ИДЕЯ: Старый сформированный столик."]);
 });

 it("repairs only the three legacy truncated spheres and keeps the other five",async()=>{
  const id="01b3d29f-bfc4-41ed-b31a-2e0db7fa2fe9",intent="Точка опоры и скульптурный образ";
  const sourceKey=eggIdeaExteriorSourceKey({intent,constraints:"",materialInsight:"",
    selected:[],field:[],visualKey:"v"});
  const damaged=new Set(["commerce","legal","production"]);
  localStorage.setItem("egg:idea-exterior:v1:"+id,JSON.stringify({
   sourceKey,updatedAt:"2026-11-20T09:00:00Z",idea:"ИДЕЯ: Исходный замысел.",
   findings:EGG_IDEA_EXTERIOR_ORDER.map(sphere=>({sphere,text:damaged.has(sphere)?
    ("НАБЛЮДЕНИЕ: "+sphere+" ").padEnd(1200,"!"):"НАБЛЮДЕНИЕ: полный ответ "+sphere}))
  }));
  const calls:string[]=[];
  vi.stubGlobal("fetch",vi.fn(async(url:string,init?:{body?:string})=>{
   if(url==="/api/egg-config")return {ok:true,json:async()=>({supabaseUrl:"https://example.test",publishableKey:"anon"})};
   const body=JSON.parse(init?.body||"{}") as {externalSphere?:string;externalFindings?:unknown[]};
   calls.push(body.externalSphere??"synthesis");
   return {ok:true,json:async()=>({ok:true,reply:body.externalSphere?
    "ВКЛАД: Отличный профессиональный принцип.\\nОПОРА: инициация.\\nГИПОТЕЗА: проверить.\\nПРОВЕРКА: макет.":
    "ИДЕЯ: Выявлен принцип соединения двух качеств.\\nПРИРОСТ: предложена проверяемая конструктивная связь."})};
  }));
  render(<EggIdeaExteriorRound projectId={id} intent={intent} constraints=""
    materials={[]} fieldCards={[]} materialInsight="" sketchImage="" spacePhoto="" visualKey="v"
    onIdeaReady={vi.fn()}/>);
  fireEvent.click(screen.getByTestId("egg-exterior-detail-toggle"));
  expect(screen.getByTestId("egg-exterior-damaged-count").textContent).toContain("3 ответов");
  fireEvent.click(screen.getByTestId("egg-repair-damaged-exterior"));
  await waitFor(()=>expect(screen.getByTestId("egg-formed-idea-core").textContent).toContain("Выявлен принцип"),{timeout:12000});
  expect(calls).toEqual(["commerce","legal","production","synthesis"]);
  const result=JSON.parse(localStorage.getItem("egg:idea-exterior:v1:"+id)||"{}");
  expect(result.findings).toHaveLength(8);
  expect(result.history).toContain("ИДЕЯ: Исходный замысел.");
  expect(result.previousFindings).toHaveLength(3);
  expect(result.findings.find((f:{sphere:string})=>f.sphere==="design").text)
   .toBe("НАБЛЮДЕНИЕ: полный ответ design");
 });

 it("after a provider interruption resumes the one remaining damaged sphere before synthesis",async()=>{
  const id="01b3d29f-bfc4-41ed-b31a-2e0db7fa2fe9",intent="Столик как опора и пространственное присутствие";
  const sourceKey=eggIdeaExteriorSourceKey({intent,constraints:"",materialInsight:"",
    selected:[],field:[],visualKey:"v"});
  const damaged=("НАБЛЮДЕНИЕ: прежняя гипотеза ").padEnd(1200,"!");
  localStorage.setItem("egg:idea-exterior:v1:"+id,JSON.stringify({
   sourceKey,updatedAt:"2026-11-20T10:00:00Z",idea:"",
   history:["ИДЕЯ: Прежняя версия"],
   findings:EGG_IDEA_EXTERIOR_ORDER.map(sphere=>({sphere,text:sphere==="production"?damaged:
     "ВКЛАД: проверка роли "+sphere+". ОПОРА: слова Автора. ГИПОТЕЗА: совместимость. ПРОВЕРКА: макет."}))
  }));
  const calls:string[]=[];
  vi.stubGlobal("fetch",vi.fn(async(url:string,init?:{body?:string})=>{
   if(url==="/api/egg-config")return {ok:true,json:async()=>({supabaseUrl:"https://example.test",publishableKey:"anon"})};
   const input=JSON.parse(init?.body||"{}");
   calls.push(input.externalSphere??"synthesis");
   return {ok:true,json:async()=>({ok:true,reply:input.externalSphere?
    "ВКЛАД: форму поддерживает облегчённая оболочка.\\nОПОРА: инициация Автора.\\nГИПОТЕЗА: добиться стабильности.\\nПРОВЕРКА: макет.":
    "ИДЕЯ: Столик объединяет опору и выразительность.\\nПРИРОСТ: альтернатива массивной опоре."})};
  }));
  render(<EggIdeaExteriorRound projectId={id} intent={intent} constraints=""
    materials={[]} fieldCards={[]} materialInsight="" sketchImage="" spacePhoto="" visualKey="v"
    onIdeaReady={vi.fn()}/>);
  const button=screen.getByTestId("egg-idea-start-research");
  expect(button.textContent).toContain("Продолжить · 1 сфера");
  fireEvent.click(button);
  await waitFor(()=>expect(screen.getByTestId("egg-formed-idea-core").textContent).toContain("Столик объединяет"),{timeout:12000});
  expect(calls).toEqual(["production","synthesis"]);
  const saved=JSON.parse(localStorage.getItem("egg:idea-exterior:v1:"+id)||"{}");
  expect(saved.history).toContain("ИДЕЯ: Прежняя версия");
  expect(saved.previousFindings).toHaveLength(1);
 });
});

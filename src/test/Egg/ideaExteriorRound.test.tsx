import {afterEach,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import EggIdeaExteriorRound from "../../components/egg/EggIdeaExteriorRound";
import {EGG_IDEA_EXTERIOR_ORDER} from "../../lib/eggIdeaExterior";
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
});

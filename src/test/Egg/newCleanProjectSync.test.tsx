import {afterEach,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import {MemoryRouter,Routes,Route,useLocation} from "react-router-dom";
import EggNewProject from "../../components/egg/EggNewProject";
import {decideEggReconciliation,eggSnapshotHash} from "../../components/egg/EggWorkspaceSync";

afterEach(()=>{cleanup();vi.unstubAllGlobals();});

describe("Clean EGG project starts at Field",()=>{
 it("creates exactly one empty server project and navigates to Field, not Author",async()=>{
  const projectId="9b012bf4-9d66-4e9b-80a9-fba942d0d37d";
  const fetchMock=vi.fn(async(_url:string,_options:RequestInit)=>({
   ok:true,json:async()=>({ok:true,projectId}),
  }));
  vi.stubGlobal("fetch",fetchMock);
  const client={auth:{getSession:vi.fn(async()=>({
   data:{session:{access_token:"test-session"}},
  }))}} as never;
  function Location(){const location=useLocation();return <output data-testid="location">{location.pathname+location.search}</output>}
  render(<MemoryRouter initialEntries={["/egg/connect"]}><Routes>
   <Route path="/egg/connect" element={<EggNewProject client={client}/>}/>
   <Route path="/ru/egg" element={<Location/>}/>
  </Routes></MemoryRouter>);
  fireEvent.change(screen.getByRole("textbox",{name:"Название проекта"}),{
   target:{value:"EGG · Новый опыт"},
  });
  fireEvent.click(screen.getByRole("button",{name:"Создать и открыть Поле"}));
  await waitFor(()=>expect(screen.getByTestId("location").textContent)
   .toBe("/ru/egg?project="+projectId+"&start=field"));
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url,options]=fetchMock.mock.calls[0] as unknown as [string,RequestInit];
  expect(url).toBe("/api/egg");
  const payload=JSON.parse(String(options.body));
  expect(payload).toEqual({command:"create",title:"EGG · Новый опыт"});
  expect(payload).not.toHaveProperty("seed");
  expect((options.headers as Record<string,string>).Authorization).toBe("Bearer test-session");
 });
});
describe("EGG drafts never silently overwrite conflicting devices",()=>{
 const local={intent:"Тихая пространственная нота",messages:[]};
 const server={intent:"Совсем другая рабочая редакция",messages:[]};
 it("saves new local data when the project has no server snapshot",()=>{
  expect(decideEggReconciliation(local,null,null,false)).toBe("upload_local");
  expect(decideEggReconciliation({},null,null,true)).toBe("empty");
 });
 it("restores server content to a fresh browser without local edits",()=>{
  expect(decideEggReconciliation({}, {payload:server,revision:2},null,true))
   .toBe("load_remote");
 });
 it("uses common version knowledge to distinguish safe upload or download",()=>{
  const remote={payload:server,revision:7};
  expect(decideEggReconciliation(local,remote,{revision:7,hash:eggSnapshotHash(server)},false))
   .toBe("upload_local");
  expect(decideEggReconciliation(local,remote,{revision:6,hash:eggSnapshotHash(local)},false))
   .toBe("load_remote");
 });
 it("requires author action when two divergent copies have no common base",()=>{
  expect(decideEggReconciliation(local,{payload:server,revision:7},null,false))
   .toBe("conflict");
  expect(decideEggReconciliation(local,{payload:local,revision:1},null,false))
   .toBe("in_sync");
 });
});

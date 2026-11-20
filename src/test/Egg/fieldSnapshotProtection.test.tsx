// @vitest-environment jsdom
import {afterEach,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import {useState} from "react";
import EggWorkspaceSync,{decideEggReconciliation,eggSnapshotHash} from "../../components/egg/EggWorkspaceSync";

const mock=vi.hoisted(()=>({
 remote:null as null|{payload:unknown;revision:number},
 history:null as null|{payload:unknown;revision:number},
 writes:0,
}));
vi.mock("@supabase/supabase-js",()=>({
 createClient:()=>({
  auth:{getUser:async()=>({data:{user:{id:"author-1"}},error:null})},
  from:(table:string)=>{
   let op="read";let newData:Record<string,unknown>={};
   const query={
    select:()=>query,eq:()=>query,order:()=>query,limit:()=>query,
    update:(payload:Record<string,unknown>)=>{op="update";newData=payload;return query;},
    insert:(payload:Record<string,unknown>)=>{op="insert";newData=payload;return query;},
    maybeSingle:async()=>{
     if(table==="egg_workspace_snapshot_history")
      return {data:mock.history,error:null};
     if(op==="update"||op==="insert"){
      mock.writes++;
      mock.remote={payload:newData.payload,revision:Number(newData.revision)};
      return {data:{revision:mock.remote.revision},error:null};
     }
     return {data:mock.remote,error:null};
    },
   };return query;
  },
 }),
}));
const id="da5d7c12-16e3-4a63-bb34-cb0fce6019af";
const five=Array.from({length:5},(_,i)=>({id:"material-"+i,type:"image",location:"matter",text:"Фото "+i,src:"data:image/png;base64,AAAA"}));
afterEach(()=>{cleanup();vi.unstubAllGlobals();localStorage.clear();mock.remote=null;mock.history=null;mock.writes=0;});
function mount(){
 vi.stubGlobal("fetch",vi.fn(async()=>({ok:true,json:async()=>({supabaseUrl:"https://example.test",publishableKey:"anon"})})));
 function Workspace(){
  const [items,setItems]=useState<unknown[]>([]);
  return <div>
   <span data-testid="field-card-count">{items.length}</span>
   <EggWorkspaceSync projectId={id} scope="field" ready value={items} onRestore={setItems}
    isEmpty={x=>x.length===0}/>
  </div>;
 }
 return render(<Workspace/>);
}
describe("Lost browser cache must not empty EGG Material",()=>{
 it("prefers non-empty server even when cached metadata would allow an empty upload",()=>{
  const remote={payload:five,revision:4};
  const meta={revision:4,hash:eggSnapshotHash(five)};
  expect(decideEggReconciliation([],remote,meta,true,false)).toBe("load_remote");
  expect(decideEggReconciliation([],remote,null,true,false)).toBe("load_remote");
 });
 it("actually restores the five selected images without writing [] over server data",async()=>{
  mock.remote={payload:five,revision:4};
  localStorage.setItem("egg:sync-meta:v1:field:"+id,
   JSON.stringify({revision:4,hash:eggSnapshotHash(five)}));
  mount();
  await waitFor(()=>expect(screen.getByTestId("field-card-count").textContent).toBe("5"));
  expect(mock.writes).toBe(0);
  expect(screen.getByTestId("egg-workspace-sync-field").textContent).toContain("синхронизировано");
 });
 it("offers an intentional one-click recovery if a previous nonempty snapshot survives in history",async()=>{
  mock.remote={payload:[],revision:5};
  mock.history={payload:five,revision:4};
  mount();
  await waitFor(()=>expect(screen.getByTestId("egg-restore-field-recovery").textContent).toContain("5 карточек"));
  fireEvent.click(screen.getByTestId("egg-restore-field-recovery"));
  await waitFor(()=>expect(screen.getByTestId("field-card-count").textContent).toBe("5"));
  await waitFor(()=>expect(mock.writes).toBe(1));
  expect(mock.remote?.payload).toEqual(five);
 });

 it("imports an explicit image-card archive after preview, preserving bytes and server revision",async()=>{
  mock.remote={payload:[],revision:5};
  mount();
  await waitFor(()=>expect(screen.getByTestId("egg-open-field-import")).toBeTruthy());
  const archive={format:"EGG_FIELD_BACKUP_V1",projectId:id,cards:five};
  const content=JSON.stringify(archive);
  const file=new File([content],"egg-field-"+id+".json",{type:"application/json"});
  Object.defineProperty(file,"text",{value:async()=>content});
  fireEvent.change(screen.getByLabelText("Загрузить резервную копию EGG"),{
   target:{files:[file]},
  });
  await waitFor(()=>expect(screen.getByTestId("egg-field-import-confirm").textContent).toContain("5 карточек"));
  expect(mock.writes).toBe(0);
  fireEvent.click(screen.getByTestId("egg-confirm-field-restore"));
  await waitFor(()=>expect(screen.getByTestId("field-card-count").textContent).toBe("5"));
  await waitFor(()=>expect(mock.writes).toBe(1));
  expect(mock.remote?.payload).toEqual(five);
 });
 it("rejects a backup with another project id without modifying the server",async()=>{
  mock.remote={payload:[],revision:5};
  mount();
  await waitFor(()=>expect(screen.getByTestId("egg-open-field-import")).toBeTruthy());
  const content=JSON.stringify({format:"EGG_FIELD_BACKUP_V1",projectId:"another-project",cards:five});
  const file=new File([content],"wrong.json",{type:"application/json"});
  Object.defineProperty(file,"text",{value:async()=>content});
  fireEvent.change(screen.getByLabelText("Загрузить резервную копию EGG"),{target:{files:[file]}});
  await waitFor(()=>expect(screen.getByText(/Архив не относится к этому проекту/)).toBeTruthy());
  expect(screen.queryByTestId("egg-field-import-confirm")).toBeNull();
  expect(mock.writes).toBe(0);
 });
});

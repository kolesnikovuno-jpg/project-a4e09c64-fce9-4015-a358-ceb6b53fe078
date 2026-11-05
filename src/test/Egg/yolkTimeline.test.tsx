// @vitest-environment jsdom
import {afterEach,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {
  createEggProject,proposeEggConcept,
  type EggProject,type EggTask,
} from "../../lib/eggEngine";
import {registerDriveReference,confirmDriveReference} from "../../lib/eggArtifacts";
import {startEggFlowCycle,contributeEggFlowSphere,decideEggFlowCycle} from "../../lib/eggFlowCycle";
import {registerEggVisualVersion} from "../../lib/eggVisualHistory";
import {buildEggYolkTimeSnapshot,eggYolkTimeOptions} from "../../lib/eggYolkTimeline";
import EggYolkViewer from "../../components/egg/EggYolkViewer";
import EggYolkExperience from "../../components/egg/EggYolkExperience";

vi.mock("@supabase/supabase-js",()=>({
  createClient:()=>({auth:{getSession:async()=>({
    data:{session:{access_token:"mock-author-access"}},
  })}}),
}));
const id="01b3d29f-bfc4-41ed-b31a-2e0db7fa2fe9";
const t0="2026-11-05T16:00:00Z",t1="2026-11-05T18:00:00Z",
  t2="2026-11-05T19:00:00Z",t3="2026-11-05T20:00:00Z";
const route=["marketing","legal","design","production","testDrive","procurement","commerce","retail"] as const;
const original=()=>{
  let p=createEggProject({id,title:"Кресло A «Объятие»",
    seed:"Лёгкое кресло A с натуральным льном и открытым контуром.",at:t0});
  const task:EggTask={id:"task-old",from:"marketing",sphere:"design",
    initiatedBy:"ai",question:"Исследовать силуэт",openedAt:t0,level:1,iteration:1,
    status:"returned",findings:[{id:"finding-old",taskId:"task-old",
      text:"Первоначальная версия с открытым контуром. Конструкция не проверена.",
      evidence:"hypothesis",submittedBy:"ai",submittedAt:t0,sourceRefs:[]}],
    decisions:[]};
  p={...p,tasks:[task]};
  p=proposeEggConcept(p,{actor:"ai",at:t0,
    text:"Кресло A «Объятие», визуальная гипотеза.",
    visualUrl:"https://example.org/chair-original.png",questions:[]});
  return p;
};
function linked(p:EggProject,cycleId:string|null,sourceRef:string,note:string){
  return registerEggVisualVersion(p,{actor:"author",cycleId,sourceRef,note,at:t3});
}
function fullCycle(p=original()){
  p=linked(p,null,p.concepts![0].id,"Исходная версия перед первым циклом.");
  p=startEggFlowCycle(p,{actor:"author",at:t1});
  const first=p.flowCycles![0].id;
  for(const sphere of route)p=contributeEggFlowSphere(p,{actor:"ai",sphere,at:t1,
    text:"Первый цикл, результат "+sphere+".",evidence:"hypothesis"});
  return {p,first};
}
function twoCycles(){
  let {p,first}=fullCycle();
  p=registerDriveReference(p,{actor:"ai",at:t1,fileId:"ImageModelFileA20261105001",
    title:"Новый вид кресла A",mimeType:"image/png",
    collectionKey:"chair-a/visuals",
    webUrl:"https://drive.google.com/file/d/ImageModelFileA20261105001/view"});
  const external=p.artifacts!.at(-1)!.id;
  p=confirmDriveReference(p,{actor:"author",artifactId:external,at:t1});
  p=linked(p,first,external,"Исследовательский рисунок после первого цикла.");
  p=decideEggFlowCycle(p,{actor:"author",at:t2,
    outcome:"revise",reason:"Нужно проверить форму и конструкцию.",
    addressedSpheres:["design"]});
  const second=p.flowCycles![1].id;
  return {p,first,second,external};
}
afterEach(()=>{cleanup();vi.restoreAllMocks()});
describe("Yolk central historical state synchronization",()=>{
 it("exposes historical baseline without inventing a photo or approval",()=>{
  const p=original(),view=buildEggYolkTimeSnapshot(p);
  expect(eggYolkTimeOptions(p)).toHaveLength(1);
  expect(view.status).toBe("baseline");
  expect(view.spheres.find(x=>x.sphere==="design")).toMatchObject({
    status:"historical",resultId:"finding-old",
  });
  expect(view.spheres.find(x=>x.sphere==="production")?.status).toBe("missing");
  expect(view.visual).toBeNull();
  expect(view.authorDecision).toBeNull();
  expect(view.tensions).toHaveLength(0);
  expect(view.disclaimer).toBe("read_only_time_slice_not_physical_verification");
 });
 it("maps images and all eight sphere results to their exact historical cycle",()=>{
  const {p,first,second,external}=twoCycles();
  const baseline=buildEggYolkTimeSnapshot(p,"baseline");
  const old=buildEggYolkTimeSnapshot(p,first);
  const latest=buildEggYolkTimeSnapshot(p,second);
  expect(baseline.visual?.sourceRef).toBe(p.concepts![0].id);
  expect(baseline.spheres.find(x=>x.sphere==="design")?.resultId).toBe("finding-old");
  expect(old.visual).toMatchObject({sourceRef:external,presentation:"external_reference"});
  expect(old.visualProvenance).toBe("selected_cycle");
  expect(old.spheres.every(x=>x.status==="new")).toBe(true);
  expect(old.authorDecision?.outcome).toBe("revise");
  expect(old.authorDecision?.reason).toContain("конструкцию");
  expect(latest.visual).toMatchObject({sourceRef:external});
  expect(latest.visualProvenance).toBe("carried_from_previous");
  expect(latest.visualNote).toContain("прежний источник");
  expect(latest.spheres.find(x=>x.sphere==="marketing")).toMatchObject({
    status:"inherited",sourceCycleId:first,
  });
  expect(latest.spheres.find(x=>x.sphere==="design")?.status).toBe("pending_work");
  expect(latest.spheres.find(x=>x.sphere==="testDrive")?.status).toBe("pending_transit");
  expect(latest.authorDecision).toBeNull();
  expect(latest.synthesisId).toBeNull();
  expect(eggYolkTimeOptions(p).map(x=>x.key)).toEqual(["baseline",first,second]);
  expect(()=>buildEggYolkTimeSnapshot(p,"nonexistent-cycle")).toThrow(/Unknown Yolk/);
  expect(p.level).toBe(1);
 });
 it("historically scopes registered tension status instead of displaying future Author decisions",()=>{
   const {p,first,second}=twoCycles();
   const known:EggProject={...p,balanceTensions:[{
     id:"balance-900",key:"structural_lightness",title:"Лёгкость и конструкция",
     hypothesis:"Сечения пока не проверены",relatedSpheres:["design","production"],
     sourceRefs:["finding-old"],verification:"Проверить узлы",
     resolutionOptions:["Макет"],suggestedTargets:["design"],
     source:"source_cue",priority:"needs_evidence",coreStatus:"author_review_required",
     status:"tracked",severity:"medium",createdAt:"2026-11-05T18:30:00Z",
     history:[
       {at:"2026-11-05T18:30:00Z",actor:"ai",action:"registered",
         reason:"Требуется проверка формы.",verificationRefs:[]},
       {at:"2026-11-05T19:30:00Z",actor:"author",action:"tracked",
         reason:"Проверить рамный узел.",verificationRefs:[]},
     ],
   }]};
   expect(buildEggYolkTimeSnapshot(known,"baseline").tensions).toHaveLength(0);
   expect(buildEggYolkTimeSnapshot(known,first).tensions)
     .toMatchObject([{status:"proposed",lastActionAt:"2026-11-05T18:30:00Z"}]);
   expect(buildEggYolkTimeSnapshot(known,second).tensions)
     .toMatchObject([{status:"tracked",lastActionAt:"2026-11-05T19:30:00Z"}]);
 });
 it("renders real linked image at the center and switches to unapproved parametric sketch",()=>{
   const p=linked(original(),null,original().concepts![0].id,
     "Исходный образ авторского кресла.");
   const visual=p.visualVersions![0];
   render(<EggYolkViewer level={1} iteration={1} visualVersion={visual}/>);
   expect(screen.getByTestId("yolk-bound-image").getAttribute("src"))
     .toBe("https://example.org/chair-original.png");
   expect(screen.queryByTestId("yolk-stage-gesture")).toBeNull();
   fireEvent.click(screen.getByTestId("yolk-visual-mode"));
   expect(screen.getByTestId("yolk-stage-gesture")).toBeTruthy();
   expect(screen.getByTestId("yolk-generate-glb")).toBeTruthy();
   fireEvent.click(screen.getByTestId("yolk-visual-mode"));
   expect(screen.getByTestId("yolk-bound-image")).toBeTruthy();
 });
 it("does not fake a 3D preview of a Google Drive sharing page",()=>{
   let p=original();
   p=registerDriveReference(p,{actor:"ai",at:t1,fileId:"MODEL_2026_EXAMPLE_12345",
     title:"GLB концепции",mimeType:"model/gltf-binary",
     collectionKey:"chair-a/3d",
     webUrl:"https://drive.google.com/file/d/MODEL_2026_EXAMPLE_12345/view"});
   p=confirmDriveReference(p,{actor:"author",artifactId:p.artifacts![0].id,at:t2});
   p=linked(p,null,p.artifacts![0].id,"Подтверждённый источник модели, не утверждённая конструкция.");
   render(<EggYolkViewer visualVersion={p.visualVersions![0]}/>);
   expect(screen.getByTestId("yolk-bound-external").textContent)
     .toContain("не встроена");
   expect(screen.queryByTestId("yolk-bound-3d")).toBeNull();
   expect(screen.getByRole("link",{name:"Открыть исходный материал"})).toBeTruthy();
 });
 it("synchronizes cycle selection, central visual and historical Author decision on actual Yolk page",async()=>{
   const {p,first,second}=twoCycles();
   const originalFetch=globalThis.fetch;
   globalThis.fetch=vi.fn(async(input:RequestInfo|URL)=>{
     const url=String(input);
     if(url.includes("/api/egg-config"))return {ok:true,json:async()=>({
       supabaseUrl:"https://example.supabase.co",publishableKey:"test-key",
     })} as Response;
     if(url.includes("/api/egg-project-state"))return {ok:true,json:async()=>({
       revision:27,project:p,
     })} as Response;
     throw Error("Unexpected test request "+url);
   });
   try{
     render(<MemoryRouter initialEntries={["/egg/yolk?project="+id]}>
       <EggYolkExperience/>
     </MemoryRouter>);
     await waitFor(()=>expect(screen.getByTestId("yolk-timeline-controls")).toBeTruthy());
     expect((screen.getByTestId("yolk-timeline-select") as HTMLSelectElement).value).toBe(second);
     expect(screen.getByTestId("yolk-timeline-stage-status").textContent).toContain("Цикл идёт");
     expect(screen.getByTestId("yolk-bound-external").textContent).toContain("не встроена");
     fireEvent.click(screen.getByTestId("yolk-orbit-marketing"));
     fireEvent.click(screen.getByTestId("yolk-expand"));
     expect(screen.getByTestId("yolk-sphere-versioned-result").textContent)
       .toContain("Унаследован");
     fireEvent.click(screen.getByRole("button",{name:"Закрыть"}));
     fireEvent.change(screen.getByTestId("yolk-timeline-select"),{target:{value:first}});
     expect(screen.getByTestId("yolk-timeline-stage-status").textContent).toContain("доработку");
     expect(screen.getByTestId("yolk-timeline-audit").textContent).toContain("проверить форму");
     fireEvent.click(screen.getByTestId("yolk-expand"));
     expect(screen.getByTestId("yolk-sphere-versioned-result").textContent)
       .toContain("Новый вывод");
     fireEvent.click(screen.getByRole("button",{name:"Закрыть"}));
     fireEvent.change(screen.getByTestId("yolk-timeline-select"),{target:{value:"baseline"}});
     expect(screen.getByTestId("yolk-bound-image").getAttribute("src"))
       .toBe("https://example.org/chair-original.png");
     expect(screen.getByTestId("yolk-timeline-stage-status").textContent)
       .toContain("Исходное");
     expect(screen.getByTestId("yolk-timeline-audit").textContent)
       .toContain("не зарегистрировано");
   }finally{globalThis.fetch=originalFetch}
 });
});

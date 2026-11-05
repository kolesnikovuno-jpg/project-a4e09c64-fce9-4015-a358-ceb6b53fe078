import {describe,expect,it} from "vitest";
import {EGG_EDGES,canRoute,createEggProject} from "../../lib/eggEngine";
import {EGG_FLOW_ROUTES,EGG_FIXED_ROUTE,startEggFlowCycle,contributeEggFlowSphere,decideEggFlowCycle,
  currentEggFlowCycle} from "../../lib/eggFlowCycle";
import {eggMutationSchema,readEggState,runEggMutation} from "../../lib/eggCommands";

const id="01b3d29f-bfc4-41ed-b31a-2e0db7fa2fe9",at="2026-11-05T09:55:00.000Z";
const ownerId="owner";
const author={kind:"author" as const,ownerId};
const ai={kind:"agent" as const,projectId:id,ownerId,scopes:["read" as const,"contribute" as const]};
const original=()=>createEggProject({id,title:"Кресло",seed:"Лёгкое кресло для отдыха и уединения",at});
function contribute(p:ReturnType<typeof original>,sphere:typeof EGG_FIXED_ROUTE[number],word:string){
 return contributeEggFlowSphere(p,{actor:"ai",sphere,text:word,evidence:"hypothesis",sourceRefs:["author-observation"],at});
}
function fullCycle(){
 let p=startEggFlowCycle(original(),{actor:"author",at});
 p=contribute(p,"marketing","Возможности аудитории");
 p=contribute(p,"legal","Права на дизайн");
 p=contribute(p,"design","Эскизы");
 p=contribute(p,"production","Вариант технологии");
 p=contribute(p,"testDrive","Гипотеза эргономики");
 p=contribute(p,"procurement","Комплектация");
 p=contribute(p,"commerce","Экономическая модель");
 p=contribute(p,"retail","Способ передачи пользователю");
 return p;
}
describe("EGG fixed-route flow engine",()=>{
 it("has exactly two forward lines with no design→production and no commerce→retail junction",()=>{
   expect(EGG_FLOW_ROUTES.first).toEqual(["marketing","design","testDrive","commerce"]);
   expect(EGG_FLOW_ROUTES.second).toEqual(["legal","production","procurement","retail"]);
   expect(EGG_EDGES).toHaveLength(8);
   expect(canRoute("design","production","ai")).toBe(false);
   expect(canRoute("design","marketing","ai")).toBe(false);
   expect(canRoute("commerce","retail","ai")).toBe(false);
   expect(canRoute("idea","legal","ai")).toBe(true);
 });
 it("visits all eight active spheres by branch order and only synthesizes once BOTH endpoints arrive",()=>{
   let p=startEggFlowCycle(original(),{actor:"author",at});
   expect(currentEggFlowCycle(p)?.first.map(v=>v.sphere)).toEqual(EGG_FLOW_ROUTES.first);
   expect(currentEggFlowCycle(p)?.second.map(v=>v.sphere)).toEqual(EGG_FLOW_ROUTES.second);
   expect(()=>contribute(p,"design","Premature")).toThrow(/next active station/);
   for(const [sphere,text] of [["marketing","m"],["design","d"],["testDrive","t"],["commerce","c"]] as const)
     p=contribute(p,sphere,text);
   expect(currentEggFlowCycle(p)?.status).toBe("running");
   expect(currentEggFlowCycle(p)?.synthesis).toBeUndefined();
   for(const [sphere,text] of [["legal","l"],["production","p"],["procurement","m"],["retail","r"]] as const)
     p=contribute(p,sphere,text);
   const cycle=currentEggFlowCycle(p)!;
   expect(cycle.status).toBe("awaiting_author");
   expect(cycle.first.every(v=>v.status==="completed")).toBe(true);
   expect(cycle.second.every(v=>v.status==="completed")).toBe(true);
   expect(cycle.synthesis?.endpoints.commerce.text).toBe("c");
   expect(cycle.synthesis?.endpoints.retail.text).toBe("r");
   expect(cycle.synthesis?.dna.seed).toBe(original().seed.text);
   expect(p.level).toBe(1);
   expect(p.iteration).toBe(1);
   expect(cycle.synthesis?.status).toBe("structural_not_expert_verified");
 });
 it("only Author may revise, then all nodes are visited but only addressed nodes work",()=>{
   let p=fullCycle();
   expect(()=>decideEggFlowCycle(p,{actor:"ai",outcome:"revise",reason:"Change",addressedSpheres:["design"],at})).toThrow(/Only Author/);
   p=decideEggFlowCycle(p,{actor:"author",outcome:"revise",
     reason:"Проверить лёгкость формы",addressedSpheres:["design","testDrive"],at});
   const cycle=currentEggFlowCycle(p)!;
   expect(p.level).toBe(1);
   expect(p.iteration).toBe(2);
   expect(cycle.first.map(v=>v.status)).toEqual(["transited","awaiting_result","pending","pending"]);
   expect(cycle.second.map(v=>v.status)).toEqual(["transited","transited","transited","transited"]);
   expect(cycle.second.map(v=>v.inherited?.resultId)).toEqual(
     [...p.flowCycles![0].second].map(v=>v.result!.id));
   expect(cycle.second.map(v=>v.requiresRecheck)).toEqual([false,false,false,false]);
   p=contribute(p,"design","Эскиз B: облегчение контура");
   p=contribute(p,"testDrive","Оценить эргономику эскиза B");
   const finished=currentEggFlowCycle(p)!;
   expect(finished.status).toBe("awaiting_author");
   expect(finished.first.map(v=>v.status)).toEqual(["transited","completed","completed","transited"]);
   expect(finished.synthesis?.first[0].status).toBe("inherited");
   expect(finished.synthesis?.first[1].status).toBe("new");
   expect(finished.synthesis?.first[3].requiresRecheck).toBe(true);
   expect(finished.synthesis?.endpoints.commerce.sourceCycleId).toBe(p.flowCycles![0].id);
   expect(finished.synthesis?.endpoints.retail.sourceCycleId).toBe(p.flowCycles![0].id);
   expect(p.events.filter(e=>e.kind==="sphere_transited"&&e.detail.includes(finished.id))).toHaveLength(6);
 });
 it("advances 1 of 5 levels only after Author accepts an integrated cycle",()=>{
   let p=fullCycle();
   expect(()=>decideEggFlowCycle(p,{actor:"author",outcome:"revise",reason:"Need review",addressedSpheres:[],at})).toThrow(/at least one/);
   p=decideEggFlowCycle(p,{actor:"author",outcome:"accept",reason:"Принято целиком",at});
   expect(p.level).toBe(2);
   expect(p.iteration).toBe(1);
   expect(currentEggFlowCycle(p)?.status).toBe("accepted");
   p=startEggFlowCycle(p,{actor:"author",at});
   expect(currentEggFlowCycle(p)?.level).toBe(2);
   expect(currentEggFlowCycle(p)?.first.filter(v=>v.mode==="work")).toHaveLength(4);
   expect(p.flowCycles).toHaveLength(2);
   expect(()=>decideEggFlowCycle(p,{actor:"author",outcome:"accept",reason:"premature",at})).toThrow(/Both complete flows/);
 });
 it("validates AI and Author scoped server mutations, preserving the older project state",()=>{
   let p=original();
   const m=(command:unknown)=>eggMutationSchema.parse(command);
   expect(eggMutationSchema.safeParse({
     command:"decide_flow_cycle",projectId:id,expectedRevision:1,outcome:"revise",reason:"change",
     addressedSpheres:["design","other"]
   }).success).toBe(false);
   p=runEggMutation(p,m({command:"start_flow_cycle",projectId:id,expectedRevision:1}),author,ownerId,at);
   expect(readEggState(p).flowCycles).toHaveLength(1);
   expect(readEggState(p).flowModel.levels).toBe(5);
   expect(()=>runEggMutation(p,m({command:"decide_flow_cycle",projectId:id,expectedRevision:2,
     outcome:"accept",reason:"Approval"}),ai,ownerId,at)).toThrow(/Forbidden/);
   expect(()=>runEggMutation(p,m({command:"set_level",projectId:id,expectedRevision:2,
     level:6,reason:"Incorrect"}),author,ownerId,at)).toThrow();
   expect(()=>runEggMutation(p,m({command:"route",projectId:id,expectedRevision:2,
     from:"idea",to:"marketing",question:"old style"}),ai,ownerId,at)).toThrow(/Legacy/);
   expect(readEggState(original()).flowCycles).toEqual([]);
 });
});

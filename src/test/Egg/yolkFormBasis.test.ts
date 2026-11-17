import {describe,expect,it} from "vitest";
import {createEggProject} from "../../lib/eggEngine";
import type {EggFlowCycle,EggSynthesisItem} from "../../lib/eggFlowCycle";
import {projectCompleteEggCycleToSpatial} from "../../lib/eggCycleSpatialProjection";
import {resolveEggYolkFormBasis} from "../../lib/eggYolkFormBasis";
import type {EggProject,SphereId} from "../../lib/eggEngine";

const oldIdea="Кресло с мягкой опорой";
const currentIdea="Неутилитарный элемент пространства — отдельная нота";
const first=["marketing","design","testDrive","commerce"] as SphereId[];
const second=["legal","production","procurement","retail"] as SphereId[];
const item=(sphere:SphereId,branch:"first"|"second"):EggSynthesisItem=>({
 sphere,branch,sourceCycleId:"cycle-old",resultId:"result-"+sphere,
 evidence:"observation",text:"Сохранённый результат "+sphere,
 status:"new",requiresRecheck:false,
});
function projectWithCompletedIdea(intent:string):EggProject{
 const project=createEggProject({id:"01b3d29f-bfc4-41ed-b31a-2e0db7fa2fe9",
  title:"Старый объект",seed:oldIdea,at:"2026-11-17T10:00:00Z"});
 const items1=first.map(s=>item(s,"first"));
 const items2=second.map(s=>item(s,"second"));
 const cycle={
  id:"cycle-old",level:1,iteration:1,startedAt:"2026-11-17T10:10:00Z",
  source:"idea",authorBrief:intent,status:"awaiting_author",
  ideaHandoff:{intent},
  first:[],second:[],
  synthesis:{
   id:"syn-old",at:"2026-11-17T10:15:00Z",
   dna:{seed:oldIdea,conceptId:null,conceptText:null,authorIntent:intent},
   first:items1,second:items2,
   endpoints:{commerce:items1[3],retail:items2[3]},gaps:[],
   status:"structural_not_expert_verified",
  }
 } as unknown as EggFlowCycle;
 return {...project,flowCycles:[cycle]};
}
describe("Yolk is bound to the actual Author idea, not historical cycles",()=>{
 it("starts a provisional spatial field from current Author's local draft",()=>{
  const result=resolveEggYolkFormBasis(projectWithCompletedIdea(oldIdea),
   {intent:currentIdea,savedDraft:"Рабочая гипотеза о скрытом присутствии"},
   "demo");
  expect(result.origin).toBe("author_idea_preview");
  expect(result.text).toContain(currentIdea);
  expect(result.text).toContain("скрытом присутствии");
  expect(result.synthesis).toBeNull();
 });
 it("reveals further geometry only after the SAME idea completes eight spheres",()=>{
  const project=projectWithCompletedIdea(currentIdea);
  expect(projectCompleteEggCycleToSpatial(project,currentIdea)?.synthesisId).toBe("syn-old");
  expect(resolveEggYolkFormBasis(project,{intent:currentIdea,savedDraft:""},"demo")
    .synthesis?.synthesisId).toBe("syn-old");
  expect(projectCompleteEggCycleToSpatial(project,"Совершенно другая идея")).toBeNull();
 });
 it("preserves the underlying seed when there is no current local Idea",()=>{
  const project=createEggProject({id:"01b3d29f-bfc4-41ed-b31a-2e0db7fa2fe9",
   title:"Без нового цикла",seed:oldIdea,at:"2026-11-17T10:00:00Z"});
  const result=resolveEggYolkFormBasis(project,null,"demo");
  expect(result.origin).toBe("project_seed");
  expect(result.text).toBe(oldIdea);
  expect(result.synthesis).toBeNull();
 });
});

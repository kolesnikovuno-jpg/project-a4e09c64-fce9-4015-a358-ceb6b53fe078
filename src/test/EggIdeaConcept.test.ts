import { describe, expect, it } from "vitest";
import {
 createEggProject, decideEggConcept, getActiveConcept, proposeEggConcept,
 readCore, routeConceptQuestion, type EggProject,
} from "../lib/eggEngine";
import { eggMutationSchema, runEggMutation } from "../lib/eggCommands";

const at="2026-11-04T16:00:00+02:00";
const newProject=()=>createEggProject({id:"11111111-1111-4111-8111-111111111111",seed:"Смысл Автора не должен меняться",at});
const proposed=(p:EggProject)=>proposeEggConcept(p,{
 actor:"ai",at,text:"Сжатая концепция",questions:[
   {sphere:"production",question:"Как сохранить лёгкость формы?"},
   {sphere:"marketing",question:"Для кого нужен объект?"},
 ]
});

describe("EGG Idea sphere and concepts",()=>{
 it("keeps proposals out of Core until the Author approves",()=>{
   const base=newProject();
   const draft=proposed(base);
   expect(draft.seed.text).toBe(base.seed.text);
   expect(draft.concepts).toHaveLength(1);
   expect(draft.concepts?.[0].status).toBe("proposed");
   expect(readCore(draft).approvedConcept).toBeNull();
   expect(draft.tasks).toHaveLength(0);
   expect(()=>decideEggConcept(draft,{actor:"ai",conceptId:draft.concepts![0].id,outcome:"accept",reason:"ok",at})).toThrow(/Only the Author/);
 });
 it("accepts a version and routes only a selected question with traceability",()=>{
   const draft=proposed(newProject());
   const id=draft.concepts![0].id;
   const approved=decideEggConcept(draft,{actor:"author",conceptId:id,outcome:"accept",reason:"Сохраняем",at});
   expect(getActiveConcept(approved)?.text).toBe("Сжатая концепция");
   expect(readCore(approved).approvedConcept?.id).toBe(id);
   expect(()=>routeConceptQuestion(approved,{actor:"ai",conceptId:id,questionIndex:0,at})).toThrow(/Only the Author/);
   const routed=routeConceptQuestion(approved,{actor:"author",conceptId:id,questionIndex:0,at});
   expect(routed.tasks).toHaveLength(1);
   expect(routed.tasks[0].sphere).toBe("production");
   expect(routed.tasks[0].sourceConceptId).toBe(id);
   expect(routed.tasks[0].sourceQuestionIndex).toBe(0);
   expect(routeConceptQuestion(routed,{actor:"author",conceptId:id,questionIndex:0,at})).toBe(routed);
   expect(routed.seed.text).toBe("Смысл Автора не должен меняться");
 });
 it("preserves earlier accepted concepts and feedback when a level is revisited",()=>{
   const first=proposed(newProject());
   const one=first.concepts![0].id;
   const accepted=decideEggConcept(first,{actor:"author",conceptId:one,outcome:"accept",reason:"Первый проход",at});
   const second=proposeEggConcept(accepted,{actor:"author",at,text:"Новая версия"});
   const two=second.concepts![1].id;
   const returned=decideEggConcept(second,{actor:"author",conceptId:two,outcome:"revise",reason:"Вернуть лёгкость",at});
   expect(returned.concepts?.[1].decision?.reason).toBe("Вернуть лёгкость");
   expect(getActiveConcept(returned)?.id).toBe(one);
   const third=proposeEggConcept(returned,{actor:"ai",at,text:"Уточнённая версия"});
   const three=third.concepts![2].id;
   const final=decideEggConcept(third,{actor:"author",conceptId:three,outcome:"accept",reason:"Принято",at});
   expect(final.concepts?.map(c=>c.status)).toEqual(["accepted","revision_requested","accepted"]);
   expect(getActiveConcept(final)?.id).toBe(three);
 });
 it("does not allow a second unresolved proposal or invented empty questions",()=>{
   const draft=proposed(newProject());
   expect(()=>proposed(draft)).toThrow(/Review the open/);
   expect(()=>proposeEggConcept(newProject(),{actor:"ai",at,text:"OK",questions:[{sphere:"design",question:""}]})).toThrow(/Invalid concept questions/);
 });
 it("keeps author-only commands unavailable to scoped AI agents",()=>{
   const state=newProject();
   const identity={kind:"agent" as const,projectId:state.id,ownerId:"owner",scopes:["read","contribute"] as Array<"read"|"contribute">};
   const valid=eggMutationSchema.parse({command:"propose_concept",projectId:state.id,expectedRevision:1,text:"Черновик"});
   const draft=runEggMutation(state,valid,identity,"owner",at);
   expect(draft.concepts?.[0].status).toBe("proposed");
   const decision=eggMutationSchema.parse({command:"decide_concept",projectId:state.id,expectedRevision:2,conceptId:draft.concepts![0].id,outcome:"accept",reason:"Одобрение"});
   expect(()=>runEggMutation(draft,decision,identity,"owner",at)).toThrow(/Forbidden/);
 });
});

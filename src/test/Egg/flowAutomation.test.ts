import {describe,it,expect} from "vitest";
import {createEggProject} from "../../lib/eggEngine";
import {startEggFlowCycle,contributeEggFlowSphere,decideEggFlowCycle} from "../../lib/eggFlowCycle";
import {contributeEggYolkReview} from "../../lib/eggYolkSemantic";
import {
  nextEggAutomationStep,EGG_AUTOMATION_ORDER,MAX_EGG_AUTOMATION_STEPS,
  buildEggAutomationPrompt,parseEggAutomationOutput,
  eggAutomationRequestSchema,
} from "../../lib/eggFlowAutomation";
import {buildEggSphereBrief} from "../../lib/eggSphereIntelligence";
import {providerFromEnv} from "../../../api/egg-flow-ai";

const at="2026-11-05T18:50:00Z";
const base=()=>createEggProject({
  id:"2186cc4c-9faf-457b-8881-93ee786ca513",
  title:"Кресло / сценарий",seed:"Лёгкое кресло для отдыха из дерева и льна",at,
});
const sphereValue={
  text:"Требуется исследовать реализацию текущего замысла без выдуманных расчётов.",
  evidence:"hypothesis" as const,
  discoveredQuestions:[{domain:"Реализуемость",question:"Какие ограничения требуют проверки?",
    basis:"Данных для подтверждения конструкции недостаточно."}],
};
describe("EGG automated execution / author-preserving circulation",()=>{
 it("selects server-side OIDC from Vercel's runtime request header, with no client secret",()=>{
   expect(providerFromEnv({VERCEL:"1"} as NodeJS.ProcessEnv,"oidc-test-token"))
     .toMatchObject({kind:"gateway",model:"openai/gpt-5.4-mini"});
   expect(providerFromEnv({} as NodeJS.ProcessEnv,"client-faked-header")).toBeNull();
   expect(providerFromEnv({AI_GATEWAY_API_KEY:"server-key"} as NodeJS.ProcessEnv))
     .toMatchObject({kind:"gateway"});
   expect(providerFromEnv({OPENAI_API_KEY:"direct-key"} as NodeJS.ProcessEnv))
     .toMatchObject({kind:"direct_openai"});
   expect(providerFromEnv({VERCEL_OIDC_TOKEN:"server-token"} as NodeJS.ProcessEnv))
     .toMatchObject({kind:"gateway"});
   expect(eggAutomationRequestSchema.safeParse({
     projectId:base().id,expectedRevision:1,mode:"preflight",
   }).success).toBe(true);
   expect(eggAutomationRequestSchema.safeParse({
     projectId:base().id,expectedRevision:1,mode:"preflight",actor:"author",
   }).success).toBe(false);
   expect(eggAutomationRequestSchema.safeParse({
     projectId:base().id,expectedRevision:1,mode:"invalid",
   }).success).toBe(false);
 });

 it("plans interleaved spheres in fixed branch order, then Yolk, then stops",()=>{
   let p=base();
   expect(nextEggAutomationStep(p)).toEqual({kind:"not_started"});
   expect(EGG_AUTOMATION_ORDER).toEqual([
     "marketing","legal","design","production","testDrive","procurement","commerce","retail",
   ]);
   expect(MAX_EGG_AUTOMATION_STEPS).toBe(9);
   p=startEggFlowCycle(p,{actor:"author",at});
   const sequence:string[]=[];
   for(let i=0;i<8;i++){
     const step=nextEggAutomationStep(p);
     expect(step.kind).toBe("sphere");
     if(step.kind!=="sphere")throw Error("not sphere");
     sequence.push(step.sphere);
     const prompt=buildEggAutomationPrompt(p,step);
     expect(prompt.instructions).toContain("AUTOMATED TEXT-ONLY MODE");
     expect(prompt.instructions).toContain("No");
     const output=parseEggAutomationOutput(step,JSON.stringify(sphereValue));
     expect(output.kind).toBe("sphere");
     p=contributeEggFlowSphere(p,{actor:"ai",sphere:step.sphere,at,
       text:sphereValue.text,evidence:"hypothesis",
       discoveredQuestions:sphereValue.discoveredQuestions});
   }
   expect(sequence).toEqual([...EGG_AUTOMATION_ORDER]);
   const step=nextEggAutomationStep(p);
   expect(step.kind).toBe("yolk");
   if(step.kind!=="yolk")throw Error("not yolk");
   expect(buildEggAutomationPrompt(p,step).instructions).toContain("ACTUAL");
   const semantic=parseEggAutomationOutput(step,JSON.stringify({
     synthesisId:step.synthesisId,
     summary:"Нужна проверка технологических ограничений и согласования двух потоков.",
     interpretations:[],
     limitations:["Нет реальных физических испытаний и реестровых проверок."],
   }));
   expect(semantic.kind).toBe("yolk");
   if(semantic.kind!=="yolk")throw Error("not semantic");
   p=contributeEggYolkReview(p,{actor:"ai",at,draft:semantic.data});
   expect(nextEggAutomationStep(p)).toEqual({kind:"done"});
   expect(p.level).toBe(1);
   expect(p.flowCycles![0].status).toBe("awaiting_author");
   expect(p.flowCycles![0].decision).toBeUndefined();
   const approved=decideEggFlowCycle(p,{actor:"author",at,outcome:"accept",
     reason:"Автор утверждает результат"});
   expect(approved.level).toBe(2);
 });
 it("never leaks parallel Design into Legal; context is same-branch only",()=>{
   let p=startEggFlowCycle(base(),{actor:"author",at});
   p=contributeEggFlowSphere(p,{actor:"ai",at,sphere:"marketing",
     evidence:"hypothesis",text:"Вариант рынка: интерьерные бюро"});
   p=contributeEggFlowSphere(p,{actor:"ai",at,sphere:"design",
     evidence:"hypothesis",text:"Новая форма в Дизайне"});
   const brief=buildEggSphereBrief(p,"legal");
   expect(JSON.stringify(brief)).not.toContain("Новая форма в Дизайне");
   expect(buildEggAutomationPrompt(p,{kind:"sphere",sphere:"legal",cycleId:p.flowCycles![0].id}).input)
      .not.toContain("Новая форма в Дизайне");
 });
 it("supports targeted revisions and stops on completed Author review",()=>{
   let p=startEggFlowCycle(base(),{actor:"author",at});
   for(const s of EGG_AUTOMATION_ORDER)p=contributeEggFlowSphere(p,{actor:"ai",at,
     sphere:s,evidence:"hypothesis",text:"Черновой анализ "+s});
   p=decideEggFlowCycle(p,{actor:"author",outcome:"revise",reason:"Проработать конструкцию",
      addressedSpheres:["production"],at});
   expect(nextEggAutomationStep(p)).toMatchObject({kind:"sphere",sphere:"production"});
   p=contributeEggFlowSphere(p,{actor:"ai",at,sphere:"production",
     text:"Второй цикл · уточнение узла",evidence:"hypothesis"});
   expect(nextEggAutomationStep(p).kind).toBe("yolk");
 });
 it("rejects unsupported source claims and Author impersonation in automation outputs",()=>{
   const p=startEggFlowCycle(base(),{actor:"author",at});
   const step=nextEggAutomationStep(p);
   expect(()=>parseEggAutomationOutput(step,JSON.stringify({
     ...sphereValue,evidence:"observation",
   }))).toThrow();
   expect(()=>parseEggAutomationOutput(step,JSON.stringify({
     ...sphereValue,sourceRefs:["https://example.org/unsearched-record"],
   }))).toThrow();
   expect(()=>parseEggAutomationOutput(step,JSON.stringify({
     ...sphereValue,legalSimilarity:{status:"no_infringement"},
   }))).toThrow();
   expect(()=>parseEggAutomationOutput(step,"{invalid-json")).toThrow();
   expect(eggAutomationRequestSchema.safeParse({
     projectId:p.id,expectedRevision:1,command:"decide_flow_cycle",
   }).success).toBe(false);
   expect(eggAutomationRequestSchema.safeParse({
     projectId:p.id,expectedRevision:1,
   }).success).toBe(true);
   expect(p.flowCycles![0].first[0].result).toBeUndefined();
 });
});

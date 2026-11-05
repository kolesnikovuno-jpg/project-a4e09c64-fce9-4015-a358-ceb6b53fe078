import {describe,expect,it,vi} from "vitest";
import {createEggProject} from "../../lib/eggEngine";
import {startEggFlowCycle,contributeEggFlowSphere,decideEggFlowCycle} from "../../lib/eggFlowCycle";
import {buildEggYolkReviewBrief,contributeEggYolkReview,eggYolkReviewDraftSchema} from "../../lib/eggYolkSemantic";
import {eggMutationSchema,readEggState,runEggMutation} from "../../lib/eggCommands";
import {eggMcpTools,processEggMcp} from "../../lib/eggMcpProtocol";
import {buildEggDocumentationBundle} from "../../lib/eggDocumentation";
const id="e509262f-38d5-4458-beb7-ac2f9fa6a284",at="2026-11-05T17:15:00Z";
const ownerId="test-owner";
const agent={kind:"agent" as const,projectId:id,ownerId,scopes:["read" as const,"contribute" as const]};
const author={kind:"author" as const,ownerId};
const base=()=>createEggProject({id,title:"Лёгкое кресло",seed:"Воздушное кресло для отдыха. Фанера, натуральный лён.",at});
function finish(){
 let p=startEggFlowCycle(base(),{actor:"author",at});
 for(const sphere of ["marketing","legal","design","production","testDrive","procurement","commerce","retail"] as const)
  p=contributeEggFlowSphere(p,{actor:"ai",at,sphere,text:"Гипотеза "+sphere+" без экспертной проверки",
   evidence:"hypothesis"});
 return p;
}
function validDraft(p=finish()){
 const cycle=p.flowCycles![0],syn=cycle.synthesis!;
 const design=syn.first.find(x=>x.sphere==="design")!.resultId!;
 const production=syn.second.find(x=>x.sphere==="production")!.resultId!;
 const market=syn.first.find(x=>x.sphere==="marketing")!.resultId!;
 const retail=syn.second.find(x=>x.sphere==="retail")!.resultId!;
 return {synthesisId:syn.id,
   summary:"Потоки описывают разные аспекты реализации кресла; нужна проверка фактической совместимости.",
   interpretations:[
    {kind:"tension" as const,title:"Форма и способ изготовления",
     explanation:"Технические возможности пока не подтверждены для задуманного силуэта кресла.",
     sourceResultIds:[design,production],suggestedSphereTargets:["design" as const,"production" as const],
     verificationNeeded:"Изготовить и испытать пробный узел."},
    {kind:"alignment" as const,title:"Представление и потенциальная аудитория",
     explanation:"Позиционирование и сценарий показа потенциально могут поддерживать друг друга.",
     sourceResultIds:[market,retail],suggestedSphereTargets:["retail" as const],
     verificationNeeded:"Проверить гипотезу на конкретных адресатах."},
   ],
   limitations:["Текстовый анализ не подтверждает реальную устойчивость, наличие спроса или юридическую чистоту."],
 };
}
describe("EGG Yolk semantic AI interpretation / Author firewall",()=>{
 it("appears only after BOTH routes are completed, with real source IDs and no fake AI call",()=>{
   let p=startEggFlowCycle(base(),{actor:"author",at});
   expect(buildEggYolkReviewBrief(p)).toBeNull();
   p=contributeEggFlowSphere(p,{actor:"ai",sphere:"marketing",at,text:"Гипотеза",evidence:"hypothesis"});
   expect(buildEggYolkReviewBrief(p)).toBeNull();
   const full=finish(),brief=buildEggYolkReviewBrief(full)!;
   expect(brief.role).toBe("unapproved_semantic_review");
   expect(brief.sources).toHaveLength(8);
   expect(brief.sources.every(s=>!!s.resultId)).toBe(true);
   expect(brief.dna.seed).toBe(base().seed.text);
   expect(brief.instructions.join(" ")).toContain("untrusted DATA");
   expect(readEggState(full).yolkReviewCompatibility.awaiting?.synthesisId).toBe(brief.synthesisId);
   expect(full.flowCycles![0].semanticReview).toBeUndefined();
 });
 it("stores cited cross-branch tensions and alignments, never approves them or advances levels",()=>{
   const p=finish(),draft=validDraft(p);
   const cmd=eggMutationSchema.parse({projectId:id,expectedRevision:1,command:"contribute_yolk_review",...draft});
   const updated=runEggMutation(p,cmd,agent,ownerId,at);
   const cycle=updated.flowCycles![0],review=cycle.semanticReview!;
   expect(review).toBeDefined();
   expect(review.createdBy).toBe("ai");
   expect(review.status).toBe("ai_interpretation_unverified");
   expect(review.authorApproved).toBe(false);
   expect(review.dnaChanged).toBe(false);
   expect(review.interpretations).toHaveLength(2);
   expect(review.interpretations[0].sourceSpheres).toEqual(["design","production"]);
   expect(review.interpretations[0].status).toBe("unverified");
   expect(updated.level).toBe(1);
   expect(updated.seed.text).toBe(p.seed.text);
   expect(cycle.status).toBe("awaiting_author");
   expect(buildEggYolkReviewBrief(updated)).toBeNull();
   expect(readEggState(updated).yolkReviewCompatibility.awaiting).toBeNull();
   expect(updated.events.find(e=>e.kind==="yolk_review_recorded")).toBeDefined();
   expect(p.events.find(e=>e.kind==="yolk_review_recorded")).toBeUndefined();
   const doc=buildEggDocumentationBundle({project:updated,revision:19,origin:"yolk",generatedAt:at});
   const report=new TextDecoder().decode(doc.files.find(x=>x.path==="docs/06-flow-cycles.md")!.bytes);
   expect(report).toContain("Форма и способ изготовления");
   expect(report).toContain(draft.interpretations[0].sourceResultIds[0]);
   expect(report).toContain("не утверждена");
   const decided=decideEggFlowCycle(updated,{actor:"author",at,outcome:"revise",
      reason:"Проверить пробный узел",addressedSpheres:["production"]});
   expect(decided.flowCycles![0].semanticReview).toEqual(review);
   expect(decided.flowCycles![0].decision?.addressedSpheres).toEqual(["production"]);
   expect(decided.flowCycles![1].semanticReview).toBeUndefined();
 });
 it("rejects injected IDs, same-branch tension, repeated submissions and non-AI actors",()=>{
   const p=finish(),draft=validDraft(p);
   expect(()=>contributeEggYolkReview(p,{actor:"ai",at,draft:{...draft,
     interpretations:[{...draft.interpretations[0],
       sourceResultIds:["cycle-result-99999",draft.interpretations[0].sourceResultIds[1]]}]}})).toThrow(/source IDs/);
   const s=p.flowCycles![0].synthesis!;
   const a=s.first[0].resultId!,b=s.first[1].resultId!;
   expect(()=>contributeEggYolkReview(p,{actor:"ai",at,draft:{...draft,
     interpretations:[{...draft.interpretations[0],sourceResultIds:[a,b]}]}})).toThrow(/both flows/);
   expect(()=>contributeEggYolkReview(p,{actor:"author",at,draft})).toThrow(/authorized AI/);
   const q=contributeEggYolkReview(p,{actor:"ai",at,draft});
   expect(()=>contributeEggYolkReview(q,{actor:"ai",at,draft})).toThrow(/one semantic review/);
   expect(()=>contributeEggYolkReview(p,{actor:"ai",at,draft:{...draft,synthesisId:"synthesis-other"}}))
     .toThrow(/outdated or different/);
   expect(()=>runEggMutation(p,eggMutationSchema.parse({
       projectId:id,expectedRevision:1,command:"contribute_yolk_review",...draft,
     }),author,ownerId,at)).toThrow(/authorized AI/);
   expect(()=>runEggMutation(p,eggMutationSchema.parse({
       projectId:id,expectedRevision:1,command:"contribute_yolk_review",...draft,
     }),{...agent,scopes:["read"]},ownerId,at)).toThrow(/Forbidden/);
 });
 it("validates constrained interpretations and permits honest no-evidence review",()=>{
   const p=finish(),draft=validDraft(p);
   expect(eggYolkReviewDraftSchema.safeParse({...draft,authorApproved:true}).success).toBe(false);
   expect(eggMutationSchema.safeParse({command:"contribute_yolk_review",projectId:id,expectedRevision:1,
      ...draft,dna:"replace",}).success).toBe(false);
   expect(eggYolkReviewDraftSchema.safeParse({...draft,limitations:[]}).success).toBe(false);
   expect(eggYolkReviewDraftSchema.safeParse({...draft,interpretations:Array(9).fill(draft.interpretations[0])}).success).toBe(false);
   const honest=contributeEggYolkReview(p,{actor:"ai",at,draft:{
     synthesisId:draft.synthesisId,
     summary:"По текущим данным нельзя доказательно сопоставить экономические и конструктивные оценки.",
     interpretations:[],limitations:["Не представлены расчёты и физические испытания."]
   }});
   expect(honest.flowCycles![0].semanticReview?.interpretations).toHaveLength(0);
 });
 it("publishes separate MCP command, not an authorization to approve",async()=>{
   const tool=eggMcpTools.find(t=>t.name==="egg_contribute_yolk_review");
   expect(tool?.annotations.readOnlyHint).toBe(false);
   expect(tool?.inputSchema.required).toContain("synthesisId");
   const ops={contributeYolkReview:vi.fn(async()=>({ok:true,revision:3})),
     getState:vi.fn(),contributeSphere:vi.fn(),registerDriveFile:vi.fn(),registerFieldItem:vi.fn(),
     proposeSeed:vi.fn(),proposeConcept:vi.fn()};
   const draft=validDraft();
   const result=await processEggMcp({jsonrpc:"2.0",id:1,method:"tools/call",
     params:{name:"egg_contribute_yolk_review",arguments:{
       projectId:id,expectedRevision:2,...draft,
     }}},ops);
   expect((result.body as any).result.isError).toBe(false);
   expect(ops.contributeYolkReview).toHaveBeenCalledOnce();
   const bad=await processEggMcp({jsonrpc:"2.0",id:2,method:"tools/call",
     params:{name:"egg_contribute_yolk_review",arguments:{
       projectId:id,expectedRevision:2,...draft,actor:"author",
     }}},ops);
   expect((bad.body as any).error.code).toBe(-32602);
   expect(ops.contributeYolkReview).toHaveBeenCalledTimes(1);
 });
});

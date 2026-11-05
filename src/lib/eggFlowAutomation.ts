/**
 * One request -> ONE authorized AI step -> ONE CAS save.
 * Both parallel EGG branches are visited in interleaved, fixed internal order.
 * A Yolk semantic draft is the last step, NEVER an Author decision.
 *
 * No runtime model call occurs in this module; all sources and findings are
 * untrusted project data. A provider without search tools must not fabricate
 * external sources, legal searches, physical tests, suppliers or prices.
 */
import {z} from "zod";
import type {EggProject,SphereId} from "./eggEngine.js";
import {EGG_FLOW_ROUTES,currentEggFlowCycle} from "./eggFlowCycle.js";
import {buildEggSphereIntelligencePrompt} from "./eggSphereIntelligence.js";
import {buildEggYolkReviewBrief,eggYolkReviewDraftSchema} from "./eggYolkSemantic.js";

export const EGG_AUTOMATION_ORDER=[
  "marketing","legal","design","production",
  "testDrive","procurement","commerce","retail",
] as const satisfies readonly SphereId[];
export type EggAutomationStep=
  |{kind:"sphere";sphere:SphereId;cycleId:string}
  |{kind:"yolk";cycleId:string;synthesisId:string}
  |{kind:"done"}
  |{kind:"not_started"};

export function nextEggAutomationStep(project:EggProject):EggAutomationStep{
  const cycle=currentEggFlowCycle(project);
  if(!cycle)return {kind:"not_started"};
  if(cycle.status==="running"){
    for(const sphere of EGG_AUTOMATION_ORDER){
      const visit=[...cycle.first,...cycle.second].find(v=>v.sphere===sphere);
      if(visit?.status==="awaiting_result"&&visit.mode==="work")
        return {kind:"sphere",sphere,cycleId:cycle.id};
    }
    // This is an engine inconsistency, not "done". Never claim completion.
    throw Error("No active sphere despite a running flow");
  }
  if(cycle.status==="awaiting_author"&&cycle.synthesis&&!cycle.semanticReview)
    return {kind:"yolk",cycleId:cycle.id,synthesisId:cycle.synthesis.id};
  return {kind:"done"};
}
const discoveredQuestion=z.object({
  domain:z.string().trim().min(1).max(90),
  question:z.string().trim().min(8).max(1000),
  basis:z.string().trim().max(1200).optional(),
  sourceRefs:z.array(z.string()).max(0).optional(),
}).strict();
export const automatedSphereOutputSchema=z.object({
  text:z.string().trim().min(8).max(6000),
  evidence:z.enum(["hypothesis","question"]),
  sourceRefs:z.array(z.string()).max(0).optional(),
  discoveredQuestions:z.array(discoveredQuestion).max(6).optional(),
}).strict();

export function buildEggAutomationPrompt(project:EggProject,step:EggAutomationStep){
  if(step.kind==="sphere"){
    const brief=buildEggSphereIntelligencePrompt(project,step.sphere);
    return {
      instructions:brief.instructions+"\n"+[
        "AUTOMATED TEXT-ONLY MODE: You have NO browser, registry, file-opening, image/3D inspection or physical testing tools in this request.",
        "Do not assert you searched a database, inspected a real image/3D file, checked real suppliers, made strength calculations, or verified facts.",
        "Do not invent sourceRefs or URLs. SourceRefs and legalSimilarity must be OMITTED; for Legal explain the need for an external rights review.",
        "Keep a single evolving recommendation about the existing concept, never generate three alternatives.",
        "Use short Russian language and distinguish assumptions from evidence.",
        "Return ONLY a compact JSON object: {\"text\":\"at least 8 chars\",\"evidence\":\"hypothesis|question\",\"discoveredQuestions\":[{\"domain\":\"...\",\"question\":\"at least 8 chars\",\"basis\":\"...\"}]}.",
        "Do not include any additional fields, sourceRefs, legalSimilarity or external searches.",
      ].join("\n"),
      input:brief.input,
    };
  }
  if(step.kind==="yolk"){
    const brief=buildEggYolkReviewBrief(project);
    if(!brief||brief.cycleId!==step.cycleId||brief.synthesisId!==step.synthesisId)
      throw Error("Yolk semantic brief no longer matches current cycle");
    // Free-text contributions are already bounded to eight per synthesis.
    const compact={
      ...brief,sources:brief.sources.map(s=>({...s,text:s.text?.slice(0,2700)??null})),
      openQuestions:brief.openQuestions.slice(0,48),
    };
    return {
      instructions:brief.instructions.join("\n")+"\n"+[
        "AUTOMATED TEXT-ONLY MODE: No external research tools, no independent verification, no invented sources or rights clearances.",
        "Never claim contradictions are proven; only possible tensions with precise internal result IDs and verification plans.",
        "Prefer at most four HIGH-VALUE interpretations. A claim must cite existing sourceResultIds from input; alignments/tensions require one from EACH branch.",
        "If genuinely insufficient data, interpretations:[] with meaningful limitations is correct.",
        "Use concise Russian. Return ONLY JSON matching: {\"synthesisId\":\"exact input synthesisId\",\"summary\":\"...\",\"interpretations\":[{\"kind\":\"alignment|tension|gap|opportunity\",\"title\":\"...\",\"explanation\":\"...\",\"sourceResultIds\":[\"actual ids\"],\"suggestedSphereTargets\":[],\"verificationNeeded\":\"...\"}],\"limitations\":[\"at least one honest limitation\"]}.",
      ].join("\n"),
      input:JSON.stringify(compact),
    };
  }
  throw Error("No active AI step");
}
export function parseEggAutomationOutput(step:EggAutomationStep,raw:string){
  if(raw.length>25000)throw Error("AI output exceeds max length");
  const json:unknown=JSON.parse(raw);
  if(step.kind==="sphere")return {kind:"sphere" as const,data:automatedSphereOutputSchema.parse(json)};
  if(step.kind==="yolk")return {kind:"yolk" as const,data:eggYolkReviewDraftSchema.parse(json)};
  throw Error("No active step");
}

/** A bounded unit of AI-generated work. The browser may call 9 times; the
 * server never recurses, never starts a cycle, and never decides for Author.
 */
export const eggAutomationRequestSchema=z.object({
  projectId:z.string().uuid(),
  expectedRevision:z.number().int().positive(),
}).strict();
export const MAX_EGG_AUTOMATION_STEPS=9;

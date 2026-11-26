import {z} from "zod";

const evidenceGapSchema=z.object({
  missingFact:z.string().trim().min(8).max(320),
  whyNeeded:z.string().trim().min(8).max(320),
  sourceType:z.enum(["internal","external","authorial"]),
  priority:z.enum(["critical","important","optional"]),
  affectedDecision:z.string().trim().min(8).max(320),
});
const analysisSchema=z.object({
  observation:z.string().trim().min(12).max(1200),
  hypothesis:z.string().trim().min(12).max(1200),
  nextStep:z.string().trim().min(12).max(1200),
  confidence:z.enum(["low","medium"]),
  limitations:z.array(z.string().trim().min(8).max(360)).min(1).max(4),
  evidenceGaps:z.array(evidenceGapSchema).max(5).default([]),
  scenarios:z.array(z.object({
    id:z.string().trim().min(1).max(48),
    approach:z.string().trim().min(8).max(300),
    prerequisite:z.string().trim().min(8).max(300),
    costUah:z.number().finite().nonnegative().nullable(),
    costEvidence:z.enum(["verified","estimate","unknown"]),
    sourceRef:z.string().max(300).nullable(),
    nextValidation:z.string().trim().min(8).max(300),
  })).max(3).default([]),
});
export const eggOperationalAnalysisRules =
  "Проверка JSON: observation, hypothesis, nextStep — по 12–1200 символов; limitations — 1–4 строки по 8–360 символов. " +
  "evidenceGaps — от 0 до 5 записей (missingFact, whyNeeded, affectedDecision по 8–320 символов); " +
  "scenarios — от 0 до 3 записей (id 1–48 символов, approach, prerequisite, nextValidation по 8–300 символов, sourceRef не более 300 символов или null). " +
  "При отсутствии обоснованных записей передавай пустой массив, не добавляй вымышленные сведения.";

export type EggOperationalAnalysisIssue = {path:string;code:string};

const safePathParts=new Set([
  "observation","hypothesis","nextStep","confidence","limitations","evidenceGaps","scenarios",
  "missingFact","whyNeeded","sourceType","priority","affectedDecision","id","approach","prerequisite",
  "costUah","costEvidence","sourceRef","nextValidation",
]);

/** Do not retain any raw provider output or error messages in diagnostics. */
export function parseEggOperationalAnalysis(raw:string):
  | {ok:true;data:z.infer<typeof analysisSchema>}
  | {ok:false;issues:EggOperationalAnalysisIssue[]}{
  let decoded:unknown;
  try{
    const trimmed=raw.trim();
    const fenced=/^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
    decoded=JSON.parse(fenced?fenced[1]:trimmed) as unknown;
  }catch{
    return {ok:false,issues:[{path:"$",code:"invalid_json"}]};
  }
  const validated=analysisSchema.safeParse(decoded);
  if(validated.success)return {ok:true,data:validated.data};
  return {ok:false,issues:validated.error.issues.slice(0,12).map(issue=>({
    path:issue.path.length?issue.path.map(part=>
      typeof part==="number"||safePathParts.has(part)?String(part):"*"
    ).join("."):"$",
    code:issue.code,
  }))};
}

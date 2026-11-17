/** Material research stays a hypothesis until the Author approves its card.
 * Does not create an Idea, DNA, sphere result or Yolk synthesis.
 */
import {z} from "zod";

const entry=z.object({
 text:z.string().trim().min(4).max(450),
 sourceIds:z.array(z.string().trim().min(1).max(120)).min(1).max(12),
}).strict();
export const eggMaterialMapDraftSchema=z.object({
 observations:z.array(entry).min(1).max(6),
 connections:z.array(entry).max(5),
 tensions:z.array(entry).max(5),
 hypotheses:z.array(entry).max(5),
 questions:z.array(z.string().trim().min(4).max(350)).max(5),
}).strict();
export type EggMaterialMapDraft=z.infer<typeof eggMaterialMapDraftSchema>;
export type EggMaterialMapEntry=z.infer<typeof entry>;
export const eggMaterialMapRecordSchema=z.object({
 status:z.enum(["draft","accepted"]),
 map:eggMaterialMapDraftSchema,
 sourceCardIds:z.array(z.string().min(1).max(120)).min(1).max(100),
 sourceKey:z.string().min(1).max(80),
 updatedAt:z.string().max(50),
 acceptedAt:z.string().max(50).optional(),
}).strict();
export type EggMaterialMapRecord=z.infer<typeof eggMaterialMapRecordSchema>;
export type EggMaterialSource={id:string;type:string;text:string;src?:string;strokes?:unknown};
/** Version signature detects edits to the selected dataset; not a security hash. */
export function eggMaterialSourceKey(cards:EggMaterialSource[]):string{
 const ordered=cards.map(c=>[c.id,c.type,c.text,c.src?.length??0,
  c.src?.slice(0,96)??"",c.src?.slice(-96)??"",
  c.strokes?JSON.stringify(c.strokes).slice(0,400):""].join("|")).sort().join("\n");
 let hash=2166136261;
 for(let i=0;i<ordered.length;i++)hash=Math.imul(hash^ordered.charCodeAt(i),16777619);
 return cards.length+":"+(hash>>>0).toString(16).padStart(8,"0");
}
/** Model claims without actual evidence IDs never become grounded entries. */
export function validateMaterialMapSources(raw:unknown,sourceIds:string[]):EggMaterialMapDraft|null{
 const result=eggMaterialMapDraftSchema.safeParse(raw);
 if(!result.success)return null;
 const allowed=new Set(sourceIds);
 const grounded=(entries:EggMaterialMapEntry[])=>entries.filter(e=>
  e.sourceIds.every(id=>allowed.has(id))&&new Set(e.sourceIds).size===e.sourceIds.length
 );
 const draft=result.data;
 const observations=grounded(draft.observations);
 if(!observations.length)return null;
 return {...draft,observations,connections:grounded(draft.connections),
  tensions:grounded(draft.tensions),hypotheses:grounded(draft.hypotheses)};
}
export function createEggMaterialMapRecord(
 map:EggMaterialMapDraft,cards:EggMaterialSource[],at:string,
):EggMaterialMapRecord{
 return {status:"draft",map,sourceCardIds:cards.map(c=>c.id),
  sourceKey:eggMaterialSourceKey(cards),updatedAt:at};
}
export function isEggMaterialMapCurrent(
 record:EggMaterialMapRecord|null,cards:EggMaterialSource[],
):boolean{
 if(!record||record.sourceCardIds.length!==cards.length)return false;
 return record.sourceKey===eggMaterialSourceKey(cards)&&
  record.sourceCardIds.every(id=>cards.some(c=>c.id===id));
}
export function readEggMaterialMapRecord(raw:unknown):EggMaterialMapRecord|null{
 const parsed=eggMaterialMapRecordSchema.safeParse(raw);
 return parsed.success?parsed.data:null;
}
export const eggMaterialMapKey=(projectId:string)=>"egg:material-research:v1:"+projectId;
/** Only an Author-accepted, current snapshot can enter Idea. */
export function eggMaterialInsight(
 record:EggMaterialMapRecord|null,cards:EggMaterialSource[],
):string{
 if(!record||record.status!=="accepted"||!isEggMaterialMapCurrent(record,cards))return "";
 const sections=[
  ["НАБЛЮДЕНИЯ",record.map.observations],
  ["СВЯЗИ",record.map.connections],
  ["НАПРЯЖЕНИЯ",record.map.tensions],
  ["ГИПОТЕЗЫ",record.map.hypotheses],
 ] as const;
 const parts:string[]=[];
 for(const [title,entries] of sections){
  if(!entries.length)continue;
  parts.push(title+": "+entries.map(e=>e.text+" [источники: "+e.sourceIds.join(", ")+"]").join("; "));
 }
 if(record.map.questions.length)parts.push("ВОПРОСЫ: "+record.map.questions.join("; "));
 return parts.join("\n").slice(0,1400);
}
export function readLocalEggMaterialMap(projectId:string):EggMaterialMapRecord|null{
 try{return readEggMaterialMapRecord(JSON.parse(localStorage.getItem(eggMaterialMapKey(projectId))||"null"));}
 catch{return null;}
}

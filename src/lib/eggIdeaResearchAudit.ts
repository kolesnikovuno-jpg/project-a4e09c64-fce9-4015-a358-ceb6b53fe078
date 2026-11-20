import type {EggIdeaExteriorFinding} from "./eggIdeaExterior";

export type ExteriorReading={
 format:"structured"|"legacy"|"unstructured";
 contribution:string;
 basis:string;
 hypothesis:string;
 check:string;
 raw:string;
};
/** A structural inspection, not an AI judgement of truth or originality. */
export function readExteriorContribution(raw:string):ExteriorReading{
 const text=(raw||"").replace(/\*\*/g,"").replace(/^\s*#{1,4}\s+/gm,"").trim();
 const sections=new Map<string,string>();
 const marker=/^\s*(ВКЛАД|ОПОРА|ГИПОТЕЗА|ПРОВЕРКА|НАБЛЮДЕНИЕ|НАПРЯЖЕНИЕ|ВОПРОС)\s*:\s*/gim;
 const items=Array.from(text.matchAll(marker));
 items.forEach((m,i)=>{
  const start=(m.index??0)+m[0].length;
  sections.set(m[1].toUpperCase(),text.slice(start,items[i+1]?.index??text.length).trim().replace(/\s+/g," "));
 });
 const format=sections.has("ВКЛАД")&&sections.has("ОПОРА")&&
  sections.has("ПРОВЕРКА")?"structured":items.length?"legacy":"unstructured";
 return {
  format,
  contribution:(sections.get("ВКЛАД")||sections.get("НАБЛЮДЕНИЕ")||
   (format==="unstructured"?text:"")).slice(0,500),
  basis:(sections.get("ОПОРА")||"").slice(0,500),
  hypothesis:(sections.get("ГИПОТЕЗА")||"").slice(0,500),
  check:(sections.get("ПРОВЕРКА")||sections.get("ВОПРОС")||"").slice(0,500),
  raw:text,
 };
}
/** Detect old 1200-character clipping and repeated model fragments.
 * This does not claim to verify the semantic accuracy of a finding.
 */
export function exteriorFindingNeedsRepair(text:string):boolean{
 if(text.length===1200)return true; // Historical client cut-off
 if(/(?:^|\s)_norm(?:\s|$)/i.test(text))return true;
 const sections=Array.from(text.matchAll(/(?:^|\n|\\n)\s*\*{0,2}(?:НАБЛЮДЕНИЕ|ВКЛАД)\s*:/gim));
 return sections.length>1;
}
export function exteriorRepairCandidates(findings:readonly EggIdeaExteriorFinding[]){
 return findings.filter(f=>exteriorFindingNeedsRepair(f.text)).map(f=>f.sphere);
}
export function exteriorResearchAudit(findings:readonly EggIdeaExteriorFinding[]){
 let structured=0,legacy=0,unstructured=0;
 for(const f of findings){
  const format=readExteriorContribution(f.text).format;
  if(format==="structured")structured++;
  else if(format==="legacy")legacy++;
  else unstructured++;
 }
 return {structured,legacy,unstructured,total:findings.length};
}
/** Never claim semantic novelty merely because a model followed the format. */
export function exteriorAuditForExport(initiation:string,findings:readonly EggIdeaExteriorFinding[],synthesis:string){
 return [
  "EGG · Внешний исследовательский круг (не утверждён Автором)",
  "ИНИЦИАЦИЯ АВТОРА:\n"+initiation,
  ...findings.map((f,i)=>"\nСФЕРА "+(i+1)+" / "+f.sphere+":\n"+f.text),
  "\nСИНТЕЗ:\n"+synthesis,
  "\nОГРАНИЧЕНИЕ: текстовые гипотезы, без автоматической проверки интернета, испытаний и рынка.",
 ].join("\n");
}

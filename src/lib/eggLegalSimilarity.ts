/**
 * EGG Legal / similarity and rights-intersection screening.
 *
 * A screening is a SOURCE-ATTRIBUTED DRAFT, not a copyright or patent clearance,
 * a legal opinion, a visual-distance score, or an automatic registry search.
 * External research is performed only by the user's authorised AI / researchers.
 * Only the most recent PREVIOUSLY SYNTHESIZED Design result is available to
 * Legal. Current-cycle Design cannot leak across the parallel branches.
 */
import type {EggProject} from "./eggEngine.js";
import {z} from "zod";

export const EGG_IP_SEARCH_CATALOG = [
  {
    id:"wipo_designs",
    label:"WIPO · Global Design Database",
    url:"https://www.wipo.int/en/web/global-design-database/index",
    target:"Промышленные образцы / зарегистрированные внешние формы",
  },
  {
    id:"wipo_brands",
    label:"WIPO · Global Brand Database",
    url:"https://www.wipo.int/ru/web/global-brand-database/index",
    target:"Товарные знаки, название, логотип и отличительные элементы",
  },
  {
    id:"epo_patents",
    label:"EPO · Espacenet",
    url:"https://www.epo.org/en/searching-for-patents/technical/espacenet",
    target:"Патентные публикации о технических решениях",
  },
] as const;

export type EggIpRightKind="industrial_design"|"trademark"|"patent"|"copyright"|"other";
export type EggIpSearchCategory="registered_designs"|"trademarks"|"patent_publications"|"market_examples"|"copyright_materials";
export type EggIpSearchDraft={
  category:EggIpSearchCategory;
  sourceName:string;
  sourceUrl:string;
  query:string;
  searchedAt:string;
  scopeNote?:string;
};
export type EggIpCandidateDraft={
  kind:EggIpRightKind;
  title:string;
  sourceUrl:string;
  similarity:string;
  differences?:string;
  evidenceNote?:string;
};
export type EggLegalSimilarityDraft={
  territories:string[];
  searches?:EggIpSearchDraft[];
  candidates?:EggIpCandidateDraft[];
  limitations:string[];
};
/** Single wire contract for REST mutations and MCP validation. */
const ipUrl=z.string().url().max(1200).refine(value=>
  /^(https?):\/\//i.test(value),"HTTP(S) URL required");
export const eggLegalSimilaritySchema=z.object({
  territories:z.array(z.string().trim().min(1).max(100)).max(8),
  searches:z.array(z.object({
    category:z.enum(["registered_designs","trademarks","patent_publications","market_examples","copyright_materials"]),
    sourceName:z.string().trim().min(2).max(120),
    sourceUrl:ipUrl,
    query:z.string().trim().min(2).max(500),
    searchedAt:z.string().datetime({offset:true}),
    scopeNote:z.string().trim().max(500).optional(),
  }).strict()).max(12).optional(),
  candidates:z.array(z.object({
    kind:z.enum(["industrial_design","trademark","patent","copyright","other"]),
    title:z.string().trim().min(2).max(250),
    sourceUrl:ipUrl,
    similarity:z.string().trim().min(5).max(1200),
    differences:z.string().trim().max(1200).optional(),
    evidenceNote:z.string().trim().max(800).optional(),
  }).strict()).max(8).optional(),
  limitations:z.array(z.string().trim().min(1).max(1200)).max(10),
}).strict();
export type EggIpSearchRecord=EggIpSearchDraft;
export type EggIpCandidate=EggIpCandidateDraft & {status:"possible_overlap_unverified"};
export type EggLegalSimilarityReport={
  status:"no_search_reported"|"research_reported_unverified";
  subject:{
    designResultId:string|null;
    designCycleId:string|null;
    conceptVisualUrl:string|null;
    artifactRefs:Array<{id:string;title:string;mimeType:string;webUrl:string|null}>;
  };
  territories:string[];
  searches:EggIpSearchRecord[];
  candidates:EggIpCandidate[];
  limitations:string[];
  conclusion:"not_a_legal_clearance";
};

export const isSafeExternalIpUrl=(value:string):boolean=>{
  if(typeof value!=="string"||value.length>1200)return false;
  try{
    const u=new URL(value);
    return (u.protocol==="https:"||u.protocol==="http:") &&
      Boolean(u.hostname)&&!u.username&&!u.password&&
      !["localhost","127.0.0.1","::1"].includes(u.hostname.toLowerCase()) &&
      !u.hostname.endsWith(".local");
  }catch{return false;}
};

/** Only form versions previously handed to Yolk are eligible for Legal.
 * Latest completed current-cycle Design never appears in Legal's prompt.
 */
export function getEggLegalSimilaritySubject(project:EggProject){
  const past=(project.flowCycles??[]).filter(c=>Boolean(c.synthesis));
  let designResultId:string|null=null,designCycleId:string|null=null,designSummary:string|null=null;
  for(const cycle of [...past].reverse()){
    const item=cycle.synthesis?.first.find(s=>s.sphere==="design");
    if(item?.resultId){
      designResultId=item.resultId;
      designCycleId=item.sourceCycleId;
      designSummary=item.text?.slice(0,3200)??null;
      break;
    }
  }
  const concept=[...(project.concepts??[])].reverse().find(c=>c.status==="accepted");
  const artifacts=(project.artifacts??[]).filter(file=>
    /image|model|3d|gltf|glb|usdz|pdf/i.test(file.mimeType+" "+file.title+" "+file.collectionKey)
  ).slice(-12).map(file=>({
    id:file.id,title:file.title,mimeType:file.mimeType,
    webUrl:file.webUrl && isSafeExternalIpUrl(file.webUrl)?file.webUrl:null,
  }));
  return {
    designResultId,designCycleId,designSummary,
    conceptVisualUrl:concept?.visualUrl&&isSafeExternalIpUrl(concept.visualUrl)?concept.visualUrl:null,
    artifactRefs:artifacts,
  };
}
const required=(value:string,label:string,min=1,max=1000):string=>{
  if(typeof value!=="string"||value.trim().length<min||value.length>max)
    throw Error("Invalid legal screening "+label);
  return value.trim();
};
const shortArray=(arr:unknown,label:string,max=10,maxChars=100):string[]=>{
  if(!Array.isArray(arr)||arr.length>max)throw Error("Invalid legal screening "+label);
  return arr.map(value=>required(value,label,1,maxChars));
};
const kinds=["industrial_design","trademark","patent","copyright","other"];
const categories=["registered_designs","trademarks","patent_publications","market_examples","copyright_materials"];
export function validateEggLegalSimilarity(
  draft:EggLegalSimilarityDraft,
  project:EggProject,
):EggLegalSimilarityReport{
  if(!draft||typeof draft!=="object")throw Error("Invalid legal screening");
  const territories=shortArray(draft.territories,"territory",8);
  const searches=draft.searches??[],candidates=draft.candidates??[];
  const limitations=shortArray(draft.limitations,"limitations",10,1200);
  if(!Array.isArray(searches)||searches.length>12||!Array.isArray(candidates)||candidates.length>8)
    throw Error("Invalid legal screening number of searches or candidates");
  const validatedSearches=searches.map(s=>{
    if(!s||!categories.includes(s.category)||!isSafeExternalIpUrl(s.sourceUrl)||
       !Number.isFinite(Date.parse(s.searchedAt))||Date.parse(s.searchedAt)>Date.now()+86400000)
      throw Error("Invalid legal screening search evidence");
    return {category:s.category,sourceName:required(s.sourceName,"sourceName",2,120),
      sourceUrl:s.sourceUrl,query:required(s.query,"query",2,500),
      searchedAt:s.searchedAt,scopeNote:s.scopeNote?required(s.scopeNote,"scopeNote",1,500):undefined};
  });
  const validatedCandidates=candidates.map(c=>{
    if(!c||!kinds.includes(c.kind)||!isSafeExternalIpUrl(c.sourceUrl))
      throw Error("Invalid legal screening candidate source");
    return {kind:c.kind,title:required(c.title,"title",2,250),
      sourceUrl:c.sourceUrl,similarity:required(c.similarity,"similarity",5,1200),
      differences:c.differences?required(c.differences,"differences",1,1200):undefined,
      evidenceNote:c.evidenceNote?required(c.evidenceNote,"evidenceNote",1,800):undefined,
      status:"possible_overlap_unverified" as const};
  });
  if(validatedCandidates.length&&!validatedSearches.length)
    throw Error("Legal similarity candidates need a documented search");
  if(validatedSearches.length===0&&limitations.length===0)
    throw Error("If no searches were performed, explain screening limitations");
  const subject=getEggLegalSimilaritySubject(project);
  return {
    status:validatedSearches.length?"research_reported_unverified":"no_search_reported",
    subject:{
      designResultId:subject.designResultId,
      designCycleId:subject.designCycleId,
      conceptVisualUrl:subject.conceptVisualUrl,
      artifactRefs:subject.artifactRefs,
    },
    territories,searches:validatedSearches,candidates:validatedCandidates,
    limitations,
    conclusion:"not_a_legal_clearance",
  };
}

/** Update text is intentionally factual: a candidate is a lead for a
 * rights specialist, not evidence that infringement has occurred.
 */
export function getEggLegalScreeningGaps(
  designResultId:string|null,
  legalReport:EggLegalSimilarityReport|undefined,
):string[]{
  if(!designResultId)return ["Для проверки правовых пересечений пока нет идентифицированной версии формы Дизайна."];
  if(!legalReport)return ["Не выполнена структурированная проверка сходства формы с ранее существующими объектами."];
  if(legalReport.subject.designResultId!==designResultId)
    return ["Проверка Право относится к предыдущей форме; актуальная версия Дизайна ещё не сопоставлена с аналогами."];
  if(legalReport.status==="no_search_reported")
    return ["Источники аналогов и реестры ещё не исследованы для текущей версии формы."];
  return legalReport.candidates.length
    ? ["Найдены возможные пересечения; требуется правовая оценка с учётом территории, даты и объёма охраны."]
    : ["Исследована лишь указанная часть источников; отсутствие найденных совпадений не означает отсутствие правовых рисков."];
}

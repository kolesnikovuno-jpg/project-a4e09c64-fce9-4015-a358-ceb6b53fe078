/**
 * EGG / visual version ledger.
 *
 * A visual version is an Author-selected immutable link to a source ALREADY
 * registered in the project. It is NOT an upload, geometric analysis, approval
 * of concept, or proof the remote file still exists / is public.
 * Neither AI nor unconfirmed external Drive references can pin a version.
 */
import {EggEngineError,type EggActor,type EggProject} from "./eggEngine.js";
import {validDriveWebUrl} from "./eggArtifacts.js";

export type EggVisualMedia="image"|"model";
export type EggVisualSnapshot={
  id:string;cycleId:string|null;sourceRef:string;
  sourceKind:"concept"|"artifact";
  sourceStatus:"concept_accepted"|"concept_proposed"|"artifact_confirmed";
  media:EggVisualMedia;
  presentation:"inline_image"|"external_reference";
  url:string;title:string;note:string;
  createdAt:string;createdBy:"author";approvedAsProduct:false;
};
export type EggVisualCandidate={
  sourceRef:string;sourceKind:"concept"|"artifact";
  sourceStatus:EggVisualSnapshot["sourceStatus"];
  media:EggVisualMedia;presentation:EggVisualSnapshot["presentation"];
  url:string;title:string;
};
export type EggVisualComparison={
  cycleId:string;
  before:EggVisualSnapshot|null;
  after:EggVisualSnapshot|null;
  sourceRelation:"different_sources"|"same_source"|"missing_before"|"missing_after"|"both_missing";
  actualVisualDifferences:"not_computed";
};
export type EggVisualHistory={
  candidates:EggVisualCandidate[];
  snapshots:EggVisualSnapshot[];
  baseline:EggVisualSnapshot|null;
  comparisons:EggVisualComparison[];
  unverifiedDocumentCount:number;
  note:"only_author_linked_existing_assets";
};
const safeUrl=(raw?:string):string|null=>{
  if(!raw||raw.length>1200)return null;
  try{
    const u=new URL(raw);
    if(u.protocol!=="https:"||u.username||u.password||u.port||u.hash)return null;
    return u.href;
  }catch{return null;}
};
const IMAGE_FILE=/\.(png|jpe?g|webp|avif|gif)$/i;
const MODEL_FILE=/\.(glb|gltf|usdz)$/i;
const mediaFromUrl=(url:string):EggVisualMedia|null=>{
  const path=new URL(url).pathname;
  if(IMAGE_FILE.test(path))return "image";
  if(MODEL_FILE.test(path))return "model";
  return null;
};
function sources(p:EggProject):EggVisualCandidate[]{
  const result:EggVisualCandidate[]=[];
  for(const concept of p.concepts??[]){
    const url=safeUrl(concept.visualUrl);
    if(!url)continue;
    const media=mediaFromUrl(url);
    if(!media)continue; // A web page URL is not a supported visual object.
    result.push({
      sourceRef:concept.id,sourceKind:"concept",
      sourceStatus:concept.status==="accepted"?"concept_accepted":"concept_proposed",
      media,presentation:media==="image"?"inline_image":"external_reference",
      url,title:"Образ концепции · "+concept.id,
    });
  }
  for(const file of p.artifacts??[]){
    if(file.status!=="author_confirmed"||!file.webUrl||
      !validDriveWebUrl(file.webUrl,file.fileId))continue;
    const mime=file.mimeType.toLowerCase();
    const media:EggVisualMedia|null=mime.startsWith("image/")?"image":
      /^(model\/|application\/(?:gltf|vnd\.usdz))/i.test(mime)?"model":null;
    if(!media)continue;
    result.push({
      sourceRef:file.id,sourceKind:"artifact",sourceStatus:"artifact_confirmed",
      media,presentation:"external_reference",
      url:file.webUrl,title:file.title,
    });
  }
  return result;
}
const lastIn=(items:EggVisualSnapshot[],id:string|null)=>
  [...items].reverse().find(x=>x.cycleId===id)??null;

export function buildEggVisualHistory(p:EggProject):EggVisualHistory{
  const snapshots=p.visualVersions??[];
  const cycles=p.flowCycles??[];
  const candidates=sources(p);
  const baseline=lastIn(snapshots,null);
  let previous=baseline;
  const comparisons=cycles.map(cycle=>{
    const after=lastIn(snapshots,cycle.id);
    const relation:EggVisualComparison["sourceRelation"]=
      !previous&&!after?"both_missing":!previous?"missing_before":
      !after?"missing_after":
      previous.sourceRef===after.sourceRef?"same_source":"different_sources";
    const comparison:EggVisualComparison={
      cycleId:cycle.id,before:previous,after,
      sourceRelation:relation,actualVisualDifferences:"not_computed",
    };
    // The preceding documented visual version remains the "before" source
    // even when no image was contributed during an intermediate iteration.
    if(after)previous=after;
    return comparison;
  });
  return {
    candidates,snapshots,baseline,comparisons,
    unverifiedDocumentCount:(p.artifacts??[]).filter(x=>
      !x.mimeType.startsWith("image/")&&!/^(model\/|application\/(?:gltf|vnd\.usdz))/i.test(x.mimeType)).length,
    note:"only_author_linked_existing_assets",
  };
}
export function registerEggVisualVersion(p:EggProject,input:{
  actor:EggActor;cycleId:string|null;sourceRef:string;note:string;at:string;
}):EggProject{
  if(input.actor!=="author")throw new EggEngineError("Only Author may link a visual version");
  if(!Number.isFinite(Date.parse(input.at)))throw new EggEngineError("Invalid visual timestamp");
  if(typeof input.note!=="string"||input.note.trim().length<8||input.note.length>800)
    throw new EggEngineError("Explain the visual version in 8–800 characters");
  if(input.cycleId!==null&&!(p.flowCycles??[]).some(c=>c.id===input.cycleId))
    throw new EggEngineError("Visual version references an unknown cycle");
  const candidate=sources(p).find(s=>s.sourceRef===input.sourceRef);
  if(!candidate)throw new EggEngineError("Visual source is missing or not Author-confirmed");
  if((p.visualVersions??[]).length>=150)
    throw new EggEngineError("Visual version ledger is full");
  const version:EggVisualSnapshot={
    id:"visual-version-"+p.nextSequence,cycleId:input.cycleId,
    sourceRef:candidate.sourceRef,sourceKind:candidate.sourceKind,
    sourceStatus:candidate.sourceStatus,
    media:candidate.media,presentation:candidate.presentation,
    url:candidate.url,title:candidate.title,note:input.note.trim(),
    createdAt:input.at,createdBy:"author",approvedAsProduct:false,
  };
  return {...p,
    visualVersions:[...(p.visualVersions??[]),version],
    nextSequence:p.nextSequence+1,
    events:[...p.events,{
      id:"event-"+p.nextSequence,at:input.at,actor:"author",
      kind:"visual_version_linked",
      detail:version.id+" / "+(input.cycleId??"baseline")+" / "+version.sourceRef,
    }],
  };
}

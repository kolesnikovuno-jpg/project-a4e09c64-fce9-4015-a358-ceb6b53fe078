/** Current author's local Idea is NOT automatically the server's historical eight-sphere cycle. */
export type EggIdeaFormSource={
  intent:string;constraints:string;draft:string;materialInsight:string;
  materials:{type:string;text:string}[];
  /** Reduced JPEG of the actual room. Context ONLY, never a form reference. */
  spacePhoto?:string;
};
export function normalizeEggIdeaFormSource(source:EggIdeaFormSource):EggIdeaFormSource{
 return {
  intent:(source.intent??"").trim().slice(0,3000),
  constraints:(source.constraints??"").trim().slice(0,2000),
  draft:(source.draft??"").trim().slice(0,3000),
  materialInsight:(source.materialInsight??"").trim().slice(0,1400),
  materials:(source.materials??[]).slice(0,20).map(item=>({
   type:String(item.type??"").trim().slice(0,40),
   text:String(item.text??"").trim().slice(0,250),
  })).filter(item=>item.text.length>0),
  spacePhoto:typeof source.spacePhoto==="string"&&
   /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(source.spacePhoto)&&
   source.spacePhoto.length<=210000?source.spacePhoto:"",
 };
}
/** Opaque version key, NOT a semantic judgement, approval, or authorization. */
export function eggIdeaFormSourceId(source:EggIdeaFormSource):string{
 const normalized=normalizeEggIdeaFormSource(source);
 // Old text-only study IDs stay stable. A room image creates a distinct
 // visual study identity, so it never inherits a studio-only image variant.
 const {spacePhoto,...textOnly}=normalized;
 const value=JSON.stringify(spacePhoto?normalized:textOnly);
 let a=2166136261,b=2246822519;
 for(let i=0;i<value.length;i++){
  const c=value.charCodeAt(i);
  a=Math.imul(a^c,16777619);
  b=Math.imul(b^c,3266489917);
 }
 return "idea:"+[a,b].map(n=>(n>>>0).toString(16).padStart(8,"0")).join("");
}

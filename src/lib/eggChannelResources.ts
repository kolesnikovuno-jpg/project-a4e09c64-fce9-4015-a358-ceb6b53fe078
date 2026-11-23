/** Resource planning is preparation, not permission to spend. All money is in minor-free UAH units. */
export type EggChannelPreparation={
 id:string;name:string;sphere:"marketing"|"retail";
 status:"hypothesis"|"researching"|"prepared"|"testing"|"validated";
 audience:string;presentation:string;landingUrl?:string;
 requirements:EggResourceNeed[];
 evidenceRefs:string[];nextExperiment:string;
};
export type EggResourceNeed={
 id:string;label:string;ownerSphere:string;
 amountUah:number|null;amountKind:"verified"|"estimate"|"unknown";
 sourceRef?:string;alreadyAvailable:boolean;sharedKey?:string;
 blocking:boolean;
};
export type EggResourcePlan={
 knownMinimumUah:number;estimatedAdditionalUah:number;
 unknownCosts:EggResourceNeed[];unresolved:EggResourceNeed[];
 reusable: {key:string;channelIds:string[];amountUah:number|null}[];
 affordableKnownCost:boolean;budgetUah:number|null;
 /** Not an allocation instruction; only a readiness assessment. */
 readiness:"unassessed"|"incomplete"|"costed";
 spendingAuthorized:false;
};
export function planEggChannelResources(channels:readonly EggChannelPreparation[],budgetUah:number|null):EggResourcePlan{
 if(budgetUah!==null&&(!Number.isFinite(budgetUah)||budgetUah<0))throw Error("Invalid budget");
 const all=channels.flatMap(c=>c.requirements.map(n=>({...n,channelId:c.id})));
 const needs=all.filter(n=>!n.alreadyAvailable);
 const distinct=new Map<string,typeof needs[number]>();
 for(const n of needs){
  if(n.amountUah!==null&&(!Number.isFinite(n.amountUah)||n.amountUah<0))throw Error("Invalid resource cost");
  const key=n.sharedKey?"shared:"+n.sharedKey:"single:"+n.channelId+":"+n.id;
  const existing=distinct.get(key);
  if(existing){
   // Shared assets must not be silently undercosted when quotes disagree.
   if(existing.amountUah===null || n.amountUah===null || (existing.amountUah!==n.amountUah)) {
    distinct.set(key,{...existing,amountUah:null,amountKind:"unknown",sourceRef:undefined});
   }else if(existing.amountKind!=="verified"||n.amountKind!=="verified"){
    distinct.set(key,{...existing,amountKind:"estimate"});
   }
  }else distinct.set(key,n);
 }
 const unique=[...distinct.values()];
 const verified=unique.filter(n=>n.amountKind==="verified"&&n.amountUah!==null);
 const estimated=unique.filter(n=>n.amountKind==="estimate"&&n.amountUah!==null);
 const unknownCosts=unique.filter(n=>n.amountUah===null||n.amountKind==="unknown");
 const knownMinimumUah=verified.reduce((s,n)=>s+n.amountUah!,0);
 const estimatedAdditionalUah=estimated.reduce((s,n)=>s+n.amountUah!,0);
 const keys=[...new Set(all.filter(n=>n.sharedKey).map(n=>n.sharedKey!))];
 const reusable=keys.map(key=>({
  key,channelIds:[...new Set(all.filter(n=>n.sharedKey===key).map(n=>n.channelId))],
  amountUah:distinct.get("shared:"+key)?.amountUah??null
 })).filter(x=>x.channelIds.length>1);
 return {knownMinimumUah,estimatedAdditionalUah,unknownCosts,unresolved:unique.filter(n=>n.blocking&&n.amountUah===null),
  reusable,affordableKnownCost:budgetUah!==null&&budgetUah>=knownMinimumUah+estimatedAdditionalUah,
  budgetUah,readiness:channels.length===0?"unassessed":unknownCosts.length?"incomplete":"costed",
  spendingAuthorized:false};
}

/**
 * EGG action boundary v0.1. Deterministic, no provider calls, no external writes.
 * An AI proposal is never permission to spend, message, publish or purchase.
 */
export type EggAction =
  | {type:"verify_source_evidence";source:string;sourceDay:string;status:string}
  | {type:"calculate_funnel";pageViews:number;formOpens:number;submitted:number}
  | {type:"change_ad_budget";amountUAH:number}
  | {type:"contact_supplier";recipient:string};

export type EggActionResult =
  | {ok:true;type:string;verified:true;result:Record<string,unknown>;externalActionsExecuted:0}
  | {ok:false;type:string;verified:false;reason:string;externalActionsExecuted:0};

const datePattern=/^\d{4}-\d{2}-\d{2}$/;
const nonnegativeInteger=(n:number)=>Number.isSafeInteger(n)&&n>=0;
export function executeEggAction(action:EggAction):EggActionResult{
  if(action.type==="verify_source_evidence"){
    const validDay=datePattern.test(action.sourceDay)&&
      !Number.isNaN(Date.parse(action.sourceDay+"T00:00:00Z"))&&
      new Date(action.sourceDay+"T00:00:00Z").toISOString().slice(0,10)===action.sourceDay;
    if(action.source!=="lyra_supabase_daily_v1"||!validDay||
       !["ok","no_activity"].includes(action.status))
      return {ok:false,type:action.type,verified:false,reason:"unverified_source",externalActionsExecuted:0};
    return {ok:true,type:action.type,verified:true,
      result:{source:action.source,day:action.sourceDay,status:action.status},
      externalActionsExecuted:0};
  }
  if(action.type==="calculate_funnel"){
    const {pageViews,formOpens,submitted}=action;
    if(![pageViews,formOpens,submitted].every(nonnegativeInteger)||
       formOpens>pageViews||submitted>formOpens)
      return {ok:false,type:action.type,verified:false,reason:"inconsistent_metrics",externalActionsExecuted:0};
    return {ok:true,type:action.type,verified:true,
      result:{pageViews,formOpens,submitted,
        openRate:pageViews?formOpens/pageViews:null,
        submitRate:formOpens?submitted/formOpens:null,
        confirmedOrders:null},externalActionsExecuted:0};
  }
  return {ok:false,type:action.type,verified:false,reason:"author_approval_required",externalActionsExecuted:0};
}

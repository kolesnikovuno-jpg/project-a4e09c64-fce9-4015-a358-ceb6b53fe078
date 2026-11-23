import {describe,it,expect} from "vitest";
import {executeEggAction} from "../../server/eggActionExecutor";

describe("EGG action executor",()=>{
  it("verifies an authoritative source check",()=>{
    expect(executeEggAction({type:"verify_source_evidence",source:"lyra_supabase_daily_v1",sourceDay:"2026-11-22",status:"ok"}).ok).toBe(true);
    expect(executeEggAction({type:"verify_source_evidence",source:"unknown",sourceDay:"2026-11-22",status:"ok"}).ok).toBe(false);
    expect(executeEggAction({type:"verify_source_evidence",source:"lyra_supabase_daily_v1",sourceDay:"2026-02-31",status:"ok"}).ok).toBe(false);
  });
  it("calculates only bounded metrics and never invents orders",()=>{
    const result=executeEggAction({type:"calculate_funnel",pageViews:20,formOpens:5,submitted:2});
    expect(result.ok).toBe(true);
    if(result.ok){expect(result.result.submitRate).toBe(0.4);expect(result.result.confirmedOrders).toBeNull();}
    expect(executeEggAction({type:"calculate_funnel",pageViews:1,formOpens:5,submitted:2}).ok).toBe(false);
  });
  it("blocks external actions without explicit author authorization",()=>{
    expect(executeEggAction({type:"change_ad_budget",amountUAH:100}).ok).toBe(false);
    expect(executeEggAction({type:"contact_supplier",recipient:"example"}).ok).toBe(false);
  });
});

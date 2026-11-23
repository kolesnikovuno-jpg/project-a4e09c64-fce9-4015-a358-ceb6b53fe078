import {describe,it,expect} from "vitest";
import {diagnoseEggAdsDelivery} from "../../lib/eggAdsDeliveryDiagnostic.js";
const base={campaignEnabled:true,adsApproved:true,enabledKeywords:8,impressions:0,clicks:0,metricsVerified:true,hoursSinceChange:25};
describe("EGG marketing delivery diagnosis",()=>{
 it("never treats absent connector metrics as zero",()=>expect(diagnoseEggAdsDelivery({...base,metricsVerified:false}).state).toBe("unknown"));
 it("distinguishes recent activation from persistent zero impressions",()=>{
  expect(diagnoseEggAdsDelivery({...base,hoursSinceChange:3}).state).toBe("awaiting_observation");
  expect(diagnoseEggAdsDelivery(base).state).toBe("delivery_blocked");
 });
 it("routes engagement only after impressions",()=>expect(diagnoseEggAdsDelivery({...base,impressions:50}).state).toBe("no_engagement"));
 it("does not authorize spending",()=>expect(diagnoseEggAdsDelivery(base).spendingAllowed).toBe(false));
});

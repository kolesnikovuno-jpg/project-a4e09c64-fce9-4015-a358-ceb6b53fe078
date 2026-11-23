/** Google Ads delivery diagnostic: pure logic, no API credentials or spending authority. */
export type EggAdsSnapshot = {
  campaignEnabled: boolean | null;
  adsApproved: boolean | null;
  enabledKeywords: number | null;
  impressions: number | null;
  clicks: number | null;
  /** True only if source confirms metrics for the requested period. Empty connector rows are NOT zero. */
  metricsVerified: boolean;
  /** Observation window starts after the last relevant configuration change. */
  hoursSinceChange: number | null;
};
export type EggAdsDiagnosis = {
  state: "unknown" | "configuration_blocked" | "awaiting_observation" | "delivery_blocked" | "no_engagement" | "engagement_observed";
  sphere: "marketing";
  summary: string;
  researchQuestions: string[];
  nextAction: string;
  authorApprovalRequired: boolean;
  spendingAllowed: false;
};
export function diagnoseEggAdsDelivery(s: EggAdsSnapshot): EggAdsDiagnosis {
  const common = { sphere:"marketing" as const, authorApprovalRequired:false, spendingAllowed:false as const };
  if(s.campaignEnabled===false || s.adsApproved===false || s.enabledKeywords===0) return {
    ...common,state:"configuration_blocked",summary:"Campaign delivery has a verified configuration blocker.",
    researchQuestions:["Which paused/disapproved component prevents serving?"],
    nextAction:"Inspect and propose a permitted configuration correction; do not change budget.",
  };
  if(s.campaignEnabled===null || s.adsApproved===null || s.enabledKeywords===null || !s.metricsVerified || s.impressions===null || s.clicks===null) return {
    ...common,state:"unknown",summary:"Delivery metrics or eligibility are not sufficiently verified.",
    researchQuestions:["Obtain source-confirmed impressions and clicks for the same dated period.","Confirm ad and keyword eligibility."],
    nextAction:"Refresh evidence from Google Ads; do not interpret empty connector rows as zero.",
  };
  if(s.impressions===0) {
    if(s.hoursSinceChange===null || s.hoursSinceChange<24) return {
      ...common,state:"awaiting_observation",summary:"No impressions yet; post-change observation window is incomplete or unknown.",
      researchQuestions:["When was the last delivery-affecting configuration change?"],
      nextAction:"Recheck confirmed impressions after a 24-hour post-change window.",
    };
    return {
      ...common,state:"delivery_blocked",summary:"No impressions after at least 24 hours of observation.",
      researchQuestions:["Are search volume, targeting, schedule, bidding or account restrictions limiting delivery?"],
      nextAction:"Run delivery diagnostics; prepare a correction within existing permissions and budget.",
    };
  }
  if(s.clicks===0) return {
    ...common,state:"no_engagement",summary:"Impressions exist but no clicks are confirmed.",
    researchQuestions:["Do search terms match buyer intent?","Is the ad proposition sufficiently relevant?"],
    nextAction:"Review search terms and ad relevance before changing the offer.",
  };
  return {...common,state:"engagement_observed",summary:"Clicks observed; demand is not yet established without qualified inquiries.",
    researchQuestions:["Are clicks converting to qualified inquiries?"],nextAction:"Compare click and inquiry evidence by period and source."};
}

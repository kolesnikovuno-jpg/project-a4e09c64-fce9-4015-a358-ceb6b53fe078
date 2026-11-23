import { describe, expect, it } from "vitest";
import { assessEggInformation, selectEggScenario } from "../../lib/eggInformationSufficiency.js";
describe("EGG information sufficiency", () => {
  const items = [
    { id:"page", sphereId:"retail", question:"Is the landing page ready?", kind:"verified" as const, requiredFor:["demand-test"] },
    { id:"impressions", sphereId:"marketing", question:"Is delivery confirmed?", kind:"missing" as const, requiredFor:["demand-test"], blocking:true, verificationAction:"Check impressions and delivery diagnostics" },
    { id:"lead", sphereId:"production", question:"Manufacturing lead time?", kind:"estimate" as const, requiredFor:["fulfill-order"], verificationAction:"Request supplier quote" },
  ];
  it("blocks only the action needing a critical missing input", () => {
    expect(assessEggInformation("demand-test",items).readiness).toBe("blocked");
    expect(assessEggInformation("fulfill-order",items).readiness).toBe("conditional");
    expect(assessEggInformation("other-action",items).readiness).toBe("ready");
  });
  it("routes research to the responsible sphere", () => {
    expect(assessEggInformation("demand-test",items).nextResearch[0].sphereId).toBe("marketing");
  });
  it("selects scenarios without inventing outcomes", () => {
    const scenarios=[{id:"zero-impressions",condition:"0 impressions",ownerSphereId:"marketing",nextAction:"Diagnose delivery",authorDecisionRequired:false}];
    expect(selectEggScenario(scenarios,["zero-impressions"])).toHaveLength(1);
    expect(selectEggScenario(scenarios,["clicks"])).toHaveLength(0);
  });
});

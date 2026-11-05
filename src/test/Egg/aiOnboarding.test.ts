import { describe, expect, it } from "vitest";
import { EGG_AI_ONBOARDING, getEggAiOnboardingProtocol, getEggAiFirstContactPrompt, getEggAiReadHandoff } from "../../lib/eggAiOnboarding";

describe("Personal AI first contact",()=>{
  it("never claims EGG has tested a user's private AI cloud",()=>{
    const result=getEggAiOnboardingProtocol();
    expect(result.storageChecked).toBe(false);
    expect(result.status).toBe("pending_ai_side_verification");
    expect(result.reporting.defaultStorageState).toBe("unknown");
    expect(result.storage.connectedTo).toBe("user_ai_client");
    expect(result.storage.notConnectedTo).toBe("egg_engine");
    expect(result.product.spheres).toHaveLength(8);
    expect(JSON.stringify(result)).not.toMatch(/access_token|client_secret/);
  });
  it("bridges an old MCP tool catalog through the existing authorized project read",()=>{
    const state=getEggAiReadHandoff();
    expect(state.schema).toBe("egg.ai-onboarding/0.1");
    expect(state.source).toBe("egg_project_state");
    expect(state.cloudStorageStatus).toBe("unknown");
    expect(state.cloudVerifiedByEgg).toBe(false);
    expect(state.onboardingTool).toBe("egg_get_onboarding_protocol");
    expect(state.noteRu).toContain("своей ИИ-среде");
    expect(state.noteRu).toContain("Автор утверждает решения");
    expect(JSON.stringify(state)).not.toMatch(/access_token|client_secret|egg_v1_/);
  });
  it("is read-only, provider-neutral and keeps author approval separate",()=>{
    expect(EGG_AI_ONBOARDING.eggPermissions.approve).toContain("Not permitted");
    expect(EGG_AI_ONBOARDING.firstContact.map(s=>s.id)).toEqual([
      "read_protocol","inspect_your_own_environment","check_cloud_storage",
      "report_or_request_connection","continue_with_egg",
    ]);
    expect(EGG_AI_ONBOARDING.storage.verification).toContain("actual permitted storage tool call");
    const text=getEggAiFirstContactPrompt();
    expect(text).toContain("egg_get_onboarding_protocol");
    expect(text).toContain("своей ИИ-среде");
    expect(text).toContain("облачное хранилище");
  });
});

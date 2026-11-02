import { describe, expect, it } from "vitest";
import { getEggStorageConfig, type EggStorageEnv } from "../server/eggStorageConfig";

const independent: EggStorageEnv = {
  EGG_SUPABASE_URL: "https://egg-isolated.supabase.co",
  EGG_SUPABASE_PUBLISHABLE_KEY: "egg-publishable-test",
  EGG_SUPABASE_SECRET_KEY: "sb_secret_egg-test-only-not-a-real-key",
  VITE_SUPABASE_URL: "https://website-lovable.supabase.co",
};
describe("Egg standalone server config", () => {
  it("uses only explicitly isolated Egg settings, never Lovable/Vite fallbacks", () => {
    expect(getEggStorageConfig(independent)).toEqual({
      url: independent.EGG_SUPABASE_URL,
      publishableKey: independent.EGG_SUPABASE_PUBLISHABLE_KEY,
      serviceKey: independent.EGG_SUPABASE_SECRET_KEY,
    });
    expect(getEggStorageConfig({
      VITE_SUPABASE_URL: "https://lovable.supabase.co",
    })).toBeNull();
  });
  it("rejects partial setup and common/shared Supabase secrets", () => {
    expect(getEggStorageConfig({
      ...independent, EGG_SUPABASE_PUBLISHABLE_KEY: undefined,
    })).toBeNull();
    expect(getEggStorageConfig({
      ...independent, EGG_SUPABASE_SECRET_KEY: independent.EGG_SUPABASE_PUBLISHABLE_KEY,
    })).toBeNull();
    expect(getEggStorageConfig({
      ...independent, EGG_SUPABASE_URL: independent.VITE_SUPABASE_URL,
    })).toBeNull();
  });
  it("refuses unsafe server URLs and stays fail-closed", () => {
    for (const url of [
      "http://egg-isolated.supabase.co",
      "https://user:secret@egg-isolated.supabase.co",
      "https://egg-isolated.supabase.co/path",
      "https://egg-isolated.supabase.co?key=exposed",
      "invalid",
    ]) {
      expect(getEggStorageConfig({
        ...independent, EGG_SUPABASE_URL: url,
      })).toBeNull();
    }
  });
});

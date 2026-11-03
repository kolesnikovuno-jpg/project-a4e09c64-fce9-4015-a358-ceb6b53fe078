// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EggRemoteError, getEggAuthConfig, listEggServerProjects,
  readEggServerProject, stableFileOperationId, writeEggServerProject,
} from "../lib/eggRemoteApi";

afterEach(() => vi.unstubAllGlobals());
const testJwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0LXVzZXIifQ.test-signature";

const json = (body: unknown, status = 200) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

describe("Independent Egg Auth client API", () => {
  it("reads public-only Supabase URL/key configuration", async () => {
    const spy = vi.fn().mockResolvedValue(json({
      ok: true, supabaseUrl: "https://egg-independent.supabase.co",
      publishableKey: "sb_publishable_not-a-secret", authMode: "email_otp",
    }));
    vi.stubGlobal("fetch", spy);
    const config = await getEggAuthConfig();
    expect(config.supabaseUrl).toBe("https://egg-independent.supabase.co");
    expect(config.publishableKey).toMatch(/^sb_publishable_/);
    expect(spy.mock.calls[0][0]).toBe("/api/egg-config");
    expect(spy.mock.calls[0][1].credentials).toBe("omit");
  });

  it("rejects wrong config shape, cross-domain link, and missing backend", async () => {
    for (const input of [
      { ok: true, supabaseUrl: "https://evil.example", publishableKey: "sb_publishable_a", authMode: "email_otp" },
      { ok: true, supabaseUrl: "https://egg-independent.supabase.co", publishableKey: "sb_secret_never-expose", authMode: "email_otp" },
      { ok: false, error: "egg_engine_not_configured" },
    ]) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(input, input.ok ? 200 : 503)));
      await expect(getEggAuthConfig()).rejects.toBeInstanceOf(EggRemoteError);
    }
  });

  it("requires the user session and never accepts an Egg agent key as Author", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await expect(listEggServerProjects("egg_v1_agent-test-1234567890123"))
      .rejects.toBeInstanceOf(EggRemoteError);
    await expect(writeEggServerProject("", { command: "create", seed: "Design" }))
      .rejects.toBeInstanceOf(EggRemoteError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("lists projects, reads one, then writes only over the same-origin API", async () => {
    const fake = vi.fn()
      .mockResolvedValueOnce(json({ ok: true, projects: [
        { projectId: "d118c7e2-18cf-458f-b36a-5c47067a1072", revision: 1,
          seed: "Chair", updatedAt: "2026-11-03T10:00:00Z" },
      ] }))
      .mockResolvedValueOnce(json({ ok: true, revision: 1,
        project: { core: {}, files: [], tasks: [], events: [] } }))
      .mockResolvedValueOnce(json({ ok: true, revision: 2 }));
    vi.stubGlobal("fetch", fake);
    const items = await listEggServerProjects(testJwt);
    expect(items[0].seed).toBe("Chair");
    expect((await readEggServerProject(testJwt, items[0].projectId)).revision).toBe(1);
    await writeEggServerProject(testJwt, { command: "register_file", fileId: "real-drive-id-12345" });
    expect(fake.mock.calls[2][0]).toBe("/api/egg");
    expect(fake.mock.calls[2][1].method).toBe("POST");
    expect(fake.mock.calls[2][1].headers.Authorization).toBe("Bearer " + testJwt);
    expect(fake.mock.calls[2][1].credentials).toBe("omit");
  });

  it("deduplicates transfer operations deterministically by local file identity", () => {
    const id = stableFileOperationId("d118c7e2-18cf-458f-b36a-5c47067a1072", "artifact-5");
    expect(id).toBe(stableFileOperationId("d118c7e2-18cf-458f-b36a-5c47067a1072", "artifact-5"));
    expect(id).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
    expect(() => stableFileOperationId("bad/uuid", "artifact-1")).toThrow();
  });
});

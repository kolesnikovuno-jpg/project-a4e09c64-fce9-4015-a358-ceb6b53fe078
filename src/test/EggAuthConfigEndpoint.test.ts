import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../api/egg-config";

const original = {
  url: process.env.EGG_SUPABASE_URL,
  publishable: process.env.EGG_SUPABASE_PUBLISHABLE_KEY,
  secret: process.env.EGG_SUPABASE_SECRET_KEY,
  website: process.env.VITE_SUPABASE_URL,
};
afterEach(() => {
  if (original.url === undefined) delete process.env.EGG_SUPABASE_URL;
  else process.env.EGG_SUPABASE_URL = original.url;
  if (original.publishable === undefined) delete process.env.EGG_SUPABASE_PUBLISHABLE_KEY;
  else process.env.EGG_SUPABASE_PUBLISHABLE_KEY = original.publishable;
  if (original.secret === undefined) delete process.env.EGG_SUPABASE_SECRET_KEY;
  else process.env.EGG_SUPABASE_SECRET_KEY = original.secret;
  if (original.website === undefined) delete process.env.VITE_SUPABASE_URL;
  else process.env.VITE_SUPABASE_URL = original.website;
  vi.restoreAllMocks();
});
const request = (method: string) => ({ method });
const response = () => {
  const headers: Record<string, string> = {};
  let raw = "";
  return {
    headers,
    get raw() { return raw; },
    statusCode: 0,
    setHeader(key: string, value: string) { headers[key] = value; },
    end(data: string) { raw = data; },
  };
};
describe("Egg public auth config server endpoint", () => {
  it("returns only the public publishable key and URL, never the secret", () => {
    process.env.EGG_SUPABASE_URL = "https://egg-independent.supabase.co";
    process.env.EGG_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    process.env.EGG_SUPABASE_SECRET_KEY = "sb_secret_private_must_never_leak";
    process.env.VITE_SUPABASE_URL = "https://lovable-website.supabase.co";
    const res = response();
    handler(request("GET") as any, res as any);
    const body = JSON.parse(res.raw);
    expect(res.statusCode).toBe(200);
    expect(body).toEqual({
      ok: true, supabaseUrl: process.env.EGG_SUPABASE_URL,
      publishableKey: process.env.EGG_SUPABASE_PUBLISHABLE_KEY,
      authMode: "email_otp",
    });
    expect(res.raw).not.toContain(process.env.EGG_SUPABASE_SECRET_KEY);
    expect(res.headers["Cache-Control"]).toBe("no-store, private");
  });
  it("fails closed without dedicated secret and rejects non-GET", () => {
    delete process.env.EGG_SUPABASE_SECRET_KEY;
    process.env.EGG_SUPABASE_URL = "https://egg-independent.supabase.co";
    process.env.EGG_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    const res = response();
    handler(request("GET") as any, res as any);
    expect(res.statusCode).toBe(503);
    expect(JSON.parse(res.raw).error).toBe("egg_engine_not_configured");
    const post = response();
    handler(request("POST") as any, post as any);
    expect(post.statusCode).toBe(405);
  });
});

import {describe,expect,it} from "vitest";
import {EGG_CANONICAL_ORIGIN,EGG_AUTH_CALLBACK,eggAuthOriginMismatch,eggAuthBridgeUrl} from "../../lib/eggAuthRedirect";

describe("EGG auth / single-origin magic-link return",()=>{
  it("returns every new email verification to canonical EGG /egg/connect",()=>{
    expect(EGG_CANONICAL_ORIGIN).toBe("https://egg.kolesnikov.studio");
    expect(EGG_AUTH_CALLBACK).toBe("https://egg.kolesnikov.studio/egg/connect");
    expect(eggAuthOriginMismatch("https://egg.kolesnikov.studio")).toBe(false);
    expect(eggAuthOriginMismatch("https://egg.kolesnikov.studio/egg")).toBe(false);
  });
  it("bridges only actual Supabase magic-link callbacks from known Vercel aliases",()=>{
    const preview="https://project-a4e09c64-fce9-40-git-e8febd-kolesnikovuno-jpgs-projects.vercel.app";
    const fragment="#access_token=token123&refresh_token=refresh123&token_type=bearer&type=magiclink";
    expect(eggAuthBridgeUrl(preview,"/egg/connect",fragment)).toBe(EGG_AUTH_CALLBACK+fragment);
    expect(eggAuthBridgeUrl(preview,"/egg/connect","#error_code=otp_expired"))
      .toBe(EGG_AUTH_CALLBACK+"#error_code=otp_expired");
    expect(eggAuthBridgeUrl("https://egg.kolesnikov.studio","/egg/connect",fragment))
      .toBeNull();
    expect(eggAuthBridgeUrl(preview,"/egg",fragment)).toBeNull();
    expect(eggAuthBridgeUrl(preview,"/egg/connect","#egg-invite=abcdef")).toBeNull();
    expect(eggAuthBridgeUrl("https://evil.example","/egg/connect",fragment)).toBeNull();
    expect(eggAuthBridgeUrl("http://my.vercel.app","/egg/connect",fragment)).toBeNull();
  });
  it("identifies Vercel preview or unknown origins as separate login sessions",()=>{
    expect(eggAuthOriginMismatch("https://project-a4e09c64-fce9-40-git-e8febd-kolesnikovuno-jpgs-projects.vercel.app")).toBe(true);
    expect(eggAuthOriginMismatch("https://example.com")).toBe(true);
    expect(eggAuthOriginMismatch("not-a-valid-origin")).toBe(true);
    expect(eggAuthOriginMismatch("http://egg.kolesnikov.studio")).toBe(true);
    expect(eggAuthOriginMismatch("https://egg.kolesnikov.studio.evil.invalid")).toBe(true);
  });
});
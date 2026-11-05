import {describe,expect,it} from "vitest";
import {EGG_CANONICAL_ORIGIN,EGG_AUTH_CALLBACK,eggAuthOriginMismatch} from "../../lib/eggAuthRedirect";

describe("EGG auth / single-origin magic-link return",()=>{
  it("returns every new email verification to canonical EGG /egg/connect",()=>{
    expect(EGG_CANONICAL_ORIGIN).toBe("https://egg.kolesnikov.studio");
    expect(EGG_AUTH_CALLBACK).toBe("https://egg.kolesnikov.studio/egg/connect");
    expect(eggAuthOriginMismatch("https://egg.kolesnikov.studio")).toBe(false);
    expect(eggAuthOriginMismatch("https://egg.kolesnikov.studio/egg")).toBe(false);
  });
  it("identifies Vercel preview or unknown origins as separate login sessions",()=>{
    expect(eggAuthOriginMismatch("https://project-a4e09c64-fce9-40-git-e8febd-kolesnikovuno-jpgs-projects.vercel.app")).toBe(true);
    expect(eggAuthOriginMismatch("https://example.com")).toBe(true);
    expect(eggAuthOriginMismatch("not-a-valid-origin")).toBe(true);
    expect(eggAuthOriginMismatch("http://egg.kolesnikov.studio")).toBe(true);
    expect(eggAuthOriginMismatch("https://egg.kolesnikov.studio.evil.invalid")).toBe(true);
  });
});
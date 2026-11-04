import { afterEach, describe, expect, it } from "vitest";
import type { IncomingMessage, ServerResponse } from "node:http";
import handler from "../../api/oauth-resource";

const keys=["EGG_SUPABASE_URL","EGG_SUPABASE_PUBLISHABLE_KEY","EGG_SUPABASE_SECRET_KEY",
  "EGG_MCP_PUBLIC_ORIGIN","VITE_SUPABASE_URL"] as const;
const old=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
const invoke=()=>{
  let response="";
  const res={
    statusCode:200,
    setHeader:()=>{},
    end:(value?:string)=>{response=value??"";},
  } as unknown as ServerResponse;
  handler({method:"GET"} as IncomingMessage,res);
  return {status:res.statusCode,body:JSON.parse(response) as Record<string,unknown>};
};
afterEach(()=>{
  for(const k of keys){if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k]}
});

describe("Canonical EGG MCP resource",()=>{
  it("announces the stable domain rather than any one Vercel deployment",()=>{
    process.env.EGG_SUPABASE_URL="https://test-only.supabase.co/";
    process.env.EGG_SUPABASE_PUBLISHABLE_KEY="sb_publishable_test";
    process.env.EGG_SUPABASE_SECRET_KEY="sb_secret_test_only";
    process.env.EGG_MCP_PUBLIC_ORIGIN="https://egg.kolesnikov.studio";
    delete process.env.VITE_SUPABASE_URL;
    const {status,body}=invoke();
    expect(status).toBe(200);
    expect(body.resource).toBe("https://egg.kolesnikov.studio/api/mcp");
    expect(body.authorization_servers).toEqual(["https://test-only.supabase.co/auth/v1"]);
    expect(JSON.stringify(body)).not.toContain("sb_secret_");
  });
  it("does not announce a resource if origin is missing",()=>{
    process.env.EGG_SUPABASE_URL="https://test-only.supabase.co/";
    process.env.EGG_SUPABASE_PUBLISHABLE_KEY="sb_publishable_test";
    process.env.EGG_SUPABASE_SECRET_KEY="sb_secret_test_only";
    delete process.env.EGG_MCP_PUBLIC_ORIGIN;
    delete process.env.VITE_SUPABASE_URL;
    expect(invoke().status).toBe(503);
  });
});

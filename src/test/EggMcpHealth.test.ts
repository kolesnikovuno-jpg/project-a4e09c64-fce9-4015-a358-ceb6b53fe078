import { afterEach, describe, expect, it } from "vitest";
import type { IncomingMessage, ServerResponse } from "node:http";
import handler from "../../api/mcp-health";

const keys = ["EGG_SUPABASE_URL","EGG_SUPABASE_PUBLISHABLE_KEY",
  "EGG_SUPABASE_SECRET_KEY","VITE_SUPABASE_URL"] as const;
const original = Object.fromEntries(keys.map(key=>[key,process.env[key]]));

async function check():Promise<{status:number;result:Record<string,unknown>}> {
  let data="";
  const response = {
    statusCode:200,
    setHeader:()=>{},
    end:(body?:string)=>{data=body??"";},
  } as unknown as ServerResponse;
  await handler({method:"GET"} as IncomingMessage,response);
  return {status:response.statusCode,result:JSON.parse(data)};
}
afterEach(()=>{
  for(const key of keys){
    const value=original[key];
    if(value===undefined)delete process.env[key];
    else process.env[key]=value;
  }
});

describe("EGG MCP health and configuration",()=>{
  it("does not report MCP healthy when Supabase configuration is missing",async()=>{
    for(const key of keys)delete process.env[key];
    const {status,result}=await check();
    expect(status).toBe(503);
    expect(result.ok).toBe(false);
    expect(result.checks).toEqual({protocol:true,storageConfigured:false});
    expect(result.toolNames).toContain("egg_propose_concept");
    expect(result.toolNames).toContain("egg_get_onboarding_protocol");
  });
  it("reports configured protocol without claiming OAuth readiness",async()=>{
    process.env.EGG_SUPABASE_URL="https://test-only.supabase.co/";
    process.env.EGG_SUPABASE_PUBLISHABLE_KEY="sb_publishable_test";
    process.env.EGG_SUPABASE_SECRET_KEY="sb_secret_test_only";
    delete process.env.VITE_SUPABASE_URL;
    const {status,result}=await check();
    expect(status).toBe(200);
    expect(result.checks).toEqual({protocol:true,storageConfigured:true});
    expect(String(result.note)).toContain("not tested");
    expect(JSON.stringify(result)).not.toContain("sb_secret_test_only");
  });
});

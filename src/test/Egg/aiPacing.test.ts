import {describe,it,expect} from "vitest";
import {
 EGG_AI_REQUEST_SPACING_MS,reserveEggAiRequest,postponeEggAiRequests,
 parseEggRetryAfter,waitForEggAiRequest,
} from "../../lib/eggAiPacing";
import {parseEggProviderRateLimit} from "../../../api/egg-flow-ai";

describe("EGG Gemini rate limit safeguards",()=>{
 it("spaces charged requests below observed 5 RPM and honors a cooldown",()=>{
  const state=new Map<string,string>();
  const storage={getItem:(key:string)=>state.get(key)??null,
   setItem:(key:string,value:string)=>{state.set(key,value);}};
  const at=Date.now()+3_600_000;
  const first=reserveEggAiRequest(at,storage);
  const second=reserveEggAiRequest(at,storage);
  const third=reserveEggAiRequest(at,storage);
  expect(EGG_AI_REQUEST_SPACING_MS).toBeGreaterThanOrEqual(15_000);
  expect(first.waitMs).toBe(0);
  expect(second.waitMs).toBe(EGG_AI_REQUEST_SPACING_MS);
  expect(third.waitMs).toBe(EGG_AI_REQUEST_SPACING_MS*2);
  const cooldown=postponeEggAiRequests(90_000,at,storage);
  expect(cooldown).toBeGreaterThanOrEqual(at+90_000);
  expect(reserveEggAiRequest(at,storage).startAt).toBe(cooldown);
 });
 it("can cancel a queued request before issuing a model call",async()=>{
  const wait=await waitForEggAiRequest({shouldStop:()=>true});
  expect(wait).toBe(false);
 });
 it("parses only safe retry information and never copies provider text into EGG status",async()=>{
  const response=new Response(JSON.stringify({error:{
   message:"quota exceeded for secret-project-name",
   details:[{violations:[{quotaId:"GenerateRequestsPerMinutePerProjectPerModel"}]},
    {retryDelay:"43s"}],
  }}),{status:429,headers:{"retry-after":"30"}});
  const result=await parseEggProviderRateLimit(response);
  expect(result).toEqual({rateLimitScope:"minute",retryAfterSeconds:30});
  expect(JSON.stringify(result)).not.toContain("secret-project-name");
  expect(parseEggRetryAfter("60")).toBe(60);
  expect(parseEggRetryAfter("junk")).toBeUndefined();
 });
 it("distinguishes daily quota and unspecified 429 without inventing a reset",async()=>{
  const daily=await parseEggProviderRateLimit(new Response(JSON.stringify({
   error:{details:[{violations:[{quotaId:"GenerateRequestsPerDayPerProjectPerModel"}]}]},
  }),{status:429}));
  expect(daily).toEqual({rateLimitScope:"daily"});
  const unknown=await parseEggProviderRateLimit(new Response("{}",{status:429}));
  expect(unknown).toEqual({rateLimitScope:"unknown"});
 });
});

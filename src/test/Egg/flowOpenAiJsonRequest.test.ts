import {afterEach,describe,expect,it,vi} from "vitest";
import {eggOpenAiJsonInput,generate} from "../../../api/egg-flow-ai";

afterEach(()=>vi.unstubAllGlobals());

const provider={
 url:"https://api.openai.com/v1/responses",
 key:"unit-test-only",
 model:"gpt-6-luna",
 kind:"direct_openai" as const,
};

function simulateOpenAiJsonRequirement(){
 const requests:Array<Record<string,unknown>>=[];
 const send=vi.fn(async (_url:string,options:RequestInit)=>{
  const payload=JSON.parse(String(options.body)) as Record<string,unknown>;
  requests.push(payload);
  const input=payload.input;
  const text=typeof input==="string"?input:(
   (input as Array<{content:Array<{type:string;text?:string}>}>)[0].content
    .find(c=>c.type==="input_text")?.text??"");
  // Mirrors OpenAI JSON-mode input validation: top-level instructions
  // do NOT count. Return an HTTP 400 if user-facing input lacks JSON.
  if(!/JSON/i.test(text))return {
   ok:false,status:400,json:async()=>({error:{
    type:"invalid_request_error",param:"input",
    message:"JSON input instruction is required for response_format.",
   }}),
   clone(){return this;},
  };
  return {ok:true,status:200,json:async()=>({
   status:"completed",
   output:[{type:"message",content:[{type:"output_text",text:'{"ready":true}'}]}],
  })};
 });
 vi.stubGlobal("fetch",send);
 return {requests,send};
}

describe("EGG OpenAI JSON requirement across the actual eight-sphere cycle",()=>{
 it("passes charged preflight even when its original text contains no JSON marker",async()=>{
  const {requests}=simulateOpenAiJsonRequirement();
  const response=await generate(provider,{
   instructions:"Return only a JSON object with ready set to true. No explanation.",
   input:"Connectivity check for EGG; no project data provided.",
  },350);
  expect(JSON.parse(response)).toEqual({ready:true});
  expect(requests).toHaveLength(1);
  expect(requests[0].text).toEqual({format:{type:"json_object"}});
  expect(requests[0].input).toContain("JSON object");
  expect(requests[0].store).toBe(false);
 });
 it("includes JSON instruction for sphere structured format and does not inject a separate model call",async()=>{
  const {requests,send}=simulateOpenAiJsonRequirement();
  const response=await generate(provider,{
   instructions:"Return ONLY a compact JSON object as sphere output.",
   input:"Идея Автора: кресло как самостоятельный арт-объект.",
   responseJsonSchema:{type:"object",additionalProperties:false,
    properties:{ready:{type:"boolean"}},required:["ready"]},
  },2200);
  expect(JSON.parse(response).ready).toBe(true);
  expect(send).toHaveBeenCalledTimes(1);
  expect(requests[0].input).toContain("JSON object");
  expect((requests[0].text as {format:{type:string}}).format.type).toBe("json_schema");
 });
 it("keeps existing image input while adding JSON instruction for spatial spheres",async()=>{
  const {requests,send}=simulateOpenAiJsonRequirement();
  const image="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ";
  await generate(provider,{
   instructions:"Observe the existing space only.",
   input:"Describe tentative spatial relationships, not the existing furniture.",
   imageData:image,
  },2200);
  expect(send).toHaveBeenCalledTimes(1);
  const content=(requests[0].input as Array<{content:Array<{
   type:string;text?:string;image_url?:string
  }>}>)[0].content;
  expect(content[0].type).toBe("input_text");
  expect(content[0].text).toContain("JSON object");
  expect(content[1]).toEqual({type:"input_image",image_url:image});
 });
 it("never duplicates raw user content when appending the format instruction",()=>{
  const prompt="Исходная идея ① · свободная форма";
  const transformed=eggOpenAiJsonInput(prompt);
  expect(transformed.startsWith(prompt)).toBe(true);
  expect(transformed.split(prompt)).toHaveLength(2);
 });
});

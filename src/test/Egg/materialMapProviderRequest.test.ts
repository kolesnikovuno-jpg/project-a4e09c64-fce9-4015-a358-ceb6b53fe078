import {afterEach,describe,expect,it,vi} from "vitest";
import {matterModelReply} from "../../../api/egg-flow-ai";

afterEach(()=>vi.unstubAllGlobals());

const sampleMap={
 observations:[{text:"На карточке показана пространственная форма.",sourceIds:["image-1"]}],
 connections:[],tensions:[],hypotheses:[],
 questions:["Какая часть образа важна для Автора?"],
};
const input={
 projectId:"c68166a9-df94-4118-b2aa-b3d8d71dea18",
 materials:[{id:"image-1",type:"image" as const,text:"Reference",
  imageData:"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ"}],
 messages:[{role:"user" as const,content:"Сформируй структурированную карту всего выбранного холста."}],
 mapRequested:true,
};
const provider={
 url:"https://api.openai.com/v1/responses",
 key:"unit-test-placeholder",
 model:"gpt-6-luna",
 kind:"direct_openai" as const,
};

describe("EGG Material map OpenAI JSON-mode regression",()=>{
 it("puts the word JSON in Responses input, not only top-level instructions",async()=>{
  const fetchMock=vi.fn(async (_url:string,_options:RequestInit)=>({
   ok:true,status:200,json:async()=>({
    status:"completed",
    output:[{type:"message",content:[{type:"output_text",
     text:JSON.stringify({reply:"Наблюдается образ.",map:sampleMap})}]}],
   }),
  }));
  vi.stubGlobal("fetch",fetchMock);
  const result=await matterModelReply(provider,input);
  expect(result.reply).toBe("Наблюдается образ.");
  expect(result.materialMap?.observations[0].sourceIds).toEqual(["image-1"]);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [,options]=fetchMock.mock.calls[0] as unknown as [string,RequestInit];
  const request=JSON.parse(String(options.body)) as {
   text:{format:{type:string}};
   input:Array<{role:string;content:Array<{type:string;text?:string;image_url?:string}>}>;
  };
  expect(request.text.format.type).toBe("json_object");
  expect(request.input[0].content[0].type).toBe("input_text");
  expect(request.input[0].content[0].text).toMatch(/JSON/);
  expect(request.input[0].content[1]).toMatchObject({
   type:"input_image",image_url:input.materials[0].imageData,
  });
 });
 it("does not force JSON mode for ordinary Material or Idea dialogue",async()=>{
  const fetchMock=vi.fn(async()=>({
   ok:true,status:200,json:async()=>({
    status:"completed",
    output:[{type:"message",content:[{type:"output_text",text:"Обычный ответ."}]}],
   }),
  }));
  vi.stubGlobal("fetch",fetchMock);
  const result=await matterModelReply(provider,{...input,mapRequested:false},"matter");
  expect(result).toEqual({reply:"Обычный ответ."});
  const request=JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string,RequestInit])[1].body));
  expect(request.text).toBeUndefined();
 });
});

import { describe, expect, it, vi, afterEach } from "vitest";
import handler from "../../../api/egg-screenshot";
import type { IncomingMessage, ServerResponse } from "node:http";

function call(body:unknown,method="POST"){
 const headers:Record<string,string>={};
 let code=200;
 let result:unknown;
 const req={method,headers:{host:"egg.kolesnikov.studio",origin:"https://egg.kolesnikov.studio"},body} as unknown as IncomingMessage;
 const res={
  setHeader:(name:string,value:string)=>{headers[name]=value;},
  set statusCode(value:number){code=value;},
  get statusCode(){return code;},
  end:(text:string)=>{result=JSON.parse(text) as unknown;},
 } as unknown as ServerResponse;
 return handler(req,res).then(()=>({code,result,headers}));
}

afterEach(()=>vi.unstubAllGlobals());

describe("EGG screenshot endpoint",()=>{
 it("blocks local/private and non-http URLs before contacting the screenshot provider",async()=>{
  const fetchMock=vi.fn();vi.stubGlobal("fetch",fetchMock);
  for(const url of ["http://localhost/", "http://127.0.0.1/", "http://192.168.1.2/",
   "http://[::1]/","http://10.0.0.1/","file:///secret","javascript:alert(1)",
   "https://user:pass@example.org/","http://intranet.local/"]){
   const response=await call({url});
   expect(response.code).toBe(400);
   expect(response.result).toEqual({ok:false,error:"invalid_public_url"});
  }
  expect(fetchMock).not.toHaveBeenCalled();
 });
 it("accepts only POST and same-origin requests",async()=>{
  const notAllowed=await call({url:"https://example.org"},"GET");
  expect(notAllowed.code).toBe(405);
  const headers:Record<string,string>={};let code=200;let result:unknown;
  const req={method:"POST",headers:{host:"egg.kolesnikov.studio",origin:"https://other.com"},body:{url:"https://example.org"}} as unknown as IncomingMessage;
  const res={setHeader:(n:string,v:string)=>{headers[n]=v;},set statusCode(v:number){code=v;},end:(t:string)=>{result=JSON.parse(t) as unknown;}} as unknown as ServerResponse;
  await handler(req,res);
  expect(code).toBe(403);expect(result).toEqual({ok:false,error:"origin_mismatch"});
 });
 it("returns pending when preview service is still generating",async()=>{
  const fetchMock=vi.fn(async()=>({status:307,ok:false}));
  vi.stubGlobal("fetch",fetchMock);
  const r=await call({url:"https://example.org/portfolio"});
  expect(r.code).toBe(202);
  expect(r.result).toMatchObject({ok:false,status:"pending"});
  expect(fetchMock.mock.calls.length).toBe(1);
 });
 it("returns a verified JPEG data URL when provider responds with an image",async()=>{
  const jpeg=Uint8Array.from([255,216,255,217]);
  vi.stubGlobal("fetch",vi.fn(async()=>({
   status:200,ok:true,headers:new Headers({"content-type":"image/jpeg"}),
   arrayBuffer:async()=>jpeg.buffer,
  })));
  const r=await call({url:"https://example.org/portfolio"});
  expect(r.code).toBe(200);
  expect(r.result).toMatchObject({ok:true,status:"ready",cached:true,
   imageDataUrl:"data:image/jpeg;base64,/9j/2Q==",
  });
  expect(r.headers["Cache-Control"]).toBe("no-store, private");
 });
});

// @vitest-environment jsdom
import {describe,expect,it} from "vitest";
import {createEggPhotosZip,eggPhotosFromCards} from "../../lib/eggPhotosZip";

describe("export Field images as actual JPGs rather than JSON strings",()=>{
 const jpegA="data:image/jpeg;base64,/9j/2Q=="; // binary FF D8 FF D9
 const jpegB="data:image/jpeg;base64,/9j/4AAQSkZJRg==";
 it("produces ordinary image files in an extractable ZIP with valid local and central headers",async()=>{
  const {blob,filenames}=createEggPhotosZip([
   {type:"image",text:"002.jpeg",src:jpegA},
   {type:"image",text:"004.jpeg",src:jpegB},
   {type:"thought",text:"not photo",src:""},
  ]);
  expect(blob.type).toBe("application/zip");
  expect(filenames).toEqual(["002.jpg","004.jpg"]);
  const contents=await new Promise<ArrayBuffer>((resolve,reject)=>{
   const reader=new FileReader();
   reader.onload=()=>resolve(reader.result as ArrayBuffer);
   reader.onerror=()=>reject(reader.error);
   reader.readAsArrayBuffer(blob);
  });
  const bytes=new Uint8Array(contents);
  const v=new DataView(bytes.buffer);
  expect(v.getUint32(0,true)).toBe(0x04034b50);
  const length=v.getUint16(26,true),size=v.getUint32(18,true);
  expect(new TextDecoder().decode(bytes.slice(30,30+length))).toBe("002.jpg");
  expect([...bytes.slice(30+length,30+length+size)]).toEqual([255,216,255,217]);
  const end=bytes.length-22;
  expect(v.getUint32(end,true)).toBe(0x06054b50);
  expect(v.getUint16(end+10,true)).toBe(2);
  const centralOffset=v.getUint32(end+16,true);
  expect(v.getUint32(centralOffset,true)).toBe(0x02014b50);
  expect(v.getUint32(centralOffset+42,true)).toBe(0);
  expect(new TextDecoder().decode(bytes.slice(centralOffset+46,centralOffset+53))).toBe("002.jpg");
 });
 it("does not allow fake data URLs to become fake downloaded photos",()=>{
  expect(eggPhotosFromCards([
   {type:"image",text:"not-image.jpeg",src:"javascript:alert(1)"},
   {type:"image",text:"remote.jpeg",src:"https://example.org/pic.jpeg"},
  ])).toHaveLength(0);
  expect(()=>createEggPhotosZip([{type:"thought",text:"a note"}])).toThrow(/нет фотографий/);
 });
 it("rewrites the extension based on actual MIME, sanitizes path and avoids duplicate names",()=>{
  const items=eggPhotosFromCards([
   {type:"image",text:"../../../some/Фотография.png",src:jpegA},
   {type:"image",text:"Фотография.jpg",src:jpegB},
  ]);
  expect(items.map(x=>x.name)).toEqual(["Фотография.jpg","Фотография-2.jpg"]);
  expect(items[0].name.includes("/")).toBe(false);
  expect(items.every(x=>x.crc!==0)).toBe(true);
 });
});

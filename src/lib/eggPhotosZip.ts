/** Small dependency-free ZIP/STORE writer for ordinary photo files in EGG.
 * Field images are currently stored as data:image/…;base64 URLs in cards.
 * This exports the actual binary image payload, not JSON or text.
 */
export type EggPhotoCard={type?:unknown;text?:unknown;src?:unknown};
type ZipEntry={name:string;nameBytes:Uint8Array;data:Uint8Array;crc:number};
const encoder=new TextEncoder();

const crcTable=(()=>{
 const table=new Uint32Array(256);
 for(let i=0;i<256;i++){
  let c=i;
  for(let j=0;j<8;j++)c=c&1?0xedb88320^(c>>>1):c>>>1;
  table[i]=c>>>0;
 }
 return table;
})();
function crc32(bytes:Uint8Array):number{
 let c=0xffffffff;
 for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);
 return (c^0xffffffff)>>>0;
}
function u16(view:DataView,offset:number,value:number){
 view.setUint16(offset,value,true);
}
function u32(view:DataView,offset:number,value:number){
 view.setUint32(offset,value>>>0,true);
}
const formats:Record<string,string>={jpeg:"jpg",png:"png",webp:"webp"};
const imagePattern=/^data:image\/(jpeg|png|webp);base64,([a-zA-Z0-9+/=]+)$/;
function filename(input:string,extension:string,i:number):string{
 const base=input.replace(/\\/g,"/").split("/").pop()??"";
 const stem=base.replace(/\.[^.]*$/,"").replace(/[<>:"|?*\u0000-\u001f]/g,"_").trim().slice(0,90);
 return (stem||"photo-"+String(i+1).padStart(2,"0"))+"."+extension;
}
export function eggPhotosFromCards(cards:readonly EggPhotoCard[]):ZipEntry[]{
 const result:ZipEntry[]=[];
 const used=new Set<string>();
 for(const c of cards){
  if(c?.type!=="image"||typeof c.src!=="string")continue;
  const m=imagePattern.exec(c.src);
  if(!m)continue;
  const binary=atob(m[2]);
  if(!binary.length)continue;
  const data=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)data[i]=binary.charCodeAt(i);
  let name=filename(typeof c.text==="string"?c.text:"",formats[m[1]],result.length);
  const suffix="."+formats[m[1]],stem=name.slice(0,-suffix.length);
  let counter=2;
  while(used.has(name.toLowerCase()))name=stem+"-"+counter+++suffix;
  used.add(name.toLowerCase());
  result.push({name,nameBytes:encoder.encode(name),data,crc:crc32(data)});
 }
 return result;
}
export function createEggPhotosZip(cards:readonly EggPhotoCard[]):{
 blob:Blob;filenames:string[];
}{
 const entries=eggPhotosFromCards(cards);
 if(!entries.length)throw Error("В серверной копии нет фотографий для выгрузки.");
 if(entries.length>65535)throw Error("Слишком много фотографий для одного архива.");
 const chunks:BlobPart[]=[];
 const central:BlobPart[]=[];
 let offset=0,centralBytes=0;
 for(const entry of entries){
  const n=entry.nameBytes.length,bytes=entry.data.length;
  const local=new Uint8Array(30+n),v=new DataView(local.buffer);
  u32(v,0,0x04034b50);u16(v,4,20);u16(v,6,0x0800);
  u16(v,8,0);u16(v,10,0);u16(v,12,0);
  u32(v,14,entry.crc);u32(v,18,bytes);u32(v,22,bytes);
  u16(v,26,n);u16(v,28,0);
  local.set(entry.nameBytes,30);
  chunks.push(local,entry.data);
  const item=new Uint8Array(46+n),c=new DataView(item.buffer);
  u32(c,0,0x02014b50);u16(c,4,20);u16(c,6,20);
  u16(c,8,0x0800);u16(c,10,0);u16(c,12,0);u16(c,14,0);
  u32(c,16,entry.crc);u32(c,20,bytes);u32(c,24,bytes);
  u16(c,28,n);u16(c,30,0);u16(c,32,0);
  u16(c,34,0);u16(c,36,0);u32(c,38,0);
  u32(c,42,offset);item.set(entry.nameBytes,46);
  central.push(item);
  offset+=local.length+bytes;
  centralBytes+=item.length;
 }
 const end=new Uint8Array(22),v=new DataView(end.buffer);
 u32(v,0,0x06054b50);u16(v,4,0);u16(v,6,0);
 u16(v,8,entries.length);u16(v,10,entries.length);
 u32(v,12,centralBytes);u32(v,16,offset);u16(v,20,0);
 return {
  blob:new Blob([...chunks,...central,end],{type:"application/zip"}),
  filenames:entries.map(e=>e.name)
 };
}

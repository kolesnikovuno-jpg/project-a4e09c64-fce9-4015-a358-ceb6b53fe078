/** External EGG Field is inspiration/context, NEVER approved Matter or evidence.
 * The Idea AI receives only descriptions and URL metadata; it does not open
 * URLs, videos or images that have not been explicitly attached.
 */
export type EggOuterFieldCard={
 id:string;type:"thought"|"link"|"image"|"sketch"|"video";
 text:string;location?:string;sourceUrl?:string;src?:string;
};
export type EggIdeaExternalReference={
 id:string;type:EggOuterFieldCard["type"];text:string;url?:string;
};
export function buildEggIdeaExternalField(cards:readonly EggOuterFieldCard[],max=12):EggIdeaExternalReference[]{
 const unique=new Set<string>();
 const result:EggIdeaExternalReference[]=[];
 for(const c of cards){
  if(result.length>=Math.max(0,Math.min(16,Math.floor(max))))break;
  if(!c||c.location==="matter"||typeof c.id!=="string"||
    !c.id.trim()||c.id.length>120||unique.has(c.id)||
    !["thought","link","image","sketch","video"].includes(c.type))continue;
  unique.add(c.id);
  const text=(c.text||"").trim().slice(0,500)||
    (c.type==="image"?"Изображение без описания":
     c.type==="sketch"?"Скетч без описания":
     c.type==="video"?"Видео без описания":"Ссылка без описания");
  const urlCandidate=(c.sourceUrl||(c.type==="link"?c.text:"")||"").trim();
  let url:string|undefined;
  try {
   const parsed=new URL(urlCandidate);
   if(["https:","http:"].includes(parsed.protocol)&&
      !parsed.username&&!parsed.password&&parsed.hostname)url=parsed.href.slice(0,2048);
  }catch{/* Treat an unknown source as unverified metadata. */}
  result.push({id:c.id,type:c.type,text,...(url?{url}:{})});
 }
 return result;
}

/** A visible formed Idea is not the full research report.
 * Parse a clearly labeled synthesis conservatively. Never infer missing facts
 * and always retain the untouched full response in the review details.
 */
export type EggFormedIdeaView={
 idea:string;
 tension:string;
 question:string;
 fullText:string;
};
const labels=/^(?:рабочая\s+)?идея|^главное\s+напряжение|^напряжение|^вопрос/i;
export function parseEggFormedIdea(raw:string):EggFormedIdeaView{
 const fullText=(raw||"").replace(/\*\*/g,"").replace(/^\s*#{1,4}\s+/gm,"").trim();
 const marker=/^\s*((?:Рабочая\s+)?Идея|Главное\s+напряжение|Напряжение|Вопрос)\s*:\s*/gim;
 const parts:{kind:string;start:number;end:number}[]=[];
 for(const match of fullText.matchAll(marker)){
  const kind=(match[1]||"").toLowerCase();
  parts.push({kind,start:match.index??0,end:(match.index??0)+match[0].length});
 }
 const sections=new Map<string,string>();
 parts.forEach((part,i)=>{
  const text=fullText.slice(part.end,parts[i+1]?.start??fullText.length).trim();
  sections.set(part.kind,text);
 });
 let idea=sections.get("рабочая идея")||sections.get("идея")||fullText.split(/\n\s*\n/)[0]||"";
 // Text after the first complete sentence normally documents the Field
 // and source IDs, not the actual formulated Idea.
 const firstSentence=idea.match(/^([\s\S]*?[.!?])(?=\s|$)/);
 if(firstSentence)idea=firstSentence[1];
 idea=idea.replace(/\s+/g," ").trim().slice(0,500);
 const tension=(
   sections.get("главное напряжение")||sections.get("напряжение")||""
 ).split(/\n\s*\n/)[0].replace(/\s+/g," ").trim().slice(0,500);
 const question=(
   sections.get("вопрос")||""
 ).split(/\n\s*\n/)[0].split(/\nСледующий шаг:/i)[0].replace(/\s+/g," ").trim().slice(0,350);
 return {idea,tension,question,fullText};
}

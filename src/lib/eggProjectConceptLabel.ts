/**
 * Friendly, read-only label for the Author's own project list.
 * Do not rename DNA or silently approve a proposed concept.
 */
export type EggProjectConceptLabel = {
  title: string;
  status: "accepted"|"proposed";
};
export function eggProjectConceptLabel(document:{
  concepts?:Array<{text?:string;status?:string}>;
}):EggProjectConceptLabel|null{
  const available=(document.concepts??[]).filter(c=>
    (c.status==="accepted"||c.status==="proposed")&&
    typeof c.text==="string"&&c.text.trim().length>0);
  const selected=[...available].reverse().find(c=>c.status==="accepted") ??
    available.at(-1);
  if(!selected?.text)return null;
  const clean=selected.text.trim().split(/\s+[—–]\s+|\n|(?<=.{120})\./,1)[0]
    .trim().replace(/\s+/g," ");
  const title=clean.length>96?clean.slice(0,93)+"…":clean;
  return title?{title,status:selected.status as "accepted"|"proposed"}:null;
}

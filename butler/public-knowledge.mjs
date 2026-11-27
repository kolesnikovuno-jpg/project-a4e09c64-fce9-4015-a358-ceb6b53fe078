// Server-only adapter. Load records from trusted storage, never from guest input.
export function createPublicKnowledge({loadRecords}) {
 if(typeof loadRecords!=="function") throw new TypeError("Trusted loader required");
 return async function knowledge({visibility}={}) {
  if(visibility!=="public") return [];
  const records=await loadRecords();
  if(!Array.isArray(records)) throw new Error("Knowledge unavailable");
  return records.filter(r=>r && r.visibility==="public" && r.status==="approved" && r.active===true &&
   typeof r.id==="string" && Number.isInteger(r.version) && r.version>0 &&
   typeof r.source==="string" && r.source.trim() && typeof r.text==="string" && r.text.trim())
   .map(({id,version,source,text})=>({id,version,source,text}));
 };
}

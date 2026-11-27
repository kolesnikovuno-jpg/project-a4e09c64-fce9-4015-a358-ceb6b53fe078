export function createStudioKnowledgeLoader({url,key,fetchImpl=fetch}) {
 if(!url||!key) throw new Error("Missing server configuration");
 const endpoint=new URL("/rest/v1/rpc/butler_public_records",url);
 if(endpoint.protocol!=="https:") throw new Error("HTTPS required");
 return async()=>{
  const response=await fetchImpl(endpoint,{headers:{apikey:key},signal:AbortSignal.timeout(5000)});
  if(!response.ok){console.warn("butler_knowledge_http",response.status);throw new Error("Knowledge unavailable");}
  return response.json();
 };
}

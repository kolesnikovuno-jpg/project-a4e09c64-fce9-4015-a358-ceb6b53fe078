export function createOpenAIAdapter({apiKey,model,fetchImpl=fetch}) {
 if(!apiKey||!model) throw new Error("Missing server configuration");
 return async ({instructions,input})=>{
  if(typeof input!=="string"||input.length>24000) throw new Error("Input limit");
  const response=await fetchImpl("https://api.openai.com/v1/responses",{
   method:"POST",headers:{Authorization:"Bearer "+apiKey,"Content-Type":"application/json"},
   body:JSON.stringify({model,instructions,input,max_output_tokens:500,store:false}),
   signal:AbortSignal.timeout(20000)
  });
  if(!response.ok){console.warn("butler_provider_http",response.status);throw new Error("Provider unavailable");}
  const data=await response.json();
  if(data.status!=="completed") throw new Error("Incomplete response");
  const answer=(data.output??[]).filter(x=>x.type==="message").flatMap(x=>x.content??[]).filter(x=>x.type==="output_text").map(x=>x.text).join("\n");
  if(!answer.trim()) throw new Error("Empty response");
  return answer;
 };
}

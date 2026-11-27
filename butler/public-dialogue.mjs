import {createButler} from "./core.mjs";
import {createPublicKnowledge} from "./public-knowledge.mjs";
export function createPublicDialogue({loadRecords,complete,authorizeBudget}) {
 if(typeof authorizeBudget!=="function"||typeof complete!=="function") throw new TypeError("Trusted adapters required");
 const butler=createButler({knowledge:createPublicKnowledge({loadRecords}),complete:async request=>{
  if(await authorizeBudget()!==true) throw new Error("Unavailable");
  return complete(request);
 }});
 return async function dialogue(body) {
  if(!body||typeof body.message!=="string"||!body.message.trim()||body.message.length>4000) return {status:400,body:{error:"invalid_request"}};
  const locale=body.locale??"ru";
  if(!["ru","uk","en"].includes(locale)) return {status:400,body:{error:"invalid_locale"}};
  const history=body.history??[];
 if(!Array.isArray(history)||history.length>12||history.some(x=>!x||!["user","assistant"].includes(x.role)||typeof x.content!=="string"||x.content.length>2000)||JSON.stringify(history).length>12000) return {status:400,body:{error:"invalid_history"}};
 try {
   const {answer,inquiry}=await butler.dialogue({message:body.message,locale,history:history.map(({role,content})=>({role,content}))});
   if(typeof answer!=="string"||!answer.trim()) throw new Error("Unavailable");
   return {status:200,body:{answer,inquiry}};
  }catch(e){console.warn("butler_dialogue_failure");return {status:503,body:{error:"unavailable"}};}
 };
}

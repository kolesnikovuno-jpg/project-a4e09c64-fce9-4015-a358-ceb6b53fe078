/** An explicit Author-selected visual reference, not concept/DNA approval.
 * The server stores the immutable image; only this selection is browser-local.
 * Never persist signed image URLs: they expire and must be refreshed after login.
 */
export type EggIdeaVisualPin={
  projectId:string;sourceId:string;studyId:string;selectedAt:string;
};
const PREFIX="egg:idea-visual-pin:v1:";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SOURCE=/^idea:[0-9a-f]{16}$/;
export function validateEggIdeaVisualPin(raw:unknown,projectId:string):EggIdeaVisualPin|null{
 if(!raw||typeof raw!=="object"||!UUID.test(projectId))return null;
 const v=raw as Record<string,unknown>;
 if(v.projectId!==projectId||typeof v.sourceId!=="string"||!SOURCE.test(v.sourceId)||
   typeof v.studyId!=="string"||!UUID.test(v.studyId)||
   typeof v.selectedAt!=="string"||!Number.isFinite(Date.parse(v.selectedAt)))return null;
 return {projectId,sourceId:v.sourceId,studyId:v.studyId,selectedAt:v.selectedAt};
}
export function readEggIdeaVisualPin(projectId:string):EggIdeaVisualPin|null{
 try{return validateEggIdeaVisualPin(JSON.parse(localStorage.getItem(PREFIX+projectId)||"null"),projectId);}
 catch{return null;}
}
export function pinEggIdeaVisual(projectId:string,sourceId:string,studyId:string):EggIdeaVisualPin{
 const pin=validateEggIdeaVisualPin({projectId,sourceId,studyId,selectedAt:new Date().toISOString()},projectId);
 if(!pin)throw Error("invalid_idea_visual_pin");
 localStorage.setItem(PREFIX+projectId,JSON.stringify(pin));
 window.dispatchEvent(new CustomEvent("egg:idea-visual-pin",{detail:{projectId}}));
 return pin;
}
export function unpinEggIdeaVisual(projectId:string):void{
 localStorage.removeItem(PREFIX+projectId);
 window.dispatchEvent(new CustomEvent("egg:idea-visual-pin",{detail:{projectId}}));
}

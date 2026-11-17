/**
 * The Yolk has one job: present an evolving, author-linked spatial hypothesis.
 * A local Idea draft can preview the field. It cannot approve DNA, create a
 * synthesis, advance a level or inherit an unrelated project's old cycle.
 */
import type {EggProject} from "./eggEngine.js";
import {projectCompleteEggCycleToSpatial,type EggCycleSpatialProjection} from "./eggCycleSpatialProjection.js";

export type YolkLocalIdea={intent:string;savedDraft:string};
export type EggYolkFormBasis={
  text:string;
  identityText:string;
  origin:"author_idea_preview"|"server_cycle"|"project_seed"|"demo";
  synthesis:EggCycleSpatialProjection|null;
};
export function resolveEggYolkFormBasis(
  project:EggProject|null,localIdea:YolkLocalIdea|null,
  fallbackText:string,
):EggYolkFormBasis{
 const intent=localIdea?.intent?.trim()??"";
 const draft=localIdea?.savedDraft?.trim()??"";
 if(intent){
  const synthesis=project?projectCompleteEggCycleToSpatial(project,intent):null;
  return {
   // The actual Author's intention remains first. A saved AI draft is only a
   // tentative direction, not approved DNA.
   text:draft?intent+"\nРабочая гипотеза (не утверждена): "+draft:intent,
   identityText:intent,
   origin:"author_idea_preview",synthesis,
  };
 }
 const latest=(project?.flowCycles??[]).at(-1);
 const fromCycle=latest?.ideaHandoff?.intent?.trim()??"";
 if(fromCycle){
  return {text:fromCycle,identityText:fromCycle,origin:"server_cycle",
    synthesis:projectCompleteEggCycleToSpatial(project!,fromCycle)};
 }
 if(project?.seed.text.trim())return {text:project.seed.text,identityText:project.seed.text,origin:"project_seed",
  synthesis:projectCompleteEggCycleToSpatial(project)};
 return {text:fallbackText,identityText:fallbackText,origin:"demo",synthesis:null};
}

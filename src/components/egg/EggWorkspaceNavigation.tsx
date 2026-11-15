import { CircleDot, Compass, Layers, Lightbulb, Shapes } from "lucide-react";
import EggRadialMenu, { type EggMenuAction } from "./EggRadialMenu";

type Workspace = "idea" | "concept" | "yolk";
type Props = {
 active:Workspace;
 onOpenField?:()=>void;
 onOpenMatter?:()=>void;
 onOpenIdea?:()=>void;
 onOpenConcept?:()=>void;
 onOpenYolk?:()=>void;
};

/** Shared fixed circular launcher across Idea, Concept and Yolk canvases.
 * Only navigates; neither moving between canvases nor reading a draft
 * constitutes approval of DNA or advancement of an EGG maturity level.
 */
export default function EggWorkspaceNavigation({
 active,onOpenField,onOpenMatter,onOpenIdea,onOpenConcept,onOpenYolk,
}:Props){
 const actions:EggMenuAction[]=[
  {id:"field",label:"Поле",icon:Compass,onSelect:onOpenField,disabled:!onOpenField},
  {id:"matter",label:"Материальное",icon:Layers,onSelect:onOpenMatter,disabled:!onOpenMatter},
  {id:"idea",label:"Идея",icon:Lightbulb,onSelect:onOpenIdea,
   selected:active==="idea",disabled:active==="idea"||!onOpenIdea},
  {id:"concept",label:"Концепт",icon:Shapes,onSelect:onOpenConcept,
   selected:active==="concept",disabled:active==="concept"||!onOpenConcept},
  {id:"yolk",label:"Желток",icon:CircleDot,onSelect:onOpenYolk,
   selected:active==="yolk",disabled:active==="yolk"||!onOpenYolk},
 ];
 return <EggRadialMenu actions={actions} title="EGG"/>;
}

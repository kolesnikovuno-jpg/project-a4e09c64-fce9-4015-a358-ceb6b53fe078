/** A DNA reception mark must be backed by the Author-approved SERVER seed.
 * A locally reviewed candidate, external research round or pending cycle does
 * not count as delivery to Yolk. Existing synthesized visuals take precedence.
 */
import type {EggProject} from "./eggEngine.js";

export function shouldShowYolkDnaSeed(project:EggProject|null,hasCompletedSpatial:boolean):boolean{
 return Boolean(
  project?.seed?.source==="author" &&
  project.seed.text.trim() &&
  project.level===1 &&
  !hasCompletedSpatial
 );
}

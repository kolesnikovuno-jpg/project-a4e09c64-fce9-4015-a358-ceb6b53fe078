/** Immutable Author-approved snapshot at the Idea -> first-cycle boundary.
 * No file URL is fetched by EGG. Visual card references are metadata-only;
 * spatialContext is the single downsampled image explicitly approved by Author.
 */
import {z} from "zod";

const materialSchema=z.object({
 id:z.string().min(1).max(120),
 type:z.enum(["thought","link","image","sketch","video"]),
 text:z.string().trim().max(500),
 visualStatus:z.enum(["metadata_only","text"]).optional(),
}).strict();

export const eggIdeaHandoffSchema=z.object({
 intent:z.string().trim().min(1).max(3000),
 workingDna:z.string().trim().min(1).max(3000),
 constraints:z.string().trim().max(1600),
 materialInsight:z.string().trim().max(1400),
 materials:z.array(materialSchema).max(20),
 spatialContext:z.object({
  role:z.literal("spatial_context"),
  caption:z.string().trim().min(1).max(250),
  imageData:z.string().regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/).max(42000),
 }).strict().optional(),
}).strict();
export type EggIdeaHandoff=z.infer<typeof eggIdeaHandoffSchema>;

/** The text prompt sees only approved metadata; never a base64 dump.
 * The actual spatial photo, if provided, can go only through a real
 * multimodal provider call, and only to roles relevant to spatial form.
 */
export function publicEggIdeaContext(packet:EggIdeaHandoff){
 return {
  authorIntent:packet.intent,
  workingDna:packet.workingDna,
  constraints:packet.constraints||null,
  materialInsight:packet.materialInsight||null,
  materials:packet.materials.map(m=>({...m,
   interpretation:m.visualStatus==="metadata_only"
    ?"Only text/filename was transferred. The underlying image was NOT viewed.":"Author-provided textual material."})),
  spatialContext:packet.spatialContext?{
   ref:"space-context-photo",role:"spatial_context" as const,
   caption:packet.spatialContext.caption,
   imageStatus:"attached_to_spatial_spheres_only" as const,
   notice:"Existing environment photo, NOT a reference for the object's design. No measurable dimensions.",
  }:null,
 };
}

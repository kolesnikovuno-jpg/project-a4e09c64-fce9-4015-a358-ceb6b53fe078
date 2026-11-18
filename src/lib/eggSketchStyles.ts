/** Presentation of draft images, not EGG's approved Author DNA. */
export const EGG_SKETCH_IMAGE_LIMIT=8;
export const EGG_SKETCH_STYLES=[
 {id:"pencil",label:"Дизайнерский скетч"},
 {id:"line",label:"Линейный"},
 {id:"marker",label:"Маркер"},
 {id:"technical",label:"Технический"},
 {id:"volume",label:"Пластика"},
 {id:"custom",label:"Свой стиль"},
] as const;
export type EggSketchStyleId=typeof EGG_SKETCH_STYLES[number]["id"];
export function isEggSketchStyle(value:unknown):value is EggSketchStyleId{
 return typeof value==="string"&&EGG_SKETCH_STYLES.some(item=>item.id===value);
}
export function eggSketchStyleInstruction(id:EggSketchStyleId,customStyle=""):string{
 const instructions:Record<EggSketchStyleId,string>={
  pencil:"Loose professional industrial designer's graphite pencil concept sketch. Confident exploratory strokes, a few construction lines, white/off-white paper, restrained shading. NOT a polished photorealistic render.",
  line:"Clear black contour / line drawing, sparse construction strokes, white paper, no materials or photorealistic lighting.",
  marker:"Industrial design marker sketch, hand-drawn contours and restrained warm-grey marker shading; visible sketch character.",
  technical:"Simple conceptual design study with a clean silhouette and consistent construction guide lines. No invented dimensions, specs or certification.",
  volume:"Hand-drawn sculptural massing study with tonal graphite/charcoal shading, showing light, volume and negative space, not a final render.",
  custom:"Designer concept drawing. Follow the Author's presentation style, without changing the object's form merely because the style changed.",
 };
 return instructions[id]+(id==="custom"&&customStyle.trim()?
  " AUTHOR PRESENTATION STYLE: "+customStyle.trim().replace(/\s+/g," ").slice(0,200):"");
}

/**
 * EGG Yolk field prototype.
 * A continuous parametric, non-physical spatial field. The textual seed is
 * provisional until Author approves a separate DNA record. Changes following
 * a complete eight-sphere synthesis affect manifestation, never the seed.
 * No semantic understanding or AI-generated geometry is claimed here.
 */
import type {SpatialSketch,SpatialPath,SpatialQuad,Vec3} from "./eggSpatialGenerator.js";

export type EggVisualSeed={
  density:number;openness:number;verticality:number;tension:number;
  asymmetry:number;rotation:number;pulse:number;softness:number;
};
export type EggYolkFieldState={
  seed:EggVisualSeed;
  /** zero before the first full synthesis, positive afterwards */
  manifestation:number;
  variation:number;
  status:"provisional_seed"|"dna_field"|"manifested_field";
};
const clamp=(n:number)=>Math.min(1,Math.max(0,n));
function hash(text:string):number{
  let h=2166136261;
  for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);
  return h>>>0;
}
function frac(n:number){return (n>>>0)/4294967295;}
/** Test visualization only: vocabulary cues plus stable textual variation.
 * These numeric values are NOT validated measurements of the idea.
 */
export function visualSeedFromText(text:string):EggVisualSeed{
  const normalized=text.trim().toLowerCase();
  const h=hash(normalized||"egg-unapproved");
  const cue=(pattern:RegExp)=>pattern.test(normalized)?0.22:0;
  return {
    density:clamp(.32+frac(h)*.28-cue(/лёгк|легк|воздуш|эфир|прозрач|light|air/)),
    openness:clamp(.44+frac(h>>>3)*.22+cue(/открыт|сред|простран|свобод|open|space/)),
    verticality:clamp(.37+frac(h>>>7)*.32+cue(/вертик|вверх|рост|vertical/)),
    tension:clamp(.26+frac(h>>>11)*.29+cue(/напряж|контраст|резонанс|tension/)),
    asymmetry:clamp(.24+frac(h>>>15)*.34),
    rotation:clamp(.18+frac(h>>>19)*.38+cue(/движен|вращен|ритм|flow|motion/)),
    pulse:clamp(.35+frac(h>>>23)*.32),
    softness:clamp(.46+frac(h>>>5)*.25+cue(/мягк|плавн|текуч|soft|fluid/)),
  };
}
function coords(seed:EggVisualSeed,manifest:number,variation:number,u:number,v:number):Vec3{
  const phi=u*2*Math.PI;
  const theta=v*Math.PI;
  const irregular=.055+.16*seed.asymmetry;
  const ripple=Math.sin(phi*3+theta*2.2+variation)*irregular+
    Math.sin(theta*4-phi*2+variation*.35)*(.035+.055*seed.tension);
  const radius=(.50+.23*seed.openness)*(1+ripple)*(1+.16*manifest);
  const lean=(.08+.17*seed.rotation)*Math.sin(theta*1.25+variation*.2);
  const twist=(seed.rotation*.40+manifest*.19)*Math.cos(theta*1.65);
  const p=phi+twist;
  return {
    x:radius*Math.sin(theta)*Math.cos(p)+lean*(v-.5),
    y:.80+(v-.5)*(1.15+.42*seed.verticality)*(1+.10*manifest),
    z:(radius*(.74+.28*seed.softness))*Math.sin(theta)*Math.sin(p)+
      .085*seed.asymmetry*Math.sin(theta*3+variation),
  };
}
/** Same coordinates and core for both field states. A completed synthesis
 * increases structural legibility with more contour paths; never selects
 * unrelated A/B/C object families.
 */
export function buildEggYolkField(state:EggYolkFieldState):SpatialSketch{
  const manifest=clamp(state.manifestation);
  const seed=state.seed;
  const paths:SpatialPath[]=[];
  const quads:SpatialQuad[]=[];
  const rings=13,steps=54;
  const surface=(u:number,v:number)=>coords(seed,manifest,state.variation,u,v);
  for(let j=1;j<rings;j++){
    const v=j/rings;
    paths.push({
      id:"field-latitude-"+j,
      points:Array.from({length:steps+1},(_,i)=>surface(i/steps,v)),
      radius:.003+manifest*.003,
      material:manifest>.12?"frame":"guide",
    });
  }
  const meridians=9+Math.round(manifest*7);
  for(let j=0;j<meridians;j++){
    const u=j/meridians;
    paths.push({id:"field-meridian-"+j,
      points:Array.from({length:31},(_,i)=>surface(u,.035+i*.93/30)),
      radius:.003+manifest*.004,material:manifest>.35?"frame":"guide"});
  }
  // A translucent membrane is shown only after synthesis has manifested.
  if(manifest>.05){
    const slices=28,rows=13;
    for(let j=1;j<rows-1;j++){
      for(let i=0;i<slices;i++){
        if((i+j)%3!==0)continue; // Keep membrane light and porous.
        quads.push({id:"field-membrane-"+i+"-"+j,corners:[
          surface(i/slices,j/rows),surface((i+1)/slices,j/rows),
          surface((i+1)/slices,(j+1)/rows),surface(i/slices,(j+1)/rows),
        ]});
      }
    }
  }
  return {stage:manifest>.05?"volume":"gesture",variant:"A",iteration:1,paths,quads};
}

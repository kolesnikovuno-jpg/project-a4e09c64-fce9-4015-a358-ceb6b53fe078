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
  /** Stable identity of Author's original Idea, so iterative coordinates
   * move the SAME particle IDs instead of reseeding unrelated forms.
   */
  identitySeed?:EggVisualSeed;
  /** zero before the first full synthesis, positive afterwards */
  manifestation:number;
  variation:number;
  status:"provisional_seed"|"dna_field"|"manifested_field";
};
const clamp=(n:number)=>Math.min(1,Math.max(0,n));
/** Shape changes are bounded to preserve the seed's recognizable identity. */
export function blendEggYolkVisualSeed(
 base:EggVisualSeed,semantic:EggVisualSeed,weight=.62,
):EggVisualSeed{
 const keys:(keyof EggVisualSeed)[]=[
  "density","openness","verticality","tension",
  "asymmetry","rotation","pulse","softness",
 ];
 const w=Math.min(.72,Math.max(0,weight));
 return Object.fromEntries(keys.map(k=>[
  k,clamp(base[k]*(1-w)+semantic[k]*w),
 ])) as EggVisualSeed;
}
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
export type EggYolkParticle={
  id:number; position:Vec3; size:number; opacity:number;
  tone:"light"|"body"|"core";
};
export type EggYolkFieldSketch=SpatialSketch&{particles:EggYolkParticle[]};

function rng(seed:number){
  let n=seed||1;
  return ()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return (n>>>0)/4294967296;};
}
function fieldSurface(seed:EggVisualSeed,u:number,v:number):Vec3{
  // Non-regular, open lobes rather than an ellipsoid or finished object.
  const phi=u*Math.PI*2,theta=v*Math.PI;
  const knot=.22*Math.sin(phi*3+theta*2.6+seed.asymmetry*3.5);
  const waist=.78+.23*Math.cos((v-.41)*Math.PI*2)+
    .10*seed.pulse*Math.sin(v*5.5*Math.PI);
  const radius=(.57+.23*seed.openness)*Math.sin(theta)*waist*(1+knot);
  const spin=phi+seed.rotation*(v-.5)*2.2;
  return {
    x:radius*Math.cos(spin)+.18*seed.asymmetry*Math.sin(theta*2.2),
    y:.80+(v-.5)*(1.38+.30*seed.verticality)+
      .12*seed.tension*Math.cos(phi*1.8+v*4),
    z:radius*(.73+.28*seed.softness)*Math.sin(spin)+
      .12*seed.asymmetry*Math.sin(v*6+phi),
  };
}
function seedSignature(seed:EggVisualSeed):number{
  const values=[seed.density,seed.openness,seed.verticality,seed.tension,
    seed.asymmetry,seed.rotation,seed.pulse,seed.softness];
  return hash(values.map(n=>n.toFixed(5)).join("|"));
}
/**
 * Mental form = density cloud + contour attractors + localized knots.
 * The SAME particle identities and attractors persist across cycles. A full
 * synthesis only changes their positional attraction and legibility.
 * Densities are illustrative, NOT a physical or AI semantic simulation.
 */
export function buildEggYolkField(state:EggYolkFieldState):EggYolkFieldSketch{
  const m=clamp(state.manifestation);
  const seed=state.seed;
  const random=rng(seedSignature(state.identitySeed??seed));
  const particles:EggYolkParticle[]=[];
  const paths:SpatialPath[]=[];
  const quads:SpatialQuad[]=[];
  const anchors=[
    {u:.13,v:.30},{u:.65,v:.64},{u:.89,v:.46},
  ].map(a=>fieldSurface(seed,a.u,a.v));
  const total=1350;
  for(let i=0;i<total;i++){
    const a=random(),b=random(),c=random(),d=random();
    const u=a;
    const v=.06+.88*b;
    const target=fieldSurface(seed,u,v);
    let position:Vec3;
    let tone:EggYolkParticle["tone"]="body";
    let densityFactor=1;
    if(i<730){
      // Volumetric field with a biased central density and gaps/voids.
      const r=Math.pow(c,.54);
      const centerShift=(1-r)*(.055+.1*seed.tension);
      position={
        x:target.x*r+centerShift*Math.sin(v*9),
        y:target.y+(d-.5)*.20*(1-r),
        z:target.z*r+(d-.5)*.13*(1-r),
      };
      tone="light";
      densityFactor=.43+.54*(1-r);
    }else if(i<1140){
      // A soft boundary, partial but not an outlined shell.
      const r=.76+.29*c;
      position={
        x:target.x*r+(d-.5)*.09,
        y:target.y+(c-.5)*.10,
        z:target.z*r+(d-.5)*.08,
      };
      densityFactor=.44+.32*m;
    }else{
      // Strong points converge around potential material/detail nodes.
      const idx=Math.floor(a*anchors.length);
      const anchor=anchors[Math.min(idx,anchors.length-1)];
      const scatter=.23-.11*m-.045*seed.pulse;
      position={
        x:anchor.x+(b-.5)*scatter*2,
        y:anchor.y+(c-.5)*scatter*2,
        z:anchor.z+(d-.5)*scatter*2,
      };
      tone="core";
      densityFactor=.64+.34*m;
    }
    // Tangential pull toward the same latent contour as the form manifests.
    if(i<1140&&m>0){
      const pull=.10+.32*m;
      position={
        x:position.x*(1-pull)+target.x*pull,
        y:position.y*(1-pull)+target.y*pull,
        z:position.z*(1-pull)+target.z*pull,
      };
    }
    const brightness=.52+.48*random();
    const size=.65+random()*1.35+(tone==="core"?.28:0);
    const opacity=clamp((.18+brightness*.43)*densityFactor*
      (.65+.65*seed.density)+(tone==="core"?.16:.05)*m);
    particles.push({id:i,position,size,opacity,tone});
  }
  // Only a few short traces suggest form; never recreate the old wire grid.
  const traceCount=3+Math.floor(m*4);
  for(let i=0;i<traceCount;i++){
    const u=(i*.236+.12)%1;
    const v0=.13+(i%3)*.11;
    const points=Array.from({length:22},(_,j)=>
      fieldSurface(seed,u+.055*Math.sin(j/21*Math.PI),v0+j/21*.39));
    paths.push({id:"potential-contour-"+i,points,radius:.002,
      material:"guide"});
  }
  return {stage:"gesture",variant:"A",iteration:1,paths,quads,particles};
}

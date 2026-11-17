/**
 * EGG Spatial Form Engine, prototype 0.1
 *
 * Maps a complete, sourced eight-sphere morphology to stable parametric
 * geometry. It does NOT reconstruct the generated 2D image, infer hidden
 * details from photographs, assert ergonomic safety, or approve Author DNA.
 * No paid AI request and no geometry state written to the project.
 *
 * Dimensions are normalized study units. Topology and vertex IDs remain
 * stable across iterations: coefficients change the SAME seat/back/supports.
 */
import type {EggYolkMorphology} from "./eggYolkSemantic.js";
import type {SpatialSketch,SpatialPath,SpatialQuad,Vec3} from "./eggSpatialGenerator.js";

export type EggSpatialFormStudy={
  family:"chair";
  sketch:SpatialSketch;
  sourceSynthesisId:string;
  sourceResultIds:string[];
  rationale:string;
  level:number;
  iteration:number;
  status:"unapproved_parametric_hypothesis";
};
export type EggSpatialFormInput={
  intent:string;
  morphology:EggYolkMorphology|null;
  synthesisId:string|null;
  level:number;
  iteration:number;
};
const clamp=(n:number,min:number,max:number)=>Math.min(max,Math.max(min,n));
const point=(x:number,y:number,z:number):Vec3=>({x,y,z});
const ringSteps=36;
const crossSections=4;
const chairLanguage=/кресл|стул|сидень|chair|armchair|seating|seat\b/i;

/** A stable, non-random family selector. Unsupported ideas stay in the Yolk field. */
export function eggSpatialFormFamily(intent:string):"chair"|null{
 return chairLanguage.test(intent)?"chair":null;
}

export function buildEggSpatialForm(input:EggSpatialFormInput):EggSpatialFormStudy|null{
 const {morphology,synthesisId,intent}=input;
 // No independent/single-sphere source, no geometry.
 if(!morphology||!synthesisId||!morphology.sourceResultIds.length||
  eggSpatialFormFamily(intent)!=="chair")return null;
 const m=morphology.coefficients;
 const step=clamp(Math.floor(input.iteration)||1,1,99);
 const level=clamp(Math.floor(input.level)||1,1,5);
 const iterationInfluence=clamp(.72+step*.035,.72,.94);
 const width=(.48+.15*m.openness-.04*m.density)*iterationInfluence;
 const front=.50+.18*m.openness;
 const rear=-.49-.07*m.tension;
 const seatHeight=.48+.08*m.verticality;
 const backHeight=1.31+.68*m.verticality;
 const backLean=.12+.25*m.tension;
 const shellThickness=.035+.025*m.density;
 const seatThickness=.05+.025*m.density;
 const asymShift=(m.asymmetry-.5)*.16;
 const seatBow=.025+.075*m.softness;
 const backMid=(seatHeight+backHeight)*.5;
 const backHalf=(backHeight-seatHeight)*.5;
 // Aperture remains a real geometric hole: no polygons in its interior.
 const holeWidth=width*(.35+.17*m.openness);
 const holeHeight=backHalf*(.30+.17*m.openness);
 const holeY=backMid+.04*m.verticality;
 const paths:SpatialPath[]=[];
 const quads:SpatialQuad[]=[];

 const seatSurface=(u:number,v:number,bottom=false):Vec3=>{
  const x=u*width;
  const z=rear+(front-rear)*v;
  const edgeRaise=(u*u)*(.05+.055*m.tension);
  const hollow=seatBow*(1-u*u)*Math.sin(Math.PI*v);
  const rake=.04*(.45-v);
  const twist=asymShift*.15*u*v;
  return point(x,seatHeight+edgeRaise-hollow+rake+twist-(bottom?seatThickness:0),z);
 };
 const n=12;
 for(let i=0;i<n;i++)for(let j=0;j<n;j++){
  const u0=-1+2*i/n,u1=-1+2*(i+1)/n;
  const v0=j/n,v1=(j+1)/n;
  // Both sides of an open, not yet engineered chair shell.
  for(const bottom of [false,true]){
   quads.push({id:"seat-"+(bottom?"under":"upper")+"-"+i+"-"+j,corners:[
    seatSurface(u0,v0,bottom),seatSurface(u1,v0,bottom),
    seatSurface(u1,v1,bottom),seatSurface(u0,v1,bottom)
   ]});
  }
 }
 for(let i=0;i<n;i++){
  const u0=-1+2*i/n,u1=-1+2*(i+1)/n;
  for(const v of [0,1]){
   quads.push({id:"seat-edge-"+v+"-"+i,corners:[
    seatSurface(u0,v),seatSurface(u1,v),
    seatSurface(u1,v,true),seatSurface(u0,v,true),
   ]});
  }
  const v0=i/n,v1=(i+1)/n;
  for(const u of [-1,1]){
   quads.push({id:"seat-side-"+u+"-"+i,corners:[
    seatSurface(u,v0),seatSurface(u,v1),
    seatSurface(u,v1,true),seatSurface(u,v0,true),
   ]});
  }
 }

 const backZ=(x:number,y:number,behind=false):number=>
  rear-(y-seatHeight)*backLean-
  (.06+.05*m.softness)*(1-Math.pow(x/(width+.001),2))+
  .035*m.rotation*Math.sin(y*2.7)+
  (behind?shellThickness:0);

 const loopPoint=(angle:number,radius:number,behind=false):Vec3=>{
  // Radius 0 = aperture edge, 1 = outside of perforated back shell.
  // Constant topology makes the geometry evolve, rather than regenerate.
  const xOuter=width*(.83+.17*Math.sin(angle)*Math.sin(angle));
  const yOuter=backHalf*(.91+.09*Math.cos(angle)*Math.cos(angle));
  const xInner=holeWidth;
  const yInner=holeHeight;
  const x=Math.cos(angle)*(xInner*(1-radius)+xOuter*radius)+
    asymShift*Math.sin(angle)*(.5+.5*radius);
  const y=holeY+Math.sin(angle)*(yInner*(1-radius)+yOuter*radius);
  return point(x,y,backZ(x,y,behind));
 };
 for(let i=0;i<ringSteps;i++){
  const a0=i*2*Math.PI/ringSteps;
  const a1=(i+1)*2*Math.PI/ringSteps;
  for(let j=0;j<crossSections;j++){
   const r0=j/crossSections,r1=(j+1)/crossSections;
   for(const behind of [false,true]){
    quads.push({id:"back-"+(behind?"rear":"front")+"-"+i+"-"+j,corners:[
     loopPoint(a0,r0,behind),loopPoint(a1,r0,behind),
     loopPoint(a1,r1,behind),loopPoint(a0,r1,behind),
    ]});
   }
  }
  for(const edge of [0,1]){
   quads.push({id:"back-rim-"+edge+"-"+i,corners:[
    loopPoint(a0,edge),loopPoint(a1,edge),
    loopPoint(a1,edge,true),loopPoint(a0,edge,true),
   ]});
  }
 }

 // Four continuous stable support paths. They are design hypotheses, not
 // a structural or load-bearing check.
 for(const side of [-1,1]){
  const x=side*width*.76;
  paths.push({
   id:"front-support-"+side,
   material:"frame",radius:.026+.016*m.density,
   points:[
    seatSurface(side*.76,.90,true),
    point(x*1.02,seatHeight*.70,front*.90),
    point(x*1.07,seatHeight*.30,front+.10),
    point(x*1.11,.035,front+.20),
   ],
  });
  paths.push({
   id:"rear-support-"+side,
   material:"frame",radius:.027+.014*m.density,
   points:[
    seatSurface(side*.76,.12,true),
    point(x*1.03,seatHeight*.69,rear-.10),
    point(x*1.08,seatHeight*.33,rear-.21),
    point(x*1.10,.035,rear-.33),
   ],
  });
  // A legible uninterrupted plastic transition from seat to outer back.
  paths.push({
   id:"back-seat-junction-"+side,
   material:"frame",radius:.016+.008*m.softness,
   points:[
    seatSurface(side*.83,.02),
    loopPoint(side===1?.17:Math.PI-.17,.92),
    loopPoint(side===1?.40:Math.PI-.40,1),
   ],
  });
 }
 // Do not add an opaque back crossbar: the negative-space aperture matters.
 const sketch:SpatialSketch={
  stage:"volume",variant:"A",iteration:step,paths,quads,
 };
 return {
  family:"chair",sketch,
  sourceSynthesisId:synthesisId,
  sourceResultIds:[...morphology.sourceResultIds],
  rationale:morphology.rationale,level,iteration:step,
  status:"unapproved_parametric_hypothesis",
 };
}

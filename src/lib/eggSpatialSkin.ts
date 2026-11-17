/**
 * EGG sculptural continuity study for the chair family.
 *
 * Geometry, not an AI image: a stable cubic skin joins the seat's rear
 * boundary to the lower half of the perforated back shell. Four continuous
 * tapered surface sweeps meet the underside of the seat, replacing the
 * detached thin metal-looking support rods.
 *
 * Every generated quad has a permanent key. Coordinates may deform under
 * new morphology; the face graph/identities do not change per iteration.
 * Units are symbolic and no load/ergonomic claims are made.
 */
import type {SpatialQuad,Vec3} from "./eggSpatialGenerator.js";

type JoineryInput={
 quads:SpatialQuad[];
 seatSurface:(u:number,v:number,bottom?:boolean)=>Vec3;
 backLoop:(angle:number,radius:number,behind?:boolean)=>Vec3;
 width:number;
 front:number;
 rear:number;
 seatHeight:number;
 softness:number;
 tension:number;
 openness:number;
 asymmetry:number;
 density:number;
};

const clamp=(n:number,a:number,b:number)=>Math.min(b,Math.max(a,n));
const point=(x:number,y:number,z:number):Vec3=>({x,y,z});
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const smooth=(t:number)=>t*t*(3-2*t);
const bezier=(a:Vec3,b:Vec3,c:Vec3,d:Vec3,t:number):Vec3=>{
 const s=1-t,aa=s*s*s,bb=3*s*s*t,cc=3*s*t*t,dd=t*t*t;
 return point(
  aa*a.x+bb*b.x+cc*c.x+dd*d.x,
  aa*a.y+bb*b.y+cc*c.y+dd*d.y,
  aa*a.z+bb*b.z+cc*c.z+dd*d.z,
 );
};
export const CHAIR_SHELL_DIVISIONS=18;
/** Match the back-shell outer seam to a linearly sampled seat-rear boundary. */
export function chairBackAngle(index:number):number{
 const half=CHAIR_SHELL_DIVISIONS;
 if(index<=half)return Math.PI*index/half;
 const u=clamp(-1+2*(index-half)/half,-1,1);
 return Math.PI*2-Math.acos(u);
}

export function appendSculpturalChairJoinery({
 quads,seatSurface,backLoop,width,front,rear,seatHeight,
 softness,tension,openness,asymmetry,density,
}:JoineryInput):void{
 const divisions=CHAIR_SHELL_DIVISIONS;
 const crossRows=8;
 // The rearward seat transition and back shell form one continuous skin
 // along the real edge of the same annulus. Positive and negative sides
 // share their spatial boundaries; the aperture is left completely open.
 function fairing(i:number,t:number,inside:boolean):Vec3{
  const u=-1+2*i/divisions;
  const angle=chairBackAngle(divisions+i);
  const start=seatSurface(u,0,inside);
  const end=backLoop(angle,1,inside);
  const controlA=point(
   start.x*(1-.025*softness),
   start.y+.035+.022*softness,
   start.z-(.14+.10*softness),
  );
  const controlB=point(
   end.x*.98,
   end.y-(.11+.11*softness),
   end.z+(.08+.045*tension),
  );
  return bezier(start,controlA,controlB,end,t);
 }
 for(let i=0;i<divisions;i++)for(let j=0;j<crossRows;j++){
  const a=j/crossRows,b=(j+1)/crossRows;
  // The inside and outside share exactly the seam positions of seat/back.
  for(const inside of [false,true]){
   const vertices:[Vec3,Vec3,Vec3,Vec3]=[
    fairing(i,a,inside),fairing(i+1,a,inside),
    fairing(i+1,b,inside),fairing(i,b,inside),
   ];
   quads.push({
    id:"continuous-shell-"+(inside?"inside":"outside")+"-"+i+"-"+j,
    corners:inside?[vertices[0],vertices[3],vertices[2],vertices[1]]:vertices,
   });
  }
 }
 for(const i of [0,divisions])for(let j=0;j<crossRows;j++){
  const a=j/crossRows,b=(j+1)/crossRows;
  quads.push({id:"continuous-shell-edge-"+i+"-"+j,corners:[
   fairing(i,a,false),fairing(i,b,false),
   fairing(i,b,true),fairing(i,a,true),
  ]});
 }

 // Flaring shoulder/leg sweeps merge visually into the seat's underside.
 // At s=0 the ring follows the underside curvature; toward the floor it
 // becomes a narrow, continuous, gently splayed leg.
 const angular=20,vertical=12;
 for(const position of ["front","rear"] as const)for(const side of [-1,1]){
  const centerU=side*.735;
  const centerV=position==="front"?.83:.16;
  const base=seatSurface(centerU,centerV,true);
  const foot=point(
   base.x*(1.14+.09*asymmetry),
   .045,
   position==="front"?front+.18+.05*openness:rear-.26-.07*tension,
  );
  const shoulderX=width*(.20+.11*softness);
  const shoulderZ=.13+.035*softness;
  const tipX=.034+.01*density;
  const tipZ=.032+.008*density;
  function leg(s:number,angle:number):Vec3{
   const a=smooth(s);
   const x=mix(base.x,foot.x,a);
   const y=mix(base.y,foot.y,s);
   const z=mix(base.z,foot.z,.52*s+.48*a);
   const radiusFactor=1+.08*Math.sin(Math.PI*s);
   const rx=mix(shoulderX,tipX,Math.pow(s,.86))*radiusFactor;
   const rz=mix(shoulderZ,tipZ,Math.pow(s,.90))*radiusFactor;
   const px=x+rx*Math.cos(angle);
   const pz=z+rz*Math.sin(angle);
   if(s===0){
    const u=clamp(px/width,-.98,.98);
    const v=clamp((pz-rear)/(front-rear),.025,.975);
    const seat=seatSurface(u,v,true);
    return point(px,seat.y-.008,pz);
   }
   return point(px,y-.018*Math.sin(Math.PI*s)*(1-s),pz);
  }
  for(let j=0;j<vertical;j++)for(let k=0;k<angular;k++){
   const s0=j/vertical,s1=(j+1)/vertical;
   const a0=k*Math.PI*2/angular,a1=(k+1)*Math.PI*2/angular;
   quads.push({
    id:"sculptural-"+position+"-leg-"+side+"-"+j+"-"+k,
    corners:[leg(s0,a0),leg(s0,a1),leg(s1,a1),leg(s1,a0)],
   });
  }
  // A real bottom cap keeps the study's leg volume closed.
  // This cap is a shallow planar fan, not evidence of a structural foot.
  const footCenter=point(foot.x,foot.y,foot.z);
  for(let k=0;k<angular;k++){
   const a0=k*Math.PI*2/angular,a1=(k+1)*Math.PI*2/angular;
   quads.push({
    id:"sculptural-"+position+"-foot-"+side+"-"+k,
    corners:[footCenter,leg(1,a1),leg(1,a0),footCenter],
   });
  }
 }
}

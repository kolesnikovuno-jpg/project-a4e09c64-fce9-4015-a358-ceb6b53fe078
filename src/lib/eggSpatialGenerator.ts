/**
 * EGG spatial generator, prototype 1.
 * One parametric 3D source produces both the interactive spatial sketch and a
 * genuine glTF 2.0 binary GLB. Dimensions are normalized drawing units, not
 * a claim about a manufactured chair. No server-side AI or approval is implied.
 */
export type SpatialStage = "gesture" | "frame" | "volume";
export type SpatialVariant = "A" | "B" | "C";
export type Vec3 = { x: number; y: number; z: number };
export type SpatialPath = { id: string; points: Vec3[]; radius: number; material: "guide" | "frame" };
export type SpatialQuad = { id: string; corners: [Vec3, Vec3, Vec3, Vec3] };
export type SpatialSketch = {
  stage: SpatialStage;
  variant: SpatialVariant;
  iteration: number;
  paths: SpatialPath[];
  quads: SpatialQuad[];
};
const add = (a:Vec3,b:Vec3):Vec3 => ({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
const sub = (a:Vec3,b:Vec3):Vec3 => ({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const mul = (a:Vec3,n:number):Vec3 => ({x:a.x*n,y:a.y*n,z:a.z*n});
const dot = (a:Vec3,b:Vec3) => a.x*b.x+a.y*b.y+a.z*b.z;
const cross = (a:Vec3,b:Vec3):Vec3 => ({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
const unit = (a:Vec3):Vec3 => mul(a,1/Math.max(1e-9,Math.sqrt(dot(a,a))));
const clamp = (value:number,min:number,max:number) => Math.min(max,Math.max(min,value));

const CONTROL = [
  {z:1.08,y:.48},
  {z:.74,y:.56},
  {z:.18,y:.61},
  {z:-.30,y:.88},
  {z:-.61,y:1.35},
  {z:-.76,y:1.74},
];

/** A/B/C are geometry studies of ONE chair seed, not separate approved products. */
export function buildSpatialSketch(stage:SpatialStage,variant:SpatialVariant,iteration=1):SpatialSketch {
  const step=clamp(Math.floor(Number.isFinite(iteration)?iteration:1),1,99);
  const options={
    A:{width:.79,depth:1,back:1,curve:.12},
    B:{width:.70,depth:1.09,back:.89,curve:.045},
    C:{width:.85,depth:.94,back:1.08,curve:.17},
  }[variant];
  const stations=CONTROL.map((v,i)=>({
    z:v.z*options.depth,
    y:(v.y-.48)*options.back+.48+(variant==="C"?Math.sin(i/2)*.04:0),
  }));
  const point=(x:number,i:number):Vec3=>{
    const s=stations[i];
    const bow=options.curve*(1-(x/options.width)**2);
    return {x,y:s.y-bow,z:s.z};
  };
  const rails=(side:number):Vec3[]=>stations.map(s=>({x:side*options.width,y:s.y,z:s.z}));
  const paths:SpatialPath[]=[
    {id:"contour-left",points:rails(-1),radius:stage==="gesture"?.009:.028,material:stage==="gesture"?"guide":"frame"},
    {id:"contour-right",points:rails(1),radius:stage==="gesture"?.009:.028,material:stage==="gesture"?"guide":"frame"},
    {id:"central-gesture",points:stations.map((_,i)=>point(0,i)),radius:.007,material:"guide"},
  ];
  if(step>=2 || stage!=="gesture")paths.push({
    id:"edge-gesture",points:[-.75,-.375,0,.375,.75].map(n=>point(n*options.width,5)),
    radius:.007,material:"guide"
  });
  if(step>=3 || stage!=="gesture")paths.push({
    id:"seat-gesture",points:[-.75,-.375,0,.375,.75].map(n=>point(n*options.width,1)),
    radius:.006,material:"guide"
  });
  const quad:SpatialQuad[]=[];
  if(stage!=="gesture"){
    for(const side of [-1,1]){
      const x=side*options.width;
      paths.push({id:"front-leg-"+side,points:[
        {x,y:stations[0].y,z:stations[0].z},
        {x:x*1.04,y:.08,z:stations[0].z+.09},
      ],radius:.022,material:"frame"});
      paths.push({id:"rear-leg-"+side,points:[
        {x,y:stations[3].y+.15,z:stations[3].z},
        {x:x*1.04,y:.08,z:stations[4].z-.25},
      ],radius:.022,material:"frame"});
    }
    paths.push({id:"front-crossbar",points:[rails(-1)[0],rails(1)[0]],radius:.014,material:"frame"});
    paths.push({id:"back-crossbar",points:[rails(-1)[5],rails(1)[5]],radius:.014,material:"frame"});
    if(step>=2)paths.push({id:"seat-crossbar",points:[rails(-1)[2],rails(1)[2]],radius:.011,material:"frame"});
  }
  if(stage==="volume"){
    const segments=8;
    for(let i=0;i<stations.length-1;i++){
      for(let j=0;j<segments;j++){
        const x0=(-.92+(j*1.84/segments))*options.width;
        const x1=(-.92+((j+1)*1.84/segments))*options.width;
        quad.push({id:"cloth-"+i+"-"+j,corners:[
          point(x0,i),point(x1,i),point(x1,i+1),point(x0,i+1)
        ]});
      }
    }
  }
  return {stage,variant,iteration:step,paths,quads:quad};
}

type MaterialName = "guide" | "frame" | "fabric";
type MeshAccum = {points:number[];triangles:number[]};
function addVertex(mesh:MeshAccum,p:Vec3):number{
  const index=mesh.points.length/3;
  mesh.points.push(p.x,p.y,p.z);
  return index;
}
function addTube(mesh:MeshAccum,path:SpatialPath){
  const sides=8;
  for(let segment=0;segment<path.points.length-1;segment++){
    const p0=path.points[segment],p1=path.points[segment+1];
    const direction=sub(p1,p0);
    if(dot(direction,direction)<1e-12)continue;
    const axis=unit(direction);
    const reference=Math.abs(axis.y)>.91?{x:1,y:0,z:0}:{x:0,y:1,z:0};
    const across=unit(cross(axis,reference));
    const around=unit(cross(axis,across));
    const base=mesh.points.length/3;
    for(const center of [p0,p1]){
      for(let i=0;i<sides;i++){
        const angle=2*Math.PI*i/sides;
        addVertex(mesh,add(center,add(mul(across,path.radius*Math.cos(angle)),mul(around,path.radius*Math.sin(angle)))));
      }
    }
    for(let i=0;i<sides;i++){
      const next=(i+1)%sides;
      mesh.triangles.push(base+i,base+next,base+sides+i);
      mesh.triangles.push(base+next,base+sides+next,base+sides+i);
    }
  }
}
function addQuad(mesh:MeshAccum,q:SpatialQuad){
  const base=mesh.points.length/3;
  q.corners.forEach(v=>addVertex(mesh,v));
  mesh.triangles.push(base,base+1,base+2,base,base+2,base+3);
}
function pad4(n:number){return (n+3)&~3;}
function bytesFromFloat(values:number[]):Uint8Array{
  const buffer=new ArrayBuffer(values.length*4);
  const view=new DataView(buffer);
  values.forEach((v,i)=>view.setFloat32(i*4,v,true));
  return new Uint8Array(buffer);
}
function bytesFromUint(values:number[]):Uint8Array{
  const buffer=new ArrayBuffer(values.length*4);
  const view=new DataView(buffer);
  values.forEach((v,i)=>view.setUint32(i*4,v,true));
  return new Uint8Array(buffer);
}

/** Portable GLB with real triangle geometry (tube strokes and optional fabric).
 * No external dependency/network request needed to generate or download it.
 */
export function createSpatialGlb(sketch:SpatialSketch):Uint8Array{
  const meshByMaterial:Record<MaterialName,MeshAccum>={
    guide:{points:[],triangles:[]},
    frame:{points:[],triangles:[]},
    fabric:{points:[],triangles:[]},
  };
  for(const path of sketch.paths)addTube(meshByMaterial[path.material],path);
  for(const quad of sketch.quads)addQuad(meshByMaterial.fabric,quad);
  const chunks:Uint8Array[]=[];
  const bufferViews:Array<{buffer:number;byteOffset:number;byteLength:number;target:number}>=[];
  const accessors:Array<Record<string,unknown>>=[];
  const primitives:Array<{attributes:{POSITION:number};indices:number;material:number;mode:number}>=[];
  let offset=0;
  function put(bytes:Uint8Array,target:number){
    const aligned=pad4(bytes.length);
    const result=bufferViews.length;
    bufferViews.push({buffer:0,byteOffset:offset,byteLength:bytes.length,target});
    const padded=new Uint8Array(aligned);padded.set(bytes);
    chunks.push(padded);offset+=aligned;
    return result;
  }
  const palette:Record<MaterialName,[number,number,number,number]>={
    guide:[.38,.34,.28,1],frame:[.29,.25,.20,1],fabric:[.78,.72,.62,1],
  };
  const materials=(["guide","frame","fabric"] as const).map(name=>({
    name, doubleSided:true,
    pbrMetallicRoughness:{baseColorFactor:palette[name],metallicFactor:0,roughnessFactor:.92},
    ...(name==="guide"?{extensions:{KHR_materials_unlit:{}}}:{})
  }));
  (["guide","frame","fabric"] as const).forEach((name,material)=>{
    const current=meshByMaterial[name];
    if(current.points.length===0||current.triangles.length===0)return;
    const positionView=put(bytesFromFloat(current.points),34962);
    const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
    for(let i=0;i<current.points.length;i+=3)for(let k=0;k<3;k++){
      min[k]=Math.min(min[k],current.points[i+k]);
      max[k]=Math.max(max[k],current.points[i+k]);
    }
    const positionAccessor=accessors.length;
    accessors.push({bufferView:positionView,byteOffset:0,componentType:5126,count:current.points.length/3,type:"VEC3",min,max});
    const indexView=put(bytesFromUint(current.triangles),34963);
    const indexAccessor=accessors.length;
    accessors.push({bufferView:indexView,byteOffset:0,componentType:5125,count:current.triangles.length,type:"SCALAR"});
    primitives.push({attributes:{POSITION:positionAccessor},indices:indexAccessor,material,mode:4});
  });
  if(primitives.length===0)throw new Error("Пространственный эскиз не содержит экспортируемой геометрии.");
  const json={
    asset:{version:"2.0",generator:"EGG Spatial Generator 0.1"},
    extensionsUsed:["KHR_materials_unlit"],
    scene:0,
    scenes:[{nodes:[0]}],
    nodes:[{name:"EGG / author sketch",mesh:0}],
    meshes:[{name:"Spatial study · unapproved",primitives}],
    materials,
    accessors,bufferViews,buffers:[{byteLength:offset}],
    extras:{workflow:"author-sketch",approved:false,stage:sketch.stage,variant:sketch.variant,iteration:sketch.iteration,units:"normalized, not manufacturing dimensions"}
  };
  const encoded=new TextEncoder().encode(JSON.stringify(json));
  const jsonLength=pad4(encoded.length);
  const total=12+8+jsonLength+8+offset;
  const out=new Uint8Array(total);
  const header=new DataView(out.buffer);
  header.setUint32(0,0x46546C67,true); // "glTF"
  header.setUint32(4,2,true);
  header.setUint32(8,total,true);
  header.setUint32(12,jsonLength,true);
  header.setUint32(16,0x4E4F534A,true); // JSON
  out.fill(0x20,20,20+jsonLength);
  out.set(encoded,20);
  const binHead=20+jsonLength;
  header.setUint32(binHead,offset,true);
  header.setUint32(binHead+4,0x004E4942,true); // BIN\0
  let place=binHead+8;
  for(const chunk of chunks){out.set(chunk,place);place+=chunk.length;}
  return out;
}

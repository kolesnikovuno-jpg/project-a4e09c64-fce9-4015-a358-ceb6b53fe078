import {describe,expect,it} from "vitest";
import {buildEggSpatialForm,eggSpatialFormFamily} from "../../lib/eggSpatialFormEngine";
import {createSpatialGlb} from "../../lib/eggSpatialGenerator";
import type {EggYolkMorphology} from "../../lib/eggYolkSemantic";

const morphology:EggYolkMorphology={
 rationale:"Открытая скульптурная форма с вытянутой спинкой, негативным пространством и пластическим переходом от сиденья.",
 sourceResultIds:["cycle-result-design","cycle-result-production"],
 coefficients:{
  pulse:.28,density:.52,tension:.42,openness:.62,
  rotation:.20,softness:.55,asymmetry:.38,verticality:.74,
 },
};
const base={
 intent:"Кресло для рабочего пространства как арт объект — спокойный акцент",
 morphology,synthesisId:"synthesis-36",level:2,iteration:1,
};
describe("EGG Spatial Form Engine — nonbinding 3D form from a completed Yolk",()=>{
 it("requires a source synthesis, actual morphology and grounded chair intent",()=>{
  expect(eggSpatialFormFamily(base.intent)).toBe("chair");
  expect(eggSpatialFormFamily("Неутилитарная отдельная нота")).toBeNull();
  expect(buildEggSpatialForm({...base,synthesisId:null})).toBeNull();
  expect(buildEggSpatialForm({...base,morphology:null})).toBeNull();
  expect(buildEggSpatialForm({...base,intent:"Неутилитарная отдельная нота"})).toBeNull();
 });
 it("makes a spatial seat, perforated back shell and four stable supports",()=>{
  const form=buildEggSpatialForm(base);
  expect(form).not.toBeNull();
  expect(form?.sourceSynthesisId).toBe("synthesis-36");
  expect(form?.sourceResultIds).toEqual(morphology.sourceResultIds);
  expect(form?.status).toBe("unapproved_parametric_hypothesis");
  const sketch=form!.sketch;
  expect(sketch.stage).toBe("volume");
  expect(sketch.quads.filter(q=>q.id.startsWith("seat-upper-"))).toHaveLength(324);
  expect(sketch.quads.filter(q=>q.id.startsWith("back-front-"))).toHaveLength(144);
  expect(sketch.quads.filter(q=>q.id.startsWith("back-rim-0-"))).toHaveLength(36);
  expect(sketch.paths.filter(p=>p.id.startsWith("front-support-"))).toHaveLength(2);
  expect(sketch.paths.filter(p=>p.id.startsWith("rear-support-"))).toHaveLength(2);
  const vertices=sketch.quads.flatMap(q=>q.corners);
  // Leg shells are true surface geometry now; the lower extrema belong at the floor.
  expect(Math.min(...vertices.map(p=>p.y))).toBeGreaterThanOrEqual(0.04);
  expect(Math.max(...vertices.map(p=>p.y))).toBeGreaterThan(1.5);
  expect(sketch.paths.some(p=>p.points.some(v=>v.y<.04))).toBe(true);
  expect(vertices.every(v=>Number.isFinite(v.x)&&Number.isFinite(v.y)&&Number.isFinite(v.z))).toBe(true);
 });
 it("joins seat rear to back shell with a continuous real fairing instead of floating back rails",()=>{
  const sketch=buildEggSpatialForm(base)!.sketch;
  const byId=new Map(sketch.quads.map(q=>[q.id,q]));
  expect(sketch.quads.filter(q=>q.id.startsWith("continuous-shell-outside-"))).toHaveLength(144);
  expect(sketch.quads.filter(q=>q.id.startsWith("continuous-shell-inside-"))).toHaveLength(144);
  expect(sketch.quads.filter(q=>q.id.startsWith("sculptural-front-leg-"))).toHaveLength(480);
  expect(sketch.quads.filter(q=>q.id.startsWith("sculptural-rear-leg-"))).toHaveLength(480);
  expect(sketch.quads.filter(q=>q.id.startsWith("sculptural-")&&q.id.includes("-foot-"))).toHaveLength(80);
  // Left seam of the saddle touches EXACTLY the rear seat surface;
  // its top edge touches the same annular back surface at the same vertices.
  for(let i=0;i<18;i++){
   const fairingStart=byId.get("continuous-shell-outside-"+i+"-0")!;
   const seat=byId.get("seat-upper-"+i+"-0")!;
   expect(fairingStart.corners[0]).toEqual(seat.corners[0]);
   const fairingEnd=byId.get("continuous-shell-outside-"+i+"-7")!;
   const back=byId.get("back-front-"+(18+i)+"-3")!;
   expect(fairingEnd.corners[3]).toEqual(back.corners[1]);
  }
  expect(byId.has("seat-edge-0-0")).toBe(false);
  expect(byId.has("back-rim-1-18")).toBe(false);
  expect(byId.has("back-rim-0-18")).toBe(true); // inner aperture remains a real hole
  expect(sketch.paths.every(path=>path.material==="guide")).toBe(true);
 });
 it("evolves the SAME surface topology instead of randomizing a new model",()=>{
  const original=buildEggSpatialForm(base)!.sketch;
  const evolved=buildEggSpatialForm({
   ...base,iteration:2,morphology:{
    ...morphology,coefficients:{...morphology.coefficients,verticality:.90,openness:.79},
   },
  })!.sketch;
  expect(evolved.paths.map(p=>p.id)).toEqual(original.paths.map(p=>p.id));
  expect(evolved.quads.map(q=>q.id)).toEqual(original.quads.map(q=>q.id));
  expect(evolved.quads[0].corners).not.toEqual(original.quads[0].corners);
  expect(buildEggSpatialForm(base)!.sketch).toEqual(original);
  // This stage generates geometry without making an API call, deleting a
  // previous image or approving the project's DNA.
 });
 it("responds to every one of the eight Yolk morphology parameters without re-seeding geometry",()=>{
  const original=buildEggSpatialForm(base)!.sketch;
  const keys=Object.keys(morphology.coefficients) as Array<keyof typeof morphology.coefficients>;
  expect(keys).toHaveLength(8);
  for(const key of keys){
   const changed=buildEggSpatialForm({...base,morphology:{
    ...morphology,coefficients:{
     ...morphology.coefficients,[key]:Math.min(.99,morphology.coefficients[key]+.12),
    },
   }})!.sketch;
   expect(changed.quads.map(q=>q.id)).toEqual(original.quads.map(q=>q.id));
   expect(changed.quads.some((q,i)=>q.corners.some((p,j)=>{
    const prev=original.quads[i].corners[j];
    return Math.abs(p.x-prev.x)+Math.abs(p.y-prev.y)+Math.abs(p.z-prev.z)>1e-6;
   })),key).toBe(true);
  }
 });
 it("exports a genuine triangulated glTF 2.0 GLB from the same geometry",()=>{
  const form=buildEggSpatialForm(base)!;
  const bytes=createSpatialGlb(form.sketch,{
   projectId:"c68166a9-df94-4118-b2aa-b3d8d71dea18",
   sourceSynthesisId:form.sourceSynthesisId,
   sourceResultIds:form.sourceResultIds,
   origin:"egg_morphology_parametric_prototype",
  });
  const header=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  expect(header.getUint32(0,true)).toBe(0x46546c67);
  expect(header.getUint32(4,true)).toBe(2);
  expect(header.getUint32(8,true)).toBe(bytes.length);
  const jsonLength=header.getUint32(12,true);
  const jsonText=new TextDecoder().decode(bytes.slice(20,20+jsonLength)).trim();
  const gltf=JSON.parse(jsonText);
  expect(gltf.asset.version).toBe("2.0");
  expect(gltf.meshes[0].primitives.length).toBeGreaterThan(0);
  // GLB now contains one smoothly shaded sculptural surface, no detached dark rods.
  const primitive=gltf.meshes[0].primitives[0];
  expect(gltf.meshes[0].primitives).toHaveLength(1);
  expect(primitive.material).toBe(2);
  expect(primitive.attributes.NORMAL).toBeTypeOf("number");
  expect(gltf.accessors[primitive.attributes.POSITION].count)
   .toBe(gltf.accessors[primitive.attributes.NORMAL].count);
  expect(gltf.accessors[primitive.attributes.POSITION].count)
   .toBeLessThan(form.sketch.quads.length*4);
  expect(gltf.accessors.some((a:{type:string})=>a.type==="VEC3")).toBe(true);
  expect(gltf.accessors.some((a:{type:string})=>a.type==="SCALAR")).toBe(true);
  expect(gltf.extras.approved).toBe(false);
  expect(gltf.extras.units).toContain("not manufacturing");
  expect(gltf.extras.source.origin).toBe("egg_morphology_parametric_prototype");
  expect(gltf.extras.source.sourceSynthesisId).toBe("synthesis-36");
  expect(gltf.extras.source.sourceResultIds).toEqual(morphology.sourceResultIds);
  expect(gltf.extras.source.projectId).toBe("c68166a9-df94-4118-b2aa-b3d8d71dea18");
 });
});

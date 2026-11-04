import { describe, expect, it } from "vitest";
import { buildSpatialSketch, createSpatialGlb } from "../../lib/eggSpatialGenerator";

function inspectGlb(file:Uint8Array){
  const view=new DataView(file.buffer,file.byteOffset,file.byteLength);
  const jsonSize=view.getUint32(12,true);
  const jsonString=new TextDecoder().decode(file.subarray(20,20+jsonSize)).trim();
  const json=JSON.parse(jsonString);
  const binaryHeader=20+jsonSize;
  return {view,json,binaryHeader};
}
describe("EGG spatial generator · real geometric GLB",()=>{
  it("starts with only a handful of real 3D curves at the gesture stage",()=>{
    const sketch=buildSpatialSketch("gesture","A",1);
    expect(sketch.stage).toBe("gesture");
    expect(sketch.paths).toHaveLength(3);
    expect(sketch.quads).toHaveLength(0);
    expect(sketch.paths.every(path=>path.points.length>=2)).toBe(true);
    expect(sketch.paths.every(path=>path.points.some(p=>p.z!==0))).toBe(true);
  });
  it("grows geometrical detail without pretending to change the accepted concept",()=>{
    const gesture=buildSpatialSketch("gesture","A",1);
    const frame=buildSpatialSketch("frame","A",2);
    const volume=buildSpatialSketch("volume","A",3);
    expect(frame.paths.length).toBeGreaterThan(gesture.paths.length);
    expect(volume.quads.length).toBeGreaterThan(0);
    expect(volume.paths.length).toBeGreaterThan(frame.paths.length);
    const alternate=buildSpatialSketch("gesture","B",1);
    expect(alternate.paths[0].points[0].x).not.toBe(gesture.paths[0].points[0].x);
  });
  for(const stage of ["gesture","frame","volume"] as const){
    it("exports "+stage+" as a structurally consistent GLB v2 with triangle primitives",()=>{
      const data=createSpatialGlb(buildSpatialSketch(stage,"C",4));
      const {view,json,binaryHeader}=inspectGlb(data);
      expect(view.getUint32(0,true)).toBe(0x46546C67);
      expect(view.getUint32(4,true)).toBe(2);
      expect(view.getUint32(8,true)).toBe(data.byteLength);
      expect(view.getUint32(16,true)).toBe(0x4E4F534A);
      expect(view.getUint32(binaryHeader+4,true)).toBe(0x004E4942);
      expect(json.asset.version).toBe("2.0");
      expect(json.extras.approved).toBe(false);
      expect(json.extras.stage).toBe(stage);
      expect(json.buffers[0].byteLength).toBe(view.getUint32(binaryHeader,true));
      expect(binaryHeader+8+json.buffers[0].byteLength).toBe(data.byteLength);
      expect(json.meshes[0].primitives.length).toBeGreaterThan(0);
      for(const primitive of json.meshes[0].primitives){
        expect(primitive.mode).toBe(4);
        const pos=json.accessors[primitive.attributes.POSITION];
        const idx=json.accessors[primitive.indices];
        expect(pos.count).toBeGreaterThan(0);
        expect(idx.count%3).toBe(0);
        expect(json.bufferViews[pos.bufferView].byteOffset%4).toBe(0);
        expect(json.bufferViews[idx.bufferView].byteOffset%4).toBe(0);
      }
    });
  }
});

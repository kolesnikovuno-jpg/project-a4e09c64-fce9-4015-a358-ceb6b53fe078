import {describe,expect,it} from "vitest";
import {eggIdeaFormSourceId,normalizeEggIdeaFormSource} from "../../lib/eggIdeaFormSource";
import {EGG_SKETCH_STYLES,eggSketchStyleInstruction,isEggSketchStyle} from "../../lib/eggSketchStyles";
describe("EGG sketch-first",()=>{
 it("offers pencil first and custom rendering without redefinition of form",()=>{
  expect(EGG_SKETCH_STYLES[0].id).toBe("pencil");
  expect(eggSketchStyleInstruction("pencil")).toContain("industrial designer");
  expect(eggSketchStyleInstruction("custom","ink and graphite")).toContain("ink and graphite");
  expect(isEggSketchStyle("marker")).toBe(true);
  expect(isEggSketchStyle("unsupported")).toBe(false);
 });
 it("preserves hashes of earlier Idea versions and distinguishes a new source image",()=>{
  const old={intent:"A sculptural chair with a hole in the back",constraints:"",
   draft:"",materialInsight:"",materials:[],spacePhoto:"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ"};
  expect(eggIdeaFormSourceId(normalizeEggIdeaFormSource(old))).toBe(eggIdeaFormSourceId(old));
  expect(eggIdeaFormSourceId(old)).not.toBe(eggIdeaFormSourceId({
   ...old,formReference:"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ",
  }));
 });
});

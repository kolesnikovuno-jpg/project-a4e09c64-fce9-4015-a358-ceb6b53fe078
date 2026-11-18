import {afterEach,describe,expect,it,vi} from "vitest";
import {pinEggIdeaVisual,readEggIdeaVisualPin,unpinEggIdeaVisual,
 validateEggIdeaVisualPin} from "../../lib/eggIdeaVisualPin";
const project="01b3d29f-bfc4-41ed-b31a-2e0db7fa2fe9";
const other="14b422a1-0c66-4d6d-8f01-10e642991e77";
const source="idea:1234567890abcdef";
const study="b318b752-d77c-4970-b8f8-fe60329b8707";
afterEach(()=>{localStorage.clear();vi.restoreAllMocks();});
describe("Author's selected Yolk sketch",()=>{
 it("stores only a scoped image identity, not an expiring signed URL",()=>{
  const pin=pinEggIdeaVisual(project,source,study);
  expect(pin).toMatchObject({projectId:project,sourceId:source,studyId:study});
  expect(readEggIdeaVisualPin(project)).toEqual(pin);
  expect(JSON.stringify(pin)).not.toContain("imageUrl");
  expect(readEggIdeaVisualPin(other)).toBeNull();
 });
 it("never accepts a sketch from another project or an unverified id",()=>{
  const pin=pinEggIdeaVisual(project,source,study);
  expect(validateEggIdeaVisualPin(pin,other)).toBeNull();
  expect(validateEggIdeaVisualPin({...pin,studyId:"invalid"},project)).toBeNull();
  expect(validateEggIdeaVisualPin({...pin,sourceId:"cycle:abc"},project)).toBeNull();
 });
 it("can reverse the Author's choice without changing project state",()=>{
  pinEggIdeaVisual(project,source,study);
  unpinEggIdeaVisual(project);
  expect(readEggIdeaVisualPin(project)).toBeNull();
 });
});

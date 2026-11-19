import {describe,expect,it} from "vitest";
import {eggStudioEntryUrl} from "../pages/EggGate";

const project="01b3d29f-bfc4-41ed-b31a-2e0db7fa2fe9";
describe("Studio entry to canonical EGG",()=>{
 it("opens the real EGG account, not the obsolete local demo",()=>{
  expect(eggStudioEntryUrl("")).toBe("https://egg.kolesnikov.studio/egg/connect");
  expect(eggStudioEntryUrl("?start=field")).toBe("https://egg.kolesnikov.studio/egg/connect");
 });
 it("retains a valid project across the studio's password and EGG's own login",()=>{
  const target=new URL(eggStudioEntryUrl("?project="+project+"&start=idea"));
  expect(target.origin).toBe("https://egg.kolesnikov.studio");
  expect(target.pathname).toBe("/egg/connect");
  expect(target.searchParams.get("returnProject")).toBe(project);
  expect(target.searchParams.get("start")).toBe("idea");
 });
 it("does not forward an arbitrary URL or invalid project id",()=>{
  expect(eggStudioEntryUrl("?project=https%3A%2F%2Fevil.invalid")).toBe("https://egg.kolesnikov.studio/egg/connect");
  expect(eggStudioEntryUrl("?project="+project+"&start=https://evil.invalid")).toContain("start=author");
 });
});

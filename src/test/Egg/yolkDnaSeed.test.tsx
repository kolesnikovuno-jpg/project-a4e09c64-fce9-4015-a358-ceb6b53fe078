// @vitest-environment jsdom
import {afterEach,describe,expect,it} from "vitest";
import {cleanup,render,screen} from "@testing-library/react";
import {createEggProject,recordAuthorSeed} from "../../lib/eggEngine";
import {shouldShowYolkDnaSeed} from "../../lib/eggYolkDnaSeed";
import EggYolkDnaSeed from "../../components/egg/EggYolkDnaSeed";

afterEach(cleanup);
const id="01b3d29f-bfc4-41ed-b31a-2e0db7fa2fe9";
const date="2026-11-20T12:00:00Z";

describe("Yolk DNA reception is factual, not a local visual hypothesis",()=>{
 it("does not signal receipt for an unapproved Idea",()=>{
  const project=createEggProject({id,title:"Текущий замысел",at:date});
  expect(shouldShowYolkDnaSeed(project,false)).toBe(false);
  expect(shouldShowYolkDnaSeed(null,false)).toBe(false);
 });
 it("signals receipt only after the Author-approved server seed is recorded",()=>{
  const initial=createEggProject({id,title:"Текущий замысел",at:date});
  const accepted=recordAuthorSeed(initial,
   "Функция опоры и художественный образ рождаются из единого принципа",date);
  expect(accepted.seed.source).toBe("author");
  expect(shouldShowYolkDnaSeed(accepted,false)).toBe(true);
  // A completed research synthesis already has its own Yolk visual.
  expect(shouldShowYolkDnaSeed(accepted,true)).toBe(false);
  expect(shouldShowYolkDnaSeed({...accepted,level:2},false)).toBe(false);
 });
 it("renders only the animated small egg, without claiming an object model",()=>{
  render(<EggYolkDnaSeed/>);
  expect(screen.getByTestId("yolk-dna-received")).toBeTruthy();
  expect(screen.getByText("ДНК получена")).toBeTruthy();
  expect(screen.getByText(/форма ещё не определена/)).toBeTruthy();
  expect(screen.getByRole("img",{name:/Зерно ДНК/})).toBeTruthy();
  expect(screen.queryByTestId("yolk-viewer")).toBeNull();
 });
});

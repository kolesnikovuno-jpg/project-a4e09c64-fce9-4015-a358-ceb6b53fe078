// @vitest-environment jsdom
import {afterEach,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen} from "@testing-library/react";
import UnoEggScene from "../../components/unocalc/UnoEggScene";
import {EGG_STAGES} from "../../lib/unocalcEggStages";
import {eggFormationStageNodes} from "../../lib/unocalcEgg3d";

afterEach(cleanup);

describe("EGG interactive console",()=>{
 it("uses the Egg spheres themselves as direct panel selectors in project mode",()=>{
  const onSphereOpen=vi.fn(),onIdeaOpen=vi.fn(),onConceptOpen=vi.fn(),onYolkOpen=vi.fn();
  render(<UnoEggScene locale="ru" onSphereOpen={onSphereOpen}
   onIdeaOpen={onIdeaOpen} onConceptOpen={onConceptOpen} onYolkOpen={onYolkOpen}/>);
  fireEvent.click(screen.getByTestId("unocalc-marketing-hit"));
  expect(onSphereOpen).toHaveBeenCalledWith("marketing");
  fireEvent.click(screen.getByTestId("unocalc-design-hit"));
  expect(onSphereOpen).toHaveBeenCalledWith("design");
  fireEvent.click(screen.getByTestId("unocalc-author-hit"));
  expect(onIdeaOpen).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByTestId("unocalc-idea-hit"));
  expect(onConceptOpen).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByTestId("unocalc-yolk-hit"));
  expect(onYolkOpen).toHaveBeenCalledTimes(1);
 });
 it("renders one larger outline centered on the actual yellow level-two sphere",()=>{
  render(<UnoEggScene locale="ru" onYolkOpen={()=>{}}/>);
  const group=screen.getByTestId("unocalc-yolk-sphere");
  const outline=screen.getByTestId("unocalc-yolk-outline");
  const hit=screen.getByTestId("unocalc-yolk-hit");
  const expected=eggFormationStageNodes({yaw:0,tilt:0}).find(
   point=>EGG_STAGES[point.index-1].index===2
  );
  expect(expected).toBeDefined();
  expect(outline.getAttribute("fill")).toBe("none");
  expect(Number(outline.getAttribute("r"))).toBeGreaterThan(47);
  expect(Number(outline.getAttribute("cx"))).toBeCloseTo(expected!.x,5);
  expect(Number(outline.getAttribute("cy"))).toBeCloseTo(expected!.y,5);
  expect(hit.getAttribute("cx")).toBe(outline.getAttribute("cx"));
  expect(hit.getAttribute("cy")).toBe(outline.getAttribute("cy"));
  expect(group.querySelectorAll("circle")).toHaveLength(2);
  expect(group.querySelector("text")).toBeNull();
 });
});

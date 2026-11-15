import {afterEach,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen} from "@testing-library/react";
import UnoEggScene from "@/components/unocalc/UnoEggScene";

afterEach(()=>{cleanup();localStorage.clear();});

describe("EGG temporary central Yolk entry",()=>{
 it("is a translucent separate navigable center only in real EGG project mode",()=>{
  const onYolkOpen=vi.fn();
  const {rerender}=render(<UnoEggScene locale="ru" onYolkOpen={onYolkOpen}/>);
  const yolk=screen.getByTestId("unocalc-yolk-sphere");
  expect(yolk.querySelector('circle[fill="url(#egg-temporary-yolk-light)"]')).toBeTruthy();
  const hit=screen.getByTestId("unocalc-yolk-hit");
  expect(hit.getAttribute("aria-label")).toBe("Открыть Желток");
  expect(hit.getAttribute("data-egg-node")).toBe("yolk");
  fireEvent.click(hit);
  expect(onYolkOpen).toHaveBeenCalledTimes(1);
  rerender(<UnoEggScene locale="ru"/>);
  expect(screen.queryByTestId("unocalc-yolk-sphere")).toBeNull();
 });
 it("handles a touch-like pointer activation once and supports keyboard navigation",()=>{
  const onYolkOpen=vi.fn();
  render(<UnoEggScene locale="ru" onYolkOpen={onYolkOpen}/>);
  const hit=screen.getByTestId("unocalc-yolk-hit");
  const svg=screen.getByTestId("unocalc-egg-svg");
  fireEvent.pointerDown(hit,{pointerId:11,clientX:380,clientY:350,pointerType:"touch"});
  fireEvent.pointerUp(svg,{pointerId:11,clientX:380,clientY:350,pointerType:"touch"});
  fireEvent.click(hit);
  expect(onYolkOpen).toHaveBeenCalledTimes(1);
  fireEvent.keyDown(hit,{key:"Enter"});
  expect(onYolkOpen).toHaveBeenCalledTimes(2);
 });
});

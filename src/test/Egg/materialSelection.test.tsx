import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import EggProjectField from "@/components/egg/EggProjectField";

const key="egg:project-field:v1:selection-test";
function Workspace({projectId="selection-test"}:{projectId?:string}){
 const [workspace,setWorkspace]=useState<"field"|"matter">("field");
 return <EggProjectField projectId={projectId} workspace={workspace} onWorkspaceChange={setWorkspace}><div>Egg</div></EggProjectField>;
}
function switchWorkspace(name:string){
 fireEvent.click(screen.getByRole("button",{name:"Открыть круговое меню"}));
 fireEvent.click(screen.getByRole("button",{name}));
}
afterEach(()=>{cleanup();localStorage.clear();vi.restoreAllMocks();});
describe("Field material selection",()=>{
 it.each([
  {type:"thought",text:"Observation"},
  {type:"image",text:"Reference",src:"data:image/png;base64,eA=="},
  {type:"link",text:"https://example.com"},
  {type:"sketch",text:"Sketch",strokes:[{color:"#000",strokeWidth:2,points:[{x:1,y:1},{x:8,y:8}]}]},
  {type:"video",text:"Video",mediaId:"existing-video"},
 ])("moves $type without duplication, survives reload, and returns to its original position",payload=>{
  const original={id:"source",x:410,y:80,...payload};
  localStorage.setItem(key,JSON.stringify([original]));
  const view=render(<Workspace/>);
  fireEvent.click(screen.getByRole("button",{name:"В работу"}));
  expect(view.container.querySelector('[data-field-item="source"]')).toBeNull();
  const selected=JSON.parse(localStorage.getItem(key)!);
  expect(selected).toHaveLength(1);
  expect(selected[0]).toMatchObject({...payload,id:"source",location:"matter",fieldPosition:{x:410,y:80}});
  view.unmount();
  const next=render(<Workspace/>);
  expect(next.container.querySelector('[data-field-item="source"]')).toBeNull();
  switchWorkspace("Материальное");
  expect(next.container.querySelector('[data-field-item="source"]')).toBeTruthy();
  fireEvent.click(screen.getByRole("button",{name:"Вернуть в общее поле"}));
  expect(next.container.querySelector('[data-field-item="source"]')).toBeNull();
  switchWorkspace("Общее поле");
  expect(next.container.querySelector('[data-field-item="source"]')).toBeTruthy();
  expect(JSON.parse(localStorage.getItem(key)!)).toEqual([expect.objectContaining({...original,location:"field"})]);
 });
 it("does not block a transfer when browser storage is full and shows a clear warning",()=>{
  localStorage.setItem(key,JSON.stringify([{id:"source",type:"thought",text:"Keep me",x:0,y:0}]));
  const view=render(<Workspace/>);
  vi.spyOn(Storage.prototype,"setItem").mockImplementation(()=>{throw new Error("quota");});
  fireEvent.click(screen.getByRole("button",{name:"В работу"}));
  expect(view.container.querySelector('[data-field-item="source"]')).toBeNull();
  expect(screen.getByTestId("egg-field-transfer-feedback").textContent)
   .toContain("Память браузера заполнена");
  fireEvent.click(screen.getByRole("button",{name:"Открыть Материальное"}));
  expect(view.container.querySelector('[data-field-item="source"]')).not.toBeNull();
 });
 it("does not overwrite another project's board when the project changes",()=>{
  localStorage.setItem(key,JSON.stringify([{id:"a",type:"thought",text:"A",x:0,y:0}]));
  const otherKey="egg:project-field:v1:other";
  const other=[{id:"b",type:"thought",text:"B",x:10,y:10,location:"matter"}];
  localStorage.setItem(otherKey,JSON.stringify(other));
  const view=render(<Workspace/>);
  view.rerender(<Workspace projectId="other"/>);
  expect(JSON.parse(localStorage.getItem(otherKey)!)).toEqual(other);
  expect(JSON.parse(localStorage.getItem(key)!)[0].id).toBe("a");
 });
});

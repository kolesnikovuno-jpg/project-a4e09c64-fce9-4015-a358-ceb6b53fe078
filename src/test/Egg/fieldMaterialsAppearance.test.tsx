import { fireEvent, render, screen, within, waitFor, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import EggProjectField from "@/components/egg/EggProjectField";

afterEach(()=>{cleanup();vi.restoreAllMocks();localStorage.clear();});
describe("EGG field material appearance", () => {
  it("renders image, note and sketch without card frames and with overlay round controls", async () => {
    const projectId="field-cards-borderless-test";
    window.localStorage.setItem("egg:project-field:v1:"+projectId, JSON.stringify([
      {id:"photo1",type:"image",x:100,y:80,text:"Референс",src:"data:image/png;base64,iVBORw0KGgo="},
      {id:"note1",type:"thought",x:300,y:180,text:"Свет и ощущение пространства"},
      {id:"sketch1",type:"sketch",x:200,y:300,text:"Скетч",strokes:[{points:[{x:1,y:2},{x:50,y:30}],strokeWidth:1,color:"#252525"}]},
    ]));
    const {container}=render(<EggProjectField projectId={projectId}><span>EGG scene</span></EggProjectField>);
    expect(screen.queryByLabelText("Перетащить материал")).toBeNull();
    const itemElements=Array.from(container.querySelectorAll("[data-field-item]"));
    expect(itemElements).toHaveLength(3);
    expect(itemElements.every(item=>item.className.includes("cursor-grab"))).toBe(true);
    for(const card of itemElements){
      expect(card.className).not.toMatch(/\bborder(?:-|\/|\b)/);
      expect(card.querySelector("[data-field-actions]")).not.toBeNull();
      expect(within(card as HTMLElement).getByRole("button",{name:"Развернуть элемент"})).toBeTruthy();
      expect(within(card as HTMLElement).getByRole("button",{name:"Удалить элемент"})).toBeTruthy();
    }
    const photo=screen.getByAltText("Референс");
    expect(photo.closest("button")).toBeNull();
    expect(photo.getAttribute("draggable")).toBe("false");
    fireEvent.click(within(itemElements[0] as HTMLElement).getByRole("button",{name:"Развернуть элемент"}));
    expect(screen.getByTestId("egg-photo-workspace")).toBeTruthy();
    expect(container.querySelector(".bg-black\\/65")).toBeNull();
  });
  it("accepts a large image into Material even when Safari localStorage is full",async()=>{
    const projectId="field-move-quota-test";
    const onWorkspaceChange=vi.fn();
    // Two images plus other workspace data may make a redundant full-board
    // localStorage write fail. Accept must still transfer the state.
    localStorage.setItem("egg:project-field:v1:"+projectId,JSON.stringify([
      {id:"image1",type:"image",x:20,y:30,text:"Референс 1",
       src:"data:image/jpeg;base64,"+"A".repeat(70000)},
      {id:"image2",type:"image",x:80,y:60,text:"Референс 2",
       src:"data:image/jpeg;base64,"+"B".repeat(70000)},
    ]));
    const {container,rerender}=render(<EggProjectField projectId={projectId}
     workspace="field" onWorkspaceChange={onWorkspaceChange}><span>EGG</span></EggProjectField>);
    expect(container.querySelectorAll("[data-field-item]")).toHaveLength(2);
    const setItem=vi.spyOn(Storage.prototype,"setItem").mockImplementation(()=>{
      throw new DOMException("Quota exceeded","QuotaExceededError");
    });
    const image1=container.querySelector('[data-field-item="image1"]') as HTMLElement;
    fireEvent.click(within(image1).getByRole("button",{name:"В работу"}));
    // Previously this would silently return before setItems and leave image1.
    await waitFor(()=>expect(container.querySelector('[data-field-item="image1"]')).toBeNull());
    expect(container.querySelector('[data-field-item="image2"]')).not.toBeNull();
    // A browser cache quota failure must not mask the actual transfer result.
    // The independent server sync indicator reports persistence errors.
    expect(screen.getByTestId("egg-field-transfer-feedback").textContent)
     .toContain("Перенесено в Материальное");
    expect(screen.getByTestId("egg-field-transfer-feedback").textContent)
     .not.toContain("Память браузера заполнена");
    expect(screen.getByTestId("egg-workspace-sync-field")).toBeTruthy();
    const open=screen.getByRole("button",{name:"Открыть Материальное"});
    fireEvent.click(open);
    expect(onWorkspaceChange).toHaveBeenCalledWith("matter");
    // Parent navigation switches the workspace while preserving the same items.
    rerender(<EggProjectField projectId={projectId} workspace="matter"
      onWorkspaceChange={onWorkspaceChange}><span>EGG</span></EggProjectField>);
    expect(container.querySelector('[data-field-item="image1"]')).not.toBeNull();
    expect(container.querySelector('[data-field-item="image2"]')).toBeNull();
    setItem.mockRestore();
  });
});

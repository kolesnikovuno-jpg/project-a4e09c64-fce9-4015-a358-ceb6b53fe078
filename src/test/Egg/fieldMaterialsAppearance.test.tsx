import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import EggProjectField from "@/components/egg/EggProjectField";

describe("EGG field material appearance", () => {
  it("renders image, note and sketch without card frames and with overlay round controls", async () => {
    const projectId="field-cards-borderless-test";
    window.localStorage.setItem("egg:project-field:v1:"+projectId, JSON.stringify([
      {id:"photo1",type:"image",x:100,y:80,text:"Референс",src:"data:image/png;base64,iVBORw0KGgo="},
      {id:"note1",type:"thought",x:300,y:180,text:"Свет и ощущение пространства"},
      {id:"sketch1",type:"sketch",x:200,y:300,text:"Скетч",strokes:[{points:[{x:1,y:2},{x:50,y:30}],strokeWidth:1,color:"#252525"}]},
    ]));
    const {container}=render(<EggProjectField projectId={projectId}><span>EGG scene</span></EggProjectField>);
    const cards=await screen.findAllByLabelText("Перетащить материал");
    expect(cards).toHaveLength(3);
    const itemElements=Array.from(container.querySelectorAll("[data-field-item]"));
    expect(itemElements).toHaveLength(3);
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
});

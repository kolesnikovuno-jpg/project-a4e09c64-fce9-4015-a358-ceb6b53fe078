// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import EggYolkExperience, { YOLK_SPHERES } from "../components/egg/EggYolkExperience";

afterEach(cleanup);

function show(){
  return render(<MemoryRouter initialEntries={["/egg/yolk"]}><EggYolkExperience /></MemoryRouter>);
}

describe("EGG Yolk: match the main Egg visual system",()=>{
  it("shows an enlarged central object, eight contour sphere controls and a truthful demo label",()=>{
    show();
    expect(screen.getByTestId("yolk-experience")).toBeTruthy();
    expect(screen.getByTestId("yolk-orbit-stage")).toBeTruthy();
    expect(screen.getByTestId("yolk-central-object")).toBeTruthy();
    expect(screen.getByTestId("yolk-viewer")).toBeTruthy();
    expect(screen.getByText(/Демонстрация · кресло/)).toBeTruthy();
    expect(YOLK_SPHERES).toHaveLength(8);
    for(const sphere of YOLK_SPHERES){
      const control=screen.getByTestId("yolk-orbit-"+sphere.id);
      expect(control.getAttribute("role")).toBe("button");
      expect(control.getAttribute("aria-pressed")).toBe("false");
    }
  });

  it("places short information on both sides and reveals details only on request",()=>{
    show();
    fireEvent.click(screen.getByTestId("yolk-orbit-procurement"));
    const selected=screen.getByTestId("yolk-orbit-procurement");
    expect(selected.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("yolk-left-typing").textContent).toContain("Материя");
    expect(screen.getByTestId("yolk-right-typing").textContent).toContain("Это ознакомительный режим");
    fireEvent.click(screen.getByTestId("yolk-expand"));
    expect(screen.getByRole("dialog",{name:"Подробнее о сфере Материя"})).toBeTruthy();
    expect(screen.getByText("Назначение сферы")).toBeTruthy();
    fireEvent.click(screen.getByRole("button",{name:"Закрыть"}));
    expect(screen.queryByRole("button",{name:"ДНК / концепт"})).toBeNull();
  });

  it("does not claim the demo illustration is an approved physical object",()=>{
    show();
    expect(screen.getByText(/Параметрический эскиз · GLB создаётся локально/)).toBeTruthy();
    expect(screen.getByTestId("yolk-stage-volume").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("yolk-stage-gesture").closest('[role="group"]')?.className).toContain("hidden");
    expect(screen.getByTestId("yolk-generate-glb").parentElement?.className).toContain("hidden");
    expect(screen.queryByRole("button",{name:"ДНК / концепт"})).toBeNull();
  });
});

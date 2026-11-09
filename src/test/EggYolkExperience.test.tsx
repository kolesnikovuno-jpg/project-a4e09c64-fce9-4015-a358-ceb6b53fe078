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
  it("centers the object with minimal navigation and no sphere controls",()=>{
    show();
    expect(screen.getByTestId("yolk-experience")).toBeTruthy();
    expect(screen.getByTestId("yolk-orbit-stage")).toBeTruthy();
    expect(screen.getByTestId("yolk-central-object")).toBeTruthy();
    expect(screen.getByTestId("yolk-viewer")).toBeTruthy();
    expect(screen.getByRole("link",{name:"Назад"})).toBeTruthy();
    expect(YOLK_SPHERES).toHaveLength(8);
    for(const sphere of YOLK_SPHERES)expect(screen.queryByTestId("yolk-orbit-"+sphere.id)).toBeNull();
  });

  it("does not claim the demo illustration is an approved physical object",()=>{
    show();
    expect(screen.getByText(/Параметрический эскиз · GLB создаётся локально/)).toBeTruthy();
    expect(screen.queryByTestId("yolk-stage-volume")).toBeNull();
    expect(screen.getByRole("img",{name:/Объём/})).toBeTruthy();
    expect(screen.getByTestId("yolk-generate-glb").parentElement?.className).toContain("hidden");
    expect(screen.queryByRole("button",{name:"ДНК / концепт"})).toBeNull();
  });
});

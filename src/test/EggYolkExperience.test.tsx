// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import EggYolkExperience, { YOLK_SPHERES } from "../components/egg/EggYolkExperience";

afterEach(cleanup);

function show(){
  return render(<MemoryRouter initialEntries={["/egg/yolk"]}><EggYolkExperience /></MemoryRouter>);
}
describe("EGG Yolk workspace",()=>{
  it("shows rotating concept scene, exactly eight clickable spheres and honest demo label",()=>{
    show();
    expect(screen.getByTestId("yolk-experience")).toBeTruthy();
    expect(screen.getByTestId("yolk-viewer")).toBeTruthy();
    expect(screen.getByText("ДЕМОНСТРАЦИЯ")).toBeTruthy();
    expect(YOLK_SPHERES).toHaveLength(8);
    for(const s of YOLK_SPHERES)expect(screen.getByTestId("yolk-orbit-"+s.id)).toBeTruthy();
  });
  it("opens a compact sphere panel, expands and goes back to DNA",()=>{
    show();
    fireEvent.click(screen.getByTestId("yolk-orbit-procurement"));
    expect(screen.getByRole("heading",{name:"Материя"})).toBeTruthy();
    expect(screen.getByText(/В демонстрации нет вымышленных результатов/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button",{name:"Развернуть информацию"}));
    expect(screen.getByTestId("yolk-expanded")).toBeTruthy();
    fireEvent.click(screen.getByRole("button",{name:"Вернуться к ДНК"}));
    expect(screen.getByRole("heading",{name:"ДНК продукта"})).toBeTruthy();
  });
  it("never represents a procedural illustration as an approved real model",()=>{
    show();
    expect(screen.getByText(/Форма условная/)).toBeTruthy();
    expect(screen.getByText(/ДНК задаёт направление/)).toBeTruthy();
    expect(screen.getByRole("button",{name:"ДНК / концепт"})).toBeTruthy();
  });
});

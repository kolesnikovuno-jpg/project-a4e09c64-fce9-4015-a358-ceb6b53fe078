// @vitest-environment jsdom
import {afterEach,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen} from "@testing-library/react";
import {createEggProject} from "../../lib/eggEngine";
import EggDocumentationPanel from "../../components/egg/EggDocumentationPanel";

const project=()=>createEggProject({
  id:"be54dfb9-8cb6-444a-94c7-1ce54a2aca47",
  title:"Кресло — проверка документации",
  seed:"Авторское зерно",at:"2026-11-05T11:00:00.000Z",
});
afterEach(()=>{cleanup();vi.restoreAllMocks();});

describe("EGG dual product documentation panels",()=>{
  it("exposes history and a draft documentation archive at the Author sphere",()=>{
    render(<EggDocumentationPanel project={project()} revision={4} origin="author"/>);
    expect(screen.getByTestId("egg-docs-author")).toBeTruthy();
    expect(screen.getByText(/Черновик · не утверждён/)).toBeTruthy();
    expect(screen.getByTestId("egg-document-download-author")).toBeTruthy();
    expect(screen.getByTestId("egg-memory-list-author").textContent).toContain("Исходная идея");
    fireEvent.click(screen.getByTestId("egg-memory-toggle-author"));
    expect(screen.getByTestId("egg-memory-toggle-author").getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByTestId("egg-document-gaps-author").textContent).toContain("Что ещё требуется");
  });
  it("distinguishes the Yolk sketch from an imported unembedded local GLB",()=>{
    const current={stage:"gesture" as const,variant:"B" as const,iteration:2};
    const {rerender}=render(<EggDocumentationPanel project={project()} revision={4}
      origin="yolk" visual={current}/>);
    expect(screen.getByText(/Текущий пространственный эскиз включается как экспериментальный GLB/)).toBeTruthy();
    rerender(<EggDocumentationPanel project={project()} revision={4} origin="yolk"
      visual={current} externalPreviewOpen/>);
    expect(screen.getByText(/Открытый локальный GLB не включается в архив автоматически/)).toBeTruthy();
  });
  it("blocks producing a real-project package in demo mode",()=>{
    render(<EggDocumentationPanel project={null} revision={null} origin="yolk"/>);
    expect(screen.queryByTestId("egg-document-download-yolk")).toBeNull();
    expect(screen.getByText(/откройте проект EGG из аккаунта/)).toBeTruthy();
  });
  it("builds a downloadable draft ZIP locally without writing anything to the EGG server",()=>{
    const make=vi.fn(()=> "blob:mock-archive");
    const revoke=vi.fn();
    Object.defineProperty(URL,"createObjectURL",{configurable:true,writable:true,value:make});
    Object.defineProperty(URL,"revokeObjectURL",{configurable:true,writable:true,value:revoke});
    const clicked=vi.spyOn(HTMLAnchorElement.prototype,"click").mockImplementation(()=>{});
    const requests=vi.fn();
    vi.stubGlobal("fetch",requests);
    render(<EggDocumentationPanel project={project()} revision={4} origin="author"/>);
    fireEvent.click(screen.getByTestId("egg-document-download-author"));
    expect(make).toHaveBeenCalledOnce();
    expect(clicked).toHaveBeenCalledOnce();
    expect(requests).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toContain("Архив сформирован");
    vi.unstubAllGlobals();
  });
});

// @vitest-environment jsdom
import {afterEach,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen} from "@testing-library/react";
import {MemoryRouter,Route,Routes} from "react-router-dom";
import UnoCalcEgg from "../../pages/UnoCalcEgg";

vi.mock("@/components/unocalc/UnoEggScene",()=>({
 default:({onIdeaOpen,onConceptOpen,onYolkOpen,onMatterOpen,onSphereOpen}:{
  onIdeaOpen?:()=>void;onConceptOpen?:()=>void;onYolkOpen?:()=>void;onMatterOpen?:()=>void;onSphereOpen?:(sphere:string)=>void;
 })=><div data-testid="persistent-egg-visual">
  <button onClick={onIdeaOpen}>Open Idea</button>
  <button onClick={onConceptOpen}>Open Concept</button>
  <button onClick={onYolkOpen}>Open Yolk</button>
  <button onClick={onMatterOpen}>Open Material</button>
  <button onClick={()=>onSphereOpen?.("design")}>Open Design</button>
 </div>,
}));
vi.mock("@/components/egg/EggProjectField",()=>({
 default:({children,workspace,onWorkspaceChange,onOpenProject}:{children:React.ReactNode;workspace:string;
  onWorkspaceChange?:(value:"field"|"matter")=>void;onOpenProject?:()=>void})=>
   <section data-testid="persistent-field" data-workspace={workspace}>
    {children}
    <button onClick={()=>onWorkspaceChange?.("field")}>Back to Field</button>
    <button onClick={()=>onWorkspaceChange?.("matter")}>Field Menu: Material</button>
    <button onClick={onOpenProject}>Field Menu: Project</button>
   </section>,
}));
vi.mock("@/components/egg/EggIdeaWorkspace",()=>({
 default:({onOpenConcept,onOpenMatter,onOpenYolk}:{onOpenConcept:()=>void;onOpenMatter:()=>void;onOpenYolk:()=>void})=>
  <section data-testid="egg-idea-workspace">
   <button onClick={onOpenConcept}>Next Concept</button>
   <button onClick={onOpenMatter}>To Material</button>
   <button onClick={onOpenYolk}>To Yolk</button>
  </section>,
}));
vi.mock("@/components/egg/EggConceptWorkspace",()=>({
 default:({onOpenIdea,onOpenYolk}:{onOpenIdea:()=>void;onOpenYolk:()=>void})=>
  <section data-testid="egg-concept-workspace">
   <button onClick={onOpenIdea}>Back to Idea</button>
   <button onClick={onOpenYolk}>To Yolk</button>
  </section>,
}));
vi.mock("@/components/egg/EggYolkExperience",()=>({
 default:({embedded,onClose}:{embedded?:boolean;onClose?:()=>void})=>
  <div data-testid="embedded-yolk">{embedded?"embedded":"standalone"}
   <button onClick={onClose}>Close Yolk</button>
  </div>,
}));
vi.mock("@/components/egg/EggSpherePanel",()=>({
 default:({sphere,onClose}:{sphere:string;onClose:()=>void})=>
  <section data-testid="egg-sphere-panel">Active sphere: {sphere}
   <button onClick={onClose}>Close Sphere</button>
  </section>,
}));
vi.mock("@/components/egg/EggServerState",()=>({
 default:()=> <div data-testid="egg-server-state-stub">Project settings</div>,
}));
const project="01b3d29f-bfc4-41ed-b31a-2e0db7fa2fe9";
const show=()=>render(<MemoryRouter initialEntries={["/ru/egg?project="+project]}>
 <Routes><Route path="/ru/egg" element={<UnoCalcEgg eggBrand/>}/></Routes>
</MemoryRouter>);
afterEach(()=>cleanup());

describe("EGG single canvas",()=>{
 it("keeps the same Egg/field mounted while changing right-hand workspace layers",()=>{
  show();
  const egg=screen.getByTestId("persistent-egg-visual");
  const field=screen.getByTestId("persistent-field");
  expect(egg).toBeTruthy();
  expect(document.querySelector(".egg-one-screen")).not.toBeNull();
  fireEvent.click(screen.getByRole("button",{name:"Open Idea"}));
  expect(screen.getByTestId("egg-idea-workspace")).toBeTruthy();
  expect(screen.getByTestId("persistent-egg-visual")).toBe(egg);
  fireEvent.click(screen.getByRole("button",{name:"Next Concept"}));
  expect(screen.getByTestId("egg-concept-workspace")).toBeTruthy();
  expect(screen.getByTestId("persistent-field")).toBe(field);
  fireEvent.click(screen.getByRole("button",{name:"To Yolk"}));
  expect(screen.getByTestId("embedded-yolk").textContent).toContain("embedded");
  expect(screen.getByTestId("persistent-egg-visual")).toBe(egg);
  fireEvent.click(screen.getByRole("button",{name:"Close Yolk"}));
  expect(screen.queryByTestId("embedded-yolk")).toBeNull();
  fireEvent.click(screen.getByRole("button",{name:"Open Material"}));
  expect(screen.getByTestId("persistent-field").getAttribute("data-workspace")).toBe("matter");
  fireEvent.click(screen.getByRole("button",{name:"Back to Field"}));
  expect(screen.getByTestId("persistent-field").getAttribute("data-workspace")).toBe("field");
  expect(screen.getByTestId("persistent-egg-visual")).toBe(egg);
 });
 it("switches between sphere, Idea, Concept, Material and project panels without stacking",()=>{
  show();
  const egg=screen.getByTestId("persistent-egg-visual");
  fireEvent.click(screen.getByRole("button",{name:"Open Idea"}));
  expect(screen.getByTestId("egg-idea-workspace")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button",{name:"Open Design"}));
  expect(screen.queryByTestId("egg-idea-workspace")).toBeNull();
  expect(screen.getByTestId("egg-sphere-panel")).toHaveTextContent("design");

  fireEvent.click(screen.getByRole("button",{name:"Open Concept"}));
  expect(screen.queryByTestId("egg-sphere-panel")).toBeNull();
  expect(screen.getByTestId("egg-concept-workspace")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button",{name:"Field Menu: Project"}));
  expect(screen.queryByTestId("egg-concept-workspace")).toBeNull();
  expect(screen.getByTestId("egg-one-utility-layer")).toBeInTheDocument();

  // The persistent Egg's own Material control closes the project panel.
  fireEvent.click(screen.getByRole("button",{name:"Open Material"}));
  expect(screen.queryByTestId("egg-one-utility-layer")).toBeNull();
  expect(screen.getByTestId("persistent-field")).toHaveAttribute("data-workspace","matter");

  fireEvent.click(screen.getByRole("button",{name:"Open Idea"}));
  expect(screen.getByTestId("egg-idea-workspace")).toBeInTheDocument();
  expect(screen.getByTestId("persistent-field")).toHaveAttribute("data-workspace","field");

  // The Field's navigation menu must also close the Idea instead of layering.
  fireEvent.click(screen.getByRole("button",{name:"Field Menu: Material"}));
  expect(screen.queryByTestId("egg-idea-workspace")).toBeNull();
  expect(screen.getByTestId("persistent-field")).toHaveAttribute("data-workspace","matter");
  expect(screen.getByTestId("persistent-egg-visual")).toBe(egg);
 });
});

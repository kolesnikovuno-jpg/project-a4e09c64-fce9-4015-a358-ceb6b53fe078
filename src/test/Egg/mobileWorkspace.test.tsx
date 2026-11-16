import {afterEach,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen} from "@testing-library/react";
import EggIdeaWorkspace from "@/components/egg/EggIdeaWorkspace";
import EggConceptWorkspace from "@/components/egg/EggConceptWorkspace";
import EggProjectField from "@/components/egg/EggProjectField";
import EggRadialMenu from "@/components/egg/EggRadialMenu";
import {Layers,Lightbulb} from "lucide-react";

afterEach(()=>{cleanup();localStorage.clear();vi.unstubAllGlobals();});
const project="egg-mobile-workspace";

describe("EGG mobile layouts",()=>{
 it("keeps Author intention while switching between the canvas and AI dialogue",()=>{
  render(<EggIdeaWorkspace projectId={project} onClose={()=>{}} onOpenMatter={()=>{}}/>);
  expect(screen.getByTestId("egg-idea-mobile-tabs")).toBeTruthy();
  const input=screen.getByRole("textbox",{name:"Намерение Автора"});
  fireEvent.change(input,{target:{value:"Нота пространства"}});
  const dialogue=screen.getByRole("tab",{name:"Диалог с ИИ"});
  fireEvent.click(dialogue);
  expect(dialogue.getAttribute("aria-selected")).toBe("true");
  fireEvent.click(screen.getByRole("tab",{name:"Холст"}));
  expect(input).toHaveValue("Нота пространства");
 });
 it("keeps Concept description intact across visual and textual mobile panes",()=>{
  render(<EggConceptWorkspace projectId={project} onClose={()=>{}} onOpenIdea={()=>{}}
   onOpenMatter={()=>{}} onOpenField={()=>{}} onOpenYolk={()=>{}}/>);
  expect(screen.getByTestId("egg-concept-mobile-tabs")).toBeTruthy();
  fireEvent.click(screen.getByRole("tab",{name:"Описание"}));
  const input=screen.getByRole("textbox",{name:"Описание концепта"});
  fireEvent.change(input,{target:{value:"Схема формы"}});
  fireEvent.click(screen.getByRole("tab",{name:"Холст"}));
  fireEvent.click(screen.getByRole("tab",{name:"Описание"}));
  expect(input).toHaveValue("Схема формы");
 });
 it("starts Matter with the canvas visible on a narrow viewport",()=>{
  vi.stubGlobal("matchMedia",vi.fn(()=>({matches:false,addListener:vi.fn(),removeListener:vi.fn()})));
  render(<EggProjectField projectId={project} workspace="matter"><div>Яйцо</div></EggProjectField>);
  expect(screen.queryByTestId("egg-matter-dialogue")).toBeNull();
  fireEvent.click(screen.getByRole("button",{name:"Открыть диалог Материальное"}));
  expect(screen.getByTestId("egg-matter-dialogue")).toBeTruthy();
  fireEvent.click(screen.getByRole("button",{name:"Скрыть диалог"}));
  expect(screen.queryByTestId("egg-matter-dialogue")).toBeNull();
 });
 it("keeps a single fixed menu position when opening the compact dial",()=>{
  render(<EggRadialMenu actions={[
   {id:"idea",label:"Идея",icon:Lightbulb,onSelect:()=>{}},
   {id:"matter",label:"Материальное",icon:Layers,onSelect:()=>{}}
  ]}/>);
  const closed=screen.getByTestId("egg-menu-fixed-position");
  expect(closed.className).toContain("egg-menu-dial");
  fireEvent.click(screen.getByRole("button",{name:"Открыть круговое меню"}));
  expect(screen.getByTestId("egg-menu-fixed-position").className).toContain("egg-menu-dial");
 });
});

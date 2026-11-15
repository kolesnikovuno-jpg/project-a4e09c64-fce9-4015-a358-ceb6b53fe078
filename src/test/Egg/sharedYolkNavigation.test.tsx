import {afterEach,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen} from "@testing-library/react";
import EggWorkspaceNavigation from "@/components/egg/EggWorkspaceNavigation";

afterEach(()=>cleanup());

describe("Shared navigation for the EGG Yolk",()=>{
 it("opens other canvas destinations while keeping the active Yolk non-interactive",()=>{
  const openIdea=vi.fn();
  const openMatter=vi.fn();
  const openField=vi.fn();
  const openConcept=vi.fn();
  render(<EggWorkspaceNavigation active="yolk"
   onOpenField={openField} onOpenMatter={openMatter}
   onOpenIdea={openIdea} onOpenConcept={openConcept} onOpenYolk={()=>{}}/>);
  fireEvent.click(screen.getByRole("button",{name:"Открыть круговое меню"}));
  expect((screen.getByRole("button",{name:"Желток"}) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole("button",{name:"Идея"}));
  expect(openIdea).toHaveBeenCalledTimes(1);
  expect(openConcept).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button",{name:"Открыть круговое меню"}));
  fireEvent.click(screen.getByRole("button",{name:"Материальное"}));
  expect(openMatter).toHaveBeenCalledTimes(1);
  expect(openField).not.toHaveBeenCalled();
 });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import EggConceptWorkspace from "@/components/egg/EggConceptWorkspace";

const project="01b3d29f-bfc4-41ed-b31a-2e0db7fa2fe9";
afterEach(()=>{cleanup();localStorage.clear();});

describe("EGG Concept workspace",()=>{
 it("is distinct from Author Idea, reads an unapproved snapshot and preserves its own draft",async()=>{
  localStorage.setItem("egg:idea-workspace:v1:"+project,JSON.stringify({
   intent:"Авторское намерение",savedDraft:"Сохранённый аккорд",constraints:""
  }));
  const onIdea=vi.fn();
  render(<EggConceptWorkspace projectId={project} onClose={()=>{}} onOpenIdea={onIdea}
   onOpenMatter={()=>{}} onOpenField={()=>{}} onOpenYolk={()=>{}}/>);
  expect(screen.getByTestId("egg-concept-workspace")).toBeTruthy();
  expect(screen.getByText("Сохранённый аккорд")).toBeTruthy();
  expect(screen.getByText("Авторское намерение",{exact:false})).toBeTruthy();
  expect(screen.getByRole("button",{name:"Открыть круговое меню"})).toBeTruthy();
  const note=screen.getByRole("textbox",{name:"Описание концепта"});
  fireEvent.change(note,{target:{value:"Визуальный принцип объекта"}});
  await waitFor(()=>expect(localStorage.getItem("egg:concept-workspace:v1:"+project))
   .toContain("Визуальный принцип объекта"));
  fireEvent.click(screen.getByRole("button",{name:"Идея"}));
  expect(onIdea).toHaveBeenCalledTimes(1);
  expect(localStorage.getItem("egg:idea-workspace:v1:"+project)).toContain("Сохранённый аккорд");
 });
});

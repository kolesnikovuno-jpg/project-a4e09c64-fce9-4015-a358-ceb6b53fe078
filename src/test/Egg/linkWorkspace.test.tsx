import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import EggLinkWorkspace, { normalizeSiteUrl, type SiteMark } from "@/components/egg/EggLinkWorkspace";
import EggProjectField from "@/components/egg/EggProjectField";

describe("EGG website marks",()=>{
 it("accepts only ordinary web URLs",()=>{
  expect(normalizeSiteUrl("example.com/gallery")).toBe("https://example.com/gallery");
  expect(normalizeSiteUrl("javascript:alert(1)")).toBeNull();
  expect(normalizeSiteUrl("data:text/html,x")).toBeNull();
  expect(normalizeSiteUrl("file:///etc/passwd")).toBeNull();
  expect(normalizeSiteUrl("https://user:password@example.com/")).toBeNull();
 });
 it("retains embedded site and removes screenshot and text extraction buttons",()=>{
  const onClose=vi.fn();
  render(<EggLinkWorkspace address="https://example.com/gallery" onClose={onClose} marks={[]} onMarksChange={()=>{}}/>);
  const iframe=screen.getByTestId("egg-site-frame") as HTMLIFrameElement;
  expect(iframe.getAttribute("src")).toBe("https://example.com/gallery");
  expect(iframe.getAttribute("sandbox")).toContain("allow-scripts");
  expect(iframe.getAttribute("referrerpolicy")).toBe("no-referrer");
  expect(screen.getByRole("button",{name:"Добавить пометку"})).toBeTruthy();
  expect(screen.queryByRole("button",{name:"Фрагмент сайта"})).toBeNull();
  expect(screen.queryByRole("button",{name:"Текст сайта"})).toBeNull();
  expect(screen.queryByTestId("egg-capture-options")).toBeNull();
  expect(screen.getByRole("link",{name:"Открыть сайт отдельно"})).toHaveProperty("target","_blank");
  fireEvent.click(screen.getByRole("button",{name:"Закрыть сайт"}));
  expect(onClose).toHaveBeenCalledOnce();
 });
 it("adds, edits, deletes website pins without refreshing the iframe",()=>{
  const Wrapper=()=>{
   const [marks,setMarks]=useState<SiteMark[]>([]);
   return <EggLinkWorkspace address="https://example.com/model" onClose={()=>{}} marks={marks} onMarksChange={setMarks}/>;
  };
  render(<Wrapper/>);
  const frame=screen.getByTestId("egg-site-frame");
  fireEvent.click(screen.getByRole("button",{name:"Добавить пометку"}));
  expect(screen.getByTestId("egg-site-mark-target")).toBeTruthy();
  fireEvent.click(screen.getByTestId("egg-site-mark-target"),{clientX:120,clientY:110});
  fireEvent.change(screen.getByRole("textbox",{name:"Текст пометки"}),{target:{value:"Здесь важная форма"}});
  fireEvent.click(screen.getByRole("button",{name:"Сохранить пометку"}));
  expect(screen.getAllByTestId("egg-site-mark")).toHaveLength(1);
  expect(screen.getByTestId("egg-site-frame")).toBe(frame);
  fireEvent.click(screen.getByRole("button",{name:"Пометка 1"}));
  expect(screen.getByText("Здесь важная форма")).toBeTruthy();
  fireEvent.click(screen.getByRole("button",{name:"Редактировать пометку"}));
  fireEvent.change(screen.getByRole("textbox",{name:"Текст пометки"}),{target:{value:"Изменено"}});
  fireEvent.click(screen.getByRole("button",{name:"Сохранить пометку"}));
  fireEvent.click(screen.getByRole("button",{name:"Пометка 1"}));
  expect(screen.getByText("Изменено")).toBeTruthy();
  fireEvent.click(screen.getByRole("button",{name:"Удалить пометку"}));
  expect(screen.queryByTestId("egg-site-mark")).toBeNull();
 });
 it("persists pins together with the original link and restores them after reopening",async()=>{
  const projectId="egg-site-mark-persistence";
  localStorage.setItem("egg:project-field:v1:"+projectId,JSON.stringify([
   {id:"ref1",type:"link",x:25,y:25,location:"field",text:"https://example.com/model"}
  ]));
  const {unmount}=render(<EggProjectField projectId={projectId}><div>Scene remains</div></EggProjectField>);
  fireEvent.click(await screen.findByRole("button",{name:"Просмотреть сайт https://example.com/model"}));
  fireEvent.click(screen.getByRole("button",{name:"Добавить пометку"}));
  fireEvent.click(screen.getByTestId("egg-site-mark-target"),{clientX:100,clientY:100});
  fireEvent.change(screen.getByRole("textbox",{name:"Текст пометки"}),{target:{value:"Сохранённая пометка"}});
  fireEvent.click(screen.getByRole("button",{name:"Сохранить пометку"}));
  await waitFor(()=>{
   const saved=JSON.parse(localStorage.getItem("egg:project-field:v1:"+projectId)||"[]");
   expect(saved[0]?.siteMarks?.[0]?.text).toBe("Сохранённая пометка");
  });
  fireEvent.click(screen.getByRole("button",{name:"Закрыть сайт"}));
  fireEvent.click(screen.getByRole("button",{name:"Просмотреть сайт https://example.com/model"}));
  expect(screen.getByRole("button",{name:"Пометка 1"})).toBeTruthy();
  unmount();
  render(<EggProjectField projectId={projectId}><div>Scene remains</div></EggProjectField>);
  fireEvent.click(await screen.findByRole("button",{name:"Просмотреть сайт https://example.com/model"}));
  expect(screen.getByRole("button",{name:"Пометка 1"})).toBeTruthy();
 });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EggLinkWorkspace, { normalizeSiteUrl } from "@/components/egg/EggLinkWorkspace";
import EggProjectField from "@/components/egg/EggProjectField";

describe("EGG website viewing without false anchors",()=>{
 it("accepts safe web URLs only",()=>{
  expect(normalizeSiteUrl("example.com/gallery")).toBe("https://example.com/gallery");
  expect(normalizeSiteUrl("javascript:alert(1)")).toBeNull();
  expect(normalizeSiteUrl("data:text/html,x")).toBeNull();
  expect(normalizeSiteUrl("file:///etc/passwd")).toBeNull();
  expect(normalizeSiteUrl("https://user:password@example.com/")).toBeNull();
 });
 it("retains embedded website with external and close controls only",()=>{
  const onClose=vi.fn();
  render(<EggLinkWorkspace address="https://example.com/gallery" onClose={onClose}/>);
  const iframe=screen.getByTestId("egg-site-frame") as HTMLIFrameElement;
  expect(iframe.getAttribute("src")).toBe("https://example.com/gallery");
  expect(iframe.getAttribute("sandbox")).toContain("allow-scripts");
  expect(iframe.getAttribute("referrerpolicy")).toBe("no-referrer");
  expect(screen.getByRole("link",{name:"Открыть сайт отдельно"})).toHaveProperty("target","_blank");
  for(const name of ["Добавить пометку","Текст сайта","Фрагмент сайта"])
   expect(screen.queryByRole("button",{name})).toBeNull();
  expect(screen.queryByTestId("egg-site-mark-layer")).toBeNull();
  expect(screen.queryByTestId("egg-capture-options")).toBeNull();
  fireEvent.click(screen.getByRole("button",{name:"Закрыть сайт"}));
  expect(onClose).toHaveBeenCalledOnce();
 });
 it("keeps previously saved marks in project data, without rendering their misleading pins",async()=>{
  const projectId="egg-legacy-site-marks";
  const storageKey="egg:project-field:v1:"+projectId;
  const stored=[{id:"ref1",type:"link",x:25,y:25,location:"field",
   text:"https://example.com/model",
   siteMarks:[{id:"mark1",x:42,y:31,text:"Старая пометка"}]}];
  localStorage.setItem(storageKey,JSON.stringify(stored));
  render(<EggProjectField projectId={projectId}><div>Scene remains</div></EggProjectField>);
  const link=await screen.findByRole("button",{name:"Просмотреть сайт https://example.com/model"});
  fireEvent.click(link);
  expect(screen.getByTestId("egg-site-frame")).toBeTruthy();
  expect(screen.queryByTestId("egg-site-mark")).toBeNull();
  expect(screen.queryByRole("button",{name:"Добавить пометку"})).toBeNull();
  expect(JSON.parse(localStorage.getItem(storageKey)||"[]")[0].siteMarks)
   .toEqual(stored[0].siteMarks);
  fireEvent.click(screen.getByRole("button",{name:"Закрыть сайт"}));
  expect(screen.queryByTestId("egg-link-workspace")).toBeNull();
  expect(screen.getByText("Scene remains")).toBeTruthy();
 });
});

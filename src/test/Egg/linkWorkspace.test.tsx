import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EggLinkWorkspace, { normalizeSiteUrl } from "@/components/egg/EggLinkWorkspace";
import EggProjectField from "@/components/egg/EggProjectField";

describe("EGG link website preview",()=>{
 it("accepts web addresses and blocks javascript or non-web protocols",()=>{
  expect(normalizeSiteUrl("example.com/gallery")).toBe("https://example.com/gallery");
  expect(normalizeSiteUrl("https://example.com/show")).toBe("https://example.com/show");
  expect(normalizeSiteUrl("javascript:alert(1)")).toBeNull();
  expect(normalizeSiteUrl("data:text/html,x")).toBeNull();
  expect(normalizeSiteUrl("file:///etc/passwd")).toBeNull();
  expect(normalizeSiteUrl("https://user:password@example.com/")).toBeNull();
 });
 it("displays the website inside a borderless window with independent external option and close",()=>{
  const onClose=vi.fn();
  const {container}=render(<EggLinkWorkspace address="https://example.com/gallery" onClose={onClose}/>);
  const iframe=screen.getByTestId("egg-site-frame") as HTMLIFrameElement;
  expect(iframe.getAttribute("src")).toBe("https://example.com/gallery");
  expect(iframe.getAttribute("sandbox")).toContain("allow-scripts");
  expect(iframe.getAttribute("referrerpolicy")).toBe("no-referrer");
  expect(container.querySelector(".bg-black\\/65")).toBeNull();
  const external=screen.getByRole("link",{name:"Открыть сайт отдельно"}) as HTMLAnchorElement;
  expect(external.getAttribute("href")).toBe("https://example.com/gallery");
  expect(external.target).toBe("_blank");
  expect(external.rel).toContain("noopener");
  fireEvent.click(screen.getByRole("button",{name:"Развернуть окно сайта"}));
  expect(screen.getByRole("button",{name:"Уменьшить окно сайта"})).toBeTruthy();
  fireEvent.click(screen.getByRole("button",{name:"Закрыть сайт"}));
  expect(onClose).toHaveBeenCalledTimes(1);
 });
 it("does not embed unsafe legacy links",()=>{
  render(<EggLinkWorkspace address="javascript:alert(1)" onClose={()=>{}}/>);
  expect(screen.queryByTestId("egg-site-frame")).toBeNull();
  expect(screen.getByText("Это не адрес сайта. Укажите ссылку с http:// или https://.")).toBeTruthy();
 });
 it("opens a previously saved link as a website in the field without erasing the field",async()=>{
  const projectId="egg-link-window-test";
  localStorage.setItem("egg:project-field:v1:"+projectId,JSON.stringify([
   {id:"ref1",type:"link",x:25,y:25,location:"field",text:"https://example.com/architecture"}
  ]));
  render(<EggProjectField projectId={projectId}><div>Egg scene remains</div></EggProjectField>);
  const link=await screen.findByRole("button",{name:"Просмотреть сайт https://example.com/architecture"});
  fireEvent.click(link);
  expect(screen.getByTestId("egg-link-workspace")).toBeTruthy();
  expect((screen.getByTestId("egg-site-frame") as HTMLIFrameElement).getAttribute("src")).toBe("https://example.com/architecture");
  expect(screen.getByText("Egg scene remains")).toBeTruthy();
  fireEvent.click(screen.getByRole("button",{name:"Закрыть сайт"}));
  expect(screen.queryByTestId("egg-link-workspace")).toBeNull();
  expect(screen.getByRole("button",{name:"Просмотреть сайт https://example.com/architecture"})).toBeTruthy();
 });
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
 it("captures copied text with the original site URL without reading iframe internals",()=>{
  const onCaptureText=vi.fn();
  render(<EggLinkWorkspace address="https://example.com/design" onClose={()=>{}} onCaptureText={onCaptureText}/>);
  fireEvent.click(screen.getByRole("button",{name:"Сохранить материал сайта"}));
  fireEvent.change(screen.getByRole("textbox",{name:"Текст с сайта"}),{target:{value:"A useful selected passage"}});
  fireEvent.click(screen.getByRole("button",{name:"Добавить текст в поле"}));
  expect(onCaptureText).toHaveBeenCalledWith("A useful selected passage","https://example.com/design");
  expect(screen.queryByTestId("egg-site-capture-panel")).toBeNull();
 });
 it("allows importing a visual reference from a file with its originating URL",async()=>{
  const onCaptureImage=vi.fn(async()=>true);
  render(<EggLinkWorkspace address="https://example.com/image" onClose={()=>{}} onCaptureImage={onCaptureImage}/>);
  fireEvent.click(screen.getByRole("button",{name:"Сохранить материал сайта"}));
  const input=screen.getByLabelText("Выбрать изображение с сайта") as HTMLInputElement;
  const file=new File(["image"],"reference.png",{type:"image/png"});
  fireEvent.change(input,{target:{files:[file]}});
  await waitFor(()=>expect(onCaptureImage).toHaveBeenCalledWith(file,"https://example.com/image"));
  await waitFor(()=>expect(screen.queryByTestId("egg-site-capture-panel")).toBeNull());
 });
 it("opens the screenshot picker as fallback when browser screen capture is unavailable",()=>{
  const onCaptureCrop=vi.fn();
  render(<EggLinkWorkspace address="https://example.com/reference" onClose={()=>{}} onCaptureCrop={onCaptureCrop}/>);
  const picker=screen.getByLabelText("Выбрать готовый скриншот") as HTMLInputElement;
  const click=vi.spyOn(picker,"click").mockImplementation(()=>{});
  fireEvent.click(screen.getByRole("button",{name:"Скрин сайта"}));
  expect(click).toHaveBeenCalledTimes(1);
  expect(onCaptureCrop).not.toHaveBeenCalled();
 });
 it("opens imported screenshot directly in rectangle-selection mode without immediately saving it",async()=>{
  const onCaptureCrop=vi.fn();
  render(<EggLinkWorkspace address="https://example.com/reference" onClose={()=>{}} onCaptureCrop={onCaptureCrop}/>);
  const picker=screen.getByLabelText("Выбрать готовый скриншот");
  const file=new File(["not-a-real-image"],"screenshot.png",{type:"image/png"});
  fireEvent.change(picker,{target:{files:[file]}});
  const workspace=await screen.findByTestId("egg-photo-workspace");
  expect(workspace).toBeTruthy();
  expect(screen.getByRole("button",{name:"Сохранить выделенный фрагмент"})).toBeTruthy();
  expect(onCaptureCrop).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button",{name:"Отменить скрин"}));
  await waitFor(()=>expect(screen.queryByTestId("egg-photo-workspace")).toBeNull());
  expect(screen.getByTestId("egg-link-workspace")).toBeTruthy();
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

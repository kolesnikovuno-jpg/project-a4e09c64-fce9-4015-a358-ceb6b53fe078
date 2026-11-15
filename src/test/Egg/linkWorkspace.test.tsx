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
  expect(screen.queryByRole("button",{name:"Развернуть окно сайта"})).toBeNull();
  fireEvent.click(screen.getByRole("button",{name:"Закрыть сайт"}));
  expect(onClose).toHaveBeenCalledTimes(1);
 });
 it("captures copied text with the original site URL without reading iframe internals",()=>{
  const onCaptureText=vi.fn();
  render(<EggLinkWorkspace address="https://example.com/design" onClose={()=>{}} onCaptureText={onCaptureText}/>);
  fireEvent.click(screen.getByRole("button",{name:"Текст сайта"}));
  fireEvent.change(screen.getByRole("textbox",{name:"Текст с сайта"}),{target:{value:"A useful selected passage"}});
  fireEvent.click(screen.getByRole("button",{name:"Добавить текст в поле"}));
  expect(onCaptureText).toHaveBeenCalledWith("A useful selected passage","https://example.com/design");
  expect(screen.queryByTestId("egg-site-text-panel")).toBeNull();
 });
 it("has only four distinct top actions and does not offer duplicate image upload",()=>{
  render(<EggLinkWorkspace address="https://example.com/image" onClose={()=>{}} onCaptureText={()=>{}}
    onCaptureImage={async()=>true} onCaptureCrop={()=>{}}/>);
  for(const name of ["Фрагмент сайта","Текст сайта","Открыть сайт отдельно","Закрыть сайт"])
   expect(screen.getByRole(name==="Открыть сайт отдельно"?"link":"button",{name})).toBeTruthy();
  expect(screen.queryByRole("button",{name:"Сохранить материал сайта"})).toBeNull();
  expect(screen.queryByRole("button",{name:"Добавить изображение с сайта"})).toBeNull();
  expect(screen.queryByRole("button",{name:"Скрин сайта"})).toBeNull();
 });
 it("never opens Photos or camera when browser screenshot is unsupported",()=>{
  const onCaptureCrop=vi.fn();
  render(<EggLinkWorkspace address="https://example.com/reference" onClose={()=>{}} onCaptureCrop={onCaptureCrop}/>);
  fireEvent.click(screen.getByRole("button",{name:"Фрагмент сайта"}));
  expect(screen.getByRole("alert").textContent).toContain("браузер не поддерживает захват вкладки");
  expect(screen.queryByLabelText("Выбрать готовый скриншот")).toBeNull();
  expect(onCaptureCrop).not.toHaveBeenCalled();
 });
 it("invokes browser screen capture rather than a file picker when supported",async()=>{
  const getDisplayMedia=vi.fn(async()=>{const error=new Error("cancelled");error.name="NotAllowedError";throw error;});
  const media=Object.getOwnPropertyDescriptor(navigator,"mediaDevices");
  try{
   Object.defineProperty(navigator,"mediaDevices",{configurable:true,value:{getDisplayMedia}});
   render(<EggLinkWorkspace address="https://example.com/reference" onClose={()=>{}} onCaptureCrop={()=>{}}/>);
   fireEvent.click(screen.getByRole("button",{name:"Фрагмент сайта"}));
   await waitFor(()=>expect(getDisplayMedia).toHaveBeenCalledWith({video:true,audio:false}));
   expect(screen.queryByLabelText("Выбрать готовый скриншот")).toBeNull();
   await waitFor(()=>expect(screen.getByRole("alert").textContent).toContain("Захват отменён"));
  }finally{
   if(media)Object.defineProperty(navigator,"mediaDevices",media);
   else Reflect.deleteProperty(navigator,"mediaDevices");
  }
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

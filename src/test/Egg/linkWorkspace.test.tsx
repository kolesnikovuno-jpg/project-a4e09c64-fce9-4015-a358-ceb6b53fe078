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
 it("requests a screenshot from the EGG server without opening the camera or browser sharing",async()=>{
  const original=globalThis.fetch;
  const fetchMock=vi.fn(async()=>({ok:true,status:200,json:async()=>({ok:true,status:"ready",imageDataUrl:"data:image/png;base64,iVBORw0KGgo="})}));
  vi.stubGlobal("fetch",fetchMock);
  try{
   render(<EggLinkWorkspace address="https://example.com/reference" onClose={()=>{}} onCaptureCrop={()=>{}}/>);
   fireEvent.click(screen.getByRole("button",{name:"Фрагмент сайта"}));
   expect(screen.getByTestId("egg-capture-options")).toBeTruthy();
   fireEvent.click(screen.getByRole("button",{name:"Снять страницу с начала"}));
   await waitFor(()=>expect(fetchMock).toHaveBeenCalledTimes(1));
   expect(fetchMock).toHaveBeenCalledWith("/api/egg?op=page-screenshot",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({url:"https://example.com/reference"})
   });
   expect(await screen.findByTestId("egg-photo-workspace")).toBeTruthy();
   expect(screen.queryByLabelText("Выбрать готовый скриншот")).toBeNull();
  }finally{vi.stubGlobal("fetch",original);}
 });
 it("reports a pending public-page render without opening another tool",async()=>{
  const original=globalThis.fetch;
  vi.stubGlobal("fetch",vi.fn(async()=>({ok:false,status:202,json:async()=>({status:"pending"})})));
  try{
   render(<EggLinkWorkspace address="https://example.com/reference" onClose={()=>{}} onCaptureCrop={()=>{}}/>);
   fireEvent.click(screen.getByRole("button",{name:"Фрагмент сайта"}));
   fireEvent.click(screen.getByRole("button",{name:"Снять страницу с начала"}));
   await waitFor(()=>expect(screen.getByRole("alert").textContent).toContain("Снимок ещё формируется"));
   expect(screen.queryByTestId("egg-photo-workspace")).toBeNull();
  }finally{vi.stubGlobal("fetch",original);}
 });
 it("does not call server when current-screen capture is selected",async()=>{
  const serverFetch=vi.spyOn(globalThis,"fetch");
  const onCrop=vi.fn();
  const original=Object.getOwnPropertyDescriptor(navigator,"mediaDevices");
  const capture=vi.fn(async()=>{const e=new Error("Permission denied");e.name="NotAllowedError";throw e;});
  try{
   Object.defineProperty(navigator,"mediaDevices",{configurable:true,value:{getDisplayMedia:capture}});
   render(<EggLinkWorkspace address="https://example.com/view" onClose={()=>{}} onCaptureCrop={onCrop}/>);
   const frame=screen.getByTestId("egg-site-frame");
   fireEvent.click(screen.getByRole("button",{name:"Фрагмент сайта"}));
   fireEvent.click(screen.getByRole("button",{name:"Снять текущий экран"}));
   await waitFor(()=>expect(capture).toHaveBeenCalledWith({video:true,audio:false}));
   expect(serverFetch).not.toHaveBeenCalled();
   expect(screen.getByTestId("egg-site-frame")).toBe(frame);
  }finally{
   if(original)Object.defineProperty(navigator,"mediaDevices",original);
   else Reflect.deleteProperty(navigator,"mediaDevices");
   serverFetch.mockRestore();
  }
 });
 it("offers iPad-compatible screenshot import without a dead screen capture button",async()=>{
  const original=Object.getOwnPropertyDescriptor(navigator,"mediaDevices");
  try{
   Object.defineProperty(navigator,"mediaDevices",{configurable:true,value:undefined});
   render(<EggLinkWorkspace address="https://example.com/view" onClose={()=>{}} onCaptureCrop={()=>{}}/>);
   fireEvent.click(screen.getByRole("button",{name:"Фрагмент сайта"}));
   expect(screen.queryByRole("button",{name:"Снять текущий экран"})).toBeNull();
   expect(screen.getByRole("button",{name:"Вставить снимок экрана"})).toBeTruthy();
   const fileInput=screen.getByLabelText("Выбрать скриншот из Фото") as HTMLInputElement;
   const chooser=vi.spyOn(fileInput,"click").mockImplementation(()=>{});
   fireEvent.click(screen.getByRole("button",{name:"Выбрать снимок из Фото"}));
   expect(chooser).toHaveBeenCalledTimes(1);
   fireEvent.change(fileInput,{target:{files:[new File(["fake"],"screenshot.png",{type:"image/png"})]}});
   expect(await screen.findByTestId("egg-photo-workspace")).toBeTruthy();
  }finally{
   if(original)Object.defineProperty(navigator,"mediaDevices",original);
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

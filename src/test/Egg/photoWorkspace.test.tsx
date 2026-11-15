import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EggPhotoWorkspace from "@/components/egg/EggPhotoWorkspace";

const sendPointer=(node:Element,type:string,clientX:number,clientY:number,pointerId:number)=>{
 const event=new MouseEvent(type,{bubbles:true,clientX,clientY,button:0});
 Object.defineProperty(event,"pointerId",{value:pointerId});
 Object.defineProperty(event,"pointerType",{value:"pen"});
 fireEvent(node,event);
};
describe("EGG open photo",()=>{
 it("shows the photo without a blocking shade, frame or oval crop, and saves pen annotations",()=>{
  const onSave=vi.fn(),onClose=vi.fn();
  const {container}=render(<EggPhotoWorkspace src="data:image/jpeg;base64,AA==" title="Sample" onSave={onSave} onCrop={()=>{}} onClose={onClose}/>);
  expect(screen.getByTestId("egg-photo-workspace")).toBeTruthy();
  expect(container.querySelector(".bg-black\\/65")).toBeNull();
  const img=screen.getByAltText("Sample") as HTMLImageElement;
  expect(img.style.borderRadius).toBe("0");
  expect(img.style.clipPath).toBe("none");
  expect(screen.getByRole("button",{name:"Закрыть фото"})).toBeTruthy();
  const layer=screen.getByTestId("egg-photo-ink-layer");
  Object.defineProperty(layer,"getBoundingClientRect",{configurable:true,value:()=>({left:0,top:0,width:800,height:600})});
  fireEvent.click(screen.getByRole("button",{name:"Перо — пометка"}));
  sendPointer(layer,"pointerdown",20,25,1);
  sendPointer(layer,"pointermove",150,175,1);
  sendPointer(layer,"pointerup",150,175,1);
  fireEvent.click(screen.getByRole("button",{name:"Сохранить пометки"}));
  expect(onSave).toHaveBeenCalledTimes(1);
  expect(onSave.mock.calls[0][0].strokes).toHaveLength(1);
  expect(onClose).not.toHaveBeenCalled();
 });
 it("adds a text note at a photo position and keeps the original image intact",()=>{
  const onSave=vi.fn();
  render(<EggPhotoWorkspace src="data:image/jpeg;base64,AA==" title="Photo" onSave={onSave} onCrop={()=>{}} onClose={()=>{}}/>);
  const layer=screen.getByTestId("egg-photo-ink-layer");
  Object.defineProperty(layer,"getBoundingClientRect",{configurable:true,value:()=>({left:0,top:0,width:500,height:500})});
  fireEvent.click(screen.getByRole("button",{name:"Текстовая пометка"}));
  sendPointer(layer,"pointerdown",200,300,5);
  fireEvent.change(screen.getByRole("textbox",{name:"Текст пометки"}),{target:{value:"Интересная деталь"}});
  fireEvent.click(screen.getByRole("button",{name:"Сохранить текстовую пометку"}));
  fireEvent.click(screen.getByRole("button",{name:"Сохранить пометки"}));
  expect(onSave.mock.calls[0][0].notes).toEqual([expect.objectContaining({text:"Интересная деталь",x:400,y:600})]);
 });
 it("saves a selected fragment separately from the original photo",async()=>{
  const onCrop=vi.fn();
  const OriginalImage=globalThis.Image;
  const originalContext=HTMLCanvasElement.prototype.getContext;
  const originalToDataUrl=HTMLCanvasElement.prototype.toDataURL;
  class MockImage {
   src="";
   naturalWidth=800;
   naturalHeight=600;
   decode=async()=>{};
  }
  try{
   Object.defineProperty(globalThis,"Image",{configurable:true,writable:true,value:MockImage});
   Object.defineProperty(HTMLCanvasElement.prototype,"getContext",{configurable:true,writable:true,value:vi.fn(()=>({drawImage:vi.fn()}))});
   Object.defineProperty(HTMLCanvasElement.prototype,"toDataURL",{configurable:true,writable:true,value:vi.fn(()=>"data:image/jpeg;base64,CROP")});
   render(<EggPhotoWorkspace src="data:image/jpeg;base64,ORIGINAL" title="Photo" onSave={()=>{}} onCrop={onCrop} onClose={()=>{}}/>);
   const layer=screen.getByTestId("egg-photo-ink-layer");
   Object.defineProperty(layer,"getBoundingClientRect",{configurable:true,value:()=>({left:0,top:0,width:500,height:500})});
   fireEvent.click(screen.getByRole("button",{name:"Выделить фрагмент"}));
   sendPointer(layer,"pointerdown",60,70,8);
   sendPointer(layer,"pointermove",310,310,8);
   sendPointer(layer,"pointerup",310,310,8);
   fireEvent.click(screen.getByRole("button",{name:"Сохранить выделенный фрагмент"}));
   await waitFor(()=>expect(onCrop).toHaveBeenCalledWith("data:image/jpeg;base64,CROP"));
  }finally{
   Object.defineProperty(globalThis,"Image",{configurable:true,writable:true,value:OriginalImage});
   Object.defineProperty(HTMLCanvasElement.prototype,"getContext",{configurable:true,writable:true,value:originalContext});
   Object.defineProperty(HTMLCanvasElement.prototype,"toDataURL",{configurable:true,writable:true,value:originalToDataUrl});
  }
 });
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EggPhotoWorkspace, { PhotoMarkupOverlay } from "@/components/egg/EggPhotoWorkspace";

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
 it("opens a translucent touch-sized note pin, edits its text and removes it without changing the image",()=>{
  const onSave=vi.fn(),onClose=vi.fn();
  render(<EggPhotoWorkspace src="data:image/jpeg;base64,AA==" title="Photo"
    initialMarkup={{strokes:[],notes:[{id:"n1",x:400,y:600,text:"Характер света"}]}}
    onSave={onSave} onCrop={()=>{}} onClose={onClose}/>);
  const marker=screen.getByRole("button",{name:"Открыть пометку 1: Характер света"});
  expect(marker.className).toContain("h-11");
  expect(marker.querySelector(".bg-neutral-900\\/65")).not.toBeNull();
  fireEvent.click(marker);
  expect(screen.getByTestId("egg-photo-note-popover")).toBeTruthy();
  const editor=screen.getByRole("textbox",{name:"Редактировать текст пометки"}) as HTMLTextAreaElement;
  expect(editor.value).toBe("Характер света");
  fireEvent.change(editor,{target:{value:"Важен мягкий свет"}});
  fireEvent.click(screen.getByRole("button",{name:"Сохранить изменение пометки"}));
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({notes:[expect.objectContaining({id:"n1",text:"Важен мягкий свет"})]}));
  expect(screen.queryByTestId("egg-photo-note-popover")).toBeNull();
  fireEvent.click(screen.getByRole("button",{name:"Открыть пометку 1: Важен мягкий свет"}));
  expect((screen.getByRole("textbox",{name:"Редактировать текст пометки"}) as HTMLTextAreaElement).value).toBe("Важен мягкий свет");
  fireEvent.click(screen.getByRole("button",{name:"Удалить пометку"}));
  expect(onSave).toHaveBeenLastCalledWith(expect.objectContaining({notes:[]}));
  expect(screen.queryByRole("button",{name:/Открыть пометку 1/})).toBeNull();
  expect(onClose).not.toHaveBeenCalled();
 });
 it("opens a photo annotation from its thumbnail instead of hiding the text",()=>{
  const onSelect=vi.fn();
  render(<div className="relative h-40 w-48"><PhotoMarkupOverlay
   markup={{strokes:[],notes:[{id:"note9",x:230,y:700,text:"Деревянная деталь"}]}}
   onNoteSelect={onSelect}/></div>);
  const pin=screen.getByRole("button",{name:"Открыть пометку 1: Деревянная деталь"});
  expect(pin.className).toContain("h-9");
  fireEvent.click(pin);
  expect(onSelect).toHaveBeenCalledWith("note9");
 });
 it("explains what is missing if the main check is pressed without a selection",()=>{
  const onSave=vi.fn(),onCrop=vi.fn();
  render(<EggPhotoWorkspace src="data:image/jpeg;base64,AA==" title="Photo" onSave={onSave} onCrop={onCrop} onClose={()=>{}}/>);
  fireEvent.click(screen.getByRole("button",{name:"Выделить фрагмент"}));
  fireEvent.click(screen.getByRole("button",{name:"Сохранить выделенный фрагмент"}));
  expect(screen.getByText("Сначала выделите фрагмент рамкой на фотографии.")).toBeTruthy();
  expect(onCrop).not.toHaveBeenCalled();
  expect(onSave).not.toHaveBeenCalled();
 });
 it("saves a selected fragment separately from the original photo and shows field",async()=>{
  const onCrop=vi.fn(),onClose=vi.fn();
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
   render(<EggPhotoWorkspace src="data:image/jpeg;base64,ORIGINAL" title="Photo" onSave={()=>{}} onCrop={onCrop} onClose={onClose}/>);
   const layer=screen.getByTestId("egg-photo-ink-layer");
   Object.defineProperty(layer,"getBoundingClientRect",{configurable:true,value:()=>({left:0,top:0,width:500,height:500})});
   fireEvent.click(screen.getByRole("button",{name:"Выделить фрагмент"}));
   sendPointer(layer,"pointerdown",60,70,8);
   sendPointer(layer,"pointermove",310,310,8);
   sendPointer(layer,"pointerup",310,310,8);
   fireEvent.click(screen.getByRole("button",{name:"Сохранить выделенный фрагмент"}));
   await waitFor(()=>expect(onCrop).toHaveBeenCalledWith("data:image/jpeg;base64,CROP"));
   expect(onClose).toHaveBeenCalledTimes(1);
   expect(onCrop).toHaveBeenCalledTimes(1);
  }finally{
   Object.defineProperty(globalThis,"Image",{configurable:true,writable:true,value:OriginalImage});
   Object.defineProperty(HTMLCanvasElement.prototype,"getContext",{configurable:true,writable:true,value:originalContext});
   Object.defineProperty(HTMLCanvasElement.prototype,"toDataURL",{configurable:true,writable:true,value:originalToDataUrl});
  }
 });
});

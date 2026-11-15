import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Layers, Pencil } from "lucide-react";
import EggRadialMenu from "@/components/egg/EggRadialMenu";
import EggSketchEditor, { type SketchStroke } from "@/components/egg/EggSketchEditor";

describe("EGG circular menu", () => {
  it("opens the hierarchical wheel and invokes a selected action", () => {
    const select = vi.fn();
    render(<EggRadialMenu actions={[{id:"collect",label:"Добавить",icon:Layers,children:[
      {id:"sketch",label:"Скетч",icon:Pencil,onSelect:select}
    ]}]} />);
    fireEvent.click(screen.getByRole("button", {name:"Открыть круговое меню"}));
    fireEvent.click(screen.getByRole("button", {name:"Добавить"}));
    fireEvent.click(screen.getByRole("button", {name:"Скетч"}));
    expect(select).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", {name:"Открыть круговое меню"})).toBeTruthy();
  });
  it("keeps the launcher center fixed when expanded and uses rotating positions instead of arrows", () => {
    render(<EggRadialMenu actions={Array.from({length:7},(_,i)=>({id:"item"+i,label:"Раздел "+i,icon:Layers}))}/>);
    const closed=screen.getByTestId("egg-menu-fixed-position");
    const position=closed.className;
    expect(screen.getByRole("button",{name:"Открыть круговое меню"}).className).toContain("left-1/2 top-1/2");
    fireEvent.click(screen.getByRole("button",{name:"Открыть круговое меню"}));
    expect(screen.getByTestId("egg-menu-fixed-position").className).toContain(position.replace(" pointer-events-none z-[75]",""));
    const items=screen.getAllByTestId("egg-menu-orbit-item");
    expect(items).toHaveLength(7);
    expect(screen.queryByRole("button",{name:"Прокрутить меню вперёд"})).toBeNull();
    const original=items[0].style.left;
    fireEvent.keyDown(window,{key:"ArrowRight"});
    expect(screen.getAllByTestId("egg-menu-orbit-item")[0].style.left).not.toBe(original);
    expect(screen.getByRole("button",{name:"Закрыть меню"}).className).toContain("left-1/2 top-1/2");
    expect(screen.getByRole("button",{name:"Раздел 6"})).toBeTruthy();
  });
  it("rotates the actual outer actions with a circular pointer gesture without selecting", () => {
    const action=vi.fn();
    render(<EggRadialMenu actions={[
      {id:"one",label:"Один",icon:Layers,onSelect:action},
      {id:"two",label:"Два",icon:Layers,onSelect:action},
      {id:"three",label:"Три",icon:Layers,onSelect:action},
    ]}/>);
    fireEvent.click(screen.getByRole("button",{name:"Открыть круговое меню"}));
    const dial=screen.getByTestId("egg-menu-fixed-position");
    // jsdom lacks layout; use a known center 165,165.
    vi.spyOn(dial,"getBoundingClientRect").mockReturnValue({left:0,top:0,width:330,height:330,right:330,bottom:330,x:0,y:0,toJSON:()=>{}} as DOMRect);
    const before=screen.getByRole("button",{name:"Один"}).style.left;
    // jsdom's PointerEvent shim does not reliably populate coordinates.
    const dispatchPointer=(target:Element,name:string,x:number,y:number)=>{
      const event=new MouseEvent(name,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0});
      Object.defineProperties(event,{
        pointerId:{value:1},pointerType:{value:"touch"}
      });
      fireEvent(target,event);
    };
    dispatchPointer(screen.getByRole("button",{name:"Один"}),"pointerdown",165,52);
    dispatchPointer(dial,"pointermove",278,165);
    dispatchPointer(dial,"pointerup",278,165);
    expect(screen.getByRole("button",{name:"Один"}).style.left).not.toBe(before);
    expect(action).not.toHaveBeenCalled();
  });

});

describe("EGG multistroke sketch", () => {
  it("does not create a card after each line, only on explicit confirmation", () => {
    const save = vi.fn<(strokes: SketchStroke[]) => void>();
    render(<EggSketchEditor onSave={save} onClose={()=>{}} />);
    const paper = screen.getByRole("img",{name:"Лист для рисования"});
    fireEvent.pointerDown(paper,{pointerId:1,pointerType:"pen",clientX:30,clientY:40});
    fireEvent.pointerMove(paper,{pointerId:1,pointerType:"pen",clientX:150,clientY:180});
    fireEvent.pointerUp(paper,{pointerId:1,pointerType:"pen",clientX:150,clientY:180});
    fireEvent.pointerDown(paper,{pointerId:2,pointerType:"pen",clientX:200,clientY:210});
    fireEvent.pointerMove(paper,{pointerId:2,pointerType:"pen",clientX:280,clientY:290});
    fireEvent.pointerUp(paper,{pointerId:2,pointerType:"pen",clientX:280,clientY:290});
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button",{name:"Открыть круговое меню"}));
    fireEvent.click(screen.getByRole("button",{name:"Завершить"}));
    fireEvent.click(screen.getByRole("button",{name:"Готово"}));
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0].length).toBe(2);
  });
});

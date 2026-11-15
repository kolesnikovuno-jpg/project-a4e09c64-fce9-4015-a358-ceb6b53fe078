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
  it("scrolls to additional commands without losing them", () => {
    render(<EggRadialMenu actions={Array.from({length:7},(_,i)=>({id:"item"+i,label:"Раздел "+i,icon:Layers}))}/>);
    fireEvent.click(screen.getByRole("button",{name:"Открыть круговое меню"}));
    expect(screen.queryByRole("button",{name:"Раздел 6"})).toBeNull();
    fireEvent.click(screen.getByRole("button",{name:"Прокрутить меню вперёд"}));
    expect(screen.getByRole("button",{name:"Раздел 6"})).toBeTruthy();
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

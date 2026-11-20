import {afterEach,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import EggDnaFormation from "../../components/egg/EggDnaFormation";

const projectId="01b3d29f-bfc4-41ed-b31a-2e0db7fa2fe9";
const props={
  projectId,
  intent:"Подставка для человеческого тела",
  constraints:"",
  materials:[{id:"m1",type:"thought",text:"Пластическая опора"}],
  materialInsight:"Возможно поддерживать тело мягко",
  visualSourceKey:"author-sketch-a",
  suggestedIdea:"Система поддержки тела с пространственным потенциалом",
  latestAnswer:"",
};
afterEach(()=>{cleanup();localStorage.clear();});
describe("Author DNA workbench",()=>{
 it("requires Author decision and invalidates the result when research context changes",async()=>{
  const onReviewChange=vi.fn();
  const onRequestAi=vi.fn();
  const view=render(<EggDnaFormation {...props} onRequestAi={onRequestAi}
    onReviewChange={onReviewChange}/>);
  expect(screen.getByTestId("egg-review-dna").hasAttribute("disabled")).toBe(true);
  fireEvent.change(screen.getByRole("textbox",{name:"Сформированная Идея"}),{
    target:{value:"Система поддержки тела"},
  });
  fireEvent.change(screen.getByRole("textbox",{name:"Сущность ДНК"}),{
    target:{value:"Физическая поддержка и свободная поза"},
  });
  fireEvent.change(screen.getByRole("textbox",{name:"Инварианты ДНК"}),{
    target:{value:"Поддерживать тело, не копируя типологию кресла"},
  });
  expect(screen.getByTestId("egg-review-dna").hasAttribute("disabled")).toBe(false);
  fireEvent.click(screen.getByTestId("egg-review-dna"));
  await waitFor(()=>expect(onReviewChange).toHaveBeenCalledWith(expect.objectContaining({
    idea:"Система поддержки тела",
    dna:expect.stringContaining("ИНВАРИАНТЫ:"),
  })));
  view.rerender(<EggDnaFormation {...props} constraints="Теперь изменены рамки"
    onRequestAi={onRequestAi} onReviewChange={onReviewChange}/>);
  await waitFor(()=>expect(screen.getByText(/Исходное намерение, рамки, материалы или кандидат ДНК изменились/)).toBeTruthy());
  await waitFor(()=>expect(onReviewChange).toHaveBeenLastCalledWith(null));
 });
 it("parses a marked AI reply into unapproved, editable fields only",async()=>{
  const onReviewChange=vi.fn();
  render(<EggDnaFormation {...props}
    latestAnswer={"ИДЕЯ: Подставка для тела\nСУЩНОСТЬ: Поддержка тела\nИНВАРИАНТЫ: Свободное взаимодействие"}
    onRequestAi={vi.fn()} onReviewChange={onReviewChange}/>);
  fireEvent.click(screen.getByTestId("egg-import-dna"));
  expect((screen.getByRole("textbox",{name:"Сущность ДНК"}) as HTMLTextAreaElement).value).toBe("Поддержка тела");
  expect(screen.getByText(/Черновик ИИ перенесён/)).toBeTruthy();
  expect(onReviewChange).not.toHaveBeenCalledWith(expect.objectContaining({dna:expect.any(String)}));
  expect(screen.getByTestId("egg-review-dna").hasAttribute("disabled")).toBe(false);
 });
});

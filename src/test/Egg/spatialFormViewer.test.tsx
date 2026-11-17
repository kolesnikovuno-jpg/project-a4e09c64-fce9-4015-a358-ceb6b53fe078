import {afterEach,describe,expect,it} from "vitest";
import {cleanup,fireEvent,render,screen} from "@testing-library/react";
import EggYolkViewer from "../../components/egg/EggYolkViewer";
import {buildEggSpatialForm} from "../../lib/eggSpatialFormEngine";
import {visualSeedFromText,type EggYolkFieldState} from "../../lib/eggYolkField";

afterEach(()=>cleanup());
const idea="Кресло для рабочего пространства как арт объект — спокойный акцент";
const form=buildEggSpatialForm({
 intent:idea,synthesisId:"synthesis-36",level:2,iteration:1,
 morphology:{
  rationale:"Пластически собранное кресло с вертикальной опорой и исследовательским пространством.",
  sourceResultIds:["result-design","result-production"],
  coefficients:{density:.52,openness:.62,verticality:.74,tension:.42,
   asymmetry:.38,rotation:.2,pulse:.28,softness:.55},
 },
});
const field:EggYolkFieldState={
 seed:visualSeedFromText(idea),
 identitySeed:visualSeedFromText(idea),
 manifestation:.34,variation:.17,status:"manifested_field",
};
describe("Yolk spatial form viewer",()=>{
 it("exposes a spatial chair and keeps Field/Form control after synthesis",()=>{
  const {container}=render(<EggYolkViewer projectId="test" level={2}
   studyKind="field" fieldState={field} formStudy={form} minimalControls/>);
  expect(screen.getByTestId("yolk-spatial-form-status")).toBeTruthy();
  const formButton=screen.getByTestId("yolk-form-toggle");
  expect(formButton.getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByRole("img").getAttribute("aria-label")).toContain("параметрическая форма кресла");
  const formShapes=container.querySelectorAll("polygon");
  expect(formShapes.length).toBeGreaterThan(100);
  fireEvent.click(screen.getByTestId("yolk-field-toggle"));
  expect(screen.getByTestId("yolk-form-toggle").getAttribute("aria-pressed")).toBe("false");
  expect(screen.getByTestId("yolk-density-field")).toBeTruthy();
  fireEvent.click(screen.getByTestId("yolk-form-toggle"));
  expect(screen.getByTestId("yolk-form-toggle").getAttribute("aria-pressed")).toBe("true");
  expect(container.querySelectorAll("polygon").length).toBeGreaterThan(100);
 });
 it("does not invent approved geometry in a project without complete synthesis",()=>{
  render(<EggYolkViewer studyKind="field" fieldState={{
   ...field,status:"provisional_seed",manifestation:0,
  }} minimalControls/>);
  expect(screen.queryByTestId("yolk-form-toggle")).toBeNull();
  expect(screen.getByTestId("yolk-density-field")).toBeTruthy();
 });
});

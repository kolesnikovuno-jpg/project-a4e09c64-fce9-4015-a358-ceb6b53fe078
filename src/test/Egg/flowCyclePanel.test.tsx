// @vitest-environment jsdom
import {afterEach,describe,expect,it} from "vitest";
import {cleanup,render,screen} from "@testing-library/react";
import {createEggProject} from "../../lib/eggEngine";
import {startEggFlowCycle,contributeEggFlowSphere} from "../../lib/eggFlowCycle";
import EggFlowCyclePanel from "../../components/egg/EggFlowCyclePanel";

const at="2026-11-05T12:00:00Z";
const base=()=>createEggProject({id:"e0ac2947-9f9a-4c1f-b401-9d6e63aef5e0",
  title:"Кресло",seed:"Замысел кресла",at});
afterEach(cleanup);

describe("EGG flow state UI",()=>{
  it("exposes both fixed routes and first author launch without requesting eight independent approvals",()=>{
    render(<EggFlowCyclePanel project={base()} revision={1} authorControls/>);
    expect(screen.getByTestId("start-flow-cycle")).toBeTruthy();
    expect(screen.getByTestId("yolk-product-passport")).toBeTruthy();
    expect(screen.getByTestId("yolk-version-source").textContent).toContain("Параметрический");
    for(const sphere of ["marketing","design","testDrive","commerce","legal","production","procurement","retail"]){
      expect(screen.getByTestId("flow-visit-"+sphere)).toBeTruthy();
    }
    expect(screen.queryByTestId("decide-flow-cycle")).toBeNull();
  });
  it("shows no author actions inside Yolk and awaits both flows",()=>{
    let p=startEggFlowCycle(base(),{actor:"author",at});
    p=contributeEggFlowSphere(p,{actor:"ai",sphere:"marketing",text:"Аудитория",evidence:"hypothesis",at});
    render(<EggFlowCyclePanel project={p} revision={4}/>);
    expect(screen.getByTestId("flow-visit-marketing").textContent).toContain("Результат получен");
    expect(screen.getByTestId("flow-visit-design").textContent).toContain("Требуется работа");
    expect(screen.queryByTestId("decide-flow-cycle")).toBeNull();
    expect(screen.queryByTestId("start-flow-cycle")).toBeNull();
  });
  it("makes only whole-cycle decision available after the Yolk receives Commerce and Retail",()=>{
    let p=startEggFlowCycle(base(),{actor:"author",at});
    for(const sphere of ["marketing","legal","design","production","testDrive","procurement","commerce","retail"] as const)
      p=contributeEggFlowSphere(p,{actor:"ai",sphere,text:"Вывод "+sphere,evidence:"hypothesis",at});
    render(<EggFlowCyclePanel project={p} revision={14} authorControls/>);
    expect(screen.getByTestId("decide-flow-cycle")).toBeTruthy();
    expect(screen.getByTestId("yolk-product-passport").textContent).toContain("Новые");
    expect(screen.getByTestId("yolk-passport-design").textContent).toContain("Вывод design");
    expect(screen.getByTestId("yolk-intersection-checks").textContent).toContain("4");
    expect(screen.queryByTestId("yolk-product-passport")?.textContent).not.toContain("Согласовано автоматически");
    expect(screen.getByText(/Сводка двух потоков готова/)).toBeTruthy();
    expect(screen.queryByTestId("start-flow-cycle")).toBeNull();
  });
});
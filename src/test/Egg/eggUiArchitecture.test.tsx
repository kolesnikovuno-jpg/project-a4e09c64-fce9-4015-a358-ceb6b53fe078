// @vitest-environment jsdom
import {afterEach,describe,expect,it} from "vitest";
import {cleanup,render,screen} from "@testing-library/react";
import {EggUiProvider,eggUi,getEggUi,useEggUi} from "../../i18n/eggUi";
import {eggSnapshotHash} from "../../components/egg/EggWorkspaceSync";

const project={
 id:"01b3d29f-bfc4-41ed-b31a-2e0db7fa2fe9",
 title:"Авторский замысел — свет и пауза",
 dna:"Первичная ДНК: две плоскости в напряжённом равновесии",
 cards:[{id:"one",text:"Не переводить авторскую заметку",location:"matter"}],
};
function UIProbe(){
 const {ui}=useEggUi();
 return <div>
  <span data-testid="field-title">{ui.field}</span>
  <span data-testid="yolk-state">{ui.yolkDnaReceived}</span>
  <span data-testid="sync-state">{ui.syncSynced}</span>
  <p data-testid="author-dna">{project.dna}</p>
 </div>;
}
afterEach(cleanup);
describe("EGG UI translation architecture",()=>{
 it("provides exactly the same typed interface keys for RU, UA and EN",()=>{
  const source=Object.keys(eggUi.ru).sort();
  for(const locale of ["ru","uk","en"] as const){
   expect(Object.keys(eggUi[locale]).sort()).toEqual(source);
   for(const key of source)expect(eggUi[locale][key as keyof typeof eggUi.ru].trim()).not.toBe("");
  }
 });
 it("defaults to existing Russian copy in embedded workspaces",()=>{
  render(<UIProbe/>);
  expect(screen.getByTestId("yolk-state").textContent).toBe("ДНК получена");
 });
 it("translates UI only while preserving author data and stable project identifiers",()=>{
  const before=JSON.stringify(project);
  const hash=eggSnapshotHash(project);
  const ui=render(<EggUiProvider locale="ru"><UIProbe/></EggUiProvider>);
  expect(screen.getByTestId("sync-state").textContent).toBe("В EGG · синхронизировано");
  ui.rerender(<EggUiProvider locale="uk"><UIProbe/></EggUiProvider>);
  expect(screen.getByTestId("yolk-state").textContent).toBe("ДНК отримано");
  ui.rerender(<EggUiProvider locale="en"><UIProbe/></EggUiProvider>);
  expect(screen.getByTestId("field-title").textContent).toBe("Field");
  expect(screen.getByTestId("sync-state").textContent).toBe("In EGG · synced");
  expect(screen.getByTestId("author-dna").textContent).toBe(project.dna);
  expect(JSON.stringify(project)).toBe(before);
  expect(eggSnapshotHash(project)).toBe(hash);
  expect(getEggUi("ru").yolkDnaReceived).toBe("ДНК получена");
 });
});

// @vitest-environment jsdom
import {afterEach,describe,expect,it} from "vitest";
import {cleanup,fireEvent,render,screen} from "@testing-library/react";
import {MemoryRouter,Route,Routes,useLocation} from "react-router-dom";
import EggStablePreview from "../../components/egg/EggStablePreview";
import {useLocale} from "../../i18n/useLocale";

const id="01b3d29f-bfc4-41ed-b31a-2e0db7fa2fe9";
function LocationProbe(){
 const {locale}=useLocale();
 const {pathname,search,hash}=useLocation();
 return <output data-testid="egg-language-location">{locale+"|"+pathname+search+hash}</output>;
}
function show(path:string){
 return render(<MemoryRouter initialEntries={[path]}>
  <Routes>
   <Route path="/ru/egg" element={<EggStablePreview><LocationProbe/></EggStablePreview>}/>
   <Route path="/uk/egg" element={<EggStablePreview><LocationProbe/></EggStablePreview>}/>
   <Route path="/en/egg" element={<EggStablePreview><LocationProbe/></EggStablePreview>}/>
   <Route path="/egg/yolk" element={<EggStablePreview><LocationProbe/></EggStablePreview>}/>
   <Route path="/egg/connect" element={<EggStablePreview><LocationProbe/></EggStablePreview>}/>
  </Routes>
 </MemoryRouter>);
}
afterEach(()=>{cleanup();localStorage.clear();});
describe("Shared EGG language switcher",()=>{
 it("keeps the project and workspace URL when changing language on the Egg",()=>{
  show("/ru/egg?project="+id+"&start=idea");
  expect(screen.getByRole("button",{name:"Change language"}).textContent).toBe("RU");
  fireEvent.click(screen.getByRole("button",{name:"Change language"}));
  fireEvent.click(screen.getByRole("option",{name:"UA"}));
  expect(screen.getByTestId("egg-language-location").textContent)
   .toBe("uk|/uk/egg?project="+id+"&start=idea");
  expect(localStorage.getItem("uno.locale")).toBe("uk");
 });
 it("switches language in place on bare Yolk routes and keeps the project",()=>{
  localStorage.setItem("uno.locale","ru");
  show("/egg/yolk?project="+id);
  expect(screen.getByRole("button",{name:"Change language"}).textContent).toBe("RU");
  fireEvent.click(screen.getByRole("button",{name:"Change language"}));
  fireEvent.click(screen.getByRole("option",{name:"EN"}));
  expect(screen.getByTestId("egg-language-location").textContent)
   .toBe("en|/egg/yolk?project="+id);
  expect(localStorage.getItem("uno.locale")).toBe("en");
 });
 it("keeps the canonical auth callback path intact when the language changes",()=>{
  show("/egg/connect?returnProject="+id);
  fireEvent.click(screen.getByRole("button",{name:"Change language"}));
  fireEvent.click(screen.getByRole("option",{name:"UA"}));
  expect(screen.getByTestId("egg-language-location").textContent)
   .toBe("uk|/egg/connect?returnProject="+id);
 });
});

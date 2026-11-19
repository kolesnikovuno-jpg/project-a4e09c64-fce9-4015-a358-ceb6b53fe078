// @vitest-environment jsdom
import {afterEach,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import EggYolkIdeaVisual from "../../components/egg/EggYolkIdeaVisual";

vi.mock("@supabase/supabase-js",()=>({
 createClient:vi.fn(()=>({auth:{getSession:async()=>({data:{session:{access_token:"demo-token"}}})}}))
}));
const projectId="6e569320-632c-4dbe-924a-a1656b4906c9";
afterEach(()=>{cleanup();localStorage.clear();vi.unstubAllGlobals();});

describe("Yolk uses actual synthesis-linked 2D visual",()=>{
 it("loads latest saved synthesis sketch without requiring an Author pin",async()=>{
  const fetchMock=vi.fn(async(url:string)=>url==="/api/egg-config"?
   {ok:true,json:async()=>({supabaseUrl:"https://example.test",publishableKey:"anon"})}:
   {ok:true,json:async()=>({ok:true,studies:[{
     id:"ec09c569-2979-4645-8154-0e532c5af78c",
     imageUrl:"https://example.test/private-sketch.png",
     createdAt:"2026-11-19T21:57:33Z",
   }]})});
  vi.stubGlobal("fetch",fetchMock);
  render(<EggYolkIdeaVisual projectId={projectId} synthesisId="synthesis-11">
    <div data-testid="yolk-spatial-field">Field</div>
  </EggYolkIdeaVisual>);
  await waitFor(()=>expect(screen.getByTestId("egg-yolk-original-sketch")).toBeTruthy());
  const image=screen.getByAltText("Авторский скетч — визуальная опора Желтка") as HTMLImageElement;
  expect(image.src).toContain("/private-sketch.png");
  expect(screen.getByText(/Скетч по синтезу восьми сфер/)).toBeTruthy();
  const studyUrl=fetchMock.mock.calls.map(call=>call[0]).find(url=>url.startsWith("/api/egg-flow-ai?"));
  expect(studyUrl).toContain("synthesisId=synthesis-11");
  expect(studyUrl).toContain("projectId="+projectId);
  fireEvent.click(screen.getByTestId("egg-yolk-view-form"));
  expect(screen.queryByTestId("egg-yolk-original-sketch")).toBeNull();
  expect(screen.getByTestId("yolk-spatial-field")).toBeTruthy();
  fireEvent.click(screen.getByTestId("egg-yolk-view-compare"));
  expect(screen.getByTestId("egg-yolk-original-sketch")).toBeTruthy();
 });
 it("retains spatial field alone if no sketch exists for the current synthesis",async()=>{
  vi.stubGlobal("fetch",vi.fn(async(url:string)=>url==="/api/egg-config"?
   {ok:true,json:async()=>({supabaseUrl:"https://example.test",publishableKey:"anon"})}:
   {ok:true,json:async()=>({ok:true,studies:[]})}));
  render(<EggYolkIdeaVisual projectId={projectId} synthesisId="synthesis-empty">
    <div data-testid="yolk-spatial-field">Field</div>
  </EggYolkIdeaVisual>);
  await waitFor(()=>expect(screen.getByTestId("yolk-spatial-field")).toBeTruthy());
  expect(screen.queryByTestId("egg-yolk-original-sketch")).toBeNull();
 });
});

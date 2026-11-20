// @vitest-environment jsdom
import {afterEach,describe,expect,it,vi} from "vitest";
import {cleanup,render,screen,waitFor} from "@testing-library/react";
import EggRecoveredFieldMedia from "../../components/egg/EggRecoveredFieldMedia";

const photos=vi.hoisted(()=>({
 rows:[] as Array<{filename:string;card:{type:string;src:string};source_project_id:string}>,
}));
vi.mock("@supabase/supabase-js",()=>({
 createClient:()=>({
  auth:{getUser:async()=>({data:{user:{id:"owner"}}})},
  from:()=>({
   select:()=>({
    eq:async()=>({data:photos.rows,error:null}),
   }),
  }),
 }),
}));
afterEach(()=>{cleanup();vi.unstubAllGlobals();photos.rows=[];});
const id="da5d7c12-16e3-4a63-bb34-cb0fce6019af";
function show(){
 vi.stubGlobal("fetch",vi.fn(async()=>({ok:true,json:async()=>({
  supabaseUrl:"https://example.test",publishableKey:"anon",
 })})));
 return render(<EggRecoveredFieldMedia projectId={id}/>);
}
describe("read-only rescue of externally cached EGG source photos",()=>{
 it("shows verified recovered media but does not claim original Material was restored",async()=>{
  photos.rows=[
   {filename:"004.jpeg",card:{type:"image",src:"data:image/jpeg;base64,AAAA"},
    source_project_id:"first"},
   {filename:"IMG_4597.jpeg",card:{type:"image",src:"data:image/jpeg;base64,BBBB"},
    source_project_id:"second"},
  ];
  show();
  await waitFor(()=>expect(screen.getByTestId("egg-recovered-field-media")).toBeTruthy());
  expect(screen.getByText("Найдены фотографии в резерве · 2 из 5")).toBeTruthy();
  expect(screen.getAllByText("Сохранить файл")).toHaveLength(2);
  expect(screen.getByText(/не подменяют исходное Материальное/)).toBeTruthy();
 });
 it("does not render a recovered photo from an invalid source",async()=>{
  photos.rows=[{filename:"fake.svg",card:{type:"image",src:"javascript:alert(1)"},source_project_id:"fake"}];
  show();
  await waitFor(()=>expect(screen.getByText(/Материальное пусто/)).toBeTruthy());
  expect(screen.queryByTestId("egg-recovered-field-media")).toBeNull();
 });
});

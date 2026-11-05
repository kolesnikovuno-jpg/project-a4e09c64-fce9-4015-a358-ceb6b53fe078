// @vitest-environment jsdom
import {afterEach,describe,expect,it} from "vitest";
import {cleanup,render,screen} from "@testing-library/react";
import {
  createEggProject,proposeEggConcept,decideEggConcept,type EggProject,
} from "../../lib/eggEngine";
import {registerDriveReference,confirmDriveReference} from "../../lib/eggArtifacts";
import {buildEggVisualHistory} from "../../lib/eggVisualHistory";
import {eggMutationSchema,runEggMutation,readEggState} from "../../lib/eggCommands";
import {startEggFlowCycle,contributeEggFlowSphere,decideEggFlowCycle} from "../../lib/eggFlowCycle";
import {buildEggDocumentationBundle} from "../../lib/eggDocumentation";
import EggFlowCyclePanel from "../../components/egg/EggFlowCyclePanel";

const id="01b3d29f-bfc4-41ed-b31a-2e0db7fa2fe9",at="2026-11-05T18:30:00Z";
const ownerId="author-test";
const author={kind:"author" as const,ownerId};
const ai={kind:"agent" as const,ownerId,projectId:id,scopes:["read" as const,"contribute" as const]};
const base=():EggProject=>createEggProject({id,title:"Кресло A «Объятие»",
  seed:"Лёгкое кресло из фанеры и льна для отдыха, открытый контур",at});
function projectWithDocument(){
 let p=base();
 p=proposeEggConcept(p,{actor:"ai",text:"Объятие · рабочая концепция с текстом",
   at,questions:[]});
 p=registerDriveReference(p,{
   actor:"ai",at,fileId:"1tzhlvD1-e9T-FROIOiGa4DMu-19BiYYn48UQq7acxxM",
   title:"Кресло A «Объятие» — концепция v1",
   mimeType:"application/vnd.google-apps.document",
   webUrl:"https://docs.google.com/document/d/1tzhlvD1-e9T-FROIOiGa4DMu-19BiYYn48UQq7acxxM/edit",
   collectionKey:"idea/concepts",
 });
 return p;
}
function withConceptImage(){
 return proposeEggConcept(base(),{actor:"ai",at,
   text:"Кресло A «Объятие» / набросок в PNG",
   visualUrl:"https://example.org/egg/chair-v1.png",questions:[]});
}
function pin(p:EggProject,sourceRef:string,cycleId:string|null,note:string,identity=author){
 return runEggMutation(p,eggMutationSchema.parse({
   command:"link_visual_version",projectId:id,expectedRevision:1,
   sourceRef,cycleId,note,
 }),identity,ownerId,at);
}
afterEach(cleanup);
describe("EGG / visual version ledger and real chair A",()=>{
 it("does not mislabel a reported Google document as a visual image or 3D model",()=>{
   const p=projectWithDocument();
   const history=buildEggVisualHistory(p);
   expect(history.candidates).toHaveLength(0);
   expect(history.baseline).toBeNull();
   expect(history.unverifiedDocumentCount).toBe(1);
   expect(history.snapshots).toHaveLength(0);
   expect(p.visualVersions).toBeUndefined();
   render(<EggFlowCyclePanel project={p} revision={13} authorControls/>);
   expect(screen.getByTestId("egg-visual-no-source").textContent)
     .toContain("нет изображений или 3D-файлов");
   expect(screen.getByTestId("egg-visual-document-context").textContent)
     .toContain("концепция v1");
   expect(screen.getByTestId("egg-visual-comparison-status").textContent)
     .toContain("пока нет");
   expect(screen.queryByTestId("egg-visual-save")).toBeNull();
   expect(screen.queryByTestId("egg-visual-image-before")).toBeNull();
 });
 it("accepts only EXISTING Author-linked concept image, not an arbitrary URL or AI approval",()=>{
   const p=withConceptImage();
   const candidate=buildEggVisualHistory(p).candidates[0];
   expect(candidate).toMatchObject({sourceRef:p.concepts![0].id,
     sourceStatus:"concept_proposed",presentation:"inline_image",media:"image"});
   expect(()=>pin(p,"https://arbitrary.url/image.png",null,"Arbitrary source",author))
     .toThrow(/source is missing/i);
   expect(()=>pin(p,p.concepts![0].id,null,"Photo of original chair",ai))
     .toThrow(/Forbidden/);
   expect(()=>pin(p,p.concepts![0].id,"not-a-cycle","Photo of original chair"))
     .toThrow(/unknown cycle/);
   const saved=pin(p,p.concepts![0].id,null,"Первый эскиз кресла, без расчётов конструкции.");
   const version=saved.visualVersions![0];
   expect(version).toMatchObject({
     media:"image",presentation:"inline_image",
     sourceStatus:"concept_proposed",cycleId:null,
     approvedAsProduct:false,createdBy:"author",
   });
   expect(saved.events.at(-1)?.kind).toBe("visual_version_linked");
   expect(saved.seed.text).toBe(p.seed.text);
   expect(saved.concepts?.[0].status).toBe("proposed");
   expect(saved.level).toBe(1);
   expect(readEggState(saved).visualHistory.baseline?.id).toBe(version.id);
   render(<EggFlowCyclePanel project={saved} revision={14} authorControls/>);
   const element=screen.getByTestId("egg-visual-image-before") as HTMLImageElement;
   expect(element.src).toBe("https://example.org/egg/chair-v1.png");
   expect(screen.getByTestId("egg-visual-after").textContent).toContain("Нет закреплённой");
   const doc=buildEggDocumentationBundle({
     project:saved,revision:14,origin:"yolk",generatedAt:at,
   });
   const report=new TextDecoder().decode(doc.files.find(x=>x.path==="docs/06-flow-cycles.md")!.bytes);
   expect(report).toContain("Визуальные версии");
   expect(report).toContain(version.id);
   expect(report).toContain("без расчётов конструкции");
 });
 it("requires Author-confirmed Drive model/image before version pinning; never tries to embed Drive pages as images",()=>{
   let p=base();
   p=registerDriveReference(p,{
     actor:"ai",at,fileId:"abcdefABCDEF123456789",
     title:"Кресло: 3D GLB / внешняя версия",
     mimeType:"model/gltf-binary",collectionKey:"visual/model",
     webUrl:"https://drive.google.com/file/d/abcdefABCDEF123456789/view",
   });
   expect(buildEggVisualHistory(p).candidates).toHaveLength(0);
   expect(()=>pin(p,p.artifacts![0].id,null,"Сырые данные 3D объекта."))
     .toThrow(/source is missing/i);
   p=confirmDriveReference(p,{actor:"author",artifactId:p.artifacts![0].id,at});
   const candidate=buildEggVisualHistory(p).candidates[0];
   expect(candidate).toMatchObject({media:"model",presentation:"external_reference",
     sourceStatus:"artifact_confirmed"});
   p=pin(p,p.artifacts![0].id,null,"Пробный GLB, параметры формы не подтверждены.");
   render(<EggFlowCyclePanel project={p} revision={17}/>);
   expect(screen.getByTestId("egg-visual-before").textContent)
     .toContain("3D-файл доступен по внешней ссылке");
   expect(screen.queryByTestId("egg-visual-image-before")).toBeNull();
   expect(screen.queryByTestId("egg-visual-save")).toBeNull();
 });
 it("compares first cycle to baseline, and subsequent cycles to latest source without fabricating pixel differences",()=>{
   let p=withConceptImage();
   const original=p.concepts![0].id;
   p=pin(p,original,null,"Исходный эскиз кресла A до итераций.");
   p=startEggFlowCycle(p,{actor:"author",at});
   const first=p.flowCycles![0].id;
   p=pin(p,original,first,"Вид A после первого синтеза, ссылка та же.");
   expect(buildEggVisualHistory(p).comparisons[0]).toMatchObject({
     cycleId:first,sourceRelation:"same_source",actualVisualDifferences:"not_computed",
   });
   const order=["marketing","legal","design","production","testDrive","procurement","commerce","retail"] as const;
   for(const sphere of order)p=contributeEggFlowSphere(p,{
     actor:"ai",sphere,at,text:"Черновой вывод "+sphere,evidence:"hypothesis",
   });
   p=decideEggFlowCycle(p,{actor:"author",outcome:"revise",at,
     reason:"Проверить конструкцию кресла",addressedSpheres:["design"]});
   const second=p.flowCycles![1].id;
   expect(buildEggVisualHistory(p).comparisons[1]).toMatchObject({
     cycleId:second,sourceRelation:"missing_after",
     before:{sourceRef:original},after:null,
   });
   // The ledger stores a second LINK, not fake geometry or generated pixels.
   const expected=proposeEggConcept;expect(typeof expected).toBe("function");
   expect(p.visualVersions?.length).toBe(2);
 });
 it("records two different actual visual sources as distinct, without claiming better geometry",()=>{
   let p=withConceptImage();
   const firstId=p.concepts![0].id;
   p=pin(p,firstId,null,"Исходный образ лёгкого кресла A.");
   p=startEggFlowCycle(p,{actor:"author",at});
   // No concurrent second concept proposal is invented. A confirmed artifact
   // is a separate existing source linked to the current cycle.
   p=registerDriveReference(p,{
     actor:"ai",at,fileId:"VisualModelFile123456789",
     title:"Второе изображение формы кресла",
     mimeType:"image/png",collectionKey:"visual/versions",
     webUrl:"https://drive.google.com/file/d/VisualModelFile123456789/view",
   });
   const artId=p.artifacts![0].id;
   p=confirmDriveReference(p,{actor:"author",artifactId:artId,at});
   p=pin(p,artId,p.flowCycles![0].id,"Второй образ, без подтверждённого улучшения.");
   const current=buildEggVisualHistory(p).comparisons[0];
   expect(current).toMatchObject({
     sourceRelation:"different_sources",actualVisualDifferences:"not_computed",
     before:{sourceRef:firstId},after:{sourceRef:artId,presentation:"external_reference"},
   });
   render(<EggFlowCyclePanel project={p} revision={29}/>);
   expect(screen.getByTestId("egg-visual-comparison-status").textContent)
     .toContain("Источники различаются");
   expect(screen.queryByTestId("egg-visual-image-after")).toBeNull();
 });
 it("blocks rejected concepts, malformed URLs and unconfirmed external references",()=>{
   let p=withConceptImage();
   p=decideEggConcept(p,{actor:"author",conceptId:p.concepts![0].id,
     outcome:"reject",reason:"Форма не соответствует замыслу",at});
   expect(buildEggVisualHistory(p).candidates).toHaveLength(0);
   expect(()=>pin(p,p.concepts![0].id,null,"Неутверждённая форма кресла."))
     .toThrow(/not Author-confirmed/);
   expect(eggMutationSchema.safeParse({command:"link_visual_version",
     projectId:id,expectedRevision:1,cycleId:null,sourceRef:"concept-1",
     note:"Пример заметки к форме",actor:"ai"}).success).toBe(false);
   expect(eggMutationSchema.safeParse({command:"link_visual_version",
     projectId:id,expectedRevision:1,cycleId:null,sourceRef:"concept-1",
     note:"short"}).success).toBe(false);
 });
});

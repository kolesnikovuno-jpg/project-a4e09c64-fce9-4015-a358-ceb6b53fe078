import {describe,expect,it} from "vitest";
import {createEggProject,routeQuestion,startSphereWork,returnFinding,decideFinding} from "../../lib/eggEngine";
import {registerDriveReference} from "../../lib/eggArtifacts";
import {buildEggDocumentationBundle,buildEggProductMemory,findDocumentationGaps,zipDocumentation} from "../../lib/eggDocumentation";

const at="2026-11-05T10:00:00.000Z";
function fixture(){
  let state=createEggProject({id:"8d93150b-40a0-4441-8054-7064c7b783fd",title:"Лёгкое кресло",seed:"Авторская идея: лёгкое кресло",at});
  state=routeQuestion(state,{actor:"ai",from:"idea",to:"marketing",question:"Для кого объект?",at});
  const id=state.tasks[0].id;
  state=startSphereWork(state,{taskId:id,actor:"ai",at});
  state=returnFinding(state,{taskId:id,actor:"ai",at,text:"Возможна нишевая аудитория.",evidence:"hypothesis"});
  state=decideFinding(state,{taskId:id,actor:"author",at,outcome:"accept",reason:"Взять в исследование."});
  state=registerDriveReference(state,{actor:"ai",at,operationId:"chair-doc-v1-test",
    fileId:"1tzhlvD1-e9T-FROIOiGa4DMu-19BiYYn48UQq7acxxM",
    title:"Референсы кресла",mimeType:"application/vnd.google-apps.document",
    collectionKey:"design/sketches"});
  return state;
}
function extractRawEntries(data:Uint8Array){
  const view=new DataView(data.buffer,data.byteOffset,data.byteLength);
  const decoded=new TextDecoder();
  const out:Record<string,Uint8Array>={};
  let pos=0;
  while(view.getUint32(pos,true)===0x04034b50){
    const method=view.getUint16(pos+8,true);
    const size=view.getUint32(pos+18,true);
    const nameLength=view.getUint16(pos+26,true);
    const extraLength=view.getUint16(pos+28,true);
    expect(method).toBe(0);
    const name=decoded.decode(data.subarray(pos+30,pos+30+nameLength));
    const start=pos+30+nameLength+extraLength;
    out[name]=data.slice(start,start+size);
    pos=start+size;
  }
  expect(view.getUint32(pos,true)).toBe(0x02014b50);
  expect(view.getUint32(data.length-22,true)).toBe(0x06054b50);
  return out;
}

describe("EGG product memory and documentation package",()=>{
  it("binds history to real event, concept and material IDs without fabricated approval",()=>{
    const state=fixture();
    const history=buildEggProductMemory(state);
    expect(history.length).toBeGreaterThan(5);
    expect(history.some(e=>e.sourceId===state.tasks[0].id)).toBe(false);
    expect(history.some(e=>e.id.startsWith("material/") && e.status==="reported")).toBe(true);
    expect(history.find(e=>e.id.startsWith("material/"))?.level).toBeNull();
    expect(history.filter(e=>e.id.startsWith("event/")).every(e=>e.sourceId.startsWith("event-"))).toBe(true);
    expect([...history].sort((a,b)=>a.at.localeCompare(b.at)||a.id.localeCompare(b.id))).toEqual(history);
    expect(findDocumentationGaps(state)).toContain("Нет принятой Автором концепции.");
  });
  it("exports the SAME documentation structure from Author and Yolk; only Yolk can include an unapproved GLB",()=>{
    const project=fixture();
    const opts={project,revision:9,generatedAt:at};
    const author=buildEggDocumentationBundle({...opts,origin:"author"});
    const yolk=buildEggDocumentationBundle({...opts,origin:"yolk",visual:{stage:"gesture",variant:"B",iteration:2}});
    const authorFiles=extractRawEntries(author.zip);
    const yolkFiles=extractRawEntries(yolk.zip);
    expect(Object.keys(authorFiles).sort()).toEqual(Object.keys(yolkFiles).filter(k=>!k.endsWith(".glb")).sort());
    expect(yolkFiles["visual/yolk-study-unapproved.glb"]).toBeDefined();
    expect(new DataView(yolkFiles["visual/yolk-study-unapproved.glb"].buffer).getUint32(0,true)).toBe(0x46546c67);
    expect(authorFiles["visual/yolk-study-unapproved.glb"]).toBeUndefined();
    expect(author.manifest.documentStatus).toBe("draft_not_approved");
    expect(yolk.manifest.visualStudy).toMatchObject({approved:false,units:"normalized"});
    expect(author.manifest.authorReleaseRecorded).toBe(false);
    expect(author.manifest.externalFilesEmbedded).toBe(false);
    expect(author.manifest.revision).toBe(9);
    expect(author.filename).toContain("-R9-author-draft.zip");
    const text=new TextDecoder();
    expect(text.decode(authorFiles["docs/01-dna.md"])).toContain("Авторская идея");
    expect(text.decode(authorFiles["docs/02-spheres.md"])).toContain("Возможна нишевая аудитория.");
    expect(text.decode(authorFiles["docs/04-artifacts.md"])).toContain("Референсы кресла");
    const snapshot=JSON.parse(text.decode(authorFiles["data/project-snapshot.json"]));
    expect(snapshot.events).toEqual(project.events);
    expect(snapshot.tasks).toEqual(project.tasks);
    const manifest=JSON.parse(text.decode(authorFiles["data/manifest.json"]));
    expect(manifest.origin).toBe("author");
    expect(manifest.sourceCounts.events).toBe(project.events.length);
  });
  it("never smuggles in a model via the Author route",()=>{
    const bundle=buildEggDocumentationBundle({
      project:fixture(),revision:3,generatedAt:at,origin:"author",
      visual:{stage:"volume",variant:"A",iteration:10},
    });
    expect(bundle.manifest.visualStudyEmbedded).toBe(false);
    expect(bundle.files.some(f=>f.path.endsWith(".glb"))).toBe(false);
  });
  it("validates archive entry names and prevents path traversal",()=>{
    expect(()=>zipDocumentation([{path:"../secret",bytes:new Uint8Array(0)}])).toThrow(/Unsafe/);
    expect(()=>zipDocumentation([{path:"a",bytes:new Uint8Array(0)},{path:"a",bytes:new Uint8Array(0)}])).toThrow(/Unsafe/);
  });
});

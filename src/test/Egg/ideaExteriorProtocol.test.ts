import {describe,expect,it} from "vitest";
import {buildEggIdeaExternalField} from "../../lib/eggIdeaExternalField";
import {EGG_IDEA_EXTERIOR_ORDER,EGG_IDEA_EXTERIOR_LENSES,eggIdeaExteriorSourceKey,eggIdeaExteriorProgress} from "../../lib/eggIdeaExterior";
describe("EGG exterior research, before DNA",()=>{
 const cards=[
  {id:"m1",type:"thought" as const,text:"Осознанно принято",location:"matter"},
  {id:"f1",type:"thought" as const,text:"Необычное пространство",location:"field"},
  {id:"f2",type:"link" as const,text:"https://example.org/form",location:"field"},
  {id:"f3",type:"image" as const,text:"Фото без просмотра",location:"field",src:"data:image/png;base64,AAAA"},
 ];
 it("keeps external Field apart from Author-selected Matter",()=>{
  const field=buildEggIdeaExternalField(cards);
  expect(field).toHaveLength(3);
  expect(field.some(c=>c.id==="m1")).toBe(false);
  expect(field.find(c=>c.id==="f2")?.url).toBe("https://example.org/form");
  expect(field.find(c=>c.id==="f3")).not.toHaveProperty("imageData");
 });
 it("executes eight distinct research roles, not one generic report",()=>{
  expect(EGG_IDEA_EXTERIOR_ORDER).toHaveLength(8);
  expect(new Set(EGG_IDEA_EXTERIOR_ORDER).size).toBe(8);
  for(const sphere of EGG_IDEA_EXTERIOR_ORDER){
   expect(EGG_IDEA_EXTERIOR_LENSES[sphere].question.length).toBeGreaterThan(40);
   expect(EGG_IDEA_EXTERIOR_LENSES[sphere].boundary.length).toBeGreaterThan(35);
  }
 });
 it("invalidates completed research if Author changes source intent or Field",()=>{
  const data={intent:"Опора человеческого тела",constraints:"",materialInsight:"",
   selected:[cards[0]],field:buildEggIdeaExternalField(cards),visualKey:"sketch:a"};
  const base=eggIdeaExteriorSourceKey(data);
  expect(base).not.toBe(eggIdeaExteriorSourceKey({...data,intent:"Другая идея"}));
  expect(base).not.toBe(eggIdeaExteriorSourceKey({...data,field:[]}));
  expect(base).not.toBe(eggIdeaExteriorSourceKey({...data,visualKey:"sketch:b"}));
 });
 it("counts unique completed spheres rather than text snippets",()=>{
  expect(eggIdeaExteriorProgress([{sphere:"design",text:"Гипотеза"},{
   sphere:"design",text:"Повтор"}, {sphere:"legal",text:""}])).toBe(1);
 });
});

import {describe,expect,it} from "vitest";
import {EGG_IDEA_EXTERIOR_LENSES,EGG_IDEA_EXTERIOR_ORDER} from "../../lib/eggIdeaExterior";
import {parseEggFormedIdea} from "../../lib/eggFormedIdeaView";
import {readExteriorContribution,exteriorResearchAudit,exteriorAuditForExport} from "../../lib/eggIdeaResearchAudit";
describe("EGG external sphere quality protocol",()=>{
 it("requires an explicit non-overlapping professional contribution for each role",()=>{
  const deliverables=EGG_IDEA_EXTERIOR_ORDER.map(s=>EGG_IDEA_EXTERIOR_LENSES[s].deliverable);
  expect(new Set(deliverables).size).toBe(8);
  deliverables.forEach(d=>expect(d.length).toBeGreaterThan(80));
 });
 it("parses four actionable sections without claiming structural validity proves quality",()=>{
  const raw="ВКЛАД: Связь конструкции и выразительности может быть единой. \nОПОРА: Материал m1 даёт видимую плоскость. \nГИПОТЕЗА: Масса основания влияет на впечатление. \nПРОВЕРКА: Сравнить два реальных макета.";
  const f=readExteriorContribution(raw);
  expect(f.format).toBe("structured");
  expect(f.contribution).toContain("Связь конструкции");
  expect(f.basis).toContain("m1");
  expect(f.check).toContain("макета");
  expect(exteriorResearchAudit([{sphere:"design",text:raw}]).structured).toBe(1);
 });
 it("keeps old 8/8 responses readable, not silently reclassifying them as audited",()=>{
  const legacy="НАБЛЮДЕНИЕ: автор ищет пространственный акцент. ГИПОТЕЗА: нужны два состояния. НАПРЯЖЕНИЕ: образ и утилитарность.";
  expect(readExteriorContribution(legacy).format).toBe("legacy");
  expect(exteriorResearchAudit([{sphere:"design",text:legacy}]).legacy).toBe(1);
 });
 it("separates the novelty statement from DNA and retains original answer",()=>{
  const raw="ИДЕЯ: Небольшая пространственная форма сочетает опору и образ.\nПРИРОСТ: Найден принцип связи контакта и присутствия.\nОСНОВАНИЯ: Автор указал опору; фото m1 реально передано.\nНАПРЯЖЕНИЕ: Устойчивость требует проверки.\nВОПРОС: Что будет опираться?";
  const v=parseEggFormedIdea(raw);
  expect(v.idea).toBe("Небольшая пространственная форма сочетает опору и образ.");
  expect(v.idea).not.toContain("ПРИРОСТ");
  expect(v.growth).toContain("связи контакта");
  expect(v.basis).toContain("m1");
  expect(v.fullText).toContain("ПРИРОСТ");
 });
 it("exports all findings with the Author initiation and explicit evidence boundary",()=>{
  const output=exteriorAuditForExport("Авторский столик",[{sphere:"design",text:"ВКЛАД: принцип связи"}],"ИДЕЯ: объект");
  expect(output).toContain("ИНИЦИАЦИЯ АВТОРА:\nАвторский столик");
  expect(output).toContain("design:");
  expect(output).toContain("ВКЛАД: принцип связи");
  expect(output).toContain("без автоматической проверки интернета");
 });
});

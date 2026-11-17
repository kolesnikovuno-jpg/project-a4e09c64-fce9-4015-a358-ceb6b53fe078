import {describe,expect,it} from "vitest";
import {
 createEggMaterialMapRecord,eggMaterialInsight,eggMaterialSourceKey,
 isEggMaterialMapCurrent,readEggMaterialMapRecord,validateMaterialMapSources,
} from "../../lib/eggMaterialMap";
import {parseEggMaterialModelResponse} from "../../../api/egg-flow-ai";

const cards=[
 {id:"ref-1",type:"image",text:"Текучий изгиб",src:"data:image/jpeg;base64,AAAAA"},
 {id:"ref-2",type:"thought",text:"Тишина и воздушность"},
];
const draft={
 observations:[{text:"На первом изображении заметен изгиб.",sourceIds:["ref-1"]}],
 connections:[{text:"Оба материала относятся к выразительности формы.",sourceIds:["ref-1","ref-2"]}],
 tensions:[{text:"Неизвестно, должна ли форма иметь функцию.",sourceIds:["ref-2"]}],
 hypotheses:[{text:"Возможно, это самостоятельное присутствие.",sourceIds:["ref-1"]}],
 questions:["Какое внутреннее качество формы следует сохранить?"],
};
describe("EGG Material research map: explicit author gate",()=>{
 it("validates that AI only cites actual card IDs, not imaginary sources",()=>{
  const parsed=parseEggMaterialModelResponse(JSON.stringify({
   reply:"Выявлен образный мотив.",
   map:{...draft,hypotheses:[...draft.hypotheses,
    {text:"Придуманная информация об источнике.",sourceIds:["invented-id"]}]},
  }),cards.map(c=>c.id));
  expect(parsed.reply).toBe("Выявлен образный мотив.");
  expect(parsed.materialMap?.hypotheses).toHaveLength(1);
  expect(validateMaterialMapSources({
   ...draft,observations:[{text:"Придуманный факт о фото.",sourceIds:["fake"]}],
  },cards.map(c=>c.id))).toBeNull();
 });
 it("never sends draft/obsolete map into Idea, sends Author-accepted one only",()=>{
  const record=createEggMaterialMapRecord(draft,cards,"2026-11-17T18:00:00Z");
  expect(record.status).toBe("draft");
  expect(eggMaterialInsight(record,cards)).toBe("");
  const accepted={...record,status:"accepted" as const,acceptedAt:"2026-11-17T18:02:00Z"};
  const current=readEggMaterialMapRecord(accepted);
  expect(current?.status).toBe("accepted");
  const insight=eggMaterialInsight(current,cards);
  expect(insight).toContain("НАБЛЮДЕНИЯ");
  expect(insight).toContain("ИСТОЧНИКИ".toLowerCase());
  expect(insight).toContain("ГИПОТЕЗЫ");
  expect(eggMaterialInsight(current,[{...cards[0],text:"Сменили фото"},cards[1]])).toBe("");
  expect(isEggMaterialMapCurrent(current,cards)).toBe(true);
  expect(eggMaterialSourceKey([...cards].reverse())).toBe(eggMaterialSourceKey(cards));
 });
});

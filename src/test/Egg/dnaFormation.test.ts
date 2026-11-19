import {describe,it,expect} from "vitest";
import {
  buildEggDnaCandidate,eggDnaSourceKey,emptyEggDnaReview,
  isEggDnaReviewComplete,parseEggDnaSuggestion,
} from "../../lib/eggDnaFormation";

const materials=[
  {id:"selected-1",type:"thought",text:"Опора без традиционной формы кресла"},
  {id:"selected-2",type:"sketch",text:"Линия, поддерживающая тело"},
];
const source=()=>eggDnaSourceKey("Подставка для человеческого тела","",materials,"");
const fields=()=>({
  formedIdea:"Исследовать новые формы поддержки тела",
  essence:"Поддержка тела и свободное положение человека",
  invariants:"Поддерживать тело без обязательной типологии обычного кресла",
  openParameters:"Материалы, геометрия, крепления",
});
describe("EGG first level DNA formation",()=>{
  it("does not treat a raw intention or the latest AI answer as approved DNA",()=>{
    expect(buildEggDnaCandidate({...fields(),invariants:""})).toBeNull();
    expect(isEggDnaReviewComplete({...emptyEggDnaReview(),...fields()},source())).toBe(false);
  });
  it("requires an explicit Author review tied to the exact Idea and accepted Material",()=>{
    const reviewed={...fields(),sourceKey:source(),reviewedAt:"2026-11-19T20:00:00Z"};
    expect(isEggDnaReviewComplete(reviewed,source())).toBe(true);
    expect(isEggDnaReviewComplete(reviewed,eggDnaSourceKey(
      "Подставка для человеческого тела","",[{...materials[0],text:"Другое"},materials[1]],""
    ))).toBe(false);
    expect(isEggDnaReviewComplete({...reviewed,reviewedAt:null},source())).toBe(false);
  });
  it("keeps essence and invariants distinct from open design parameters",()=>{
    const candidate=buildEggDnaCandidate(fields());
    expect(candidate).toContain("СУЩНОСТЬ: Поддержка");
    expect(candidate).toContain("ИНВАРИАНТЫ: Поддерживать");
    expect(candidate).toContain("ОТКРЫТЫЕ ПАРАМЕТРЫ: Материалы");
    expect(candidate).not.toContain("Сформированная");
  });
  it("imports only structured, explicitly marked AI suggestions; never invents a missing invariant",()=>{
    const raw="ИДЕЯ: Подставка для тела\nСУЩНОСТЬ: Новая опора\nИНВАРИАНТЫ: Свободное положение\nОТКРЫТО: материал";
    expect(parseEggDnaSuggestion(raw)).toMatchObject({
      formedIdea:"Подставка для тела",essence:"Новая опора",
      invariants:"Свободное положение",openParameters:"материал",
    });
    expect(parseEggDnaSuggestion("Красивый объект, без деталей")).toBeNull();
    expect(parseEggDnaSuggestion("СУЩНОСТЬ: Опора\nОТКРЫТО: Все")).toBeNull();
  });
});

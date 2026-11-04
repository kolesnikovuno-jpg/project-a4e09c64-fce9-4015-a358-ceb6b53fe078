import { describe, it, expect } from "vitest";
import {buildEggAiHandoff,parseEggAiConcept} from "../lib/eggAiHandoff";

const ctx={
  projectId:"01b3d29f-bfc4-41ed-b31a-2e0db7fa2fe9",
  sphere:"idea" as const,
  revision:8,level:1,iteration:1,
  seed:"Лёгкое кресло. Плавная форма, деревянный каркас и натуральный лён.",
  returnUrl:"https://preview.example/egg?project=01b3d29f-bfc4-41ed-b31a-2e0db7fa2fe9&start=idea",
  tasks:[{sphere:"marketing",question:"Для кого предназначено?",status:"returned"}],
};
describe("EGG ChatGPT handoff",()=>{
 it("preserves the real project, scope and source idea without generating credentials",()=>{
  const text=buildEggAiHandoff(ctx);
  expect(text).toContain(ctx.projectId);
  expect(text).toContain("Ревизия при переходе: 8");
  expect(text).toContain(ctx.seed);
  expect(text).toContain("сферой «Идея»");
  expect(text).toContain("egg_get_project_state");
  expect(text).toContain("только если этот инструмент действительно доступен");
  expect(text).not.toContain("Authorization:");
  expect(text).not.toContain("service_role");
 });
 it("asks adaptive clarification questions before freezing the Idea concept",()=>{
  const prompt=buildEggAiHandoff(ctx);
  expect(prompt).toContain("АДАПТИВНЫЙ ДИАЛОГ");
  expect(prompt).toContain("по одному уточняющему вопросу");
  expect(prompt).toContain("Не показывай обязательную анкету");
  expect(prompt).toContain("не спрашивай повторно");
  expect(prompt).toContain("сказать «не знаю»");
  expect(prompt).toContain("Маркетинг и Право");
  expect(prompt).toContain("текстовую, графическую");
  expect(prompt).toContain("Не утверждай за Автора концепцию");
 });
 it("does not mistake a market inquiry for the Idea dialogue",()=>{
  const prompt=buildEggAiHandoff({...ctx,sphere:"marketing"});
  expect(prompt).not.toContain("ЯДРО СФЕРЫ «ИДЕЯ»");
  expect(prompt).toContain("Задача сферы «Маркетинг»");
 });
 it("hands each sphere its own job and existing questions",()=>{
  const text=buildEggAiHandoff({...ctx,sphere:"production",tasks:[
   {sphere:"marketing",question:"Только рынку",status:"returned"},
   {sphere:"production",question:"Как сохранить лёгкость?",status:"working"},
  ]});
  expect(text).toContain("Как сохранить лёгкость?");
  expect(text).not.toContain("Только рынку");
  expect(text).toContain("Сфера не может утвердить");
 });
 it("supports JSON from ChatGPT without committing changes to EGG",()=>{
  const result=parseEggAiConcept('```json\n{"concept":"Кресло как воздушная оболочка","visualUrl":"https://example.org/sketch.png","questions":[{"sphere":"design","question":"Какая линия?\u0020"},{"sphere":"production","question":"Какие соединения?"}]}\n```');
  expect(result).toEqual({concept:"Кресло как воздушная оболочка",visualUrl:"https://example.org/sketch.png",questions:[
   {sphere:"design",question:"Какая линия?"},{sphere:"production",question:"Какие соединения?"}
  ]});
 });
 it("accepts plain text, not just JSON",()=>{
  expect(parseEggAiConcept("Мягкая конструктивная оболочка").concept).toBe("Мягкая конструктивная оболочка");
  expect(parseEggAiConcept("Мягкая конструктивная оболочка").questions).toEqual([]);
 });
 it("rejects invalid and duplicate questions, non-web links and arbitrary JSON",()=>{
  expect(()=>parseEggAiConcept('{"concept":"Проверить","questions":[{"sphere":"idea","question":"Нельзя"}]}')).toThrow(/сферу/i);
  expect(()=>parseEggAiConcept('{"concept":"Проверить","questions":[{"sphere":"legal","question":"Один"},{"sphere":"legal","question":"Два"}]}')).toThrow(/сферу/i);
  expect(()=>parseEggAiConcept('{"concept":"Проверить","visualUrl":"javascript:alert(1)"}')).toThrow(/ссылка/i);
  expect(()=>parseEggAiConcept('{"concept":""}')).toThrow(/Концепция/i);
 });
});

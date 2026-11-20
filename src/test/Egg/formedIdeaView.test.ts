import {describe,expect,it} from "vitest";
import {parseEggFormedIdea} from "../../lib/eggFormedIdeaView";

describe("EGG formed Idea is not the whole eight-sphere report",()=>{
 const screenshot=`**Рабочая Идея:** небольшой столик-подставка, который одновременно существует как самостоятельный арт-акцент: его практическая роль понятна, но выразительность не сводится к функции. В Материальном (ID 3h8js8jpz2g, fbyprfjtspt) заметно напряжение между тонкой верхней плоскостью и весомым основанием; это возможный визуальный ориентир, не заданная форма. Изображения интерьеров (ID 7ol3g82bnfy, dafhg4s5jse) дают контекст размещения.

**Главное напряжение:** арт-жест может перетянуть внимание на себя, а слишком нейтральная подставка — утратить характер акцента. Это исследовательские гипотезы, не результаты испытаний или рыночной проверки.

**Вопрос:** что должно считываться первым — удобство подставки или присутствие арт-объекта?

Следующий шаг: проверь формулировку в разделе «Идея → ДНК».`;
 it("isolates just the substantive formed Idea from the actual eight-sphere synthesis",()=>{
  const v=parseEggFormedIdea(screenshot);
  expect(v.idea).toContain("небольшой столик-подставка");
  expect(v.idea).toContain("не сводится к функции");
  expect(v.idea).not.toContain("В Материальном");
  expect(v.idea).not.toContain("3h8js8jpz2g");
  expect(v.tension).toContain("арт-жест");
  expect(v.question).toContain("что должно считываться первым");
  expect(v.question).not.toContain("Следующий шаг");
  expect(v.fullText).toContain("3h8js8jpz2g");
  expect(v.fullText).not.toContain("**");
 });
 it("parses compact future AI synthesis without injecting unsupported conclusions",()=>{
  const v=parseEggFormedIdea("ИДЕЯ: Опора и художественное присутствие образуют единое решение.\nОСНОВАНИЯ: Материал m1 показывает линию поддержки.\nНАПРЯЖЕНИЕ: Границы функции пока открыты.\nВОПРОС: Каков желаемый контакт?");
  expect(v.idea).toBe("Опора и художественное присутствие образуют единое решение.");
  expect(v.tension).toBe("Границы функции пока открыты.");
  expect(v.question).toBe("Каков желаемый контакт?");
 });
 it("gracefully returns a single unstructured sentence",()=>{
  const v=parseEggFormedIdea("Столик обладает выразительной самостоятельностью. Реализация ещё не определена.");
  expect(v.idea).toBe("Столик обладает выразительной самостоятельностью.");
  expect(v.fullText).toContain("Реализация");
 });
});

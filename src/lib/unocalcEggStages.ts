/** Five nested visual maturity levels of the object's core.
 * These values are manually assigned for the Egg prototype: never inferred
 * from the amount of text or from an unverified review.
 */
export const EGG_STAGES = [
  { index: 1, ru: "Идея", uk: "Ідея", en: "Idea", color: "#D85B61", radius: 16 },
  { index: 2, ru: "Концепт", uk: "Концепт", en: "Concept", color: "#E7A35A", radius: 23 },
  { index: 3, ru: "Проект", uk: "Проєкт", en: "Project", color: "#E9CC67", radius: 30 },
  { index: 4, ru: "Тестовый образец", uk: "Тестовий зразок", en: "Test prototype", color: "#68BA9B", radius: 37 },
  { index: 5, ru: "Промышленный образец", uk: "Промисловий зразок", en: "Industrial sample", color: "#7397D6", radius: 45 },
] as const;

export type EggStageNumber = 1 | 2 | 3 | 4 | 5;
export type EggMaturity = { stage: EggStageNumber; iteration: number };
export const EGG_STAGE_KEY = "unocalc.egg.maturity.v1";
export const NEW_EGG_MATURITY: EggMaturity = { stage: 1, iteration: 1 };
export const setEggStage = (current: EggMaturity, stage: EggStageNumber): EggMaturity =>
  current.stage === stage ? current : { stage, iteration: 1 };
export const nextEggIteration = (current: EggMaturity): EggMaturity =>
  ({ ...current, iteration: Math.min(999, current.iteration + 1) });

export const restoreEggMaturity = (): EggMaturity => {
  try {
    const raw = window.localStorage.getItem(EGG_STAGE_KEY);
    if (!raw) return { ...NEW_EGG_MATURITY };
    const value: unknown = JSON.parse(raw);
    if (value && typeof value === "object") {
      const stage = (value as Partial<EggMaturity>).stage;
      const iteration = (value as Partial<EggMaturity>).iteration;
      if (Number.isInteger(stage) && typeof stage === "number" && stage >= 1 && stage <= 5 &&
        Number.isInteger(iteration) && typeof iteration === "number" && iteration >= 1 && iteration <= 999) {
        return { stage: stage as EggStageNumber, iteration };
      }
    }
  } catch { /* use default without implying completed stages */ }
  return { ...NEW_EGG_MATURITY };
};

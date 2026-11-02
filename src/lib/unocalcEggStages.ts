/** Semantic maturity axis: permanent Idea (violet) and Matter (red) poles,
 * with five revisitable formation stages between them.
 *
 * Maturity is a manual presentation state, NOT automatically certified by
 * feedback, number of sketches or quantity of text in a sphere.
 */
export const EGG_POLES = {
  idea: { ru: "Идея", uk: "Ідея", en: "Idea", color: "#8C50C9" },
  matter: { ru: "Материя", uk: "Матерія", en: "Matter", color: "#D64F59" },
} as const;

export const EGG_STAGES = [
  { index: 1, ru: "Замысел", uk: "Задум", en: "Intention", color: "#5369CE", radius: 16 },
  { index: 2, ru: "Концепт", uk: "Концепт", en: "Concept", color: "#20AAC9", radius: 23 },
  { index: 3, ru: "Проект", uk: "Проєкт", en: "Project", color: "#35AF79", radius: 30 },
  { index: 4, ru: "Тестовый образец", uk: "Тестовий зразок", en: "Test prototype", color: "#DFC44F", radius: 37 },
  { index: 5, ru: "Промышленный образец", uk: "Промисловий зразок", en: "Industrial sample", color: "#E79438", radius: 45 },
] as const;

export type EggStageNumber = 1 | 2 | 3 | 4 | 5;
export type EggStageState = "completed" | "current" | "future";
export type EggMaturity = { stage: EggStageNumber; iteration: number };
export const EGG_STAGE_KEY = "unocalc.egg.maturity.v1";
export const NEW_EGG_MATURITY: EggMaturity = { stage: 1, iteration: 1 };

export const eggStageState = (maturity: EggMaturity, index: EggStageNumber): EggStageState =>
  index < maturity.stage ? "completed" : index === maturity.stage ? "current" : "future";

export const setEggStage = (current: EggMaturity, stage: EggStageNumber): EggMaturity =>
  current.stage === stage ? current : { stage, iteration: 1 };
export const nextEggIteration = (current: EggMaturity): EggMaturity =>
  ({ ...current, iteration: Math.min(999, current.iteration + 1) });

/** Previous v1 stage numbers are retained, so existing preview data survives
 * the colour and stage-1 name change. A new seed resets maturity separately. */
export const restoreEggMaturity = (): EggMaturity => {
  try {
    const raw = window.localStorage.getItem(EGG_STAGE_KEY);
    if (!raw) return { ...NEW_EGG_MATURITY };
    const value: unknown = JSON.parse(raw);
    if (value && typeof value === "object") {
      const stage = (value as Partial<EggMaturity>).stage;
      const iteration = (value as Partial<EggMaturity>).iteration;
      if (typeof stage === "number" && Number.isInteger(stage) && stage >= 1 && stage <= 5 &&
        typeof iteration === "number" && Number.isInteger(iteration) && iteration >= 1 && iteration <= 999) {
        return { stage: stage as EggStageNumber, iteration };
      }
    }
  } catch { /* use default without implying completed stages */ }
  return { ...NEW_EGG_MATURITY };
};

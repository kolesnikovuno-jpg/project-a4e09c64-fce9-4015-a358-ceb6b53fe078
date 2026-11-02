/** Semantic axis: permanent violet Idea / red Matter poles.
 *
 * Stage positions and numbers are set BOTTOM -> TOP. A new authored seed
 * begins at level 1 (orange, Intention), then levels 2..5 as it matures.
 * This model is a manual interface state, not certification of readiness.
 */
export const EGG_POLES = {
  idea: { ru: "Идея", uk: "Ідея", en: "Idea", color: "#8C50C9" },
  matter: { ru: "Материя", uk: "Матерія", en: "Matter", color: "#D64F59" },
} as const;

/** SVG rendering order is top -> bottom; semantic order is 1 -> 5. */
export const EGG_STAGES = [
  { index: 5, ru: "Промышленный образец", uk: "Промисловий зразок", en: "Industrial sample", color: "#5369CE" },
  { index: 4, ru: "Тестовый образец", uk: "Тестовий зразок", en: "Test prototype", color: "#20AAC9" },
  { index: 3, ru: "Проект", uk: "Проєкт", en: "Project", color: "#35AF79" },
  { index: 2, ru: "Концепт", uk: "Концепт", en: "Concept", color: "#DFC44F" },
  { index: 1, ru: "Замысел", uk: "Задум", en: "Intention", color: "#E79438" },
] as const;

export type EggStageNumber = 1 | 2 | 3 | 4 | 5;
export type EggStageState = "completed" | "current" | "future";
export type EggMaturity = { stage: EggStageNumber; iteration: number };

/** v3 intentionally starts a fresh stage display when earlier contradictory
 * numbering schemes existed. It does NOT reset existing seed, cycle, sketches,
 * or reviews, which use different storage keys. */
export const EGG_STAGE_KEY = "unocalc.egg.maturity.v3";
export const NEW_EGG_MATURITY: EggMaturity = { stage: 1, iteration: 1 };

export const eggStageState = (maturity: EggMaturity, index: EggStageNumber): EggStageState =>
  index < maturity.stage ? "completed" : index === maturity.stage ? "current" : "future";

export const setEggStage = (current: EggMaturity, stage: EggStageNumber): EggMaturity =>
  current.stage === stage ? current : { stage, iteration: 1 };
export const nextEggIteration = (current: EggMaturity): EggMaturity =>
  ({ ...current, iteration: Math.min(999, current.iteration + 1) });

const parseMaturity = (raw: string | null): EggMaturity | null => {
  if (!raw) return null;
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object") return null;
  const stage = (value as Partial<EggMaturity>).stage;
  const iteration = (value as Partial<EggMaturity>).iteration;
  if (typeof stage !== "number" || !Number.isInteger(stage) || stage < 1 || stage > 5 ||
      typeof iteration !== "number" || !Number.isInteger(iteration) || iteration < 1 || iteration > 999) {
    return null;
  }
  return { stage: stage as EggStageNumber, iteration };
};

export const restoreEggMaturity = (): EggMaturity => {
  try {
    const current = parseMaturity(window.localStorage.getItem(EGG_STAGE_KEY));
    if (current) return current;
  } catch { /* use default when storage is unavailable or malformed */ }
  return { ...NEW_EGG_MATURITY };
};

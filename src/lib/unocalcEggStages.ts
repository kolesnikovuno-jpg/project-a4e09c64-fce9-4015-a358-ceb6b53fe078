/** The Idea (violet) / Matter (red) poles are permanent, not stages.
 * Colours are presented TOP -> BOTTOM (Idea -> Matter), while the stage
 * NUMBERS count BOTTOM -> TOP (Matter -> Idea). The workflow therefore
 * moves 5 -> 4 -> 3 -> 2 -> 1 as form approaches the material pole.
 * Maturity remains manually set; it is not certification of readiness.
 */
export const EGG_POLES = {
  idea: { ru: "Идея", uk: "Ідея", en: "Idea", color: "#8C50C9" },
  matter: { ru: "Материя", uk: "Матерія", en: "Matter", color: "#D64F59" },
} as const;

/** Visual order along the vertical axis, starting just below Idea. */
export const EGG_STAGES = [
  { index: 5, ru: "Замысел", uk: "Задум", en: "Intention", color: "#5369CE" },
  { index: 4, ru: "Концепт", uk: "Концепт", en: "Concept", color: "#20AAC9" },
  { index: 3, ru: "Проект", uk: "Проєкт", en: "Project", color: "#35AF79" },
  { index: 2, ru: "Тестовый образец", uk: "Тестовий зразок", en: "Test prototype", color: "#DFC44F" },
  { index: 1, ru: "Промышленный образец", uk: "Промисловий зразок", en: "Industrial sample", color: "#E79438" },
] as const;

export type EggStageNumber = 1 | 2 | 3 | 4 | 5;
export type EggStageState = "completed" | "current" | "future";
export type EggMaturity = { stage: EggStageNumber; iteration: number };

/** New semantic numbering; v1 is read once with its top-down stage number
 * converted, so an existing preview retains its stage position and iteration. */
export const EGG_STAGE_KEY = "unocalc.egg.maturity.v2";
const LEGACY_EGG_STAGE_KEY = "unocalc.egg.maturity.v1";
export const NEW_EGG_MATURITY: EggMaturity = { stage: 5, iteration: 1 };

export const eggStageState = (maturity: EggMaturity, index: EggStageNumber): EggStageState =>
  index > maturity.stage ? "completed" : index === maturity.stage ? "current" : "future";

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
    const legacy = parseMaturity(window.localStorage.getItem(LEGACY_EGG_STAGE_KEY));
    if (legacy) return { stage: (6 - legacy.stage) as EggStageNumber, iteration: legacy.iteration };
  } catch { /* use default when storage unavailable or malformed */ }
  return { ...NEW_EGG_MATURITY };
};

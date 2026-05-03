import type { Locale } from "@/i18n/config";

export type ModelStage = "concept" | "prototype" | "production";

export interface ModelEntry {
  slug: string;
  name: string;
  stage: ModelStage;
  ogImage: string;
}

/**
 * Single source of truth for all model pages. New models added here are
 * automatically picked up by the SEO meta system, the in-page hidden H1 /
 * description block, the internal-linking helper, hreflang generation and
 * sitemap.xml emission.
 */
export const MODELS: ModelEntry[] = [
  { slug: "lyra", name: "LYRA", stage: "prototype", ogImage: "/og/lyra-preview.png" },
  { slug: "nava", name: "NAVA", stage: "prototype", ogImage: "/og/nava-preview.png" },
];

export const getModel = (slug: string): ModelEntry | undefined =>
  MODELS.find((m) => m.slug === slug);

const STAGE_LABEL: Record<Locale, Record<ModelStage, string>> = {
  en: { concept: "Concept", prototype: "Prototype", production: "Production" },
  ru: { concept: "Концепт", prototype: "Прототип", production: "Производство" },
  uk: { concept: "Концепт", prototype: "Прототип", production: "Виробництво" },
};

export const stageLabel = (locale: Locale, stage: ModelStage) =>
  STAGE_LABEL[locale][stage];

const TEMPLATES: Record<
  Locale,
  { title: (n: string, s: string) => string; description: (n: string, s: string) => string }
> = {
  en: {
    title: (n, s) => `${n} — ${s} | Kolesnikov`,
    description: (n, s) =>
      `${n} is a ${s.toLowerCase()} object exploring the transition from concept to material form within the Kolesnikov system.`,
  },
  ru: {
    title: (n, s) => `${n} — ${s} | Kolesnikov`,
    description: (n, s) =>
      `${n} — объект на стадии «${s.toLowerCase()}», исследующий переход от идеи к материальной форме в системе Kolesnikov.`,
  },
  uk: {
    title: (n, s) => `${n} — ${s} | Kolesnikov`,
    description: (n, s) =>
      `${n} — об'єкт на стадії «${s.toLowerCase()}», що досліджує перехід від ідеї до матеріальної форми в системі Kolesnikov.`,
  },
};

export const modelMeta = (model: ModelEntry, locale: Locale) => {
  const stage = stageLabel(locale, model.stage);
  return {
    title: TEMPLATES[locale].title(model.name, stage),
    description: TEMPLATES[locale].description(model.name, stage),
    stage,
  };
};

const HIDDEN_TEXT: Record<Locale, (n: string, s: string) => string> = {
  en: (n, s) =>
    `${n} is a design object developed within the Kolesnikov system. It represents the ${s.toLowerCase()} stage between concept and production, exploring the transition from idea to material form.`,
  ru: (n, s) =>
    `${n} — дизайн-объект, созданный в системе Kolesnikov. Он представляет стадию «${s.toLowerCase()}» между концептом и производством, исследуя переход от идеи к материальной форме.`,
  uk: (n, s) =>
    `${n} — дизайн-об'єкт, створений у системі Kolesnikov. Він представляє стадію «${s.toLowerCase()}» між концептом і виробництвом, досліджуючи перехід від ідеї до матеріальної форми.`,
};

export const modelHiddenText = (model: ModelEntry, locale: Locale) =>
  HIDDEN_TEXT[locale](model.name, stageLabel(locale, model.stage));

const RELATED_LABEL: Record<Locale, string> = {
  en: "Related objects",
  ru: "Связанные объекты",
  uk: "Пов'язані об'єкти",
};

const GARDEN_LABEL: Record<Locale, string> = {
  en: "Garden — index of objects",
  ru: "Сад — указатель объектов",
  uk: "Сад — покажчик об'єктів",
};

export const relatedLinksLabel = (locale: Locale) => RELATED_LABEL[locale];
export const gardenLinkLabel = (locale: Locale) => GARDEN_LABEL[locale];
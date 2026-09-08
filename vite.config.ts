import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import ogPages from "./vite-plugin-og-pages";
import sitemap from "./vite-plugin-sitemap";

const SITE_URL = "https://kolesnikov.uno";

// Build-time mirror of src/models/registry.ts. Keep entries in sync — adding a
// new model here automatically generates pre-rendered OG HTML, hreflang
// alternates and sitemap.xml entries for every locale.
const LOCALES = ["en", "ru", "uk"] as const;
type Locale = (typeof LOCALES)[number];
type Stage = "concept" | "prototype" | "production";

const MODELS: { slug: string; name: string; stage: Stage; image: string }[] = [
  { slug: "lyra", name: "LYRA", stage: "prototype", image: "/og/lyra-preview.png" },
  { slug: "nava", name: "NAVA", stage: "prototype", image: "/og/nava-preview.png" },
  { slug: "void", name: "VOID", stage: "concept", image: "/og/lyra-preview.png" },
];

const STAGE_LABEL: Record<Locale, Record<Stage, string>> = {
  en: { concept: "Concept", prototype: "Prototype", production: "Production" },
  ru: { concept: "Концепт", prototype: "Прототип", production: "Производство" },
  uk: { concept: "Концепт", prototype: "Прототип", production: "Виробництво" },
};

const titleFor = (name: string, stage: string) => `${name} — ${stage} | Kolesnikov`;
const descFor = (locale: Locale, name: string, stage: string) => {
  const lower = stage.toLowerCase();
  if (locale === "ru")
    return `${name} — объект на стадии «${lower}», исследующий переход от идеи к материальной форме в системе Kolesnikov.`;
  if (locale === "uk")
    return `${name} — об'єкт на стадії «${lower}», що досліджує перехід від ідеї до матеріальної форми в системі Kolesnikov.`;
  return `${name} is a ${lower} object exploring the transition from concept to material form within the Kolesnikov system.`;
};

const ogPagesList = MODELS.flatMap((m) => {
  const alternates: Record<string, string> = { "x-default": `/en/${m.slug}` };
  for (const l of LOCALES) alternates[l] = `/${l}/${m.slug}`;
  return LOCALES.map((l) => {
    const stage = STAGE_LABEL[l][m.stage];
    return {
      route: `/${l}/${m.slug}`,
      title: titleFor(m.name, stage),
      description: descFor(l, m.name, stage),
      image: m.image,
      type: "product",
      alternates,
    };
  });
});

// Per-locale titles/descriptions for non-model static pages, so social
// crawlers (which don't execute JS) see unique previews per route.
const STATIC_META: Record<
  string,
  Record<Locale, { title: string; description: string }>
> = {
  "": {
    en: { title: "Kolesnikov.studio — Architecture · Design · Research · Product", description: "I discover economically interesting opportunities and turn them into product constructions." },
    ru: { title: "Kolesnikov.studio — Архитектура · Дизайн · Исследование · Продукт", description: "Я обнаруживаю экономически интересные возможности и превращаю их в продуктовые конструкции." },
    uk: { title: "Kolesnikov.studio — Архітектура · Дизайн · Дослідження · Продукт", description: "Я виявляю економічно цікаві можливості та перетворюю їх на продуктові конструкції." },
  },
  method: {
    en: { title: "Method — Kolesnikov.studio", description: "Observe, analyze, concept, construct, realize — how an opportunity becomes a workable form." },
    ru: { title: "Метод — Kolesnikov.studio", description: "Наблюдение, анализ, концепт, конструкция, реализация — как возможность становится рабочей формой." },
    uk: { title: "Метод — Kolesnikov.studio", description: "Спостереження, аналіз, концепт, конструкція, реалізація — як можливість стає робочою формою." },
  },
  cases: {
    en: { title: "Cases — Kolesnikov.studio", description: "Projects organised around what was observed and what it became." },
    ru: { title: "Кейсы — Kolesnikov.studio", description: "Проекты, выстроенные вокруг наблюдения и того, чем оно стало." },
    uk: { title: "Кейси — Kolesnikov.studio", description: "Проєкти, вибудувані навколо спостереження і того, чим воно стало." },
  },
  exchange: {
    en: { title: "Exchange — Kolesnikov.studio", description: "Collaboration models: research, concept, prototype, partnership." },
    ru: { title: "Обмен — Kolesnikov.studio", description: "Модели сотрудничества: исследование, концепт, прототип, партнёрство." },
    uk: { title: "Обмін — Kolesnikov.studio", description: "Моделі співпраці: дослідження, концепт, прототип, партнерство." },
  },
  studio: {
    en: { title: "Studio — Kolesnikov.studio", description: "An author-led practice between architecture, design, research and product development." },
    ru: { title: "Студия — Kolesnikov.studio", description: "Авторская практика между архитектурой, дизайном, исследованием и разработкой продукта." },
    uk: { title: "Студія — Kolesnikov.studio", description: "Авторська практика між архітектурою, дизайном, дослідженням і розробкою продукту." },
  },
  start: {
    en: { title: "Start — Kolesnikov.studio", description: "Start with what you have: a problem, an idea, a material, a space or an observation." },
    ru: { title: "Начать — Kolesnikov.studio", description: "Начните с того, что у вас есть: проблема, идея, материал, пространство или наблюдение." },
    uk: { title: "Почати — Kolesnikov.studio", description: "Почніть з того, що у вас є: проблема, ідея, матеріал, простір або спостереження." },
  },
  about: {
    en: { title: "About — Kolesnikov", description: "About .uno studio: practice, principles and the people behind the work." },
    ru: { title: "О студии — Колесников", description: "О .uno studio: практика, принципы и люди, стоящие за работой." },
    uk: { title: "Про студію — Колесников", description: "Про .uno studio: практика, принципи і люди, що стоять за роботою." },
  },
  pricing: {
    en: { title: "Pricing — Kolesnikov", description: "Pricing and engagement model for working with .uno studio." },
    ru: { title: "Стоимость — Колесников", description: "Стоимость и модель работы со студией .uno." },
    uk: { title: "Вартість — Колесников", description: "Вартість і модель співпраці зі студією .uno." },
  },
  garden: {
    en: { title: "Garden — Kolesnikov", description: "Garden: an index of objects developed within the Kolesnikov system." },
    ru: { title: "Сад — Колесников", description: "Сад: указатель объектов, созданных в системе Kolesnikov." },
    uk: { title: "Сад — Колесников", description: "Сад: покажчик об'єктів, створених у системі Kolesnikov." },
  },
  gateway: {
    en: { title: "Gateway — Kolesnikov", description: "Gateway into the Kolesnikov system." },
    ru: { title: "Врата — Колесников", description: "Вход в систему Kolesnikov." },
    uk: { title: "Брама — Колесников", description: "Вхід у систему Kolesnikov." },
  },
  unostudio: {
    en: { title: ".uno studio — Kolesnikov", description: ".uno studio: architecture, design and art practice by Kolesnikov." },
    ru: { title: ".uno studio — Колесников", description: ".uno studio: практика архитектуры, дизайна и искусства Колесникова." },
    uk: { title: ".uno studio — Колесников", description: ".uno studio: практика архітектури, дизайну та мистецтва Колесникова." },
  },
  clarity: {
    en: { title: "Structural Clarity — Kolesnikov", description: "Structural Clarity — a curated structural analysis of your situation by .uno studio." },
    ru: { title: "Структурная ясность — Колесников", description: "Структурная ясность — точечный структурный анализ вашей ситуации от .uno studio." },
    uk: { title: "Структурна ясність — Колесников", description: "Структурна ясність — точковий структурний аналіз вашої ситуації від .uno studio." },
  },
};

const staticOgPages = Object.entries(STATIC_META).flatMap(([p, byLocale]) => {
  const alternates: Record<string, string> = { "x-default": `/en/${p}` };
  for (const l of LOCALES) alternates[l] = `/${l}/${p}`;
  return LOCALES.map((l) => ({
    route: `/${l}${p ? "/" + p : ""}`,
    title: byLocale[l].title,
    description: byLocale[l].description,
    image: "/og/lyra-preview.png",
    type: "website",
    alternates,
  }));
});

const allOgPages = [...ogPagesList, ...staticOgPages];

// Static (non-model) pages mirrored across locales.
const STATIC_PAGES = ["", "method", "cases", "exchange", "studio", "start", "about", "pricing", "garden", "gateway", "unostudio", "clarity"];
const sitemapEntries = [
  ...STATIC_PAGES.flatMap((p) => {
    const alternates: Record<string, string> = { "x-default": `/en/${p}` };
    for (const l of LOCALES) alternates[l] = `/${l}/${p}`;
    return LOCALES.map((l) => ({
      loc: `/${l}${p ? "/" + p : ""}`,
      changefreq: "monthly" as const,
      priority: p === "" ? 1.0 : 0.7,
      alternates,
    }));
  }),
  ...MODELS.flatMap((m) => {
    const alternates: Record<string, string> = { "x-default": `/en/${m.slug}` };
    for (const l of LOCALES) alternates[l] = `/${l}/${m.slug}`;
    return LOCALES.map((l) => ({
      loc: `/${l}/${m.slug}`,
      changefreq: "monthly" as const,
      priority: 0.8,
      alternates,
    }));
  }),
  // Non-localized utility routes (single-language).
  { loc: "/doodle", changefreq: "yearly" as const, priority: 0.3 },
  { loc: "/pixels", changefreq: "yearly" as const, priority: 0.3 },
  { loc: "/unocalc", changefreq: "yearly" as const, priority: 0.3 },
  { loc: "/lyra-concept", changefreq: "yearly" as const, priority: 0.3 },
];

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    ogPages({ siteUrl: SITE_URL, pages: allOgPages }),
    sitemap({ siteUrl: SITE_URL, entries: sitemapEntries }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));

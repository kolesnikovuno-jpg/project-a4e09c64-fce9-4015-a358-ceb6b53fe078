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

// Static (non-model) pages mirrored across locales.
const STATIC_PAGES = ["", "about", "pricing", "garden", "gateway", "unostudio"];
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
    ogPages({ siteUrl: SITE_URL, pages: ogPagesList }),
    sitemap({ siteUrl: SITE_URL, entries: sitemapEntries }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));

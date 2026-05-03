import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import ogPages from "./vite-plugin-og-pages";

const SITE_URL = "https://kolesnikov.uno";

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
    ogPages({
      siteUrl: SITE_URL,
      pages: (() => {
        // Multilingual Lyra. EN is canonical; RU/UK adapted from EN.
        const alternates = {
          en: "/en/lyra",
          ru: "/ru/lyra",
          uk: "/uk/lyra",
          "x-default": "/en/lyra",
        };
        const navaAlternates = {
          en: "/en/nava",
          ru: "/ru/nava",
          uk: "/uk/nava",
          "x-default": "/en/nava",
        };
        return [
          {
            route: "/en/lyra",
            title: "LYRA — .uno studio",
            description:
              "LYRA — tension-based seating system. Flexible support structure, minimal material, adaptive response.",
            image: "/og/lyra-preview.png",
            type: "product",
            alternates,
          },
          {
            route: "/ru/lyra",
            title: "LYRA — .uno studio",
            description:
              "LYRA — система сидения, основанная на натяжении. Гибкая опора, минимум материала, отзывчивая форма.",
            image: "/og/lyra-preview.png",
            type: "product",
            alternates,
          },
          {
            route: "/uk/lyra",
            title: "LYRA — .uno studio",
            description:
              "LYRA — система сидіння на натягу. Гнучка опора, мінімум матеріалу, чутлива форма.",
            image: "/og/lyra-preview.png",
            type: "product",
            alternates,
          },
          {
            route: "/en/nava",
            title: "NAVA — .uno studio",
            description:
              "NAVA — a lounge chair defined by a continuous frame and a suspended soft volume. Form that holds the body.",
            image: "/og/nava-preview.png",
            type: "product",
            alternates: navaAlternates,
          },
          {
            route: "/ru/nava",
            title: "NAVA — .uno studio",
            description:
              "NAVA — кресло на непрерывном каркасе с подвешенным мягким объёмом. Форма, которая держит тело.",
            image: "/og/nava-preview.png",
            type: "product",
            alternates: navaAlternates,
          },
          {
            route: "/uk/nava",
            title: "NAVA — .uno studio",
            description:
              "NAVA — крісло на безперервному каркасі з підвішеним м'яким об'ємом. Форма, що тримає тіло.",
            image: "/og/nava-preview.png",
            type: "product",
            alternates: navaAlternates,
          },
        ];
      })(),
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));

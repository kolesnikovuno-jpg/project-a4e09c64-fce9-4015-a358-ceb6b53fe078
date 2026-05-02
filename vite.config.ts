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

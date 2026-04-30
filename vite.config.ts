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
      pages: [
        {
          route: "/lyra",
          title: "LYRA — .uno studio",
          description:
            "LYRA — tension-based seating system. Flexible support structure, minimal material, adaptive response.",
          image: "/og/lyra-preview.png",
          type: "product",
        },
      ],
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));

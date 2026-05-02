import type { Plugin } from "vite";
import fs from "node:fs";
import path from "node:path";

export type OgPage = {
  /** Route path, e.g. "/lyra" — will be emitted as "lyra/index.html" */
  route: string;
  title: string;
  description: string;
  /** Path relative to site root, e.g. "/og/lyra-preview.png" */
  image: string;
  type?: string;
  /** Optional per-locale alternate URLs for hreflang tags. */
  alternates?: Record<string, string>;
};

type Options = {
  siteUrl: string;
  pages: OgPage[];
};

/**
 * Emits per-route static HTML files (lyra/index.html, etc.) cloned from the
 * built index.html with route-specific <title>, description and Open Graph /
 * Twitter meta tags injected into <head>.
 *
 * Why: SPA crawlers used by Telegram / WhatsApp / iMessage do not execute JS,
 * so they only see the meta tags present in the initial HTML response. By
 * pre-emitting per-route HTML we guarantee correct link previews while the
 * SPA continues to handle client-side navigation for real users.
 */
export default function ogPages({ siteUrl, pages }: Options): Plugin {
  const escape = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const buildHead = (page: OgPage) => {
    const absUrl = siteUrl.replace(/\/$/, "") + page.route;
    const absImage = /^https?:\/\//i.test(page.image)
      ? page.image
      : siteUrl.replace(/\/$/, "") + page.image;
    const type = page.type || "website";
    const tags = [
      `<title>${escape(page.title)}</title>`,
      `<meta name="description" content="${escape(page.description)}">`,
      `<link rel="canonical" href="${escape(absUrl)}">`,
      `<meta property="og:type" content="${escape(type)}">`,
      `<meta property="og:title" content="${escape(page.title)}">`,
      `<meta property="og:description" content="${escape(page.description)}">`,
      `<meta property="og:image" content="${escape(absImage)}">`,
      `<meta property="og:url" content="${escape(absUrl)}">`,
      `<meta name="twitter:card" content="summary_large_image">`,
      `<meta name="twitter:title" content="${escape(page.title)}">`,
      `<meta name="twitter:description" content="${escape(page.description)}">`,
      `<meta name="twitter:image" content="${escape(absImage)}">`,
    ];
    if (page.alternates) {
      const entries = Object.entries(page.alternates);
      for (const [lang, href] of entries) {
        const abs = /^https?:\/\//i.test(href)
          ? href
          : siteUrl.replace(/\/$/, "") + href;
        tags.push(
          `<link rel="alternate" hreflang="${escape(lang)}" href="${escape(abs)}">`,
        );
      }
      if (!entries.some(([l]) => l === "x-default")) {
        tags.push(
          `<link rel="alternate" hreflang="x-default" href="${escape(absUrl)}">`,
        );
      }
    }
    return tags.join("\n    ");
  };

  const rewriteHtml = (html: string, page: OgPage) => {
    let out = html;
    // Strip existing title / description / og: / twitter: / canonical tags so
    // they cannot override our per-page values.
    out = out.replace(/<title>[\s\S]*?<\/title>/i, "");
    out = out.replace(/<meta\s+name=["']description["'][^>]*>\s*/gi, "");
    out = out.replace(/<meta\s+property=["']og:[^"']+["'][^>]*>\s*/gi, "");
    out = out.replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>\s*/gi, "");
    out = out.replace(/<link\s+rel=["']canonical["'][^>]*>\s*/gi, "");
    // Inject the new head block right before </head>.
    out = out.replace(/<\/head>/i, `    ${buildHead(page)}\n  </head>`);
    return out;
  };

  return {
    name: "og-pages",
    apply: "build",
    closeBundle() {
      const distDir = path.resolve(process.cwd(), "dist");
      const indexPath = path.join(distDir, "index.html");
      if (!fs.existsSync(indexPath)) return;
      const baseHtml = fs.readFileSync(indexPath, "utf8");
      for (const page of pages) {
        const route = page.route.replace(/^\//, "").replace(/\/$/, "");
        if (!route) continue;
        const outDir = path.join(distDir, route);
        fs.mkdirSync(outDir, { recursive: true });
        const html = rewriteHtml(baseHtml, page);
        fs.writeFileSync(path.join(outDir, "index.html"), html, "utf8");
      }
    },
  };
}
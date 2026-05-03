import type { Plugin } from "vite";
import fs from "node:fs";
import path from "node:path";

export type SitemapEntry = {
  /** Path relative to site root, e.g. "/en/lyra" */
  loc: string;
  /** Optional <lastmod> ISO date. Defaults to build time. */
  lastmod?: string;
  /** Optional change frequency. */
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  /** Optional priority (0.0 – 1.0). */
  priority?: number;
  /** Optional locale alternates for xhtml:link hreflang tags. */
  alternates?: Record<string, string>;
};

type Options = {
  siteUrl: string;
  entries: SitemapEntry[];
};

/**
 * Emits a `sitemap.xml` (with hreflang alternates) at the dist root and
 * patches `robots.txt` to reference it. Entry list is built at config time
 * from the same registry that drives in-app routing, so adding a new model
 * page is a single-source-of-truth change.
 */
export default function sitemap({ siteUrl, entries }: Options): Plugin {
  const escape = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const abs = (p: string) =>
    /^https?:\/\//i.test(p) ? p : siteUrl.replace(/\/$/, "") + p;

  return {
    name: "sitemap",
    apply: "build",
    closeBundle() {
      const distDir = path.resolve(process.cwd(), "dist");
      if (!fs.existsSync(distDir)) return;
      const today = new Date().toISOString().slice(0, 10);
      const xmlBody = entries
        .map((e) => {
          const altLinks = e.alternates
            ? Object.entries(e.alternates)
                .map(
                  ([lang, href]) =>
                    `      <xhtml:link rel="alternate" hreflang="${escape(lang)}" href="${escape(abs(href))}"/>`,
                )
                .join("\n")
            : "";
          return [
            "  <url>",
            `    <loc>${escape(abs(e.loc))}</loc>`,
            `    <lastmod>${e.lastmod || today}</lastmod>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : "",
            e.priority != null ? `    <priority>${e.priority}</priority>` : "",
            altLinks,
            "  </url>",
          ]
            .filter(Boolean)
            .join("\n");
        })
        .join("\n");
      const xml =
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
        xmlBody +
        `\n</urlset>\n`;
      fs.writeFileSync(path.join(distDir, "sitemap.xml"), xml, "utf8");

      // Ensure robots.txt advertises the sitemap.
      const robotsPath = path.join(distDir, "robots.txt");
      const sitemapLine = `Sitemap: ${abs("/sitemap.xml")}`;
      if (fs.existsSync(robotsPath)) {
        const cur = fs.readFileSync(robotsPath, "utf8");
        if (!cur.includes(sitemapLine)) {
          fs.writeFileSync(robotsPath, cur.trimEnd() + "\n\n" + sitemapLine + "\n", "utf8");
        }
      } else {
        fs.writeFileSync(robotsPath, `User-agent: *\nAllow: /\n\n${sitemapLine}\n`, "utf8");
      }
    },
  };
}
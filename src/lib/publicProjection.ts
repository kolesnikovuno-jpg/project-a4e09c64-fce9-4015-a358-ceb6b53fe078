import { useEffect, useState } from "react";
import { z } from "zod";

export const stages = ["idea", "concept", "project", "prototype", "object"] as const;
const copy = z.object({
  caption: z.string().min(1).max(300),
  detail: z.string().min(1).max(180),
  description: z.string().min(1).max(2400),
  actionLabel: z.string().min(1).max(80),
}).strict();
export const projectionSchema = z.object({
  schemaVersion: z.literal(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  revision: z.number().int().positive(),
  status: z.literal("published"),
  stage: z.enum(stages),
  interaction: z.enum(["none", "collaboration", "request"]),
  copy: z.object({ uk: copy, ru: copy, en: copy }).strict(),
}).strict().superRefine((p, ctx) => {
  if (p.interaction === "request" && p.stage !== "object") {
    ctx.addIssue({ code: "custom", path: ["interaction"], message: "Ordering requires object stage and explicit approval" });
  }
});
export type PublicProjection = z.infer<typeof projectionSchema>;
export function parseProjection(value: unknown, slug: string): PublicProjection | null {
  const parsed = projectionSchema.safeParse(value);
  return parsed.success && parsed.data.slug === slug ? parsed.data : null;
}

// Only reads public, author-approved snapshots. Never queries internal EGG data.
export function usePublicProjection(slug: string, enabled = true) {
  const [snapshot, setSnapshot] = useState<PublicProjection | null>(null);
  useEffect(() => {
    setSnapshot(null);
    if (!enabled || !/^[a-z0-9-]+$/.test(slug)) return;
    const controller = new AbortController();
    let active = true;
    async function refresh() {
      try {
        const response = await fetch("/publications/" + slug + ".json", {
          signal: controller.signal, cache: "no-store", credentials: "omit"
        });
        if (!response.ok) return;
        const next = parseProjection(await response.json(), slug);
        if (active && next) setSnapshot(prev => !prev || prev.slug !== slug || next.revision >= prev.revision ? next : prev);
      } catch { /* Keep the last valid snapshot or existing page defaults. */ }
    }
    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      controller.abort();
      window.removeEventListener("focus", onFocus);
    };
  }, [slug, enabled]);
  return enabled && snapshot?.slug === slug ? snapshot : null;
}

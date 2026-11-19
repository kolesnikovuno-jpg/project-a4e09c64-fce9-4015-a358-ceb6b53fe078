/**
 * EGG · DNA is an Author decision, never the last AI reply.
 * This pure protocol describes a reviewable candidate, not a replacement
 * for the server's immutable Author-approved seed.
 */
export type EggDnaFields = {
  formedIdea: string;
  essence: string;
  invariants: string;
  openParameters: string;
};
export type EggDnaReview = EggDnaFields & {
  sourceKey: string;
  reviewedAt: string | null;
};
export const emptyEggDnaReview = (): EggDnaReview => ({
  formedIdea: "", essence: "", invariants: "", openParameters: "",
  sourceKey: "", reviewedAt: null,
});

const clean = (s: string, max: number) => (s || "").trim().slice(0, max);
export function eggDnaSourceKey(
  intent: string, constraints: string,
  materials: {id: string; type: string; text: string}[],
  acceptedMap: string, visualSourceKey = "",
): string {
  const input = JSON.stringify({
    intent: clean(intent, 3000), constraints: clean(constraints, 2000),
    materials: materials.map(x => [x.id, x.type, clean(x.text, 500)]),
    acceptedMap: clean(acceptedMap, 1400), visualSourceKey,
  });
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) hash = Math.imul(hash ^ input.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16).padStart(8, "0");
}
export function isEggDnaReviewComplete(
  fields: EggDnaReview, currentSourceKey: string,
): boolean {
  return fields.sourceKey === currentSourceKey &&
    !!fields.reviewedAt && Number.isFinite(Date.parse(fields.reviewedAt)) &&
    clean(fields.formedIdea, 3000).length >= 8 &&
    clean(fields.essence, 1200).length >= 8 &&
    clean(fields.invariants, 1200).length >= 8;
}
export function buildEggDnaCandidate(fields: EggDnaFields): string | null {
  if (clean(fields.formedIdea, 3000).length < 8 ||
    clean(fields.essence, 1200).length < 8 ||
    clean(fields.invariants, 1200).length < 8) return null;
  const text = [
    "СУЩНОСТЬ: " + clean(fields.essence, 1200),
    "ИНВАРИАНТЫ: " + clean(fields.invariants, 1200),
    ...(clean(fields.openParameters, 700) ?
      ["ОТКРЫТЫЕ ПАРАМЕТРЫ: " + clean(fields.openParameters, 700)] : []),
  ].join("\n");
  return text.length <= 3000 ? text : null;
}

/** AI replies may include prose. Parse only explicitly marked sections,
 * never invent a missing invariant or silently approve a suggestion.
 */
export function parseEggDnaSuggestion(text: string): Partial<EggDnaFields> | null {
  if (!text || text.length > 8000) return null;
  const parts = text.replace(/\r/g, "").split(/\n/);
  const result: Partial<EggDnaFields> = {};
  let active: keyof EggDnaFields | null = null;
  const headings: Array<[RegExp, keyof EggDnaFields]> = [
    [/^(?:идея|сформированная идея)\s*[:—-]/i, "formedIdea"],
    [/^(?:сущность|ядро)\s*[:—-]/i, "essence"],
    [/^инварианты?\s*[:—-]/i, "invariants"],
    [/^(?:открытые параметры|открыто|не определено)\s*[:—-]/i, "openParameters"],
  ];
  for (const line of parts) {
    const stripped = line.trim().replace(/^(?:#{1,4}\s*|\*{1,2})/, "").replace(/\*{1,2}\s*$/, "");
    const matched = headings.find(([pattern]) => pattern.test(stripped));
    if (matched) {
      active = matched[1];
      const rest = stripped.replace(matched[0], "").trim();
      result[active] = rest;
    } else if (active && stripped) {
      result[active] = ((result[active] || "") + "\n" + stripped).trim();
    }
  }
  if (!result.essence || !result.invariants) return null;
  for (const key of Object.keys(result) as (keyof EggDnaFields)[])
    result[key] = clean(result[key] || "", key === "openParameters" ? 700 : 1200);
  return result;
}

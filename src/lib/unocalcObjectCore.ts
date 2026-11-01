import type { SphereId } from "@/lib/unocalcObject";

/** The first working element type. Other element types can join the same core later. */
export type TextileField =
  | "materialName" | "composition" | "sku" | "supplier" | "originCountry"
  | "rollWidthMm" | "pricePerMetre" | "currency"
  | "finishedWidthMm" | "finishedLengthMm" | "seamAllowanceMm" | "quantity";

export type EvidenceStatus = "hypothesis" | "calculated" | "verified" | "blocked";

export type SphereAssessment = {
  sphere: SphereId;
  status: EvidenceStatus;
  note: string;
  source: string;
  updatedAt: string;
};

export type CoreEvent = {
  id: string;
  at: string;
  actor: SphereId | "author";
  kind: "property" | "assessment";
  detail: string;
  previous?: string;
  next?: string;
};

export type TextileElement = {
  id: string;
  kind: "textile";
  title: string;
  properties: Record<TextileField, string>;
  assessments: Partial<Record<SphereId, SphereAssessment>>;
  /** A change creates work for every dependent sphere, even if it has never assessed this element. */
  pendingChecks: Partial<Record<SphereId, TextileField[]>>;
  events: CoreEvent[];
};

export type ObjectCore = {
  schemaVersion: 1;
  elements: TextileElement[];
};

export const CORE_SPHERES: SphereId[] = [
  "design", "production", "commerce", "retail",
  "law", "components", "marketing", "testing",
];

export const TEXTILE_FIELDS: TextileField[] = [
  "materialName", "composition", "sku", "supplier", "originCountry",
  "rollWidthMm", "pricePerMetre", "currency", "finishedWidthMm",
  "finishedLengthMm", "seamAllowanceMm", "quantity",
];

export const DEPENDENTS: Record<TextileField, SphereId[]> = {
  materialName: ["design", "production", "testing", "law", "components", "commerce", "retail", "marketing"],
  composition: ["design", "production", "testing", "law", "components", "commerce", "retail"],
  sku: ["components", "law", "production", "testing", "commerce"],
  supplier: ["components", "law", "commerce", "retail"],
  originCountry: ["law", "components", "commerce", "retail"],
  rollWidthMm: ["production", "components", "commerce"],
  pricePerMetre: ["commerce", "components"],
  currency: ["commerce", "components"],
  finishedWidthMm: ["design", "production", "testing", "components", "commerce"],
  finishedLengthMm: ["design", "production", "testing", "components", "commerce"],
  seamAllowanceMm: ["design", "production", "testing", "commerce"],
  quantity: ["production", "components", "commerce", "retail"],
};

const uid = () => typeof crypto !== "undefined" && "randomUUID" in crypto
  ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);

export const emptyObjectCore = (): ObjectCore => ({ schemaVersion: 1, elements: [] });

export const createTextileElement = (title: string, id = uid()): TextileElement => ({
  id, kind: "textile", title,
  properties: {
    materialName: "", composition: "", sku: "", supplier: "", originCountry: "",
    rollWidthMm: "", pricePerMetre: "", currency: "UAH",
    finishedWidthMm: "", finishedLengthMm: "", seamAllowanceMm: "0", quantity: "1",
  },
  assessments: {},
  pendingChecks: {},
  events: [],
});

export const addTextileElement = (core: ObjectCore, title: string, id = uid()): ObjectCore => ({
  ...core,
  elements: [...core.elements, createTextileElement(title, id)],
});

const appendEvent = (element: TextileElement, event: CoreEvent): CoreEvent[] =>
  [...element.events, event].slice(-250);

export const renameElement = (core: ObjectCore, id: string, title: string, at = new Date().toISOString()): ObjectCore => ({
  ...core,
  elements: core.elements.map((element) => element.id !== id || element.title === title ? element : ({
    ...element, title,
    events: appendEvent(element, { id: uid(), at, actor: "author", kind: "property", detail: "title", previous: element.title, next: title }),
  })),
});

export const setTextileProperty = (
  core: ObjectCore, id: string, field: TextileField, value: string,
  actor: SphereId | "author" = "author", at = new Date().toISOString(),
): ObjectCore => ({
  ...core,
  elements: core.elements.map((element) => {
    if (element.id !== id || element.properties[field] === value) return element;
    const pendingChecks = { ...element.pendingChecks };
    for (const sphere of DEPENDENTS[field]) {
      pendingChecks[sphere] = [...new Set([...(pendingChecks[sphere] ?? []), field])];
    }
    return {
      ...element,
      properties: { ...element.properties, [field]: value },
      pendingChecks,
      events: appendEvent(element, {
        id: uid(), at, actor, kind: "property", detail: field,
        previous: element.properties[field], next: value,
      }),
    };
  }),
});

export const recordSphereAssessment = (
  core: ObjectCore, id: string, assessment: Omit<SphereAssessment, "updatedAt">,
  at = new Date().toISOString(),
): ObjectCore => {
  if (!assessment.note.trim()) return core;
  // "Verified" is a user-recorded assertion, and must include a traceable evidence reference.
  if (assessment.status === "verified" && !assessment.source.trim()) return core;
  return {
    ...core,
    elements: core.elements.map((element) => {
      if (element.id !== id) return element;
      const pendingChecks = { ...element.pendingChecks };
      delete pendingChecks[assessment.sphere];
      return {
        ...element,
        assessments: { ...element.assessments, [assessment.sphere]: { ...assessment, updatedAt: at } },
        pendingChecks,
        events: appendEvent(element, {
          id: uid(), at, actor: assessment.sphere, kind: "assessment",
          detail: assessment.status, next: assessment.note,
        }),
      };
    }),
  };
};

const numeric = (value: string): number | null => {
  if (!value.trim()) return null;
  const number = Number(value.trim().replace(",", "."));
  return Number.isFinite(number) ? number : null;
};

export type TextileCutResult =
  | { status: "incomplete"; missing: TextileField[] }
  | { status: "invalid"; fields: TextileField[] }
  | { status: "does_not_fit"; cutWidthMm: number; cutLengthMm: number; rollWidthMm: number }
  | {
      status: "calculated";
      cutWidthMm: number;
      cutLengthMm: number;
      orientation: "normal" | "rotated";
      piecesPerRow: number;
      rows: number;
      linearMetres: number;
      wastePercent: number;
      materialCost: number | null;
      currency: string;
    };

/** Rectangular, single-piece cutting estimate; not a structural or physical test. */
export const calculateTextileCut = (properties: TextileElement["properties"]): TextileCutResult => {
  const required: TextileField[] = ["rollWidthMm", "finishedWidthMm", "finishedLengthMm", "seamAllowanceMm", "quantity"];
  const values = Object.fromEntries(required.map((field) => [field, numeric(properties[field])])) as Record<TextileField, number | null>;
  const missing = required.filter((field) => values[field] === null);
  if (missing.length) return { status: "incomplete", missing };
  const invalid = required.filter((field) => field === "seamAllowanceMm"
    ? values[field]! < 0 : values[field]! <= 0);
  if (!Number.isInteger(values.quantity!)) invalid.push("quantity");
  const price = numeric(properties.pricePerMetre);
  if (price !== null && price < 0) invalid.push("pricePerMetre");
  if (invalid.length) return { status: "invalid", fields: [...new Set(invalid)] };
  const cutWidthMm = values.finishedWidthMm! + 2 * values.seamAllowanceMm!;
  const cutLengthMm = values.finishedLengthMm! + 2 * values.seamAllowanceMm!;
  const rollWidthMm = values.rollWidthMm!;
  const quantity = values.quantity!;
  const options = [
    { orientation: "normal" as const, cross: cutWidthMm, along: cutLengthMm },
    { orientation: "rotated" as const, cross: cutLengthMm, along: cutWidthMm },
  ].filter((option) => option.cross <= rollWidthMm)
    .map((option) => {
      const piecesPerRow = Math.floor(rollWidthMm / option.cross);
      const rows = Math.ceil(quantity / piecesPerRow);
      return { ...option, piecesPerRow, rows, usedLengthMm: rows * option.along };
    });
  if (!options.length) return { status: "does_not_fit", cutWidthMm, cutLengthMm, rollWidthMm };
  options.sort((a, b) => a.usedLengthMm - b.usedLengthMm);
  const best = options[0];
  const purchasedArea = rollWidthMm * best.usedLengthMm;
  return {
    status: "calculated",
    cutWidthMm, cutLengthMm,
    orientation: best.orientation,
    piecesPerRow: best.piecesPerRow,
    rows: best.rows,
    linearMetres: best.usedLengthMm / 1000,
    wastePercent: purchasedArea ? Math.max(0, 100 * (1 - (quantity * cutWidthMm * cutLengthMm) / purchasedArea)) : 0,
    materialCost: price === null ? null : price * best.usedLengthMm / 1000,
    currency: properties.currency.trim() || "UAH",
  };
};

/** Accepts existing local documents without a core, preserving their other fields. */
export const normalizeObjectCore = (value: unknown): ObjectCore => {
  if (!value || typeof value !== "object") return emptyObjectCore();
  const input = value as Partial<ObjectCore>;
  if (input.schemaVersion !== 1 || !Array.isArray(input.elements)) return emptyObjectCore();
  return {
    schemaVersion: 1,
    elements: input.elements.filter((item): item is TextileElement =>
      !!item && typeof item === "object" && item.kind === "textile" && typeof item.id === "string")
      .map((item) => ({
        ...item,
        properties: { ...createTextileElement(item.title, item.id).properties, ...(item.properties ?? {}) },
        assessments: item.assessments ?? {},
        pendingChecks: item.pendingChecks ?? {},
        events: Array.isArray(item.events) ? item.events : [],
      })),
  };
};

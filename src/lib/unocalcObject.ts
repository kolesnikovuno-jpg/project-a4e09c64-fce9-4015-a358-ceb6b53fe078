import type { DesignBrief } from "@/lib/unocalcDesign";

export type SphereId = "design" | "production" | "commerce" | "retail" | "law" | "components" | "marketing" | "testing";
export type ProposalStatus = "pending" | "accepted" | "rejected";

export type ObjectProposal = {
  id: string;
  sphere: SphereId;
  text: string;
  status: ProposalStatus;
  createdAt: string;
  decidedAt?: string;
};

export type ObjectFields = {
  title: string;
  description: string;
  lengthMm: string;
  widthMm: string;
  heightMm: string;
  quality: string;
  material: string;
  investment: string;
  marketPrice: string;
  notes: string;
  proposals: ObjectProposal[];
};

export type ObjectRevision = {
  number: number;
  savedAt: string;
  fields: ObjectFields;
  idea: string;
  brief: DesignBrief;
};

export type ObjectDocument = {
  schemaVersion: 1;
  fields: ObjectFields;
  revision: number;
  revisions: ObjectRevision[];
  updatedAt: string;
};

export const OBJECT_STORAGE_KEY = "unocalc.object.v1";

export const EMPTY_OBJECT_FIELDS: ObjectFields = {
  title: "",
  description: "",
  lengthMm: "",
  widthMm: "",
  heightMm: "",
  quality: "",
  material: "",
  investment: "",
  marketPrice: "",
  notes: "",
  proposals: [],
};

export const emptyObjectDocument = (): ObjectDocument => ({
  schemaVersion: 1,
  fields: { ...EMPTY_OBJECT_FIELDS, proposals: [] },
  revision: 0,
  revisions: [],
  updatedAt: "",
});

export const readObjectDocument = (): ObjectDocument => {
  if (typeof window === "undefined") return emptyObjectDocument();
  try {
    const raw = localStorage.getItem(OBJECT_STORAGE_KEY);
    if (!raw) return emptyObjectDocument();
    const value = JSON.parse(raw) as Partial<ObjectDocument>;
    if (value.schemaVersion !== 1 || !value.fields || typeof value.fields !== "object") {
      return emptyObjectDocument();
    }
    const safeFields = { ...EMPTY_OBJECT_FIELDS, ...value.fields };
    if (!Array.isArray(safeFields.proposals)) safeFields.proposals = [];
    return {
      schemaVersion: 1,
      fields: safeFields,
      revision: Number.isInteger(value.revision) ? Math.max(0, value.revision!) : 0,
      revisions: Array.isArray(value.revisions) ? value.revisions : [],
      updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : "",
    };
  } catch {
    return emptyObjectDocument();
  }
};

export const persistObjectDocument = (document: ObjectDocument): void => {
  localStorage.setItem(OBJECT_STORAGE_KEY, JSON.stringify(document));
};

export const approveObjectRevision = (
  document: ObjectDocument,
  idea: string,
  brief: DesignBrief,
  savedAt = new Date().toISOString(),
): ObjectDocument => {
  const number = document.revision + 1;
  const snapshot: ObjectRevision = {
    number,
    savedAt,
    fields: structuredClone(document.fields),
    idea,
    brief: { ...brief },
  };
  return {
    ...document,
    revision: number,
    updatedAt: savedAt,
    revisions: [...document.revisions, snapshot].slice(-30),
  };
};

export const volumeCubicMetres = (fields: ObjectFields): number | null => {
  const values = [fields.lengthMm, fields.widthMm, fields.heightMm].map((value) =>
    Number(value.trim().replace(",", ".")),
  );
  if (values.some((value) => !Number.isFinite(value) || value <= 0)) return null;
  return (values[0] * values[1] * values[2]) / 1_000_000_000;
};

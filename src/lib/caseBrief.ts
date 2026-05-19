import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Case = Tables<"cases">;

type CaseAttachment = { name: string; path: string };

const ATTACHMENT_PATH_RE = /intake\/[^\s]+/g;
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7;

const filenameFromPath = (path: string) => (path.split("/").pop() || path).replace(/^\d+-/, "");

export const extractCaseAttachmentPaths = (c: Case): CaseAttachment[] => {
  const text = c.raw_input ?? "";
  const byPath = new Map<string, CaseAttachment>();

  for (const line of text.split("\n")) {
    const matches = line.match(ATTACHMENT_PATH_RE);
    if (!matches) continue;

    for (const path of matches) {
      const before = line.split(path)[0] ?? "";
      const name = before.replace(/[—\-•:]\s*$/, "").trim() || filenameFromPath(path);
      byPath.set(path, { name, path });
    }
  }

  return [...byPath.values()];
};

const signAttachmentUrls = async (attachments: CaseAttachment[]) => {
  const urlByPath = new Map<string, string>();
  if (attachments.length === 0) return urlByPath;

  const { data } = await supabase.storage
    .from("clarity-attachments")
    .createSignedUrls(
      attachments.map((a) => a.path),
      SIGNED_URL_TTL_SECONDS,
    );

  data?.forEach((item, index) => {
    const path = item.path ?? attachments[index]?.path;
    if (path && item.signedUrl) urlByPath.set(path, item.signedUrl);
  });

  return urlByPath;
};

const SECTION_KEYS = ["Situation", "Uncertainty", "Scope", "Supporting links"] as const;
type SectionKey = typeof SECTION_KEYS[number];

const parseSections = (raw: string): Record<SectionKey, string> => {
  const out: Record<SectionKey, string> = {
    Situation: "",
    Uncertainty: "",
    Scope: "",
    "Supporting links": "",
  };
  if (!raw) return out;
  const lines = raw.split("\n");
  let current: SectionKey | null = null;
  const buf: Record<SectionKey, string[]> = {
    Situation: [], Uncertainty: [], Scope: [], "Supporting links": [],
  };
  for (const line of lines) {
    const header = SECTION_KEYS.find((k) => line.trim().toLowerCase() === `${k.toLowerCase()}:`);
    if (header) { current = header; continue; }
    if (current) buf[current].push(line);
  }
  for (const k of SECTION_KEYS) out[k] = buf[k].join("\n").trim();
  return out;
};

const summarizeDraft = (draft: string | null | undefined): string => {
  if (!draft) return "";
  const cleaned = draft
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !/^[#*\-—]+$/.test(l) && !/^\d+\.\s*$/.test(l));
  return cleaned.slice(0, 10).join("\n");
};

const formatDate = (iso: string | null | undefined) => {
  if (!iso) return "";
  try { return new Date(iso).toISOString().slice(0, 10); } catch { return iso; }
};

export const buildCaseBrief = async (c: Case): Promise<string> => {
  const attachments = extractCaseAttachmentPaths(c);
  const urlByPath = await signAttachmentUrls(attachments);
  const sections = parseSections(c.raw_input ?? "");

  const divider = "--------------------------------------------------";
  const parts: string[] = [];

  parts.push(divider, "CASE PACKAGE", divider, "");
  parts.push(`Case ID: ${c.id}`);
  parts.push(`Client name: ${c.client_name || "—"}`);
  parts.push(`Client email: ${c.email ?? "—"}`);
  parts.push(`Language: ${c.language ?? "—"}`);
  parts.push(`Created: ${formatDate(c.created_at)}`);
  parts.push("");

  parts.push(divider, "CLIENT REQUEST", divider, "");
  parts.push("Situation:");
  parts.push(sections.Situation || "—");
  parts.push("");
  parts.push("Uncertainty:");
  parts.push(sections.Uncertainty || "—");
  parts.push("");
  parts.push("Scope:");
  parts.push(sections.Scope || "—");
  parts.push("");

  parts.push(divider, "ATTACHMENTS", divider, "");
  if (attachments.length === 0) {
    parts.push("none");
  } else {
    const blocks = attachments.map((a) => {
      const url = urlByPath.get(a.path) ?? "[signed URL unavailable]";
      return `${a.name}\n${url}`;
    });
    parts.push(blocks.join("\n\n"));
  }
  parts.push("");

  const draftSummary = summarizeDraft(c.ai_draft);
  if (draftSummary) {
    parts.push(divider, "OPTIONAL INTERNAL CONTEXT", divider, "");
    parts.push("Primary assessment:");
    parts.push(draftSummary);
    parts.push("");
  }

  parts.push(divider, "EXPERT WORKING OBJECTIVE", divider, "");
  parts.push("Develop a client-ready expert response.");
  parts.push("");
  parts.push("Focus:");
  parts.push("- identify root structural issue");
  parts.push("- determine whether this is correction / logic shift / rebuild");
  parts.push("- propose viable solution direction");
  parts.push("");
  parts.push("If attachments exist, use them as evidence.");
  parts.push("");
  parts.push(divider);

  return parts.join("\n");
};

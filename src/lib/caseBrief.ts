import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Case = Tables<"cases">;
type CaseAttachment = { name: string; path: string };

const ATTACHMENT_PATH_RE = /intake\/[^\s]+/g;
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7;

const filenameFromPath = (path: string) =>
  (path.split("/").pop() || path).replace(/^\d+-/, "");

export const extractCaseAttachmentPaths = (c: Case): CaseAttachment[] => {
  const text = c.raw_input ?? "";
  const byPath = new Map<string, CaseAttachment>();
  const seenNames = new Set<string>();

  for (const line of text.split("\n")) {
    const matches = line.match(ATTACHMENT_PATH_RE);
    if (!matches) continue;
    for (const path of matches) {
      if (byPath.has(path)) continue;
      const before = line.split(path)[0] ?? "";
      const name =
        before.replace(/[—\-•:]\s*$/, "").trim() || filenameFromPath(path);
      const key = name.toLowerCase();
      if (seenNames.has(key)) continue;
      seenNames.add(key);
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
    Situation: "", Uncertainty: "", Scope: "", "Supporting links": "",
  };
  if (!raw) return out;
  const buf: Record<SectionKey, string[]> = {
    Situation: [], Uncertainty: [], Scope: [], "Supporting links": [],
  };
  let current: SectionKey | null = null;
  for (const line of raw.split("\n")) {
    const header = SECTION_KEYS.find(
      (k) => line.trim().toLowerCase() === `${k.toLowerCase()}:`,
    );
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
    .filter((l) => l && !/^[#*\-—=]+$/.test(l) && !/^\d+\.\s*$/.test(l));
  // Keep concise: max ~5 lines, ~600 chars
  const picked: string[] = [];
  let total = 0;
  for (const line of cleaned) {
    if (picked.length >= 5) break;
    if (total + line.length > 600) break;
    picked.push(line);
    total += line.length;
  }
  return picked.join("\n");
};

const formatDate = (iso: string | null | undefined) => {
  if (!iso) return "";
  try { return new Date(iso).toISOString().slice(0, 10); } catch { return iso; }
};

type Lang = "en" | "ru" | "uk";
const normalizeLang = (l: string | null | undefined): Lang => {
  const v = (l ?? "").toLowerCase();
  if (v.startsWith("ru")) return "ru";
  if (v.startsWith("uk") || v.startsWith("ua")) return "uk";
  return "en";
};

type Labels = {
  packageTitle: string;
  caseId: string; clientName: string; clientEmail: string; language: string; created: string;
  clientRequest: string;
  situation: string; uncertainty: string; scope: string;
  attachments: string; none: string; urlUnavailable: string;
  optionalContext: string; primaryAssessment: string;
  objectiveTitle: string;
  objectiveLead: string;
  focus: string;
  bullets: string[];
  evidenceNote: string;
  dash: string;
};

const L: Record<Lang, Labels> = {
  en: {
    packageTitle: "CASE PACKAGE",
    caseId: "Case ID", clientName: "Client name", clientEmail: "Client email",
    language: "Language", created: "Created",
    clientRequest: "CLIENT REQUEST",
    situation: "Situation", uncertainty: "Uncertainty", scope: "Scope",
    attachments: "ATTACHMENTS", none: "none", urlUnavailable: "[signed URL unavailable]",
    optionalContext: "OPTIONAL INTERNAL CONTEXT",
    primaryAssessment: "Primary assessment (orientation only — not a diagnosis):",
    objectiveTitle: "EXPERT WORKING OBJECTIVE",
    objectiveLead: "Develop a client-ready expert response.",
    focus: "Focus:",
    bullets: [
      "- identify root structural issue",
      "- determine whether this is correction / logic shift / rebuild",
      "- propose viable solution direction",
    ],
    evidenceNote: "If attachments exist, use them as evidence.",
    dash: "—",
  },
  ru: {
    packageTitle: "ПАКЕТ КЕЙСА",
    caseId: "ID кейса", clientName: "Имя клиента", clientEmail: "Email клиента",
    language: "Язык", created: "Создан",
    clientRequest: "ЗАПРОС КЛИЕНТА",
    situation: "Ситуация", uncertainty: "Неопределённость", scope: "Объём",
    attachments: "ВЛОЖЕНИЯ", none: "нет", urlUnavailable: "[подписанная ссылка недоступна]",
    optionalContext: "ВНУТРЕННИЙ КОНТЕКСТ (опционально)",
    primaryAssessment: "Первичная оценка (только для ориентации, не диагноз):",
    objectiveTitle: "ЗАДАЧА ЭКСПЕРТА",
    objectiveLead: "Подготовить ответ клиенту, готовый к отправке.",
    focus: "Фокус:",
    bullets: [
      "- определить корневую структурную проблему",
      "- понять: коррекция / смена логики / пересборка",
      "- предложить рабочее направление решения",
    ],
    evidenceNote: "Если есть вложения — использовать как доказательную базу.",
    dash: "—",
  },
  uk: {
    packageTitle: "ПАКЕТ КЕЙСУ",
    caseId: "ID кейсу", clientName: "Імʼя клієнта", clientEmail: "Email клієнта",
    language: "Мова", created: "Створено",
    clientRequest: "ЗАПИТ КЛІЄНТА",
    situation: "Ситуація", uncertainty: "Невизначеність", scope: "Обсяг",
    attachments: "ВКЛАДЕННЯ", none: "немає", urlUnavailable: "[підписане посилання недоступне]",
    optionalContext: "ВНУТРІШНІЙ КОНТЕКСТ (опціонально)",
    primaryAssessment: "Первинна оцінка (лише для орієнтації, не діагноз):",
    objectiveTitle: "ЗАВДАННЯ ЕКСПЕРТА",
    objectiveLead: "Підготувати відповідь клієнту, готову до надсилання.",
    focus: "Фокус:",
    bullets: [
      "- визначити кореневу структурну проблему",
      "- зрозуміти: корекція / зміна логіки / перебудова",
      "- запропонувати робочий напрямок рішення",
    ],
    evidenceNote: "Якщо є вкладення — використати як доказову базу.",
    dash: "—",
  },
};

export const buildCaseBrief = async (c: Case): Promise<string> => {
  const lang = normalizeLang(c.language);
  const t = L[lang];
  const attachments = extractCaseAttachmentPaths(c);
  const urlByPath = await signAttachmentUrls(attachments);
  const sections = parseSections(c.raw_input ?? "");

  const divider = "--------------------------------------------------";
  const parts: string[] = [];

  parts.push(divider, t.packageTitle, divider, "");
  parts.push(`${t.caseId}: ${c.id}`);
  parts.push(`${t.clientName}: ${c.client_name || t.dash}`);
  parts.push(`${t.clientEmail}: ${c.email ?? t.dash}`);
  parts.push(`${t.language}: ${c.language ?? t.dash}`);
  parts.push(`${t.created}: ${formatDate(c.created_at)}`);
  parts.push("");

  parts.push(divider, t.clientRequest, divider, "");
  parts.push(`${t.situation}:`); parts.push(sections.Situation || t.dash); parts.push("");
  parts.push(`${t.uncertainty}:`); parts.push(sections.Uncertainty || t.dash); parts.push("");
  parts.push(`${t.scope}:`); parts.push(sections.Scope || t.dash); parts.push("");

  parts.push(divider, t.attachments, divider, "");
  if (attachments.length === 0) {
    parts.push(t.none);
  } else {
    parts.push(
      attachments
        .map((a) => `${a.name}\n${urlByPath.get(a.path) ?? t.urlUnavailable}`)
        .join("\n\n"),
    );
  }
  parts.push("");

  const draftSummary = summarizeDraft(c.ai_draft);
  if (draftSummary) {
    parts.push(divider, t.optionalContext, divider, "");
    parts.push(t.primaryAssessment);
    parts.push(draftSummary);
    parts.push("");
  }

  parts.push(divider, t.objectiveTitle, divider, "");
  parts.push(t.objectiveLead);
  parts.push("");
  parts.push(t.focus);
  parts.push(...t.bullets);
  parts.push("");
  parts.push(t.evidenceNote);
  parts.push("");
  parts.push(divider);

  return parts.join("\n");
};

export const downloadBriefFile = (text: string, caseId: string) => {
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `case-brief-${caseId}.md`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

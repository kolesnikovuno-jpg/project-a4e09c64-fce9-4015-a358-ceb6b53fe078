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
    .filter(
      (l) =>
        l &&
        !/^[#*\-—=]+$/.test(l) &&
        !/^\d+\.\s*$/.test(l) &&
        !/^#{1,6}\s/.test(l) &&
        !/^\d+\.\s+/.test(l),
    );
  const picked: string[] = [];
  let total = 0;
  for (const line of cleaned) {
    if (picked.length >= 4) break;
    if (total + line.length > 500) break;
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
  attachments: string; urlUnavailable: string; attachmentsUseNote: string;
  optionalHypothesisTitle: string; optionalHypothesisIntro: string;
  expertTaskTitle: string; expertTaskBody: string;
  protocolTitle: string; protocolBody: string;
  outputStructureTitle: string; outputStructureBody: string;
  readyNote: string;
  dash: string;
};

const L: Record<Lang, Labels> = {
  en: {
    packageTitle: "CASE PACKAGE",
    caseId: "Case ID", clientName: "Client name", clientEmail: "Client email",
    language: "Language", created: "Created",
    clientRequest: "CLIENT REQUEST",
    situation: "Situation", uncertainty: "Uncertainty", scope: "Scope",
    attachments: "ATTACHMENTS",
    urlUnavailable: "[signed URL unavailable]",
    attachmentsUseNote: `If attachments exist:
use them as primary evidence.
Do not ignore them.`,
    optionalHypothesisTitle: "OPTIONAL PRIOR HYPOTHESIS",
    optionalHypothesisIntro: `This section is optional orientation only.

It may contain a preliminary operator interpretation.

Rules:
- do NOT treat it as truth
- do NOT simply confirm it
- independently verify against actual case evidence`,
    expertTaskTitle: "EXPERT TASK",
    expertTaskBody: `Prepare a client-ready expert response.

Your task:

1. Determine what is actually happening structurally.
2. Identify root issue:
   - bad elements?
   - broken system logic?
   - conflicting scenarios?
   - architectural mismatch?
3. Decide intervention level:
   - correction
   - logic shift
   - partial rebuild
   - full rebuild
4. Propose practical next direction.`,
    protocolTitle: "RESPONSE PROTOCOL",
    protocolBody: `Constraints:

- no generic consulting language
- no bureaucratic AI tone
- no filler
- no theatrical language
- no marketing tone
- no unsupported speculation

Use:
- structural reasoning
- evidence from request
- evidence from attachments
- clear explanation of logic

Prefer:
system diagnosis over style commentary

Tone:
calm
precise
human
expert`,
    outputStructureTitle: "OUTPUT STRUCTURE",
    outputStructureBody: `Return final client-facing response in this structure:

1. What is actually happening
2. Root structural issue
3. Why this creates the current problem
4. Required intervention level
5. Practical direction forward`,
    readyNote: "Response must be ready to send to client.",
    dash: "—",
  },
  ru: {
    packageTitle: "ПАКЕТ КЕЙСА",
    caseId: "ID кейса", clientName: "Имя клиента", clientEmail: "Email клиента",
    language: "Язык", created: "Создан",
    clientRequest: "ЗАПРОС КЛИЕНТА",
    situation: "Ситуация", uncertainty: "Неопределённость", scope: "Объём",
    attachments: "ВЛОЖЕНИЯ",
    urlUnavailable: "[подписанная ссылка недоступна]",
    attachmentsUseNote: `Если вложения есть:
использовать их как основную доказательную базу.
Не игнорировать.`,
    optionalHypothesisTitle: "ОПЦИОНАЛЬНАЯ ПРЕДВАРИТЕЛЬНАЯ ГИПОТЕЗА",
    optionalHypothesisIntro: `Этот раздел — только опциональная ориентация.

Может содержать предварительную интерпретацию оператора.

Правила:
- НЕ воспринимать как истину
- НЕ подтверждать автоматически
- независимо проверять по реальным данным кейса`,
    expertTaskTitle: "ЗАДАЧА ЭКСПЕРТА",
    expertTaskBody: `Подготовить экспертный ответ, готовый к отправке клиенту.

Задача:

1. Определить, что реально происходит структурно.
2. Определить корневую проблему:
   - плохие элементы?
   - сломанная системная логика?
   - конфликт сценариев?
   - архитектурное несоответствие?
3. Определить уровень вмешательства:
   - коррекция
   - смена логики
   - частичная пересборка
   - полная пересборка
4. Предложить практическое направление дальше.`,
    protocolTitle: "ПРОТОКОЛ ОТВЕТА",
    protocolBody: `Ограничения:

- никакого generic consulting language
- никакого бюрократического AI-тона
- никакого филлера
- никакой театральности
- никакого маркетингового тона
- никаких необоснованных спекуляций

Использовать:
- структурное рассуждение
- доказательства из запроса
- доказательства из вложений
- ясное объяснение логики

Предпочитать:
системную диагностику над стилистическим комментарием

Тон:
спокойный
точный
человеческий
экспертный`,
    outputStructureTitle: "СТРУКТУРА ОТВЕТА",
    outputStructureBody: `Итоговый ответ клиенту вернуть в следующей структуре:

1. Что реально происходит
2. Корневая структурная проблема
3. Почему это создаёт текущую проблему
4. Необходимый уровень вмешательства
5. Практическое направление дальше`,
    readyNote: "Ответ должен быть готов к отправке клиенту.",
    dash: "—",
  },
  uk: {
    packageTitle: "ПАКЕТ КЕЙСУ",
    caseId: "ID кейсу", clientName: "Імʼя клієнта", clientEmail: "Email клієнта",
    language: "Мова", created: "Створено",
    clientRequest: "ЗАПИТ КЛІЄНТА",
    situation: "Ситуація", uncertainty: "Невизначеність", scope: "Обсяг",
    attachments: "ВКЛАДЕННЯ",
    urlUnavailable: "[підписане посилання недоступне]",
    attachmentsUseNote: `Якщо вкладення є:
використати їх як основну доказову базу.
Не ігнорувати.`,
    optionalHypothesisTitle: "ОПЦІОНАЛЬНА ПОПЕРЕДНЯ ГІПОТЕЗА",
    optionalHypothesisIntro: `Цей розділ — лише опціональна орієнтація.

Може містити попередню інтерпретацію оператора.

Правила:
- НЕ сприймати як істину
- НЕ підтверджувати автоматично
- незалежно перевіряти за реальними даними кейсу`,
    expertTaskTitle: "ЗАВДАННЯ ЕКСПЕРТА",
    expertTaskBody: `Підготувати експертну відповідь, готову до надсилання клієнту.

Завдання:

1. Визначити, що реально відбувається структурно.
2. Визначити кореневу проблему:
   - погані елементи?
   - зламана системна логіка?
   - конфлікт сценаріїв?
   - архітектурна невідповідність?
3. Визначити рівень втручання:
   - корекція
   - зміна логіки
   - часткова перебудова
   - повна перебудова
4. Запропонувати практичний напрямок далі.`,
    protocolTitle: "ПРОТОКОЛ ВІДПОВІДІ",
    protocolBody: `Обмеження:

- ніякої generic consulting language
- ніякого бюрократичного AI-тону
- ніякого філера
- ніякої театральності
- ніякого маркетингового тону
- ніяких необґрунтованих спекуляцій

Використовувати:
- структурне міркування
- докази із запиту
- докази із вкладень
- ясне пояснення логіки

Надавати перевагу:
системній діагностиці над стилістичним коментарем

Тон:
спокійний
точний
людський
експертний`,
    outputStructureTitle: "СТРУКТУРА ВІДПОВІДІ",
    outputStructureBody: `Підсумкову відповідь клієнту повернути в такій структурі:

1. Що реально відбувається
2. Коренева структурна проблема
3. Чому це створює поточну проблему
4. Необхідний рівень втручання
5. Практичний напрямок далі`,
    readyNote: "Відповідь має бути готова до надсилання клієнту.",
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

  if (attachments.length > 0) {
    parts.push(divider, t.attachments, divider, "");
    parts.push(
      attachments
        .map(
          (a, i) =>
            `[${i + 1}] ${a.name}\n${urlByPath.get(a.path) ?? t.urlUnavailable}`,
        )
        .join("\n\n"),
    );
    parts.push("");
    parts.push(t.attachmentsUseNote);
    parts.push("");
  }

  const draftSummary = summarizeDraft(c.ai_draft);
  if (draftSummary) {
    parts.push(divider, t.optionalHypothesisTitle, divider, "");
    parts.push(t.optionalHypothesisIntro);
    parts.push("");
    parts.push(draftSummary);
    parts.push("");
  }

  parts.push(divider, t.expertTaskTitle, divider, "");
  parts.push(t.expertTaskBody);
  parts.push("");

  parts.push(divider, t.protocolTitle, divider, "");
  parts.push(t.protocolBody);
  parts.push("");

  parts.push(divider, t.outputStructureTitle, divider, "");
  parts.push(t.outputStructureBody);
  parts.push("");
  parts.push(t.readyNote);
  parts.push("");
  parts.push(divider);

  return parts.join("\n");
};

export const downloadBriefFile = (text: string, caseId: string) => {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `case-brief-${caseId}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
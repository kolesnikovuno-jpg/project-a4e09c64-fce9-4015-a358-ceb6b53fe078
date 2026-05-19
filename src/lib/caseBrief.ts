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
  // Keep concise: max ~4 lines, ~500 chars
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
  attachments: string; none: string; urlUnavailable: string;
  attachmentLabel: string;
  filenameLabel: string;
  urlLabel: string;
  optionalContext: string;
  primaryOrientation: string;
  biasControlText: string;
  objectiveTitle: string;
  objectiveLead: string;
  focus: string;
  bullets: string[];
  evidenceNote: string;
  outputStructureTitle: string;
  outputStructureBody: string;
  protocolTitle: string;
  protocolBody: string;
  disciplineTitle: string;
  disciplineBody: string;
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
    attachmentLabel: "ATTACHMENT",
    filenameLabel: "Filename:",
    urlLabel: "URL:",
    optionalContext: "INTERNAL ORIENTATION (OPTIONAL)",
    primaryOrientation: "Primary orientation:",
    biasControlText: `Use only as orientation.
Do not copy automatically.
Re-evaluate the case independently based on the request and attachments.`,
    objectiveTitle: "EXPERT WORKING OBJECTIVE",
    objectiveLead: "Develop a client-ready expert response.",
    focus: "Focus:",
    bullets: [
      "- identify root structural issue",
      "- determine whether this is correction / logic shift / rebuild",
      "- propose viable solution direction",
    ],
    evidenceNote: "If attachments exist, use them as evidence.",
    outputStructureTitle: "OUTPUT STRUCTURE",
    outputStructureBody: `1. What is actually happening
Briefly describe the observable situation.

2. Root structural problem
Identify the main source of tension or misalignment.

3. Why this conclusion was reached
Show evidence and reasoning chain.

4. Scale of required intervention
Determine:
— local correction
— logic shift
— partial rebuild
— full rebuild

5. Working direction for resolution
Propose the next constructive step.`,
    protocolTitle: "DELIVERY STYLE PROTOCOL",
    protocolBody: `Response style:

The response must be client-ready and suitable for delivery.

Requirements:

— do not use generic consulting language
— do not use bureaucratic AI-style phrasing
— do not produce templated "consulting" formulations
— do not drift into decorative stylistic commentary without evidentiary basis

The response must:

— be grounded in facts from the client request
— use attachments as evidence, if provided
— explain not only the conclusion but also the reasoning behind it
— distinguish between:
   * problems with individual elements
   * problems with systemic logic
   * scenario conflicts
   * architectural misalignment

Prefer structural reasoning over style commentary.

Look for:
— hidden tension
— competing logics
— hierarchy conflicts
— scenario incompatibility
— systemic causes, not just surface symptoms

Tone:

— calm
— precise
— expert
— human
— without theatrics
— without marketing bombast
— without excessive academicism

Goal:

Give the client clarity, an explanation of the root cause, and a working direction for resolution.`,
    disciplineTitle: "ANALYSIS DISCIPLINE",
    disciplineBody: `When analyzing:

Strictly distinguish:

FACT
= what directly follows from the client request or attachments

INTERPRETATION
= analytical reading of the observed signal

HYPOTHESIS
= possible explanation when direct evidence is insufficient

Prohibited:

— presenting hypotheses as facts
— constructing missing context without labeling it
— inventing client intentions without basis

If the signal is insufficient:
state this directly.`,
    dash: "—",
  },
  ru: {
    packageTitle: "ПАКЕТ КЕЙСА",
    caseId: "ID кейса", clientName: "Имя клиента", clientEmail: "Email клиента",
    language: "Язык", created: "Создан",
    clientRequest: "ЗАПРОС КЛИЕНТА",
    situation: "Ситуация", uncertainty: "Неопределённость", scope: "Объём",
    attachments: "ВЛОЖЕНИЯ", none: "нет", urlUnavailable: "[подписанная ссылка недоступна]",
    attachmentLabel: "ВЛОЖЕНИЕ",
    filenameLabel: "Файл:",
    urlLabel: "URL:",
    optionalContext: "ВНУТРЕННЯЯ ОРИЕНТАЦИЯ (НЕ ОБЯЗАТЕЛЬНО)",
    primaryOrientation: "Первичная ориентация:",
    biasControlText: `Использовать только как ориентир.
Не копировать автоматически.
Переоценивать кейс самостоятельно на основе запроса и вложений.`,
    objectiveTitle: "ЗАДАЧА ЭКСПЕРТА",
    objectiveLead: "Подготовить ответ клиенту, готовый к отправке.",
    focus: "Фокус:",
    bullets: [
      "- определить корневую структурную проблему",
      "- понять: коррекция / смена логики / пересборка",
      "- предложить рабочее направление решения",
    ],
    evidenceNote: "Если есть вложения — использовать как доказательную базу.",
    outputStructureTitle: "СТРУКТУРА ИТОГОВОГО ОТВЕТА",
    outputStructureBody: `1. Что реально происходит
Кратко описать наблюдаемую ситуацию.

2. Корневая структурная проблема
Определить основной источник напряжения или несоответствия.

3. Почему сделан этот вывод
Показать evidence and reasoning chain.

4. Масштаб необходимого вмешательства
Определить:
— локальная корректировка
— смена логики
— частичная пересборка
— полная пересборка

5. Рабочее направление решения
Предложить следующий конструктивный шаг.`,
    protocolTitle: "ПРОТОКОЛ ЭКСПЕРТНОЙ ПОДАЧИ",
    protocolBody: `Стиль ответа:

Ответ должен быть клиентским, готовым к отправке.

Требования:

— не использовать generic consulting language
— не использовать бюрократический AI-стиль
— не выдавать шаблонные "консультационные" формулировки
— не уходить в декоративные стилистические рассуждения без доказательной базы

Ответ должен:

— опираться на факты из клиентского запроса
— использовать вложения как evidence, если они приложены
— объяснять не только вывод, но и логику вывода
— различать:
   * проблему отдельных элементов
   * проблему системной логики
   * конфликт сценариев
   * архитектурное несоответствие

Предпочитать structural reasoning over style commentary.

Искать:
— скрытое напряжение
— конкурирующие логики
— конфликт иерархий
— несовместимость сценариев
— системные причины, а не только поверхностные симптомы

Тон:

— спокойный
— точный
— экспертный
— человеческий
— без театральности
— без маркетингового пафоса
— без чрезмерной академичности

Цель:

Дать клиенту ясность, объяснение причины проблемы и рабочее направление решения.`,
    disciplineTitle: "ДИСЦИПЛИНА АНАЛИЗА",
    disciplineBody: `При анализе:

Строго различать:

ФАКТ
= то, что прямо следует из клиентского запроса или вложений

ИНТЕРПРЕТАЦИЯ
= аналитическое чтение наблюдаемого сигнала

ГИПОТЕЗА
= возможное объяснение, если прямых доказательств недостаточно

Запрещено:

— выдавать гипотезы как факты
— достраивать отсутствующий контекст без маркировки
— придумывать намерения клиента без основания

Если сигнал недостаточен:
прямо указывать это.`,
    dash: "—",
  },
  uk: {
    packageTitle: "ПАКЕТ КЕЙСУ",
    caseId: "ID кейсу", clientName: "Імʼя клієнта", clientEmail: "Email клієнта",
    language: "Мова", created: "Створено",
    clientRequest: "ЗАПИТ КЛІЄНТА",
    situation: "Ситуація", uncertainty: "Невизначеність", scope: "Обсяг",
    attachments: "ВКЛАДЕННЯ", none: "немає", urlUnavailable: "[підписане посилання недоступне]",
    attachmentLabel: "ВКЛАДЕННЯ",
    filenameLabel: "Файл:",
    urlLabel: "URL:",
    optionalContext: "ВНУТРІШНЯ ОРІЄНТАЦІЯ (НЕ ОБОВʼЯЗКОВО)",
    primaryOrientation: "Первинна орієнтація:",
    biasControlText: `Використовувати лише як орієнтир.
Не копіювати автоматично.
Переоцінювати кейс самостійно на основі запиту та вкладень.`,
    objectiveTitle: "ЗАВДАННЯ ЕКСПЕРТА",
    objectiveLead: "Підготувати відповідь клієнту, готову до надсилання.",
    focus: "Фокус:",
    bullets: [
      "- визначити кореневу структурну проблему",
      "- зрозуміти: корекція / зміна логіки / перебудова",
      "- запропонувати робочий напрямок рішення",
    ],
    evidenceNote: "Якщо є вкладення — використати як доказову базу.",
    outputStructureTitle: "СТРУКТУРА ПІДСУМКОВОЇ ВІДПОВІДІ",
    outputStructureBody: `1. Що реально відбувається
Коротко описати спостережувану ситуацію.

2. Коренева структурна проблема
Визначити основне джерело напруги або невідповідності.

3. Чому зроблено цей висновок
Показати evidence and reasoning chain.

4. Масштаб необхідного втручання
Визначити:
— локальне коригування
— зміна логіки
— часткова перебудова
— повна перебудова

5. Робочий напрямок вирішення
Запропонувати наступний конструктивний крок.`,
    protocolTitle: "ПРОТОКОЛ ЕКСПЕРТНОЇ ПОДАЧІ",
    protocolBody: `Стиль відповіді:

Відповідь має бути клієнтською, готовою до надсилання.

Вимоги:

— не використовувати generic consulting language
— не використовувати бюрократичний AI-стиль
— не видавати шаблонні "консультаційні" формулювання
— не вдаватися в декоративні стилістичні міркування без доказової бази

Відповідь має:

— спиратися на факти з клієнтського запиту
— використовувати вкладення як evidence, якщо вони додані
— пояснювати не тільки висновок, але й логіку висновку
— розрізняти:
   * проблему окремих елементів
   * проблему системної логіки
   * конфлікт сценаріїв
   * архітектурну невідповідність

Надавати перевагу structural reasoning над style commentary.

Шукати:
— приховану напругу
— конкуруючі логіки
— конфлікт ієрархій
— несумісність сценаріїв
— системні причини, а не тільки поверхневі симптоми

Тон:

— спокійний
— точний
— експертний
— людський
— без театральності
— без маркетингового пафосу
— без надмірної академічності

Мета:

Дати клієнту ясність, пояснення причини проблеми та робочий напрямок вирішення.`,
    disciplineTitle: "ДИСЦИПЛІНА АНАЛІЗУ",
    disciplineBody: `При аналізі:

Строго розрізняти:

ФАКТ
= те, що прямо випливає з клієнтського запиту або вкладень

ІНТЕРПРЕТАЦІЯ
= аналітичне прочитання спостережуваного сигналу

ГІПОТЕЗА
= можливе пояснення, якщо прямих доказів недостатньо

Заборонено:

— видавати гіпотези за факти
— добудовувати відсутній контекст без маркування
— вигадувати наміри клієнта без підстави

Якщо сигналу недостатньо:
прямо вказувати на це.`,
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
        .map(
          (a, i) =>
            `${t.attachmentLabel} ${i + 1}\n${t.filenameLabel} ${a.name}\n${t.urlLabel}\n${urlByPath.get(a.path) ?? t.urlUnavailable}`,
        )
        .join("\n\n"),
    );
  }
  parts.push("");

  const draftSummary = summarizeDraft(c.ai_draft);
  if (draftSummary) {
    parts.push(divider, t.optionalContext, divider, "");
    parts.push(t.primaryOrientation);
    parts.push(draftSummary);
    parts.push("");
    parts.push(t.biasControlText);
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
  parts.push(divider, t.outputStructureTitle, divider, "");
  parts.push(t.outputStructureBody);
  parts.push("");
  parts.push(divider, t.protocolTitle, divider, "");
  parts.push(t.protocolBody);
  parts.push("");
  parts.push(divider, t.disciplineTitle, divider, "");
  parts.push(t.disciplineBody);
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

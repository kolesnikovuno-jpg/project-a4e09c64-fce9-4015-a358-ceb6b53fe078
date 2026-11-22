/**
 * EGG operational kernel v0.1 — ADR-030.
 *
 * A deterministic, headless, read-only decision layer for a running product.
 * Goal (Author) x Role (Sphere) x Common Field. Ingestion and planning never
 * perform external actions, approve money, modify project DNA, or call an AI.
 * Connectors must authenticate, aggregate, deduplicate and persist events on
 * the server before this pure kernel is used for external execution policies.
 */
export type EggOperationalSphere =
  | "marketing" | "design" | "testDrive" | "commerce"
  | "legal" | "production" | "procurement" | "retail";

export type EggOperationalEventKind =
  | "ads_metrics" | "site_metrics" | "inquiry_received" | "order_confirmed"
  | "commercial_terms_changed" | "capacity_changed" | "supplies_changed"
  | "legal_conditions_changed" | "product_feedback";

export type EggOperationalEvent = {
  eventId: string;
  projectId: string;
  kind: EggOperationalEventKind;
  observedAt: string;
  source: string;
  /** Small aggregated fact payload. Do not include PII, secrets or user prompts. */
  summary: string;
};

export type EggGoal = {
  metric: "confirmed_orders_per_month";
  target: number;
  /** Only a server-verified Author mutation may install a new goal revision. */
  approvedBy: "author";
  revision: number;
};

export type EggObservedAmount = {
  amountUAH: number;
  source: string;
  verifiedAt: string;
};

export type EggCommercialField = {
  /** Strict opt-in for the specified advertising experiment, not blanket spend authority. */
  advertising: null | {
    authorApproved: true;
    dailyMaxUAH: number;
    monthlyMaxUAH: number;
    approvedAt: string;
  };
  spentToday: EggObservedAmount | null;
  spentMonth: EggObservedAmount | null;
  unitPrice: EggObservedAmount | null;
  variableCost: EggObservedAmount | null;
};

export type EggOperationalField = {
  projectId: string;
  goal: EggGoal;
  commerce: EggCommercialField;
  /** Event replay protection. Replace with a persistent unique event key at scale. */
  processedEventIds: readonly string[];
};

export type EggOperationalActivation = {
  sphere: EggOperationalSphere;
  /** Sphere receives the same common field, but interprets it through its role. */
  task: string;
  sourceEventId: string;
};

const TASKS: Record<EggOperationalEventKind, readonly {sphere: EggOperationalSphere; task: string}[]> = {
  ads_metrics: [
    {sphere: "marketing", task: "Исследовать фактическую реакцию на рекламный эксперимент"},
    {sphere: "commerce", task: "Сопоставить фактические рекламные затраты с экономикой"},
    {sphere: "retail", task: "Оценить работу канала привлечения"},
    {sphere: "testDrive", task: "Проверить, что именно подтвердил эксперимент"},
  ],
  site_metrics: [
    {sphere: "marketing", task: "Исследовать поведение и интерес на сайте"},
    {sphere: "retail", task: "Оценить путь пользователя до обращения"},
    {sphere: "testDrive", task: "Сопоставить гипотезу с наблюдаемым поведением"},
  ],
  inquiry_received: [
    {sphere: "retail", task: "Обработать обращение по действующим условиям"},
    {sphere: "marketing", task: "Уточнить гипотезу спроса по новому обращению"},
    {sphere: "commerce", task: "Отличить обращение от подтверждённого заказа"},
  ],
  order_confirmed: [
    {sphere: "commerce", task: "Обновить выполнение цели по подтверждённым заказам"},
    {sphere: "production", task: "Проверить возможности изготовления заказа"},
    {sphere: "procurement", task: "Уточнить доступность необходимых компонентов"},
    {sphere: "retail", task: "Проверить передачу заказа на исполнение"},
    {sphere: "legal", task: "Проверить необходимые договорные условия"},
  ],
  commercial_terms_changed: [
    {sphere: "commerce", task: "Пересчитать экономические ограничения"},
    {sphere: "marketing", task: "Пересмотреть допустимые варианты исследования спроса"},
    {sphere: "retail", task: "Актуализировать экономику каналов"},
  ],
  capacity_changed: [
    {sphere: "production", task: "Сопоставить загрузку с целью"},
    {sphere: "commerce", task: "Учесть ограничения производственного объёма"},
    {sphere: "retail", task: "Актуализировать обещаемые сроки"},
  ],
  supplies_changed: [
    {sphere: "procurement", task: "Проверить цены и наличие компонентов"},
    {sphere: "production", task: "Проверить совместимость и сроки"},
    {sphere: "commerce", task: "Пересчитать затраты при необходимости"},
  ],
  legal_conditions_changed: [
    {sphere: "legal", task: "Уточнить применимые условия и договоры"},
    {sphere: "retail", task: "Сверить публичное предложение с условиями"},
    {sphere: "commerce", task: "Учесть обязательства и связанные затраты"},
  ],
  product_feedback: [
    {sphere: "testDrive", task: "Разобрать проверенный пользовательский опыт"},
    {sphere: "design", task: "Оценить влияние обратной связи на форму"},
    {sphere: "production", task: "Проверить последствия возможного изменения"},
  ],
};

const nonempty = (s: string) => typeof s === "string" && s.trim().length > 0;
const validInstant = (s: string) => typeof s === "string" && Number.isFinite(Date.parse(s));
const validMoney = (n: number) => typeof n === "number" && Number.isFinite(n) && n >= 0;

function assertField(field: EggOperationalField): void {
  if (!nonempty(field.projectId) || field.goal?.approvedBy !== "author" ||
    field.goal.metric !== "confirmed_orders_per_month" ||
    !Number.isSafeInteger(field.goal.target) || field.goal.target < 1 ||
    !Number.isSafeInteger(field.goal.revision) || field.goal.revision < 1 ||
    !Array.isArray(field.processedEventIds)) throw new Error("invalid_author_goal_or_field");
}

/** One source event activates ONLY affected spheres. It does not invent findings. */
export function routeEggOperationalEvent(field: EggOperationalField, event: EggOperationalEvent): {
  field: EggOperationalField;
  status: "new" | "duplicate";
  activations: EggOperationalActivation[];
} {
  assertField(field);
  if (!nonempty(event.eventId) || !nonempty(event.source) || !nonempty(event.summary) ||
    !validInstant(event.observedAt) || event.projectId !== field.projectId ||
    !Object.prototype.hasOwnProperty.call(TASKS, event.kind)) {
    throw new Error("invalid_operational_event");
  }
  if (field.processedEventIds.includes(event.eventId))
    return {field, status: "duplicate", activations: []};
  return {
    field: {...field, processedEventIds: [...field.processedEventIds, event.eventId]},
    status: "new",
    activations: TASKS[event.kind].map(item => ({...item, sourceEventId: event.eventId})),
  };
}

export type EggAdExperimentAssessment = {
  status: "not_initiated" | "insufficient_data" | "outside_corridor" | "within_corridor";
  reasons: string[];
  /** Proposal only. Never implies Google Ads was modified. */
  candidateSpendUAH: number | null;
  /** Research can proceed even when expenditure is prohibited. */
  researchAllowed: true;
  externalActionExecuted: false;
};

/**
 * Evaluate one RETAIL advertising experiment using Commerce facts already in
 * the shared field; Marketing does not first propose a forbidden campaign.
 * This is an initial economic corridor, NOT the complete eight-sphere balance.
 */
export function assessEggAdExperiment(field: EggOperationalField, requestedDailyUAH: number,
  at: string): EggAdExperimentAssessment {
  assertField(field);
  if (!validInstant(at) || !Number.isFinite(requestedDailyUAH) || requestedDailyUAH <= 0)
    throw new Error("invalid_ad_experiment_request");
  const missing: string[] = [];
  const blocked: string[] = [];
  const c = field.commerce;
  const b = c.advertising;
  const fresh = (v: EggObservedAmount | null, maxAgeHours: number) => {
    if (!v || !validMoney(v.amountUAH) || !nonempty(v.source) || !validInstant(v.verifiedAt)) return false;
    const ageMs = Date.parse(at) - Date.parse(v.verifiedAt);
    return ageMs >= 0 && ageMs <= maxAgeHours * 3600 * 1000;
  };
  if (!b || b.authorApproved !== true || !validInstant(b.approvedAt) ||
    !validMoney(b.dailyMaxUAH) || !validMoney(b.monthlyMaxUAH) ||
    b.dailyMaxUAH === 0 || b.monthlyMaxUAH === 0) missing.push("Нет действующего авторского лимита рекламы");
  if (!fresh(c.spentToday, 48) || !fresh(c.spentMonth, 48)) missing.push("Нет свежих подтверждённых расходов Google Ads");
  if (!fresh(c.unitPrice, 24 * 30) || !fresh(c.variableCost, 24 * 30)) missing.push("Нет свежей проверяемой экономики единицы продукта");
  if (missing.length) return {status:"insufficient_data",reasons:missing,candidateSpendUAH:null,
    researchAllowed:true,externalActionExecuted:false};
  const budget = b!;
  const spentToday = c.spentToday!.amountUAH;
  const spentMonth = c.spentMonth!.amountUAH;
  if (c.unitPrice!.amountUAH <= c.variableCost!.amountUAH)
    blocked.push("Цена не покрывает проверенные переменные расходы");
  if (spentToday + requestedDailyUAH > budget.dailyMaxUAH)
    blocked.push("Дневной лимит будет превышен");
  if (spentMonth + requestedDailyUAH > budget.monthlyMaxUAH)
    blocked.push("Месячный лимит будет превышен");
  if (Date.parse(at) < Date.parse(budget.approvedAt))
    blocked.push("Состояние не может предшествовать авторскому утверждению");
  if (blocked.length) return {status:"outside_corridor",reasons:blocked,candidateSpendUAH:null,
    researchAllowed:true,externalActionExecuted:false};
  return {status:"within_corridor",reasons:[],candidateSpendUAH:requestedDailyUAH,
    researchAllowed:true,externalActionExecuted:false};
}

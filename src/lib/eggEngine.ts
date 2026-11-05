/**
 * Egg headless engine v0.1. Pure state transitions: no React, LLM calls,
 * storage, network or browser globals. External AI adapters may suggest work,
 * but only the Author may approve a result into the Core or change a level.
 *
 * Pilot rules; not an automated legal/technical/commercial certification.
 */
import type { EggArtifact } from "./eggArtifacts.js";
import type { EggFlowCycle } from "./eggFlowCycle.js";

export const EGG_SPHERES = {
  marketing: {
    purpose: "Потребность, аудитория, позиционирование",
    question: "Для кого и почему нужен объект?",
    output: "Гипотезы аудитории, потребностей и позиционирования",
    boundary: "Не выдаёт рыночный спрос за доказанный без исследования",
  },
  legal: {
    purpose: "Правомерность, права, ограничения, условия участия",
    question: "Что допустимо и какие права/обязательства затронуты?",
    output: "Реестр правовых вопросов, ограничений и проверок",
    boundary: "Не заменяет юридическое заключение",
  },
  design: {
    purpose: "Смысл в форме, функциях и конструктивном замысле",
    question: "Какая форма соответствует авторскому зерну?",
    output: "Концепции, варианты, эскизы и решения по форме",
    boundary: "Эскиз не является доказательством реализуемости",
  },
  production: {
    purpose: "Реализуемость, технология, сборка, воспроизводимость",
    question: "Каким способом можно воплотить выбранную форму?",
    output: "Технические ограничения, прототипы, варианты производства",
    boundary: "Гипотеза о технологии не равна производственной проверке",
  },
  testDrive: {
    purpose: "Критическая проверка и обратная связь",
    question: "Что работает, а что противоречит назначению?",
    output: "Замечания с привязкой к конкретной версии",
    boundary: "Дистанционный разбор не выдаётся за физический тест",
  },
  procurement: {
    purpose: "Материалы, комплектующие, инструменты и поставщики",
    question: "Из чего и с помощью чего можно это создать?",
    output: "Варианты ресурсов, доступности, комплектации и стоимости",
    boundary: "Цены и наличие должны иметь дату и источник",
  },
  commerce: {
    purpose: "Затраты, экономика, цена, условия окупаемости",
    question: "Сколько ресурсов требует процесс и возможна ли устойчивость?",
    output: "Учёт затрат и гипотезы экономической модели",
    boundary: "Оценка затрат не является подтверждённой выручкой",
  },
  retail: {
    purpose: "Представление продукта внешнему миру: кому, где, как и в каком виде показать текущую модель",
    question: "Кому, где и каким способом представить текущую версию продукта?",
    output: "Один обоснованный сценарий презентации: адресат, место или канал, носитель (эскиз, 3D/AR, образец), способ взаимодействия и условия передачи при необходимости",
    boundary: "Ритейл не обязан продавать: на ранних уровнях допустимы демонстрация, обратная связь и поиск партнёров. Гипотеза аудитории или канала не доказывает спрос или продажи.",
  },
} as const;

export type SphereId = keyof typeof EGG_SPHERES;
export type EggEntry = SphereId | "idea" | "author";
export type EggActor = "author" | "ai";
export type EggEvidence = "observation" | "hypothesis" | "question";
export type EggTaskStatus = "question" | "working" | "returned" | "accepted" | "revision_requested" | "rejected";
export type EggDecisionType = "accept" | "revise" | "reject";
export type EggConceptStatus = "proposed" | "accepted" | "revision_requested" | "rejected";
/** Five product maturity levels; Idea and Matter are poles, not levels. */
export type EggLevel = 1 | 2 | 3 | 4 | 5;

/** Forward-only adjacency for the two fixed Idea → Yolk streams.
 * The Yolk receives Commerce and Retail separately; they are not linked.
 * Legacy tasks remain in project history without destructive migration.
 */
export const EGG_EDGES: ReadonlyArray<readonly [Exclude<EggEntry, "author">, SphereId]> = [
  ["idea", "marketing"],
  ["idea", "legal"],
  ["marketing", "design"],
  ["legal", "production"],
  ["design", "testDrive"],
  ["production", "procurement"],
  ["testDrive", "commerce"],
  ["procurement", "retail"],
];

export type EggFinding = {
  id: string;
  taskId: string;
  text: string;
  evidence: EggEvidence;
  sourceRefs: string[];
  submittedBy: EggActor;
  submittedAt: string;
};
export type EggDecision = {
  id: string;
  taskId: string;
  findingId: string;
  outcome: EggDecisionType;
  reason: string;
  decidedAt: string;
};
export type EggTask = {
  id: string;
  from: EggEntry;
  sphere: SphereId;
  question: string;
  initiatedBy: EggActor;
  openedAt: string;
  level: EggLevel;
  iteration: number;
  status: EggTaskStatus;
  findings: EggFinding[];
  decisions: EggDecision[];
  sourceConceptId?: string;
  sourceQuestionIndex?: number;
};
export type EggConceptQuestion = { sphere: SphereId; question: string };
export type EggConceptVersion = {
  id: string;
  text: string;
  visualUrl?: string;
  questions: EggConceptQuestion[];
  status: EggConceptStatus;
  proposedBy: EggActor;
  createdAt: string;
  level: EggLevel;
  iteration: number;
  decision?: { outcome: EggDecisionType; reason: string; at: string };
};
export type EggEventKind =
  | "seed_recorded" | "seed_proposed" | "question_routed" | "work_started"
  | "finding_returned" | "author_decision" | "level_changed" | "iteration_started"
  | "artifact_registered" | "artifact_confirmed"
  | "concept_proposed" | "concept_decided"
  | "cycle_started" | "sphere_transited" | "cycle_sphere_completed"
  | "cycle_synthesized" | "cycle_decided";
export type EggEvent = {
  id: string;
  kind: EggEventKind;
  actor: EggActor;
  at: string;
  taskId?: string;
  detail: string;
};
export type EggProject = {
  schema: "egg.engine/0.1";
  id: string;
  title?: string;
  archivedAt?: string;
  seedProposal?: { text: string; proposedAt: string; source: "ai" };
  seed: { text: string; createdAt: string; source: "author" };
  level: EggLevel;
  iteration: number;
  tasks: EggTask[];
  /** Versioned text/graphic concept proposals. Optional for older projects. */
  concepts?: EggConceptVersion[];
  /** External file references. Optional for projects created before v0.3. */
  artifacts?: EggArtifact[];
  /** Fixed-route two-flow cycles; optional for existing legacy projects. */
  flowCycles?: EggFlowCycle[];
  events: EggEvent[];
  nextSequence: number;
};
export class EggEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EggEngineError";
  }
}
const required = (value: string, label: string): string => {
  if (typeof value !== "string" || !value.trim()) throw new EggEngineError(label + " is required");
  return value.trim();
};
const assertAuthor = (actor: EggActor): void => {
  if (actor !== "author") throw new EggEngineError("Only the Author may approve or change maturity");
};
const assertSphere = (value: unknown): value is SphereId =>
  typeof value === "string" && Object.prototype.hasOwnProperty.call(EGG_SPHERES, value);
const idOf = (kind: "event" | "task" | "finding" | "decision" | "concept", seq: number): string => kind + "-" + seq;
const pushEvent = (project: EggProject, event: Omit<EggEvent, "id">): EggProject => ({
  ...project,
  nextSequence: project.nextSequence + 1,
  events: [...project.events, { ...event, id: idOf("event", project.nextSequence) }],
});

export const createEggProject = (params: { id: string; seed?: string; title?: string; at: string }): EggProject => {
  const id = required(params.id, "Project ID");
  const seed = params.seed?.trim() ?? "";
  const title = params.title?.trim() || seed;
  if (!title) throw new EggEngineError("Project title is required");
  const at = required(params.at, "Timestamp");
  const project: EggProject = {
    schema: "egg.engine/0.1", id, title,
    seed: { text: seed, source: "author", createdAt: at },
    level: 1, iteration: 1, tasks: [], artifacts: [], events: [], nextSequence: 1,
  };
  return seed ? pushEvent(project, { kind: "seed_recorded", actor: "author", at, detail: "Original author seed recorded" }) : project;
};

export const proposeEggSeed = (project: EggProject, text: string, at: string): EggProject => {
  if (project.seed.text.trim() || project.tasks.length) throw new EggEngineError("Seed proposal not allowed after approval or work");
  const next = { ...project, seedProposal: { text: required(text, "Proposed seed"), proposedAt: required(at, "Timestamp"), source: "ai" as const } };
  return pushEvent(next, { kind: "seed_proposed", actor: "ai", at, detail: "Seed proposed for Author approval" });
};

export const recordAuthorSeed = (project: EggProject, seed: string, at: string): EggProject => {
  if (project.seed.text.trim()) throw new EggEngineError("Seed already exists; use a versioned revision instead");
  if (project.tasks.length) throw new EggEngineError("Cannot set seed after sphere work begins");
  const updated = { ...project, seedProposal: undefined, seed: { text: required(seed, "Author seed"), source: "author" as const, createdAt: at } };
  return pushEvent(updated, { kind: "seed_recorded", actor: "author", at, detail: "Original author seed approved" });
};

/** The Idea sphere compresses an Author seed into a reviewable concept.
 * Concept proposals are NOT Core until explicitly accepted by the Author.
 * Incoming AI proposals never modify the approved original seed.
 */
export const proposeEggConcept = (project: EggProject, params: {
  actor: EggActor; text: string; visualUrl?: string;
  questions?: EggConceptQuestion[]; at: string;
}): EggProject => {
  if (!project.seed.text.trim()) throw new EggEngineError("Approve the original idea first");
  if ((project.concepts ?? []).some(c => c.status === "proposed"))
    throw new EggEngineError("Review the open concept proposal before creating another");
  const text = required(params.text, "Concept text");
  if (text.length > 10000) throw new EggEngineError("Concept too long");
  const visualUrl = params.visualUrl?.trim() || undefined;
  if (visualUrl && (visualUrl.length > 1200 || !/^https?:\/\/[^\s]+$/i.test(visualUrl)))
    throw new EggEngineError("Invalid visual reference");
  const questions = params.questions ?? [];
  if (questions.length > 8 || !questions.every(q => assertSphere(q.sphere) &&
      typeof q.question === "string" && q.question.trim().length > 0 && q.question.trim().length <= 1000) ||
      new Set(questions.map(q => q.sphere)).size !== questions.length)
    throw new EggEngineError("Invalid concept questions");
  const at = required(params.at, "Timestamp");
  const version: EggConceptVersion = {
    id: idOf("concept", project.nextSequence), text, visualUrl,
    questions: questions.map(q => ({sphere:q.sphere, question:q.question.trim()})),
    status: "proposed", proposedBy:params.actor, createdAt:at,
    level:project.level, iteration:project.iteration,
  };
  return pushEvent({ ...project, concepts:[...(project.concepts??[]),version] }, {
    kind:"concept_proposed",actor:params.actor,at,detail:version.id,
  });
};

export const decideEggConcept = (project: EggProject, params: {
  actor: EggActor; conceptId: string; outcome: EggDecisionType; reason: string; at: string;
}): EggProject => {
  assertAuthor(params.actor);
  const index=(project.concepts??[]).findIndex(c=>c.id===params.conceptId);
  if(index<0 || project.concepts?.[index].status!=="proposed")
    throw new EggEngineError("Only pending concept proposals may be reviewed");
  const reason=required(params.reason, "Author remark");
  const at=required(params.at,"Timestamp");
  const status:EggConceptStatus=params.outcome==="accept"?"accepted":
    params.outcome==="revise"?"revision_requested":"rejected";
  const concepts=(project.concepts??[]).map((c,i)=>i===index?{
    ...c,status,decision:{outcome:params.outcome,reason,at}
  }:c);
  return pushEvent({...project,concepts},{
    kind:"concept_decided",actor:"author",at,detail:params.conceptId+":"+params.outcome,
  });
};

export const getActiveConcept = (project: EggProject): EggConceptVersion | undefined =>
  [...(project.concepts??[])].reverse().find(c=>c.status==="accepted");

export const canRoute = (from: EggEntry, to: SphereId, actor: EggActor): boolean => {
  if (!assertSphere(to) || (actor !== "author" && actor !== "ai")) return false;
  if (from === "author") return actor === "author";
  return EGG_EDGES.some(([a, b]) => a === from && b === to);
};

export const routeQuestion = (project: EggProject, params: {
  actor: EggActor; from: EggEntry; to: SphereId; question: string; at: string;
}): EggProject => {
  if (!project.seed.text.trim()) throw new EggEngineError("Author seed must be approved before routing");
  if (!canRoute(params.from, params.to, params.actor)) throw new EggEngineError("Unpermitted sphere route");
  const question = required(params.question, "Sphere question");
  const at = required(params.at, "Timestamp");
  const task: EggTask = {
    id: idOf("task", project.nextSequence), from: params.from, sphere: params.to,
    question, initiatedBy: params.actor, openedAt: at,
    level: project.level, iteration: project.iteration,
    status: "question", findings: [], decisions: [],
  };
  return pushEvent(
    { ...project, tasks: [...project.tasks, task] },
    { kind: "question_routed", actor: params.actor, at, taskId: task.id, detail: params.from + " → " + params.to },
  );
};

/** Only the Author may release a proposed question from an approved concept.
 * Retrying the same question will not duplicate a task.
 */
export const routeConceptQuestion = (project: EggProject, params: {
  actor: EggActor; conceptId: string; questionIndex: number; at: string;
}): EggProject => {
  assertAuthor(params.actor);
  const concept=(project.concepts??[]).find(c=>c.id===params.conceptId);
  if(!concept || concept.status!=="accepted") throw new EggEngineError("Concept not accepted");
  if(!Number.isInteger(params.questionIndex) || params.questionIndex<0 ||
     params.questionIndex>=concept.questions.length) throw new EggEngineError("Unknown concept question");
  if(project.tasks.some(t=>t.sourceConceptId===concept.id && t.sourceQuestionIndex===params.questionIndex))
    return project;
  const question=concept.questions[params.questionIndex];
  const routed=routeQuestion(project,{actor:"author",from:"author",to:question.sphere,question:question.question,at:params.at});
  const tasks=routed.tasks.slice();
  tasks[tasks.length-1]={...tasks[tasks.length-1],sourceConceptId:concept.id,sourceQuestionIndex:params.questionIndex};
  return {...routed,tasks};
};

const getTaskIndex = (project: EggProject, id: string): number => {
  const index = project.tasks.findIndex((task) => task.id === id);
  if (index < 0) throw new EggEngineError("Unknown task: " + id);
  return index;
};
const replaceTask = (project: EggProject, index: number, task: EggTask): EggProject => ({
  ...project, tasks: project.tasks.map((old, i) => (index === i ? task : old)),
});

export const startSphereWork = (project: EggProject, params: {
  taskId: string; actor: EggActor; at: string;
}): EggProject => {
  const index = getTaskIndex(project, params.taskId);
  const task = project.tasks[index];
  if (task.status !== "question" && task.status !== "revision_requested")
    throw new EggEngineError("Task cannot start work in its current state");
  const updated = replaceTask(project, index, { ...task, status: "working" });
  return pushEvent(updated, {
    kind: "work_started", actor: params.actor, at: required(params.at, "Timestamp"),
    taskId: task.id, detail: task.sphere,
  });
};

export const returnFinding = (project: EggProject, params: {
  taskId: string; actor: EggActor; at: string; text: string; evidence: EggEvidence; sourceRefs?: string[];
}): EggProject => {
  const index = getTaskIndex(project, params.taskId);
  const task = project.tasks[index];
  if (task.status !== "working") throw new EggEngineError("Task must be in progress");
  if (!["observation", "hypothesis", "question"].includes(params.evidence))
    throw new EggEngineError("Unknown evidence category");
  const sourceRefs = params.sourceRefs ?? [];
  if (!Array.isArray(sourceRefs) || !sourceRefs.every((s) => typeof s === "string" && s.trim()))
    throw new EggEngineError("Invalid source references");
  const finding: EggFinding = {
    id: idOf("finding", project.nextSequence), taskId: task.id,
    text: required(params.text, "Finding"), evidence: params.evidence,
    sourceRefs: [...sourceRefs], submittedBy: params.actor,
    submittedAt: required(params.at, "Timestamp"),
  };
  const updated = replaceTask(project, index, {
    ...task, status: "returned", findings: [...task.findings, finding],
  });
  return pushEvent(updated, {
    kind: "finding_returned", actor: params.actor, at: params.at,
    taskId: task.id, detail: finding.id,
  });
};

/** Accepting a finding is the ONLY current route to authoritative Core decisions.
 * The LLM response alone never becomes a decision and cannot overwrite seed.
 */
export const decideFinding = (project: EggProject, params: {
  taskId: string; actor: EggActor; outcome: EggDecisionType; reason: string; at: string;
}): EggProject => {
  assertAuthor(params.actor);
  const index = getTaskIndex(project, params.taskId);
  const task = project.tasks[index];
  if (task.status !== "returned" || task.findings.length === 0)
    throw new EggEngineError("Only a returned finding can be reviewed");
  if (!["accept", "revise", "reject"].includes(params.outcome))
    throw new EggEngineError("Unknown decision");
  const finding = task.findings[task.findings.length - 1];
  const decision: EggDecision = {
    id: idOf("decision", project.nextSequence), taskId: task.id, findingId: finding.id,
    outcome: params.outcome, reason: required(params.reason, "Reason"),
    decidedAt: required(params.at, "Timestamp"),
  };
  const status: EggTaskStatus =
    params.outcome === "accept" ? "accepted" :
    params.outcome === "revise" ? "revision_requested" : "rejected";
  const updated = replaceTask(project, index, {
    ...task, status, decisions: [...task.decisions, decision],
  });
  return pushEvent(updated, {
    kind: "author_decision", actor: "author", at: params.at,
    taskId: task.id, detail: decision.id + ":" + params.outcome,
  });
};

/** Read model: approved findings only; unapproved research remains available
 * in task history, never masquerading as accepted information.
 */
export const readCore = (project: EggProject) => ({
  projectId: project.id,
  originalSeed: project.seed.text,
  approvedConcept: getActiveConcept(project) ?? null,
  level: project.level,
  iteration: project.iteration,
  accepted: project.tasks.flatMap((task) => task.decisions
    .filter((decision) => decision.outcome === "accept")
    .map((decision) => ({
      sphere: task.sphere,
      question: task.question,
      finding: task.findings.find((item) => item.id === decision.findingId)!,
      decision,
    }))),
});

export const setLevel = (project: EggProject, params: {
  actor: EggActor; level: EggLevel; reason: string; at: string;
}): EggProject => {
  assertAuthor(params.actor);
  if ((project.flowCycles??[]).length) throw new EggEngineError("Levels advance only after an Author's complete-cycle decision");
  if (![1, 2, 3, 4, 5].includes(params.level)) throw new EggEngineError("Invalid level");
  if (params.level === project.level) return project;
  if (params.level > project.level + 1) throw new EggEngineError("Cannot skip forward levels");
  const reason = required(params.reason, "Reason");
  const updated: EggProject = { ...project, level: params.level, iteration: 1 };
  return pushEvent(updated, {
    kind: "level_changed", actor: "author", at: required(params.at, "Timestamp"),
    detail: String(project.level) + " → " + params.level + ": " + reason,
  });
};

export const nextIteration = (project: EggProject, params: {
  actor: EggActor; at: string; reason: string;
}): EggProject => {
  assertAuthor(params.actor);
  if ((project.flowCycles??[]).length) throw new EggEngineError("Iterations start only after an Author's complete-cycle revision");
  if (!Number.isSafeInteger(project.iteration + 1)) throw new EggEngineError("Iteration exceeds safe numeric range");
  const updated: EggProject = { ...project, iteration: project.iteration + 1 };
  return pushEvent(updated, {
    kind: "iteration_started", actor: "author", at: required(params.at, "Timestamp"),
    detail: required(params.reason, "Reason"),
  });
};

export const readSphereStates = (project: EggProject) => (
  Object.keys(EGG_SPHERES) as SphereId[]
).map((sphere) => {
  const tasks = project.tasks.filter((task) => task.sphere === sphere);
  return {
    sphere,
    questionCount: tasks.filter((task) => task.status === "question").length,
    workingCount: tasks.filter((task) => task.status === "working" || task.status === "revision_requested").length,
    returnedCount: tasks.filter((task) => task.status === "returned").length,
    acceptedCount: tasks.filter((task) => task.status === "accepted").length,
    rejectedCount: tasks.filter((task) => task.status === "rejected").length,
  };
});

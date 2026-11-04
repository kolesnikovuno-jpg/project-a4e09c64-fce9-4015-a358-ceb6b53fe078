import { useState } from "react";
import { EGG_SPHERES, type EggTaskStatus } from "../../lib/eggEngine";

type TaskState = { id: string; sphere: string; status: string };
type OverviewProject = { level: number; iteration: number; seed: { text: string }; tasks: TaskState[] };
type StatusInfo = { label: string; className: string };
const names: Record<string, string> = {
  marketing: "Маркетинг", legal: "Право", design: "Дизайн", production: "Производство",
  testDrive: "Тестдрайв", procurement: "Комплектация", commerce: "Коммерция", retail: "Ритейл",
};
const statuses: Record<EggTaskStatus | "not_started", StatusInfo> = {
  not_started: { label: "Не начато", className: "text-foreground/45" },
  question: { label: "Вопрос поставлен", className: "text-foreground/70" },
  working: { label: "В работе", className: "text-foreground/85" },
  returned: { label: "Решение Автора", className: "text-amber-700 dark:text-amber-300" },
  accepted: { label: "Принято", className: "text-emerald-700 dark:text-emerald-300" },
  revision_requested: { label: "На доработке", className: "text-amber-700 dark:text-amber-300" },
  rejected: { label: "Отклонено", className: "text-foreground/65" },
};
const priority: EggTaskStatus[] = ["returned", "revision_requested", "working", "question", "accepted", "rejected"];
function sphereStatus(tasks: TaskState[]): EggTaskStatus | "not_started" {
  if (!tasks.length) return "not_started";
  return priority.find(status => tasks.some(task => task.status === status)) ?? "question";
}

export default function EggProjectOverview({ project, activeSphere, onSelectSphere }: {
  project: OverviewProject;
  activeSphere: string | null;
  onSelectSphere: (sphere: string | null) => void;
}) {
  const [guideOpen, setGuideOpen] = useState(false);
  const accepted = project.tasks.filter(t => t.status === "accepted").length;
  const waiting = project.tasks.filter(t => t.status === "returned");
  const revision = project.tasks.filter(t => t.status === "revision_requested");
  const running = project.tasks.filter(t => t.status === "working" || t.status === "question");
  const notStarted = Object.keys(EGG_SPHERES).filter(id => !project.tasks.some(t => t.sphere === id));
  let next = "Сформулируйте и утвердите исходную идею — только после этого запускаются сферы.";
  if (project.seed.text.trim()) {
    if (waiting.length) next = "Есть результаты для решения Автора. Откройте соответствующую сферу и примите, верните на доработку или отклоните результат.";
    else if (revision.length) next = "Есть задачи на доработке. Уточнения должны вернуться к Автору на повторное рассмотрение.";
    else if (running.length) next = "Есть открытые задачи. Их результаты должны быть получены до следующего утверждения.";
    else if (project.tasks.length) next = "Все текущие задачи закрыты. Новые сферы и следующий этап запускаются только после решения Автора.";
    else next = "Исходная идея утверждена. Автор может определить первый вопрос и выбрать сферу.";
  }
  return <section className="space-y-3 rounded-xl border border-foreground/15 bg-foreground/[0.025] p-3 sm:p-4" aria-label="Состояние проекта EGG">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h3 className="text-sm font-medium">Состояние проекта</h3>
      <span className="text-xs text-foreground/55">Уровень {project.level} · Цикл {project.iteration}</span>
    </div>
    <div className="grid grid-cols-3 gap-2">
      <div className="rounded-lg border border-foreground/10 p-2 text-center"><p className="text-xl font-medium tabular-nums">{accepted}</p><p className="text-[11px] text-foreground/65">Принято задач</p></div>
      <div className="rounded-lg border border-foreground/10 p-2 text-center"><p className="text-xl font-medium tabular-nums">{waiting.length}</p><p className="text-[11px] text-foreground/65">Ждут Автора</p></div>
      <div className="rounded-lg border border-foreground/10 p-2 text-center"><p className="text-xl font-medium tabular-nums">{notStarted.length}</p><p className="text-[11px] text-foreground/65">Не начато сфер</p></div>
    </div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {(Object.keys(EGG_SPHERES) as Array<keyof typeof EGG_SPHERES>).map(key => {
        const tasks = project.tasks.filter(task => task.sphere === key);
        const status = sphereStatus(tasks);
        const selected = activeSphere === key;
        return <button type="button" key={key} onClick={() => onSelectSphere(key)} aria-pressed={selected}
          className={`min-w-0 rounded-lg border p-3 text-left transition-colors hover:border-foreground/50 ${selected ? "border-foreground/60 bg-foreground/10" : "border-foreground/15"}`}>
          <span className="block truncate text-xs font-medium">{names[key]}</span>
          <span className={`mt-1 block text-[11px] ${statuses[status].className}`}>{statuses[status].label}</span>
        </button>;
      })}
    </div>
    <div className="rounded-lg border border-foreground/15 p-3">
      <p className="mb-1 text-xs font-medium">Текущее действие</p>
      <p className="text-xs leading-relaxed text-foreground/75">{next}</p>
      {waiting.length > 0 && <button type="button" className="mt-2 rounded-full border border-foreground/35 px-3 py-2 text-xs" onClick={() => onSelectSphere(waiting[0].sphere)}>
        Открыть решение · {names[waiting[0].sphere] ?? waiting[0].sphere}
      </button>}
    </div>
    <button type="button" className="text-left text-xs underline underline-offset-4 text-foreground/70" onClick={() => setGuideOpen(value => !value)} aria-expanded={guideOpen}>
      {guideOpen ? "Скрыть инструкцию" : "Как пользоваться EGG?"}
    </button>
    {guideOpen && <div className="space-y-2 rounded-lg bg-foreground/5 p-3 text-xs leading-relaxed text-foreground/80">
      <p><strong>1. Автор:</strong> формулирует исходную идею и выбирает направление исследования.</p>
      <p><strong>2. Сферы:</strong> исследуют свою часть задачи и возвращают предложения, а не готовые утверждённые решения.</p>
      <p><strong>3. Автор:</strong> принимает, отклоняет или отправляет результат на доработку.</p>
      <p><strong>4. Чаты:</strong> помогают уточнять детали между сферами; сообщения не меняют ядро проекта.</p>
      <p><strong>5. Новый цикл:</strong> начинается только по решению Автора. Нажатие на сферу здесь лишь открывает информацию.</p>
    </div>}
  </section>;
}

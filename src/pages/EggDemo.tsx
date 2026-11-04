import { useState } from "react";
import { Link } from "react-router-dom";
import EggProjectOverview from "../components/egg/EggProjectOverview";
import { EGG_SPHERES } from "../lib/eggEngine";
const demoTasks = [
  { id: "sample-m", sphere: "marketing", status: "accepted" },
  { id: "sample-l", sphere: "legal", status: "accepted" },
  { id: "sample-d", sphere: "design", status: "returned" },
  { id: "sample-p", sphere: "production", status: "working" },
];
const names: Record<string, string> = { marketing: "Маркетинг", legal: "Право", design: "Дизайн", production: "Производство", testDrive: "Тестдрайв", procurement: "Комплектация", commerce: "Коммерция", retail: "Ритейл" };
const statuses: Record<string, string> = { accepted:"Результат принят Автором",returned:"Сфера передала предложение, ожидается решение Автора",working:"Участник исследует вопрос",question:"Ожидает запуска",revision_requested:"Результат на доработке",rejected:"Предложение отклонено" };

export default function EggDemo() {
  const [sphere,setSphere]=useState<string|null>(null);
  const project = { level:1, iteration:1, seed:{text:"Учебный пример: идея предмета для отдыха и уединения."}, tasks:demoTasks };
  const task = demoTasks.find(t=>t.sphere===sphere);
  const sphereDef = sphere && Object.prototype.hasOwnProperty.call(EGG_SPHERES,sphere) ? EGG_SPHERES[sphere as keyof typeof EGG_SPHERES] : null;
  return <main className="mx-auto max-w-3xl px-4 py-10 text-foreground sm:px-6">
    <nav className="mb-4 flex flex-wrap gap-4 text-xs"><Link className="underline underline-offset-4" to="/egg/connect">Аккаунт EGG</Link><Link className="underline underline-offset-4" to="/egg">3D-Яйцо</Link></nav>
    <h1 className="text-2xl font-medium">EGG · демонстрация</h1>
    <p className="my-3 text-sm leading-relaxed text-foreground/75">Это интерактивный пример интерфейса без регистрации. Здесь <strong>нет данных вашего проекта</strong>; выбор сферы ничего не меняет на сервере.</p>
    <EggProjectOverview project={project} activeSphere={sphere} onSelectSphere={setSphere} />
    {sphereDef && <section className="mt-4 space-y-3 rounded-xl border border-foreground/15 p-4" aria-label="Пример сферы">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-base font-medium">{names[sphere ?? ""]}</h2><button type="button" onClick={()=>setSphere(null)} className="rounded-full border border-foreground/25 px-3 py-2 text-xs">Вернуться к обзору</button></div>
      <p className="text-sm text-foreground/80">{sphereDef.purpose}</p>
      <p className="text-sm"><strong>Основной вопрос:</strong> {sphereDef.question}</p>
      <p className="text-sm"><strong>Ожидаемый результат:</strong> {sphereDef.output}</p>
      <p className="text-sm"><strong>Состояние:</strong> {task ? statuses[task.status] : "Работа ещё не начиналась"}</p>
      {task?.status==="returned" && <div className="rounded-lg bg-foreground/5 p-3 text-sm"><p className="mb-1 font-medium">Решение Автора</p><p className="text-foreground/75">В рабочем проекте здесь появятся варианты: принять, отправить на доработку или отклонить. В демо эти действия отключены.</p></div>}
    </section>}
    <p className="mt-5 text-xs text-foreground/60">Назначение демонстрации — проверить понятность навигации и рабочих состояний, не затрагивая EGG Engine.</p>
  </main>;
}

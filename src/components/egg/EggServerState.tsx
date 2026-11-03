import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import EggAuthorDecision from "./EggAuthorDecision";
import EggSeedStart from "./EggSeedStart";

type Project = { id: string; title?: string; seed: { text: string }; level: number; iteration: number; tasks: Array<{ id: string; sphere: string; status: string; question: string; findings: Array<{ id: string; text: string; evidence: string }>; decisions: Array<{ id: string; outcome: string; reason: string }> }> };

export default function EggServerState({ activeSphere, onSelectSphere }: { activeSphere: string | null; onSelectSphere: (sphere: string | null) => void }) {
  const [params] = useSearchParams();
  const id = params.get("project");
  const [project, setProject] = useState<Project | null>(null);
  const [revision, setRevision] = useState<number | null>(null);
  const [status, setStatus] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  useEffect(() => {
    if (!id) { setProject(null); setRevision(null); setStatus(""); return; }
    let active = true;
    setProject(null);
    setRevision(null);
    setStatus("");
    (async () => {
      try {
        const configResponse = await fetch("/api/egg-config", { cache: "no-store" });
        if (!configResponse.ok) throw new Error("config");
        const config = await configResponse.json() as { supabaseUrl: string; publishableKey: string };
        const auth = createClient(config.supabaseUrl, config.publishableKey);
        const { data } = await auth.auth.getSession();
        if (!data.session?.access_token) { if (active) setStatus("Войдите в аккаунт EGG для просмотра проекта."); return; }
        const response = await fetch("/api/egg-project-state?project=" + encodeURIComponent(id), { cache: "no-store", headers: { Authorization: "Bearer " + data.session.access_token } });
        if (!response.ok) throw new Error("projects");
        const payload = await response.json() as { project: Project; revision: number };
        if (active) { setProject(payload.project); setRevision(payload.revision); setLastUpdated(new Date().toLocaleTimeString()); setStatus(""); }
      } catch { if (active) setStatus("Не удалось прочитать серверное состояние."); }
    })();
    return () => { active = false; };
  }, [id, refreshKey]);
  useEffect(() => {
    if (!id) return;
    const refresh = () => { if (document.visibilityState === "visible") setRefreshKey(value => value + 1); };
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 30000);
    return () => { window.removeEventListener("focus", refresh); window.clearInterval(timer); };
  }, [id]);
  const isSphere = activeSphere && !["author", "idea", "matter"].includes(activeSphere);
  const sphereNames: Record<string, string> = { marketing: "Маркетинг", legal: "Право", design: "Дизайн", production: "Производство", testDrive: "Тестдрайв", procurement: "Комплектация", commerce: "Коммерция", retail: "Ритейл" };
  const pending = project?.tasks.filter(task => task.status === "returned").length ?? 0;
  return <section className="mx-auto mb-5 mt-5 max-w-[760px] rounded-xl border border-foreground/15 p-4 sm:p-5" aria-label="Серверные результаты EGG">
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-sm font-medium">EGG · {isSphere ? (sphereNames[activeSphere ?? ""] ?? activeSphere) : "Серверный проект"}</h2>
      <div className="flex items-center gap-3"><button type="button" onClick={() => setRefreshKey(value => value + 1)} className="text-xs underline underline-offset-4">Обновить</button><Link to="/egg/connect" className="text-xs underline underline-offset-4">Мои проекты</Link></div>
    </div>
    {!id && <p className="text-sm text-foreground/70">Выберите проект в личном кабинете.</p>}
    {id && !project && !status && <p className="text-sm">Загружаем проект…</p>}
    {status && <p role="status" className="text-sm text-foreground/70">{status}</p>}
    {project && <div className="space-y-2">
      <p className="text-sm font-medium">{project.title || "Проект EGG"}</p>
      <p className="text-sm text-foreground/70">{project.seed.text || "Исходный замысел ещё не сформирован"}</p>
      {!project.seed.text.trim() && revision !== null && <EggSeedStart projectId={project.id} revision={revision} onSaved={() => setRefreshKey(value => value + 1)} />}
      <p className="text-xs text-foreground/65">Ревизия {revision} · Уровень {project.level} · Итерация {project.iteration}{lastUpdated ? " · Обновлено " + lastUpdated : ""}</p>
      <div className="flex flex-wrap gap-2 py-2"><button type="button" onClick={() => onSelectSphere(null)} className={`rounded-full border px-3 py-2 text-xs ${!isSphere ? "border-foreground/60" : "border-foreground/15"}`}>Обзор · {project.tasks.length} задач</button>{Object.entries(sphereNames).map(([key, label]) => { const tasks = project.tasks.filter(task => task.sphere === key); return <button type="button" key={key} onClick={() => onSelectSphere(key)} className={`rounded-full border px-3 py-2 text-xs ${activeSphere === key ? "border-foreground/60" : "border-foreground/15"}`}>{label}{tasks.length ? ` · ${tasks.length}` : ""}</button>; })}</div>
      {!isSphere && <p className="text-xs text-foreground/60">Ожидают решения Автора: {pending}. Выберите сферу на Яйце или в строке выше, чтобы открыть её результаты.</p>}
      <div className="space-y-3">{project.tasks.filter(task => isSphere && task.sphere === activeSphere).map(task => <div key={task.id} className="rounded-lg border border-foreground/10 p-3 sm:p-4"><p className="text-sm font-medium">{task.sphere} · {task.status}</p><p className="mt-1 text-xs text-foreground/70">{task.question}</p>{task.findings.map(finding => <p key={finding.id} className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed"><span className="text-foreground/50">{finding.evidence}:</span> {finding.text}</p>)}{task.decisions.length > 0 && <p className="mt-2 text-xs">Решений Автора: {task.decisions.length}</p>}{task.status === "returned" && revision !== null && <EggAuthorDecision projectId={project.id} revision={revision} taskId={task.id} onSaved={() => setRefreshKey(value => value + 1)} />}</div>)}</div>
    </div>}
    {project && activeSphere && !["author", "idea", "matter"].includes(activeSphere) && !project.tasks.some(task => task.sphere === activeSphere) && <p className="mt-2 text-xs text-foreground/60">В этой сфере пока нет серверных задач.</p>}
    <p className="mt-3 text-xs text-foreground/55">Серверные результаты синхронизируются с EGG Engine. Визуальная модель и локальные черновики пока сохраняются отдельно.</p>
  </section>;
}

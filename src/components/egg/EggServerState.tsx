import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";

type Project = { id: string; seed: { text: string }; level: number; iteration: number; tasks: Array<{ id: string; sphere: string; status: string; question: string; findings: Array<{ id: string; text: string; evidence: string }>; decisions: Array<{ id: string; outcome: string; reason: string }> }> };

export default function EggServerState({ activeSphere }: { activeSphere: string | null }) {
  const [params] = useSearchParams();
  const id = params.get("project");
  const [project, setProject] = useState<Project | null>(null);
  const [revision, setRevision] = useState<number | null>(null);
  const [status, setStatus] = useState("");
  useEffect(() => {
    if (!id) return;
    let active = true;
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
        if (active) { setProject(payload.project); setRevision(payload.revision); setStatus(""); }
      } catch { if (active) setStatus("Не удалось прочитать серверное состояние."); }
    })();
    return () => { active = false; };
  }, [id]);
  return <section className="mb-5 rounded-xl border border-foreground/15 p-4">
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-sm font-medium">EGG Engine · {activeSphere && activeSphere !== "author" && activeSphere !== "idea" && activeSphere !== "matter" ? activeSphere : "проект"}</h2>
      <Link to="/egg/connect" className="text-xs underline underline-offset-4">Мои проекты</Link>
    </div>
    {!id && <p className="text-sm text-foreground/70">Выберите проект в личном кабинете.</p>}
    {id && !project && !status && <p className="text-sm">Загружаем проект…</p>}
    {status && <p role="status" className="text-sm text-foreground/70">{status}</p>}
    {project && <div className="space-y-2">
      <p className="text-sm">{project.seed.text}</p>
      <p className="text-xs text-foreground/65">Ревизия {revision} · Уровень {project.level} · Итерация {project.iteration}</p>
      <div className="space-y-3">{project.tasks.filter(task => !activeSphere || activeSphere === "author" || activeSphere === "idea" || activeSphere === "matter" || task.sphere === activeSphere).map(task => <div key={task.id} className="rounded-lg border border-foreground/10 p-3"><p className="text-sm font-medium">{task.sphere} · {task.status}</p><p className="mt-1 text-xs text-foreground/70">{task.question}</p>{task.findings.map(finding => <p key={finding.id} className="mt-2 text-xs"><span className="text-foreground/50">{finding.evidence}:</span> {finding.text}</p>)}{task.decisions.length > 0 && <p className="mt-2 text-xs">Решений Автора: {task.decisions.length}</p>}{task.status === "returned" && task.decisions.length === 0 && <p className="mt-2 text-xs text-foreground/60">Ожидает рассмотрения Автором</p>}</div>)}</div>
    </div>}
    {project && activeSphere && !["author", "idea", "matter"].includes(activeSphere) && !project.tasks.some(task => task.sphere === activeSphere) && <p className="mt-2 text-xs text-foreground/60">В этой сфере пока нет серверных задач.</p>}
    <p className="mt-3 text-xs text-foreground/55">Серверное состояние только для чтения. 3D-модель ниже пока работает с локальными данными браузера.</p>
  </section>;
}

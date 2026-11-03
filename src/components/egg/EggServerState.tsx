import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";

type Project = { id: string; seed: string; revision: number; level: number; iteration: number; tasks: Array<{ id: string; sphere: string; status: string; findings: number }> };

export default function EggServerState() {
  const [params] = useSearchParams();
  const id = params.get("project");
  const [project, setProject] = useState<Project | null>(null);
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
        const response = await fetch("/api/egg-my-projects", { cache: "no-store", headers: { Authorization: "Bearer " + data.session.access_token } });
        if (!response.ok) throw new Error("projects");
        const payload = await response.json() as { projects: Project[] };
        const match = payload.projects.find(item => item.id === id);
        if (active) { setProject(match ?? null); setStatus(match ? "" : "Проект не найден в вашем аккаунте."); }
      } catch { if (active) setStatus("Не удалось прочитать серверное состояние."); }
    })();
    return () => { active = false; };
  }, [id]);
  return <section className="mb-5 rounded-xl border border-foreground/15 p-4">
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-sm font-medium">EGG Engine · проект</h2>
      <Link to="/egg/connect" className="text-xs underline underline-offset-4">Мои проекты</Link>
    </div>
    {!id && <p className="text-sm text-foreground/70">Выберите проект в личном кабинете.</p>}
    {id && !project && !status && <p className="text-sm">Загружаем проект…</p>}
    {status && <p role="status" className="text-sm text-foreground/70">{status}</p>}
    {project && <div className="space-y-2">
      <p className="text-sm">{project.seed}</p>
      <p className="text-xs text-foreground/65">Ревизия {project.revision} · Уровень {project.level} · Итерация {project.iteration}</p>
      <ul className="space-y-1 text-xs text-foreground/75">{project.tasks.map(task =>
        <li key={task.id}>{task.sphere}: {task.status} · результатов {task.findings}</li>)}</ul>
    </div>}
    <p className="mt-3 text-xs text-foreground/55">Серверное состояние только для чтения. 3D-модель ниже пока работает с локальными данными браузера.</p>
  </section>;
}

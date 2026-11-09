import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import EggAuthorDecision from "./EggAuthorDecision";
import EggSeedStart from "./EggSeedStart";
import EggProjectChat from "./EggProjectChat";
import EggInviteAuthor from "./EggInviteAuthor";
import EggProjectOverview from "./EggProjectOverview";
import EggSphereWorkspace from "./EggSphereWorkspace";
import EggYolkMonitor from "./EggYolkMonitor";
import EggIdeaWorkshop from "./EggIdeaWorkshop";
import EggAiHandoff from "./EggAiHandoff";
import EggDocumentationPanel from "./EggDocumentationPanel";
import EggFlowCyclePanel from "./EggFlowCyclePanel";
import type { EggProject } from "../../lib/eggEngine";
import type { AiHandoffSphere } from "../../lib/eggAiHandoff";

type Project = EggProject;

export default function EggServerState({ activeSphere, onSelectSphere }: { activeSphere: string | null; onSelectSphere: (sphere: string | null) => void }) {
  const [params] = useSearchParams();
  const id = params.get("project");
  const [project, setProject] = useState<Project | null>(null);
  const [revision, setRevision] = useState<number | null>(null);
  const [status, setStatus] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const displayedProjectId = useRef<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  useEffect(() => {
    if (!id) { displayedProjectId.current = null; setProject(null); setRevision(null); setStatus(""); return; }
    let active = true;
    // Refresh data in place on focus. Do not unmount the sphere and lose a draft
    // while the Author is discussing the project in another ChatGPT tab.
    if (displayedProjectId.current !== id) {
      displayedProjectId.current = id;
      setProject(null);
      setRevision(null);
      setStatus("");
    }
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
  // The Author has a dedicated workspace. Do not reuse the legacy all-spheres modal body.
  if (activeSphere === "author") return <section className="mx-auto w-full max-w-[1040px] space-y-5 py-5" data-testid="egg-author-workspace">
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-foreground/15 pb-5">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-foreground/45">EGG / Автор</p>
        <h2 className="mt-2 text-2xl font-light tracking-tight">Управление развитием продукта</h2>
        <p className="mt-2 text-sm text-foreground/60">{project?.title || "Проект EGG"}</p>
      </div>
      <div className="flex flex-wrap gap-3 text-xs">
        <button type="button" onClick={()=>setRefreshKey(v=>v+1)} className="rounded-full border border-foreground/20 px-4 py-2">Обновить</button>
        <Link to="/egg/connect" className="rounded-full border border-foreground/20 px-4 py-2">Проекты</Link>
      </div>
    </header>
    {!project&&<p role="status" className="rounded-xl border border-foreground/15 p-5 text-sm">{status||"Загружаем состояние проекта…"}</p>}
    {project&&<>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-foreground/15 p-4"><p className="text-[11px] text-foreground/50">Этап</p><p className="mt-2 text-xl">Уровень {project.level} · Итерация {project.iteration}</p></div>
        <div className="rounded-xl border border-foreground/15 p-4"><p className="text-[11px] text-foreground/50">Задачи сфер</p><p className="mt-2 text-xl">{project.tasks.length} <span className="text-xs text-foreground/55">в истории</span></p></div>
        <div className="rounded-xl border border-foreground/15 p-4"><p className="text-[11px] text-foreground/50">Ожидают решения</p><p className="mt-2 text-xl">{pending}</p></div>
      </div>
      <section className="rounded-xl border border-foreground/15 p-4 sm:p-6">
        <p className="text-[11px] uppercase tracking-[0.14em] text-foreground/45">01 / ДНК · исходная идея</p>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">{project.seed.text||"Исходная идея ещё не сформирована"}</p>
        {!project.seed.text.trim()&&revision!==null&&<EggSeedStart projectId={project.id} revision={revision} proposal={project.seedProposal?.text} onSaved={()=>setRefreshKey(v=>v+1)}/>}
        <div className="mt-4 flex flex-wrap gap-4 text-xs">
          <button type="button" className="underline underline-offset-4" onClick={()=>onSelectSphere("idea")}>Открыть сферу Идея</button>
          <Link className="underline underline-offset-4" to={"/egg/yolk?project="+encodeURIComponent(project.id)}>Открыть Желток</Link>
        </div>
      </section>
      <section className="rounded-xl border border-foreground/15 p-4 sm:p-6">
        <p className="mb-3 text-[11px] uppercase tracking-[0.14em] text-foreground/45">02 / Циклы · решения Автора</p>
        <EggFlowCyclePanel project={project} revision={revision} authorControls onSaved={()=>setRefreshKey(v=>v+1)}/>
      </section>
      <section className="rounded-xl border border-foreground/15 p-4 sm:p-6">
        <p className="mb-3 text-[11px] uppercase tracking-[0.14em] text-foreground/45">03 / Диалог проекта</p>
        <EggProjectChat projectId={project.id} activeSphere="author"/>
      </section>
      <details className="rounded-xl border border-foreground/15 p-4 sm:p-6">
        <summary className="cursor-pointer text-sm">Архив · обзор, документы, материалы</summary>
        <div className="mt-5 space-y-4">
          <EggProjectOverview project={project} activeSphere="author" onSelectSphere={onSelectSphere}/>
          <EggYolkMonitor project={project}/>
          <EggDocumentationPanel project={project} revision={revision} origin="author"/>
          <EggInviteAuthor projectId={project.id}/>
        </div>
      </details>
      <p className="text-[11px] text-foreground/45">Состояние сервера · ревизия {revision??"—"}{lastUpdated?" · обновлено "+lastUpdated:""}. Неподтверждённые предложения не считаются решениями Автора.</p>
    </>}
  </section>;
  return <section className="mx-auto mb-5 mt-5 max-w-[760px] rounded-xl border border-foreground/15 p-4 sm:p-5" aria-label="Серверные результаты EGG">
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-sm font-medium">EGG · {isSphere ? (sphereNames[activeSphere ?? ""] ?? activeSphere) : activeSphere==="author"?"Автор · управление циклом":"Серверный проект"}</h2>
      <div className="flex items-center gap-3"><button type="button" onClick={() => setRefreshKey(value => value + 1)} className="text-xs underline underline-offset-4">Обновить</button><Link to="/egg/connect" className="text-xs underline underline-offset-4">Мои проекты</Link></div>
    </div>
    {!id && <p className="text-sm text-foreground/70">Выберите проект в личном кабинете.</p>}
    {id && !project && !status && <p className="text-sm">Загружаем проект…</p>}
    {status && <p role="status" className="text-sm text-foreground/70">{status}</p>}
    {status && <Link to="/egg/demo" className="mt-3 inline-flex rounded-full border border-foreground/25 px-4 py-2 text-xs">Посмотреть демонстрацию без регистрации</Link>}
    {project && <div className="space-y-2">
      <p className="text-sm font-medium">{project.title || "Проект EGG"}</p>
      {project.seed.text.trim() ? <details className="rounded-lg border border-foreground/10 p-3"><summary className="cursor-pointer text-xs text-foreground/75">Исходная идея Автора</summary><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/75">{project.seed.text}</p></details> : <p className="text-sm text-foreground/70">Исходная идея ещё не сформирована</p>}
      {!project.seed.text.trim() && revision !== null && <EggSeedStart projectId={project.id} revision={revision} proposal={project.seedProposal?.text} onSaved={() => setRefreshKey(value => value + 1)} />}
      <p className="text-xs text-foreground/65">Ревизия {revision}{lastUpdated ? " · Обновлено " + lastUpdated : ""}</p>
      {project.seed.text.trim() && <div className="flex flex-wrap gap-2">
        <button type="button" className="rounded-full border border-foreground/30 px-3 py-2 text-xs" onClick={()=>onSelectSphere("idea")}>Сфера «Идея» · концепция</button>
        {activeSphere==="idea"&&<button type="button" className="rounded-full border border-foreground/20 px-3 py-2 text-xs" onClick={()=>onSelectSphere(null)}>← Обзор</button>}
      </div>}
      {project.seed.text.trim()&&activeSphere==="idea"&&revision!==null&&
        <EggIdeaWorkshop projectId={project.id} seed={project.seed.text} concepts={project.concepts??[]}
          tasks={project.tasks} files={project.artifacts??[]} revision={revision} level={project.level} iteration={project.iteration} onSaved={()=>setRefreshKey(v=>v+1)}/>}
      {activeSphere==="author"&&<div className="space-y-2 rounded-lg border border-foreground/20 p-3"
        data-testid="egg-author-focus">
        <h3 className="text-sm font-medium">Автор · управление развитием проекта</h3>
        <p className="text-xs leading-relaxed text-foreground/65">
          Основное действие сейчас — провести первый цикл восьми сфер с ИИ.
          Старые выводы остаются в истории и не считаются результатом нового цикла.
        </p>
        <Link to={"/egg/yolk?project="+encodeURIComponent(project.id)}
          className="inline-block text-xs underline underline-offset-4">
          Открыть Желток · визуальная память и напряжения
        </Link>
      </div>}
      <EggFlowCyclePanel project={project} revision={revision} authorControls={activeSphere==="author"}
        onSaved={()=>setRefreshKey(v=>v+1)}/>
      {activeSphere==="author"
        ?<details className="rounded-lg border border-foreground/15 p-3" data-testid="egg-author-history">
          <summary className="cursor-pointer text-xs font-medium">История, документация и обзор проекта</summary>
          <div className="mt-3 space-y-3">
            <EggProjectOverview project={project} activeSphere={activeSphere}
              onSelectSphere={onSelectSphere}/>
            <EggYolkMonitor project={project}/>
            <EggDocumentationPanel project={project} revision={revision} origin="author"/>
          </div>
        </details>
        :<>
          <EggProjectOverview project={project} activeSphere={activeSphere}
            onSelectSphere={onSelectSphere}/>
          {!isSphere&&<EggYolkMonitor project={project}/>}
        </>}
      {isSphere && <button type="button" onClick={() => onSelectSphere(null)} className="mt-2 rounded-full border border-foreground/30 px-3 py-2 text-xs">← К общему обзору</button>}
      {!isSphere && pending === 0 && project.tasks.length > 0 && <p className="text-xs text-foreground/60">Задачи и выводы сохранены в соответствующих сферах. Нажмите на карточку нужной сферы для просмотра.</p>}
      {isSphere && activeSphere && revision!==null && <EggAiHandoff projectId={project.id}
        sphere={activeSphere as AiHandoffSphere} revision={revision} level={project.level} iteration={project.iteration}
        seed={project.seed.text}
        concept={[...(project.concepts??[])].reverse().find(c=>c.status==="accepted")?.text}
        tasks={project.tasks}/>}
      {isSphere && activeSphere && <EggSphereWorkspace key={activeSphere} projectId={project.id} sphere={activeSphere} seed={project.seed.text}
        concept={[...(project.concepts??[])].reverse().find(c=>c.status==="accepted")?.text}
        level={project.level} iteration={project.iteration} />}
      <div className="space-y-3">{project.tasks.filter(task => isSphere && task.sphere === activeSphere).map(task => <div key={task.id} className="rounded-lg border border-foreground/10 p-3 sm:p-4"><p className="text-sm font-medium">{task.sphere} · {task.status}</p><p className="mt-1 text-xs text-foreground/70">{task.question}</p>{task.findings.map(finding => <p key={finding.id} className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed"><span className="text-foreground/50">{finding.evidence}:</span> {finding.text}</p>)}{task.decisions.length > 0 && <p className="mt-2 text-xs">Решений Автора: {task.decisions.length}</p>}{!(project.flowCycles?.length) && task.status === "returned" && revision !== null && <EggAuthorDecision projectId={project.id} revision={revision} taskId={task.id} onSaved={() => setRefreshKey(value => value + 1)} />}</div>)}</div>
    </div>}
    {project && <EggProjectChat projectId={project.id} activeSphere={activeSphere} />}
    {project && (!isSphere || activeSphere === "author") && <EggInviteAuthor projectId={project.id} />}
    {project && activeSphere && !["author", "idea", "matter"].includes(activeSphere) && !project.tasks.some(task => task.sphere === activeSphere) && <p className="mt-2 text-xs text-foreground/60">В этой сфере пока нет серверных задач.</p>}
    <p className="mt-3 text-xs text-foreground/55">Серверные результаты синхронизируются с EGG Engine. Визуальная модель и локальные черновики пока сохраняются отдельно.</p>
  </section>;
}

import { useEffect, useState } from "react";
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
import type { AiHandoffSphere } from "../../lib/eggAiHandoff";

type ConceptVersion = { id:string;text:string;visualUrl?:string;questions:Array<{sphere:string;question:string}>;status:"proposed"|"accepted"|"revision_requested"|"rejected";proposedBy:"author"|"ai";createdAt:string;level:number;iteration:number;decision?:{outcome:"accept"|"revise"|"reject";reason:string;at:string} };
type Project = { id: string; title?: string; seedProposal?: { text: string }; seed: { text: string }; level: number; iteration: number; concepts?: ConceptVersion[]; tasks: Array<{ id: string; sphere: string; status: string; question: string; sourceConceptId?:string;sourceQuestionIndex?:number; findings: Array<{ id: string; text: string; evidence: string }>; decisions: Array<{ id: string; outcome: string; reason: string }> }> };

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
          tasks={project.tasks} revision={revision} level={project.level} iteration={project.iteration} onSaved={()=>setRefreshKey(v=>v+1)}/>}
      <EggProjectOverview project={project} activeSphere={activeSphere} onSelectSphere={onSelectSphere} />
      {!isSphere && <EggYolkMonitor project={project} />}
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
      <div className="space-y-3">{project.tasks.filter(task => isSphere && task.sphere === activeSphere).map(task => <div key={task.id} className="rounded-lg border border-foreground/10 p-3 sm:p-4"><p className="text-sm font-medium">{task.sphere} · {task.status}</p><p className="mt-1 text-xs text-foreground/70">{task.question}</p>{task.findings.map(finding => <p key={finding.id} className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed"><span className="text-foreground/50">{finding.evidence}:</span> {finding.text}</p>)}{task.decisions.length > 0 && <p className="mt-2 text-xs">Решений Автора: {task.decisions.length}</p>}{task.status === "returned" && revision !== null && <EggAuthorDecision projectId={project.id} revision={revision} taskId={task.id} onSaved={() => setRefreshKey(value => value + 1)} />}</div>)}</div>
    </div>}
    {project && <EggProjectChat projectId={project.id} activeSphere={activeSphere} />}
    {project && (!isSphere || activeSphere === "author") && <EggInviteAuthor projectId={project.id} />}
    {project && activeSphere && !["author", "idea", "matter"].includes(activeSphere) && !project.tasks.some(task => task.sphere === activeSphere) && <p className="mt-2 text-xs text-foreground/60">В этой сфере пока нет серверных задач.</p>}
    <p className="mt-3 text-xs text-foreground/55">Серверные результаты синхронизируются с EGG Engine. Визуальная модель и локальные черновики пока сохраняются отдельно.</p>
  </section>;
}

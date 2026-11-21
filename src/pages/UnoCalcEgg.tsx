import { Link, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { EGG_SPHERES } from "@/lib/eggEngine";
import LanguageSwitcher from "@/i18n/LanguageSwitcher";
import { useLocale } from "@/i18n/useLocale";
import UnoEggScene from "@/components/unocalc/UnoEggScene";
import EggServerState from "@/components/egg/EggServerState";
import EggSpherePanel from "@/components/egg/EggSpherePanel";
import EggProjectField from "@/components/egg/EggProjectField";
import EggIdeaWorkspace from "@/components/egg/EggIdeaWorkspace";
import EggConceptWorkspace from "@/components/egg/EggConceptWorkspace";
import EggYolkExperience from "@/components/egg/EggYolkExperience";
import {useEggUi} from "@/i18n/eggUi";
import type { SphereId } from "@/lib/eggEngine";

const modelLabel = { ru: "Модель объекта", uk: "Модель об’єкта", en: "Object model" };

const UnoCalcEgg = ({ eggBrand = false }: { eggBrand?: boolean }) => {
  const { locale, localePath } = useLocale();
  const {ui}=useEggUi();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const hasProject = Boolean(params.get("project"));
  const fieldMode = eggBrand && hasProject;
  const [activeSphere, setActiveSphere] = useState<string | null>(null);
  const [selectedWorkSphere, setSelectedWorkSphere] = useState<SphereId | null>(null);
  const [fieldWorkspace,setFieldWorkspace]=useState<"field"|"matter">("field");
  const [panelOpen, setPanelOpen] = useState(false);
  const [entryWorkspace,setEntryWorkspace]=useState<"idea"|"concept"|"yolk"|null>(null);
  const openEntry=(workspace:"idea"|"concept")=>{setEntryWorkspace(workspace);setPanelOpen(false);setSelectedWorkSphere(null);};
  const openBoard=(workspace:"field"|"matter")=>{setEntryWorkspace(null);setFieldWorkspace(workspace);setPanelOpen(false);setSelectedWorkSphere(null);};
  const openYolk=()=>{
    if(fieldMode){setEntryWorkspace("yolk");setPanelOpen(false);setSelectedWorkSphere(null);}
    else navigate("/egg/yolk?project="+encodeURIComponent(params.get("project")||""));
  };
  const [panelExpanded, setPanelExpanded] = useState(false);
  useEffect(() => {
    if (!eggBrand || !hasProject) return;
    const requested = params.get("start");
    if(requested === "idea" || requested === "author") {openEntry("idea");return;}
    if(requested === "concept") {openEntry("concept");return;}
    if(requested === "yolk") {openYolk();return;}
    if(requested === "field" || requested === "matter") {openBoard(requested);return;}
    if(requested !== null && Object.prototype.hasOwnProperty.call(EGG_SPHERES, requested)) {
      setActiveSphere(requested);
      setPanelOpen(true);
    }
  }, [eggBrand, hasProject, params]);
  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setPanelOpen(false); };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKey); };
  }, [panelOpen]);
  // On the canonical EGG domain, a missing project must open the real project
  // selector, never the legacy UNOcalc demonstration. Project URLs stay intact.
  if (eggBrand && !hasProject && window.location.hostname === "egg.kolesnikov.studio") {
    return <Navigate to="/egg/connect" replace />;
  }
  return (
    <div
      className={fieldMode ? "egg-one-screen h-[100dvh] w-full overflow-hidden bg-background font-body text-foreground" : "min-h-screen bg-background font-body text-foreground"}
      style={fieldMode ? undefined : {
        paddingTop: "max(2.25rem, env(safe-area-inset-top))",
        paddingBottom: "max(2rem, calc(env(safe-area-inset-bottom) + 1rem))",
        paddingLeft: "max(1.25rem, env(safe-area-inset-left))",
        paddingRight: "max(1.25rem, env(safe-area-inset-right))",
      }}
    >
      {!eggBrand && <LanguageSwitcher />}
      <main className={fieldMode ? "relative h-full w-full" : "mx-auto w-full max-w-[1060px]"}>
        <header className={fieldMode ? "pointer-events-none absolute inset-x-0 top-0 z-50 flex items-center justify-between px-5 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8" : "flex items-center justify-between pb-4 pr-2"}>
          <h1 className="pointer-events-auto text-[25px] font-extralight leading-none tracking-[-0.04em] text-foreground/85 sm:text-[28px]">
            {eggBrand ? "EGG" : <>UNO<span className="font-extralight">calc</span></>}
          </h1>
          {!fieldMode && <nav className="flex items-center gap-4 sm:gap-7">
            {eggBrand && <Link to={"/egg/yolk" + (hasProject ? "?project=" + encodeURIComponent(params.get("project") || "") : "")} className="text-[12px] text-foreground/70 hover:text-primary">Желток · 3D</Link>}
            {eggBrand && <Link to="/egg/connect" className="text-[12px] text-foreground/70 hover:text-primary">{({ ru: "Аккаунт", uk: "Акаунт", en: "Account" } as const)[locale]}</Link>}
            <Link to={localePath("/unocalc/model")}
              className="inline-flex min-h-9 items-center rounded-full border border-foreground/20 px-3 text-[11px] tracking-[0.04em] text-foreground/80 transition-colors hover:border-primary hover:text-primary">
              {modelLabel[locale]}
            </Link>
            <Link to={localePath("/")}
              className="inline-flex min-h-9 items-center text-[12px] tracking-[0.12em] text-foreground/80 transition-colors hover:text-primary">
              .uno
            </Link>
          </nav>}
        </header>
        <section className={fieldMode ? "absolute inset-0" : "mt-3"} aria-label={eggBrand ? "EGG — interactive project workspace" : "UNOcalc — egg geometry"}>
          {eggBrand && hasProject ? <EggProjectField
            key={params.get("project") || ""}
            projectId={params.get("project") || ""}
            singleCanvas={fieldMode}
            workspace={fieldWorkspace} onWorkspaceChange={setFieldWorkspace}
            onOpenAuthor={() => openEntry("idea") }
            onOpenProject={() => { setActiveSphere(null); setPanelOpen(true); }}
            onOpenYolk={openYolk}
            onOpenAccount={() => navigate("/egg/connect")}
          ><UnoEggScene locale={locale} onMatterOpen={()=>openBoard("matter")} onIdeaOpen={()=>openEntry("idea")}
            onConceptOpen={()=>openEntry("concept")} onYolkOpen={openYolk} onSphereOpen={(sphere) => setSelectedWorkSphere(sphere as SphereId)} /></EggProjectField> : <UnoEggScene locale={locale} onSphereOpen={eggBrand ? (sphere) => setSelectedWorkSphere(sphere as SphereId) : undefined} />}
        </section>
        {eggBrand && fieldMode && !entryWorkspace && fieldWorkspace==="field" && !panelOpen && !selectedWorkSphere &&
          <div className="egg-one-stage-label pointer-events-none absolute right-[max(2rem,env(safe-area-inset-right))] top-[max(4.25rem,env(safe-area-inset-top))] z-20 flex flex-col items-end gap-1 text-right" data-testid="egg-one-field-title">
            <span className="text-[10px] tracking-[.16em] text-foreground/45">{ui.fieldSpaceCaption}</span>
            <h2 className="text-xl font-light tracking-[.09em] text-foreground/75">{ui.field}</h2>
          </div>}
        {eggBrand && !fieldMode && <div className="flex flex-wrap items-center justify-center gap-3 py-5">
          {hasProject && <button type="button" onClick={() => { setActiveSphere("author"); setPanelOpen(true); }} className="rounded-full bg-foreground px-5 py-3 text-sm text-background" data-testid="egg-open-concept">Идея · решение по ДНК</button>}
          <button type="button" onClick={() => { setActiveSphere(null); setPanelOpen(true); }} className="rounded-full border border-foreground/30 px-5 py-3 text-sm text-foreground/80">{hasProject ? "Открыть проект и результаты сфер" : "Познакомиться с EGG"}</button>
          <span className="text-xs text-foreground/50">Сферы открывают исходные боковые панели; обзор проекта доступен отдельно</span>
        </div>}
        {eggBrand && fieldMode && entryWorkspace==="idea" && <EggIdeaWorkspace key={params.get("project") || ""}
          projectId={params.get("project") || ""}
          onClose={()=>setEntryWorkspace(null)} onOpenMatter={()=>openBoard("matter")} onOpenField={()=>openBoard("field")}
          onOpenConcept={()=>openEntry("concept")} onOpenYolk={openYolk}
          onProjectCreated={(newId)=>{
            setActiveSphere(null);setSelectedWorkSphere(null);setPanelOpen(false);
            setFieldWorkspace("field");setEntryWorkspace("idea");
            navigate(localePath("/egg")+"?project="+encodeURIComponent(newId)+"&start=idea");
          }}/>}
        {eggBrand && fieldMode && entryWorkspace==="concept" && <EggConceptWorkspace projectId={params.get("project") || ""}
          onClose={()=>setEntryWorkspace(null)} onOpenIdea={()=>openEntry("idea")} onOpenMatter={()=>openBoard("matter")}
          onOpenField={()=>openBoard("field")} onOpenYolk={openYolk}/>}
        {eggBrand && fieldMode && entryWorkspace==="yolk" && <div data-testid="egg-one-yolk-layer" className="egg-one-yolk-layer fixed inset-y-0 right-0 z-[90] w-full overflow-hidden">
          <EggYolkExperience embedded onClose={()=>setEntryWorkspace(null)}
            onOpenField={()=>openBoard("field")} onOpenMatter={()=>openBoard("matter")}
            onOpenIdea={()=>openEntry("idea")} onOpenConcept={()=>openEntry("concept")}/>
        </div>}
        {eggBrand && selectedWorkSphere && <EggSpherePanel key={selectedWorkSphere} sphere={selectedWorkSphere} name={EGG_SPHERES[selectedWorkSphere].name} summary={EGG_SPHERES[selectedWorkSphere].purpose} status="open" projectId={params.get("project")} onClose={() => setSelectedWorkSphere(null)} />}
        {eggBrand && panelOpen && <div data-testid="egg-one-utility-layer" className="egg-one-utility-layer fixed inset-0 z-[100] isolate flex items-stretch justify-end bg-background/20 backdrop-blur-[2px]" onMouseDown={event => { if (event.target === event.currentTarget) setPanelOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-label={activeSphere === "author" ? "Холст сферы Идея EGG" : "Рабочая панель EGG"} className={`relative z-10 flex h-[100dvh] w-full flex-col overflow-hidden bg-background shadow-2xl transition-[max-width] duration-300 ${activeSphere === "author" ? "max-w-none" : panelExpanded ? "max-w-[min(100vw,1060px)]" : "max-w-[min(100vw,480px)]"}`}>
            <div className="flex shrink-0 items-center justify-between border-b border-foreground/10 px-5 py-3">
              <span className="text-sm font-medium">{activeSphere === "author" ? "EGG · Идея / Холст" : "EGG · Рабочая панель"}</span>
              <div className="flex items-center gap-2">{activeSphere !== "author" && <button type="button" onClick={() => setPanelExpanded(value => !value)} aria-label={panelExpanded ? "Свернуть панель" : "Развернуть панель"} className="rounded-full border border-foreground/20 px-3 py-2 text-sm">{panelExpanded ? "Свернуть" : "Развернуть"}</button>}<button type="button" onClick={() => setPanelOpen(false)} aria-label="Закрыть панель" className="rounded-full border border-foreground/20 px-4 py-2 text-sm">Закрыть ×</button></div>
            </div>
            <div className="min-h-0 overflow-y-auto overscroll-contain px-3 pb-5 sm:px-5">
              {!hasProject ? <div className="mx-auto max-w-[660px] space-y-4 py-6">
  <h2 className="text-lg font-medium">{activeSphere && activeSphere in EGG_SPHERES ? activeSphere : activeSphere === "author" ? "Идея" : "Знакомство с EGG"}</h2>
  <p className="text-sm leading-relaxed text-foreground/75">{activeSphere && activeSphere in EGG_SPHERES ? EGG_SPHERES[activeSphere as keyof typeof EGG_SPHERES].purpose : activeSphere === "author" ? "В сфере Идея автор осмысляет материалы поля и уточняет замысел через итерации." : "Вращайте Яйцо и выбирайте сферы. Здесь можно познакомиться с системой без регистрации."}</p>
  {activeSphere && activeSphere in EGG_SPHERES && <p className="text-sm text-foreground/70">Вопрос сферы: {EGG_SPHERES[activeSphere as keyof typeof EGG_SPHERES].question}</p>}
  <Link to="/egg/connect" className="inline-flex rounded-full bg-foreground px-5 py-3 text-sm text-background">Начать · Вход или регистрация</Link>
</div> : <EggServerState activeSphere={activeSphere} onSelectSphere={setActiveSphere} />}
            </div>
          </div>
        </div>}
      </main>
    </div>
  );
};

export default UnoCalcEgg;

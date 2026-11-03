import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { EGG_SPHERES } from "@/lib/eggEngine";
import LanguageSwitcher from "@/i18n/LanguageSwitcher";
import { useLocale } from "@/i18n/useLocale";
import UnoEggScene from "@/components/unocalc/UnoEggScene";
import EggServerState from "@/components/egg/EggServerState";

const modelLabel = { ru: "Модель объекта", uk: "Модель об’єкта", en: "Object model" };

const UnoCalcEgg = ({ eggBrand = false }: { eggBrand?: boolean }) => {
  const { locale, localePath } = useLocale();
  const [params] = useSearchParams();
  const hasProject = Boolean(params.get("project"));
  const [activeSphere, setActiveSphere] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  useEffect(() => {
    if (eggBrand && hasProject && params.get("start") === "author") { setActiveSphere("author"); setPanelOpen(true); }
  }, [eggBrand, hasProject, params]);
  const openSphere = (sphere: string) => { setActiveSphere(sphere); setPanelOpen(true); };
  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setPanelOpen(false); };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKey); };
  }, [panelOpen]);
  return (
    <div
      className="min-h-screen bg-background font-body text-foreground"
      style={{
        paddingTop: "max(2.25rem, env(safe-area-inset-top))",
        paddingBottom: "max(2rem, calc(env(safe-area-inset-bottom) + 1rem))",
        paddingLeft: "max(1.25rem, env(safe-area-inset-left))",
        paddingRight: "max(1.25rem, env(safe-area-inset-right))",
      }}
    >
      <LanguageSwitcher />
      <main className="mx-auto w-full max-w-[1060px]">
        <header className="flex items-center justify-between pb-4 pr-2">
          <h1 className="text-[25px] font-extralight leading-none tracking-[-0.04em] text-foreground/85 sm:text-[28px]">
            {eggBrand ? "EGG" : <>UNO<span className="font-extralight">calc</span></>}
          </h1>
          <nav className="flex items-center gap-4 sm:gap-7">
            {eggBrand && <Link to="/egg/connect" className="text-[12px] text-foreground/70 hover:text-primary">{({ ru: "Аккаунт", uk: "Акаунт", en: "Account" } as const)[locale]}</Link>}
            <Link to={localePath("/unocalc/model")}
              className="inline-flex min-h-9 items-center rounded-full border border-foreground/20 px-3 text-[11px] tracking-[0.04em] text-foreground/80 transition-colors hover:border-primary hover:text-primary">
              {modelLabel[locale]}
            </Link>
            <Link to={localePath("/")}
              className="inline-flex min-h-9 items-center text-[12px] tracking-[0.12em] text-foreground/80 transition-colors hover:text-primary">
              .uno
            </Link>
          </nav>
        </header>
        <section className="mt-3" aria-label={eggBrand ? "EGG — interactive project workspace" : "UNOcalc — egg geometry"}>
          <UnoEggScene locale={locale} onSphereOpen={eggBrand ? openSphere : undefined} />
        </section>
        {eggBrand && <div className="flex flex-wrap items-center justify-center gap-3 py-5">
          <button type="button" onClick={() => { setActiveSphere(null); setPanelOpen(true); }} className="rounded-full border border-foreground/30 px-5 py-3 text-sm text-foreground/80">{hasProject ? "Открыть проект и результаты сфер" : "Познакомиться с EGG"}</button>
          <span className="text-xs text-foreground/50">Выберите сферу на Яйце или откройте обзор</span>
        </div>}
        {eggBrand && panelOpen && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-5" onMouseDown={event => { if (event.target === event.currentTarget) setPanelOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-label="Рабочая панель EGG" className="flex max-h-[94dvh] w-full max-w-[800px] flex-col overflow-hidden rounded-t-2xl border border-foreground/15 bg-background shadow-2xl sm:max-h-[88dvh] sm:rounded-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-foreground/10 px-5 py-3">
              <span className="text-sm font-medium">EGG · Рабочая панель</span>
              <button type="button" autoFocus onClick={() => setPanelOpen(false)} aria-label="Закрыть панель" className="rounded-full border border-foreground/20 px-4 py-2 text-sm">Закрыть ×</button>
            </div>
            <div className="min-h-0 overflow-y-auto overscroll-contain px-3 pb-5 sm:px-5">
              {!hasProject ? <div className="mx-auto max-w-[660px] space-y-4 py-6">
  <h2 className="text-lg font-medium">{activeSphere && activeSphere in EGG_SPHERES ? activeSphere : activeSphere === "author" ? "Автор" : "Знакомство с EGG"}</h2>
  <p className="text-sm leading-relaxed text-foreground/75">{activeSphere && activeSphere in EGG_SPHERES ? EGG_SPHERES[activeSphere as keyof typeof EGG_SPHERES].purpose : activeSphere === "author" ? "Автор формирует замысел, направляет работу сфер и утверждает решения." : "Вращайте Яйцо и выбирайте сферы. Здесь можно познакомиться с системой без регистрации."}</p>
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

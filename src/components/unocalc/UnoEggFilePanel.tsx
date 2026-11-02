import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import type { EggProject, SphereId } from "@/lib/eggEngine";
import { EGG_SPHERES } from "@/lib/eggEngine";
import { confirmDriveReference, registerDriveReference } from "@/lib/eggArtifacts";
import {
  createLocalEggBundle, importEggFileReferences, loadLocalEggProject, parseGoogleDriveFileLink,
  saveLocalEggProject, startLocalEggProject,
} from "@/lib/eggLocalPreview";
import type { EggMaturity } from "@/lib/unocalcEggStages";
import type { IdeaCycle } from "./UnoEggIdeaCyclePanel";
import type { DesignLoop } from "@/lib/unocalcEggDesignLoop";
import type { DesignBrief } from "@/lib/unocalcDesign";

type Locale = "ru" | "uk" | "en";
type Props = {
  locale: Locale;
  seed: string;
  maturity: EggMaturity;
  ideaCycle: IdeaCycle | null;
  designLoop: DesignLoop | null;
  brief: DesignBrief;
  sketches: Array<{ id: string; name: string }>;
};
const words = {
  ru: {
    title: "Мои материалы · Google Drive", note: "Локальный прототип. Вы сохраняете файл в Google Drive самостоятельно или через свой ИИ; сюда добавляется только ссылка. Google Drive не подключён.",
    noSeed: "Сначала передайте зерно в Идею на странице Автора.",
    link: "Ссылка на файл из Google Drive", linkPlaceholder: "https://drive.google.com/file/d/…",
    name: "Название материала", namePlaceholder: "Например: три эскиза кресла",
    sphere: "К какой сфере относится", general: "Общие материалы",
    register: "Зарегистрировать ссылку", invalid: "Нужна действительная ссылка на файл Google Drive или Google Docs.",
    invalidName: "Укажите название материала.", added: "Ссылка зарегистрирована. Файл ещё не проверен.",
    confirmed: "Подтверждено Автором", reported: "Ссылка зарегистрирована · не подтверждена",
    confirm: "Подтвердить материал", empty: "Пока нет зарегистрированных файлов.",
    export: "Скачать JSON проекта", copy: "Скопировать JSON",
    import: "Восстановить ссылки из JSON", imported: "Ссылки восстановлены",
    importError: "Не удалось импортировать: файл должен быть экспортом «Яйца» с тем же зерном и корректными ссылками Drive.",
    importNote: "Импорт восстанавливает только ссылки. Подтверждения необходимо выполнить повторно; состояние сфер не заменяется.",
    exported: "Экспорт подготовлен. Если Safari показывает файл, используйте «Поделиться» → «Сохранить в Файлы».",
    copied: "JSON скопирован.", copyError: "Не удалось скопировать. Используйте скачивание.",
    saveError: "Браузер не сохранил запись. Экспортируйте проект, чтобы не потерять данные.",
    limitation: "Экспорт включает тексты, историю и ссылки; файлы Drive и изображения из браузера в JSON не вложены.",
  },
  uk: {
    title: "Мої матеріали · Google Drive", note: "Локальний прототип. Файл зберігається у вашому Google Drive вручну або через ваш ШІ; тут лише посилання. Drive не підключено.",
    noSeed: "Спочатку передайте зерно до Ідеї на сторінці Автора.",
    link: "Посилання на файл Google Drive", linkPlaceholder: "https://drive.google.com/file/d/…",
    name: "Назва матеріалу", namePlaceholder: "Наприклад: три ескізи крісла",
    sphere: "До якої сфери належить", general: "Загальні матеріали",
    register: "Зареєструвати посилання", invalid: "Потрібне дійсне посилання на файл Google Drive або Google Docs.",
    invalidName: "Вкажіть назву матеріалу.", added: "Посилання зареєстровано. Файл ще не перевірено.",
    confirmed: "Підтверджено Автором", reported: "Посилання зареєстровано · не підтверджено",
    confirm: "Підтвердити матеріал", empty: "Зареєстрованих файлів поки немає.",
    export: "Завантажити JSON проєкту", copy: "Копіювати JSON",
    import: "Відновити посилання з JSON", imported: "Посилання відновлено",
    importError: "Імпорт не вдався: потрібен експорт «Яйця» з тим самим зерном і коректними посиланнями Drive.",
    importNote: "Імпортуються лише посилання. Підтвердження треба виконати повторно; стан сфер не змінюється.",
    exported: "Експорт готовий. Якщо Safari відкриває файл, використайте «Поділитися» → «Зберегти у Файли».",
    copied: "JSON скопійовано.", copyError: "Не вдалося скопіювати. Спробуйте завантажити.",
    saveError: "Браузер не зберіг запис. Експортуйте проєкт, щоб не втратити дані.",
    limitation: "Експорт включає тексти, історію та посилання; файли Drive і зображення браузера не вкладені.",
  },
  en: {
    title: "My materials · Google Drive", note: "Local prototype. Save the file in your Drive yourself or through your AI; only the reference is stored here. Drive is not connected.",
    noSeed: "First send your Author seed to Idea.",
    link: "Google Drive file link", linkPlaceholder: "https://drive.google.com/file/d/…",
    name: "Material name", namePlaceholder: "For example: three chair sketches",
    sphere: "Related sphere", general: "General materials",
    register: "Register link", invalid: "Enter a valid Google Drive or Google Docs file link.",
    invalidName: "Enter a material name.", added: "Link registered. File not independently checked.",
    confirmed: "Confirmed by Author", reported: "Registered · not confirmed",
    confirm: "Confirm material", empty: "No file references yet.",
    export: "Download project JSON", copy: "Copy JSON",
    import: "Restore links from JSON", imported: "Links restored",
    importError: "Cannot import: use an Egg export with the same Author seed and valid Drive links.",
    importNote: "Import restores links only. Confirmations must be repeated; sphere state is not replaced.",
    exported: "Export prepared. If Safari opens the file, use Share → Save to Files.",
    copied: "JSON copied.", copyError: "Could not copy. Try downloading.",
    saveError: "Browser storage failed. Export your project to preserve the data.",
    limitation: "Export includes text, history and links, not actual Drive files or local image binaries.",
  },
} as const;

const sphereLabels: Record<Locale, Record<SphereId, string>> = {
  ru: { marketing: "Маркетинг", legal: "Право", design: "Дизайн", production: "Производство",
    testDrive: "Тест-драйв", procurement: "Комплектация", commerce: "Коммерция", retail: "Ритейл" },
  uk: { marketing: "Маркетинг", legal: "Право", design: "Дизайн", production: "Виробництво",
    testDrive: "Тест-драйв", procurement: "Комплектація", commerce: "Комерція", retail: "Ритейл" },
  en: { marketing: "Marketing", legal: "Legal", design: "Design", production: "Production",
    testDrive: "Test drive", procurement: "Procurement", commerce: "Commerce", retail: "Retail" },
};

const field = "w-full min-w-0 rounded-lg border border-foreground/20 bg-transparent px-3 py-3 text-[13px] text-foreground/85 placeholder:text-foreground/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary";
const button = "min-h-11 rounded-full border border-foreground/25 px-4 py-2 text-[12px] font-light text-foreground/75 transition-colors hover:border-foreground/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary";

export const UnoEggFilePanel = ({
  locale, seed, maturity, ideaCycle, designLoop, brief, sketches,
}: Props) => {
  const t = words[locale];
  const [project, setProject] = useState<EggProject | null>(() => seed.trim()
    ? loadLocalEggProject(seed) ?? startLocalEggProject(seed, new Date().toISOString())
    : null);
  const [link, setLink] = useState("");
  const [name, setName] = useState("");
  const [sphere, setSphere] = useState<SphereId | "general">("general");
  const [notice, setNotice] = useState("");
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    if (!seed.trim()) { setProject(null); return; }
    setProject(current => current?.seed.text === seed.trim()
      ? current
      : loadLocalEggProject(seed) ?? startLocalEggProject(seed, new Date().toISOString()));
  }, [seed]);

  useEffect(() => {
    if (project && !saveLocalEggProject(project)) setStorageError(true);
    else setStorageError(false);
  }, [project]);

  const addReference = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = parseGoogleDriveFileLink(link);
    if (!parsed) { setNotice(t.invalid); return; }
    if (!name.trim()) { setNotice(t.invalidName); return; }
    if (!project) { setNotice(t.noSeed); return; }
    try {
      const next = registerDriveReference(project, {
        actor: "author", at: new Date().toISOString(),
        fileId: parsed.fileId, webUrl: parsed.webUrl, mimeType: parsed.mimeType,
        title: name.trim(), collectionKey: sphere === "general" ? "general" : sphere,
        ...(sphere !== "general" ? { sphere } : {}),
      });
      setProject(next);
      setLink("");
      setName("");
      setNotice(t.added);
    } catch {
      setNotice(t.invalid);
    }
  };

  const confirm = (artifactId: string) => {
    if (!project) return;
    setProject(confirmDriveReference(project, {
      actor: "author", artifactId, at: new Date().toISOString(),
    }));
    setNotice(t.confirmed);
  };

  const serialize = () => project ? JSON.stringify(createLocalEggBundle({
    project, maturity, ideaCycle, designLoop, brief, sketches,
    exportedAt: new Date().toISOString(),
  }), null, 2) : "";

  const download = () => {
    const content = serialize();
    if (!content) return;
    const blob = new Blob([content], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "egg-project-" + project!.id + ".json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    setNotice(t.exported);
  };

  const copy = async () => {
    try {
      const content = serialize();
      if (!content || !navigator.clipboard?.writeText) throw new Error("Clipboard not available");
      await navigator.clipboard.writeText(content);
      setNotice(t.copied);
    } catch {
      setNotice(t.copyError);
    }
  };

  const importLinks = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset value so the same file can be selected again after an error.
    event.target.value = "";
    if (!file || !project) return;
    try {
      if (file.size > 2_000_000) throw new Error("Import too large");
      const raw = await file.text();
      const result = importEggFileReferences(project, raw, new Date().toISOString());
      if (result.imported) setProject(result.project);
      setNotice(t.imported + ": " + result.imported + " · " + result.skipped);
    } catch {
      setNotice(t.importError);
    }
  };

  return (
    <details data-testid="unocalc-author-files" className="w-full rounded-xl border border-foreground/15 p-4 text-left">
      <summary className="cursor-pointer text-[13px] font-light text-foreground/80">
        {t.title} · {project?.artifacts?.length ?? 0}
      </summary>
      <div className="mt-4 space-y-4">
        <p className="text-[11px] font-light leading-relaxed text-foreground/55">{t.note}</p>
        {!project ? <p role="status" className="text-[12px] text-foreground/65">{t.noSeed}</p> : (
          <>
            <form onSubmit={addReference} className="space-y-3">
              <label className="block space-y-1 text-[11px] font-light text-foreground/65">
                <span>{t.link}</span>
                <input data-testid="unocalc-file-link" className={field}
                  type="url" value={link} onChange={e => setLink(e.target.value)}
                  placeholder={t.linkPlaceholder} autoComplete="off" required maxLength={1300} />
              </label>
              <label className="block space-y-1 text-[11px] font-light text-foreground/65">
                <span>{t.name}</span>
                <input data-testid="unocalc-file-name" className={field}
                  value={name} onChange={e => setName(e.target.value)}
                  placeholder={t.namePlaceholder} maxLength={250} required />
              </label>
              <label className="block space-y-1 text-[11px] font-light text-foreground/65">
                <span>{t.sphere}</span>
                <select data-testid="unocalc-file-sphere" className={field}
                  value={sphere} onChange={e => setSphere(e.target.value as SphereId | "general")}>
                  <option value="general">{t.general}</option>
                  {(Object.keys(EGG_SPHERES) as SphereId[]).map(id =>
                    <option key={id} value={id}>{sphereLabels[locale][id]}</option>)}
                </select>
              </label>
              <button data-testid="unocalc-file-register" type="submit" className={button}>{t.register}</button>
            </form>
            <div className="space-y-3" data-testid="unocalc-file-list">
              {(project.artifacts ?? []).length === 0
                ? <p className="text-[11px] text-foreground/45">{t.empty}</p>
                : (project.artifacts ?? []).map(item => (
                  <div key={item.id} className="min-w-0 rounded-lg border border-foreground/10 p-3">
                    <a href={item.webUrl} target="_blank" rel="noopener noreferrer"
                      className="break-all text-[13px] font-light underline underline-offset-4">
                      {item.title}
                    </a>
                    <p className="mt-1 text-[11px] text-foreground/55">
                      {item.sphere ? sphereLabels[locale][item.sphere] : t.general} · v{item.version}
                    </p>
                    <p className="mt-1 text-[11px] text-foreground/55">
                      {item.status === "author_confirmed" ? t.confirmed : t.reported}
                    </p>
                    {item.status !== "author_confirmed" && (
                      <button type="button" data-testid={"unocalc-file-confirm-" + item.id}
                        className={button + " mt-2"} onClick={() => confirm(item.id)}>
                        {t.confirm}
                      </button>
                    )}
                  </div>
                ))
              }
            </div>
          </>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" className={button} disabled={!project}
            data-testid="unocalc-file-export" onClick={download}>{t.export}</button>
          <button type="button" className={button} disabled={!project}
            data-testid="unocalc-file-copy" onClick={() => { void copy(); }}>{t.copy}</button>
        </div>
        {project && (
          <label className="flex w-full cursor-pointer flex-col gap-2 text-[11px] font-light text-foreground/70">
            <span>{t.import}</span>
            <input data-testid="unocalc-file-import" type="file" accept=".json,application/json"
              className="w-full text-[11px]" onChange={(event) => { void importLinks(event); }} />
          </label>
        )}
        <p className="text-[11px] font-light leading-relaxed text-foreground/55">{t.importNote}</p>
        <p className="text-[11px] font-light leading-relaxed text-foreground/55">{t.limitation}</p>
        {storageError && <p role="alert" className="text-[11px] text-red-600">{t.saveError}</p>}
        {notice && <p data-testid="unocalc-file-notice" role="status"
          className="text-[11px] font-light leading-relaxed text-foreground/75">{notice}</p>}
      </div>
    </details>
  );
};

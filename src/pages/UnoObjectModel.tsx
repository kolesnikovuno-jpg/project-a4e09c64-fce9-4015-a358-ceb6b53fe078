import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, Check, Download, FileText, History, ImagePlus, RotateCcw, Upload, X } from "lucide-react";
import LanguageSwitcher from "@/i18n/LanguageSwitcher";
import UnoObjectCorePanel from "@/components/unocalc/UnoObjectCorePanel";
import { emptyObjectCore, type ObjectCore } from "@/lib/unocalcObjectCore";
import { useLocale } from "@/i18n/useLocale";
import { EMPTY_BRIEF, type DesignBrief } from "@/lib/unocalcDesign";
import { listSketches, type StoredSketch } from "@/lib/unocalcSketches";
import {
  approveObjectRevision,
  persistObjectDocument,
  readObjectDocument,
  volumeCubicMetres,
  type ObjectFields,
  type ObjectProposal,
  type SphereId,
} from "@/lib/unocalcObject";
import { deleteObjectModel, loadObjectModel, saveObjectModel } from "@/lib/unocalcModel";

type SketchWithUrl = StoredSketch & { url: string };
type ModelPreview = { url: string; name: string };
const SPHERES: SphereId[] = ["design", "production", "commerce", "retail", "law", "components", "marketing", "testing"];
const IDEA_KEY = "unocalc.idea.v1";
const BRIEF_KEY = "unocalc.design.v1";
const MAX_GLB_BYTES = 40 * 1024 * 1024;

const copy = {
  ru: {
    back: "Вернуться к яйцу", title: "Модель объекта", subtitle: "Единое рабочее пространство автора",
    prototype: "Локальный прототип · доступ по аккаунту и серверные копии ещё не настроены",
    object: "Объект", untitled: "Новая модель", revision: "Редакция", draft: "Черновик", approved: "Утверждено",
    save: "Утвердить редакцию", saved: "Редакция сохранена в истории.", storageError: "Не удалось сохранить данные в этом браузере.",
    leftTitle: "Смысл и решения", idea: "Исходная идея", emptyIdea: "Идея ещё не сохранена. Начните в яйце.",
    concept: "Концепция", purpose: "Назначение", character: "Характер", constraints: "Ограничения",
    editInEgg: "Изменить в яйце", description: "Описание объекта", descriptionPlaceholder: "Что представляет собой объект на текущем этапе…",
    proposals: "Влияние восьми сфер", proposalNew: "Новое предложение", proposalPlaceholder: "Наблюдение, запрос, ограничение или возможность…",
    add: "Добавить", accept: "Принять", reject: "Отклонить", pending: "На рассмотрении",
    accepted: "Принято", rejected: "Отклонено", noProposals: "Предложений пока нет. Все восемь сфер доступны для внесения информации.",
    proposalRule: "Принятие фиксирует решение, но не изменяет параметры автоматически.",
    centerTitle: "Пространственная модель", viewSketch: "Эскиз", view3d: "3D", noVisual: "Объект ещё не имеет графического представления.",
    no3d: "3D-файл ещё не загружен. Пока показываем эскиз — это не объёмная модель.",
    rotate: "Вращайте модель жестом, масштабируйте двумя пальцами.", modelLoading: "Загрузка 3D-просмотрщика…",
    viewerError: "3D-просмотрщик не загрузился. Проверьте соединение.",
    modelInvalid: "Нужен корректный бинарный .glb, не более 40 МБ.",
    modelSaved: "3D-модель сохранена в этом браузере.", modelError: "Не удалось сохранить 3D-модель.",
    modelRemove: "Удалить 3D", modelRemoved: "3D-модель удалена.", modelUpload: "Добавить GLB",
    sketchCount: "Эскизы", noSketch: "Эскизы можно добавить в разделе «Дизайн» внутри яйца.",
    rightTitle: "Параметры и ресурсы", name: "Название модели", namePlaceholder: "Название объекта",
    dimensions: "Габариты", length: "Длина", width: "Ширина", height: "Высота", volume: "Объём габаритного контейнера",
    volumeEmpty: "Укажите три размера", quality: "Уровень исполнения", qualityPlaceholder: "Не определён",
    material: "Материалы / комплектующие", materialPlaceholder: "Пока не определены",
    economics: "Коммерция", investment: "Доступная инвестиция", marketPrice: "Рыночная цена / ориентир",
    currency: "EUR", economicsHint: "Введённые суммы — исходные данные, а не автоматический расчёт UNOcalc.",
    notes: "Рабочие примечания", notesPlaceholder: "Технические вопросы, допущения, открытые решения…",
    history: "История редакций", noHistory: "Утверждённых редакций ещё нет.",
    restore: "Вернуть в черновик", restored: "Состояние редакции восстановлено как черновик. Для утверждения сохраните новую редакцию.",
    restoreConfirm: "Заменить текущий черновик выбранной редакцией?", documents: "Документация",
    passport: "Паспорт объекта / PDF", export: "Экспорт данных / JSON",
    exportHint: "PDF создаётся через печать браузера. JSON содержит данные и историю, но не включает файлы эскизов и GLB.",
    print: "Печать / сохранить PDF", noData: "Не указано", fileNote: "Приложенные файлы хранятся локально и не включены в JSON.",
    printStatus: "Рабочий паспорт · не является производственным комплектом чертежей",
    date: "Дата", source: "Источник", status: "Статус", revisionHistory: "Утверждённые редакции",
    spheres: { design: "Дизайн", production: "Производство", commerce: "Коммерция", retail: "Ритейл", law: "Право", components: "Комплектующие", marketing: "Маркетинг", testing: "Тест-драйв" },
  },
  uk: {
    back: "Повернутися до яйця", title: "Модель об’єкта", subtitle: "Єдиний робочий простір автора",
    prototype: "Локальний прототип · доступ через акаунт і серверні копії ще не налаштовані",
    object: "Об’єкт", untitled: "Нова модель", revision: "Редакція", draft: "Чернетка", approved: "Затверджено",
    save: "Затвердити редакцію", saved: "Редакцію збережено в історії.", storageError: "Не вдалося зберегти дані в браузері.",
    leftTitle: "Зміст і рішення", idea: "Початкова ідея", emptyIdea: "Ідею ще не збережено. Почніть у яйці.",
    concept: "Концепція", purpose: "Призначення", character: "Характер", constraints: "Обмеження",
    editInEgg: "Змінити в яйці", description: "Опис об’єкта", descriptionPlaceholder: "Що являє собою об’єкт на поточному етапі…",
    proposals: "Вплив восьми сфер", proposalNew: "Нова пропозиція", proposalPlaceholder: "Спостереження, запит, обмеження або можливість…",
    add: "Додати", accept: "Прийняти", reject: "Відхилити", pending: "На розгляді",
    accepted: "Прийнято", rejected: "Відхилено", noProposals: "Пропозицій поки немає. Усі вісім сфер доступні.",
    proposalRule: "Прийняття фіксує рішення, але не змінює параметри автоматично.",
    centerTitle: "Просторова модель", viewSketch: "Ескіз", view3d: "3D", noVisual: "Об’єкт ще не має графічного представлення.",
    no3d: "3D-файл ще не завантажено. Показуємо ескіз, а не об’ємну модель.",
    rotate: "Обертайте модель жестом, масштабуйте двома пальцями.", modelLoading: "Завантаження 3D-переглядача…",
    viewerError: "3D-переглядач не завантажився. Перевірте з’єднання.",
    modelInvalid: "Потрібен коректний бінарний .glb до 40 МБ.",
    modelSaved: "3D-модель збережена в цьому браузері.", modelError: "Не вдалося зберегти 3D-модель.",
    modelRemove: "Видалити 3D", modelRemoved: "3D-модель видалено.", modelUpload: "Додати GLB",
    sketchCount: "Ескізи", noSketch: "Ескізи можна додати у розділі «Дизайн» усередині яйця.",
    rightTitle: "Параметри та ресурси", name: "Назва моделі", namePlaceholder: "Назва об’єкта",
    dimensions: "Габарити", length: "Довжина", width: "Ширина", height: "Висота", volume: "Об’єм габаритного контейнера",
    volumeEmpty: "Вкажіть три розміри", quality: "Рівень виконання", qualityPlaceholder: "Не визначено",
    material: "Матеріали / комплектуючі", materialPlaceholder: "Поки не визначені",
    economics: "Комерція", investment: "Доступна інвестиція", marketPrice: "Ринкова ціна / орієнтир",
    currency: "EUR", economicsHint: "Введені суми — вихідні дані, а не автоматичний розрахунок UNOcalc.",
    notes: "Робочі примітки", notesPlaceholder: "Технічні питання, припущення, відкриті рішення…",
    history: "Історія редакцій", noHistory: "Затверджених редакцій ще немає.",
    restore: "Повернути до чернетки", restored: "Стан редакції відновлено як чернетку. Для затвердження збережіть нову редакцію.",
    restoreConfirm: "Замінити поточну чернетку обраною редакцією?", documents: "Документація",
    passport: "Паспорт об’єкта / PDF", export: "Експорт даних / JSON",
    exportHint: "PDF створюється через друк браузера. JSON містить дані та історію, але не файли ескізів і GLB.",
    print: "Друк / зберегти PDF", noData: "Не вказано", fileNote: "Додані файли зберігаються локально та не включені до JSON.",
    printStatus: "Робочий паспорт · не є виробничим комплектом креслень",
    date: "Дата", source: "Джерело", status: "Статус", revisionHistory: "Затверджені редакції",
    spheres: { design: "Дизайн", production: "Виробництво", commerce: "Комерція", retail: "Ритейл", law: "Право", components: "Комплектуючі", marketing: "Маркетинг", testing: "Тест-драйв" },
  },
  en: {
    back: "Back to the egg", title: "Object model", subtitle: "The author's unified workspace",
    prototype: "Local prototype · account access and server backups are not configured yet",
    object: "Object", untitled: "New model", revision: "Revision", draft: "Draft", approved: "Approved",
    save: "Approve revision", saved: "Revision saved to history.", storageError: "Could not save data in this browser.",
    leftTitle: "Intent and decisions", idea: "Original idea", emptyIdea: "No saved idea yet. Start in the egg.",
    concept: "Concept", purpose: "Purpose", character: "Character", constraints: "Constraints",
    editInEgg: "Edit in egg", description: "Object description", descriptionPlaceholder: "Describe the object in its current state…",
    proposals: "Input from eight spheres", proposalNew: "New proposal", proposalPlaceholder: "Observation, request, constraint or opportunity…",
    add: "Add", accept: "Accept", reject: "Reject", pending: "Pending",
    accepted: "Accepted", rejected: "Rejected", noProposals: "No proposals yet. All eight spheres are available.",
    proposalRule: "Acceptance records a decision but does not change object parameters automatically.",
    centerTitle: "Spatial model", viewSketch: "Sketch", view3d: "3D", noVisual: "No visual representation yet.",
    no3d: "No 3D file yet. A sketch is shown instead; it is not a 3D model.",
    rotate: "Drag to rotate, pinch to zoom.", modelLoading: "Loading 3D viewer…",
    viewerError: "3D viewer could not load. Check your connection.",
    modelInvalid: "Use a valid binary .glb file, up to 40 MB.",
    modelSaved: "3D model saved in this browser.", modelError: "Could not save 3D model.",
    modelRemove: "Remove 3D", modelRemoved: "3D model removed.", modelUpload: "Add GLB",
    sketchCount: "Sketches", noSketch: "Add sketches in the Design section of the egg.",
    rightTitle: "Parameters and resources", name: "Model name", namePlaceholder: "Object name",
    dimensions: "Dimensions", length: "Length", width: "Width", height: "Height", volume: "Bounding-box volume",
    volumeEmpty: "Enter all three dimensions", quality: "Execution level", qualityPlaceholder: "Not defined",
    material: "Materials / components", materialPlaceholder: "Not defined yet",
    economics: "Commerce", investment: "Available investment", marketPrice: "Market price / reference",
    currency: "EUR", economicsHint: "These amounts are inputs, not an automated UNOcalc estimate.",
    notes: "Working notes", notesPlaceholder: "Technical questions, assumptions, unresolved decisions…",
    history: "Revision history", noHistory: "No approved revisions yet.",
    restore: "Restore as draft", restored: "Revision restored as a draft. Approve a new revision to keep it.",
    restoreConfirm: "Replace the current draft with this revision?", documents: "Documentation",
    passport: "Object passport / PDF", export: "Data export / JSON",
    exportHint: "PDF uses browser printing. JSON includes data and history, not sketch or GLB files.",
    print: "Print / save PDF", noData: "Not specified", fileNote: "Attached files are local and not included in JSON.",
    printStatus: "Working object passport · not a production drawing set",
    date: "Date", source: "Source", status: "Status", revisionHistory: "Approved revisions",
    spheres: { design: "Design", production: "Production", commerce: "Commerce", retail: "Retail", law: "Legal", components: "Components", marketing: "Marketing", testing: "Test drive" },
  },
} as const;

const readIdea = () => {
  try { return localStorage.getItem(IDEA_KEY) ?? ""; } catch { return ""; }
};
const readBrief = (): DesignBrief => {
  try {
    const parsed = JSON.parse(localStorage.getItem(BRIEF_KEY) || "null");
    return parsed && typeof parsed === "object"
      ? { ...EMPTY_BRIEF, ...parsed } : { ...EMPTY_BRIEF };
  } catch { return { ...EMPTY_BRIEF }; }
};

const fieldClass = "w-full rounded-xl border border-foreground/15 bg-background/65 px-3 py-2.5 text-[13px] leading-relaxed outline-none transition-colors focus:border-primary/70";
const sectionClass = "rounded-2xl border border-foreground/10 bg-foreground/[0.025] p-4 sm:p-5";
const mutedLabel = "mb-1.5 block text-[10px] uppercase tracking-[0.13em] text-foreground/55";
const formatDate = (iso: string, locale: string) => {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString(locale === "uk" ? "uk-UA" : locale === "en" ? "en-GB" : "ru-RU");
};

const UnoObjectModel = () => {
  const { locale, localePath } = useLocale();
  const t = copy[locale];
  const [doc, setDoc] = useState(readObjectDocument);
  const [idea] = useState(readIdea);
  const [brief] = useState(readBrief);
  const [sketches, setSketches] = useState<SketchWithUrl[]>([]);
  const [activeSketch, setActiveSketch] = useState("");
  const [model, setModel] = useState<ModelPreview | null>(null);
  const modelUrlRef = useRef<string | null>(null);
  const [viewerState, setViewerState] = useState<"loading" | "ready" | "error">("loading");
  const [viewMode, setViewMode] = useState<"sketch" | "3d">("sketch");
  const [sphere, setSphere] = useState<SphereId>("design");
  const [proposalText, setProposalText] = useState("");
  const [notice, setNotice] = useState("");
  const [storageError, setStorageError] = useState(false);
  const volume = useMemo(() => volumeCubicMetres(doc.fields), [doc.fields]);
  const lastRevision = doc.revisions[doc.revisions.length - 1];
  const isDraft = !lastRevision || JSON.stringify(lastRevision.fields) !== JSON.stringify(doc.fields)
    || JSON.stringify(lastRevision.core ?? emptyObjectCore()) !== JSON.stringify(doc.core)
    || lastRevision.idea !== idea || JSON.stringify(lastRevision.brief) !== JSON.stringify(brief);
  const selectedSketch = sketches.find((item) => item.id === activeSketch) ?? sketches[0];

  useEffect(() => {
    try { persistObjectDocument(doc); setStorageError(false); }
    catch { setStorageError(true); }
  }, [doc]);

  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];
    listSketches().then((items) => {
      if (cancelled) return;
      setSketches(items.map((item) => {
        const url = URL.createObjectURL(item.blob);
        urls.push(url);
        return { ...item, url };
      }));
    }).catch(() => {});
    return () => { cancelled = true; urls.forEach((url) => URL.revokeObjectURL(url)); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadObjectModel().then((stored) => {
      if (!stored || cancelled) return;
      const url = URL.createObjectURL(stored.blob);
      modelUrlRef.current = url;
      setModel({ url, name: stored.name });
      setViewMode("3d");
    }).catch(() => {});
    return () => {
      cancelled = true;
      if (modelUrlRef.current) URL.revokeObjectURL(modelUrlRef.current);
      modelUrlRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!model) return;
    if (customElements.get("model-viewer")) { setViewerState("ready"); return; }
    setViewerState("loading");
    let script = document.querySelector<HTMLScriptElement>("#unocalc-object-model-viewer");
    if (!script) {
      script = document.createElement("script");
      script.id = "unocalc-object-model-viewer";
      script.type = "module";
      script.src = "https://ajax.googleapis.com/ajax/libs/model-viewer/3.0.1/model-viewer.min.js";
      document.head.appendChild(script);
    }
    let active = true;
    const onError = () => { if (active) setViewerState("error"); };
    script.addEventListener("error", onError);
    customElements.whenDefined("model-viewer").then(() => { if (active) setViewerState("ready"); });
    return () => { active = false; script?.removeEventListener("error", onError); };
  }, [model]);

  const changeField = (field: Exclude<keyof ObjectFields, "proposals">, value: string) =>
    setDoc((current) => ({
      ...current, fields: { ...current.fields, [field]: value },
      updatedAt: new Date().toISOString(),
    }));

  const updateCore = (updater: (core: ObjectCore) => ObjectCore) => {
    setDoc((current) => ({ ...current, core: updater(current.core), updatedAt: new Date().toISOString() }));
  };

  const addProposal = () => {
    const text = proposalText.trim();
    if (!text) return;
    const proposal: ObjectProposal = {
      id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()),
      sphere, text, status: "pending", createdAt: new Date().toISOString(),
    };
    setDoc((current) => ({
      ...current,
      fields: { ...current.fields, proposals: [...current.fields.proposals, proposal] },
      updatedAt: new Date().toISOString(),
    }));
    setProposalText("");
  };

  const decideProposal = (id: string, status: "accepted" | "rejected") => {
    setDoc((current) => ({
      ...current,
      fields: {
        ...current.fields,
        proposals: current.fields.proposals.map((item) =>
          item.id === id ? { ...item, status, decidedAt: new Date().toISOString() } : item),
      },
      updatedAt: new Date().toISOString(),
    }));
  };

  const approveRevision = () => {
    setDoc((current) => approveObjectRevision(current, idea, brief));
    setNotice(t.saved);
  };

  const restoreRevision = (number: number) => {
    const revision = doc.revisions.find((item) => item.number === number);
    if (!revision || !window.confirm(t.restoreConfirm)) return;
    setDoc((current) => ({ ...current, fields: structuredClone(revision.fields),
      core: structuredClone(revision.core ?? emptyObjectCore()), updatedAt: new Date().toISOString() }));
    setNotice(t.restored);
  };

  const uploadModel = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const magic = file.size >= 4 ? new TextDecoder().decode(await file.slice(0, 4).arrayBuffer()) : "";
    if (!file.name.toLowerCase().endsWith(".glb") || file.size > MAX_GLB_BYTES || magic !== "glTF") {
      setNotice(t.modelInvalid);
      return;
    }
    try {
      await saveObjectModel({ id: "current", name: file.name, savedAt: Date.now(), blob: file });
      if (modelUrlRef.current) URL.revokeObjectURL(modelUrlRef.current);
      const url = URL.createObjectURL(file);
      modelUrlRef.current = url;
      setModel({ url, name: file.name });
      setViewMode("3d");
      setNotice(t.modelSaved);
    } catch { setNotice(t.modelError); }
  };

  const removeModel = async () => {
    try {
      await deleteObjectModel();
      if (modelUrlRef.current) URL.revokeObjectURL(modelUrlRef.current);
      modelUrlRef.current = null;
      setModel(null);
      setViewMode("sketch");
      setNotice(t.modelRemoved);
    } catch { setNotice(t.modelError); }
  };

  const exportJson = () => {
    const data = {
      schemaVersion: "unocalc.object-package/1",
      exportedAt: new Date().toISOString(),
      idea,
      designBrief: brief,
      document: doc,
      sketchFiles: sketches.map(({ id, name, createdAt }) => ({ id, name, createdAt, embedded: false })),
      modelFile: model ? { name: model.name, embedded: false } : null,
      note: t.fileNote,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "unocalc-object-" + (doc.revision || "draft") + ".json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const input = (label: string, field: Exclude<keyof ObjectFields, "proposals">, placeholder = "", type = "text") => (
    <label className="block">
      <span className={mutedLabel}>{label}</span>
      <input className={fieldClass} type={type} min={type === "number" ? "0" : undefined} step={type === "number" ? "any" : undefined}
        inputMode={type === "number" ? "decimal" : undefined}
        placeholder={placeholder} value={doc.fields[field]}
        onChange={(event) => changeField(field, event.target.value)} />
    </label>
  );

  return (
    <div className="min-h-screen bg-background font-body text-foreground" style={{
      paddingTop: "max(2rem, env(safe-area-inset-top))",
      paddingBottom: "max(2rem, env(safe-area-inset-bottom))",
      paddingLeft: "max(1rem, env(safe-area-inset-left))",
      paddingRight: "max(1rem, env(safe-area-inset-right))",
    }}>
      <div className="print:hidden"><LanguageSwitcher /></div>
      <main className="mx-auto max-w-[1500px] print:hidden">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-foreground/10 pb-5">
          <div>
            <Link to={localePath("/unocalc")} className="mb-4 inline-flex items-center gap-2 text-[11px] tracking-[0.09em] text-foreground/60 hover:text-foreground">
              <ArrowLeft size={14} /> {t.back}
            </Link>
            <div className="text-[10px] uppercase tracking-[0.25em] text-foreground/45">UNOcalc / {t.object}</div>
            <h1 className="mt-1 text-[29px] font-extralight tracking-[-0.035em] sm:text-[35px]">{t.title}</h1>
            <p className="mt-1 text-[12px] text-foreground/55">{t.subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-4">
            <span className="rounded-full border border-foreground/15 px-3 py-2 text-[11px] text-foreground/65">{t.revision} {String(doc.revision).padStart(2, "0")}</span>
            <span className="rounded-full border border-foreground/15 px-3 py-2 text-[11px] text-foreground/65">{isDraft ? t.draft : t.approved}</span>
            <button type="button" onClick={approveRevision}
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-foreground px-4 text-[11px] text-background transition-opacity hover:opacity-80">
              <Check size={14} /> {t.save}
            </button>
          </div>
        </header>

        <p className="mb-5 text-[11px] leading-relaxed text-foreground/55">{t.prototype}</p>
        {(notice || storageError) && (
          <p role="status" className="mb-4 rounded-xl border border-foreground/15 px-3 py-2 text-[12px]">
            {storageError ? t.storageError : notice}
          </p>
        )}

        <UnoObjectCorePanel locale={locale} core={doc.core} onUpdate={updateCore} />

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(225px,0.95fr)_minmax(360px,1.65fr)_minmax(235px,1fr)]">
          <div className="order-2 space-y-4 lg:order-1">
            <section className={sectionClass}>
              <h2 className="mb-4 text-[15px] font-medium">{t.leftTitle}</h2>
              <div className="space-y-4">
                <div>
                  <div className={mutedLabel}>{t.idea}</div>
                  <p className="whitespace-pre-wrap text-[12px] leading-[1.75] text-foreground/80">{idea || t.emptyIdea}</p>
                  <Link to={localePath("/unocalc")} className="mt-2 inline-flex items-center gap-1 text-[11px] text-primary hover:underline">
                    {t.editInEgg} <ArrowUpRight size={12} />
                  </Link>
                </div>
                {([
                  [t.concept, brief.concept], [t.purpose, brief.purpose],
                  [t.character, brief.character], [t.constraints, brief.constraints],
                ] as const).filter(([, value]) => value.trim()).map(([label, value]) => (
                  <div key={label} className="border-t border-foreground/10 pt-3">
                    <div className={mutedLabel}>{label}</div>
                    <p className="whitespace-pre-wrap text-[12px] leading-[1.7]">{value}</p>
                  </div>
                ))}
                <label className="block border-t border-foreground/10 pt-3">
                  <span className={mutedLabel}>{t.description}</span>
                  <textarea className={fieldClass} rows={4} placeholder={t.descriptionPlaceholder}
                    value={doc.fields.description} onChange={(event) => changeField("description", event.target.value)} />
                </label>
              </div>
            </section>

            <section className={sectionClass}>
              <h2 className="mb-1 text-[15px] font-medium">{t.proposals}</h2>
              <p className="mb-4 text-[11px] leading-relaxed text-foreground/55">{t.proposalRule}</p>
              <div className="mb-4 grid grid-cols-2 gap-1.5">
                {SPHERES.map((item) => (
                  <button key={item} type="button" onClick={() => setSphere(item)}
                    aria-pressed={sphere === item}
                    className={`rounded-lg border px-2 py-2 text-left text-[11px] transition-colors ${sphere === item ? "border-primary/65 bg-primary/10 text-foreground" : "border-foreground/10 text-foreground/60 hover:border-foreground/30"}`}>
                    {t.spheres[item]}
                  </button>
                ))}
              </div>
              <label className="block">
                <span className={mutedLabel}>{t.proposalNew} · {t.spheres[sphere]}</span>
                <textarea className={fieldClass} rows={3} value={proposalText} placeholder={t.proposalPlaceholder}
                  onChange={(event) => setProposalText(event.target.value)} />
              </label>
              <button type="button" onClick={addProposal} disabled={!proposalText.trim()}
                className="mt-2 inline-flex min-h-9 items-center rounded-full border border-foreground/25 px-4 text-[11px] disabled:opacity-35">
                {t.add}
              </button>
              <div className="mt-5 space-y-3">
                {doc.fields.proposals.length === 0 && <p className="text-[11px] leading-relaxed text-foreground/55">{t.noProposals}</p>}
                {[...doc.fields.proposals].reverse().map((item) => (
                  <article key={item.id} className="rounded-xl border border-foreground/10 bg-background/60 p-3">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-foreground/55">
                      <span>{t.spheres[item.sphere] ?? item.sphere}</span>
                      <span>{item.status === "pending" ? t.pending : item.status === "accepted" ? t.accepted : t.rejected}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-[12px] leading-relaxed">{item.text}</p>
                    {item.status === "pending" && (
                      <div className="mt-3 flex gap-2">
                        <button type="button" onClick={() => decideProposal(item.id, "accepted")}
                          className="inline-flex items-center gap-1 rounded-full border border-foreground/20 px-3 py-1.5 text-[10px]"><Check size={12}/>{t.accept}</button>
                        <button type="button" onClick={() => decideProposal(item.id, "rejected")}
                          className="inline-flex items-center gap-1 rounded-full border border-foreground/20 px-3 py-1.5 text-[10px]"><X size={12}/>{t.reject}</button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          </div>

          <div className="order-1 space-y-4 lg:order-2">
            <section className={sectionClass}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[15px] font-medium">{t.centerTitle}</h2>
                <div className="flex gap-1 rounded-full border border-foreground/10 p-1">
                  <button type="button" onClick={() => setViewMode("sketch")} disabled={!selectedSketch}
                    aria-pressed={viewMode === "sketch"}
                    className={`rounded-full px-3 py-1.5 text-[10px] disabled:opacity-35 ${viewMode === "sketch" ? "bg-foreground text-background" : "text-foreground/65"}`}>{t.viewSketch}</button>
                  <button type="button" onClick={() => setViewMode("3d")} disabled={!model}
                    aria-pressed={viewMode === "3d"}
                    className={`rounded-full px-3 py-1.5 text-[10px] disabled:opacity-35 ${viewMode === "3d" ? "bg-foreground text-background" : "text-foreground/65"}`}>{t.view3d}</button>
                </div>
              </div>
              <div className="relative flex h-[350px] items-center justify-center overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/[0.035] sm:h-[490px] lg:h-[560px]">
                <div aria-hidden="true" className="pointer-events-none absolute inset-6 rounded-[50%] border border-foreground/[0.045]" />
                <div aria-hidden="true" className="pointer-events-none absolute inset-14 rounded-[50%] border border-foreground/[0.035]" />
                {viewMode === "3d" && model && viewerState === "ready" ? (
                  <model-viewer key={model.url} src={model.url} alt={doc.fields.title || t.title}
                    camera-controls interaction-prompt="none" environment-image="neutral" shadow-intensity="0.8"
                    style={{ width: "100%", height: "100%", position: "relative", zIndex: 1 }} />
                ) : viewMode === "3d" && model ? (
                  <div className="z-10 max-w-[240px] px-4 text-center text-[12px] leading-relaxed text-foreground/60">
                    {viewerState === "error" ? t.viewerError : t.modelLoading}
                  </div>
                ) : selectedSketch ? (
                  <img src={selectedSketch.url} alt={selectedSketch.name} className="relative z-10 h-full w-full object-contain p-5" />
                ) : (
                  <div className="z-10 max-w-[240px] px-5 text-center">
                    <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full border border-foreground/20 bg-foreground/[0.025]">
                      <div className="h-12 w-12 rounded-full border border-foreground/20 bg-foreground/[0.045]" />
                    </div>
                    <p className="text-[12px] leading-relaxed text-foreground/55">{t.noVisual}</p>
                  </div>
                )}
                <div className="pointer-events-none absolute bottom-4 left-4 z-20 text-[10px] uppercase tracking-[0.12em] text-foreground/40">
                  {viewMode === "3d" && model ? "GLB · " + model.name : selectedSketch ? selectedSketch.name : "UNO / OBJECT"}
                </div>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-foreground/55">
                {viewMode === "3d" && model ? t.rotate : t.no3d}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full border border-foreground/25 px-4 text-[11px]">
                  <Upload size={13}/>{t.modelUpload}
                  <input type="file" accept=".glb,model/gltf-binary" className="sr-only" onChange={uploadModel} />
                </label>
                {model && (
                  <button type="button" onClick={removeModel} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-foreground/15 px-4 text-[11px] text-foreground/65">
                    <X size={13}/>{t.modelRemove}
                  </button>
                )}
              </div>
              <div className="mt-5 border-t border-foreground/10 pt-4">
                <div className={mutedLabel}>{t.sketchCount} · {sketches.length}</div>
                {sketches.length ? (
                  <div className="flex flex-wrap gap-2">
                    {sketches.map((item) => (
                      <button key={item.id} type="button" onClick={() => { setActiveSketch(item.id); setViewMode("sketch"); }}
                        aria-label={item.name} aria-pressed={selectedSketch?.id === item.id && viewMode === "sketch"}
                        className={`h-16 w-16 overflow-hidden rounded-lg border-2 ${selectedSketch?.id === item.id && viewMode === "sketch" ? "border-primary" : "border-foreground/10"}`}>
                        <img src={item.url} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <Link to={localePath("/unocalc")} className="inline-flex items-center gap-2 text-[11px] text-primary hover:underline">
                    <ImagePlus size={13}/>{t.noSketch}<ArrowUpRight size={12}/>
                  </Link>
                )}
              </div>
            </section>

            <section className={sectionClass}>
              <h2 className="mb-4 text-[15px] font-medium">{t.documents}</h2>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => window.print()}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-foreground/25 px-4 text-[11px]">
                  <FileText size={14}/>{t.print}
                </button>
                <button type="button" onClick={exportJson}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-foreground/25 px-4 text-[11px]">
                  <Download size={14}/>{t.export}
                </button>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-foreground/55">{t.exportHint}</p>
            </section>
          </div>

          <div className="order-3 space-y-4">
            <section className={sectionClass}>
              <h2 className="mb-4 text-[15px] font-medium">{t.rightTitle}</h2>
              <div className="space-y-4">
                {input(t.name, "title", t.namePlaceholder)}
                <div className="border-t border-foreground/10 pt-4">
                  <h3 className="mb-3 text-[12px] font-medium">{t.dimensions} · мм</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {input(t.length, "lengthMm", "0", "number")}
                    {input(t.width, "widthMm", "0", "number")}
                    {input(t.height, "heightMm", "0", "number")}
                  </div>
                  <div className="mt-3 rounded-xl bg-foreground/[0.045] p-3">
                    <div className={mutedLabel}>{t.volume}</div>
                    <div className="text-[20px] font-light tabular-nums">
                      {volume === null ? <span className="text-[11px] text-foreground/50">{t.volumeEmpty}</span>
                        : new Intl.NumberFormat(locale === "uk" ? "uk-UA" : locale === "en" ? "en-GB" : "ru-RU", { maximumFractionDigits: 4 }).format(volume) + " м³"}
                    </div>
                  </div>
                </div>
                {input(t.quality, "quality", t.qualityPlaceholder)}
                <label className="block">
                  <span className={mutedLabel}>{t.material}</span>
                  <textarea className={fieldClass} rows={3} placeholder={t.materialPlaceholder}
                    value={doc.fields.material} onChange={(event) => changeField("material", event.target.value)} />
                </label>
                <div className="border-t border-foreground/10 pt-4">
                  <h3 className="mb-3 text-[12px] font-medium">{t.economics}</h3>
                  <div className="space-y-3">
                    {input(t.investment + " · " + t.currency, "investment", "", "number")}
                    {input(t.marketPrice + " · " + t.currency, "marketPrice", "", "number")}
                  </div>
                  <p className="mt-3 text-[11px] leading-relaxed text-foreground/55">{t.economicsHint}</p>
                </div>
                <label className="block border-t border-foreground/10 pt-4">
                  <span className={mutedLabel}>{t.notes}</span>
                  <textarea className={fieldClass} rows={4} placeholder={t.notesPlaceholder}
                    value={doc.fields.notes} onChange={(event) => changeField("notes", event.target.value)} />
                </label>
              </div>
            </section>

            <section className={sectionClass}>
              <h2 className="mb-3 flex items-center gap-2 text-[15px] font-medium"><History size={16}/>{t.history}</h2>
              {doc.revisions.length === 0 && <p className="text-[11px] text-foreground/55">{t.noHistory}</p>}
              <div className="space-y-2">
                {[...doc.revisions].reverse().map((item) => (
                  <div key={item.number} className="flex items-center justify-between gap-2 border-t border-foreground/10 pt-2">
                    <div>
                      <div className="text-[12px]">{t.revision} {String(item.number).padStart(2, "0")}</div>
                      <div className="text-[10px] text-foreground/55">{formatDate(item.savedAt, locale)}</div>
                    </div>
                    <button type="button" onClick={() => restoreRevision(item.number)} title={t.restore} aria-label={t.restore + " " + item.number}
                      className="rounded-full border border-foreground/15 p-2 text-foreground/65"><RotateCcw size={13}/></button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
        <footer className="mt-8 border-t border-foreground/10 pt-4 text-[10px] text-foreground/45">UNOcalc · {t.title}</footer>
      </main>

      <section className="hidden print:block print:text-black">
        <div className="mb-6 border-b border-black/20 pb-4">
          <div className="text-sm">UNOcalc / {t.passport}</div>
          <h1 className="mt-2 text-3xl">{doc.fields.title || t.untitled}</h1>
          <p className="mt-2 text-xs">{t.printStatus}</p>
          <p className="mt-2 text-xs">{t.revision} {doc.revision} · {isDraft ? t.draft : t.approved} · {t.date}: {formatDate(new Date().toISOString(), locale)}</p>
        </div>
        <div className="space-y-5 text-sm">
          <div><h2 className="mb-1 text-lg">{t.idea}</h2><p className="whitespace-pre-wrap">{idea || t.noData}</p></div>
          {([
            [t.concept, brief.concept], [t.purpose, brief.purpose], [t.character, brief.character],
            [t.constraints, brief.constraints], [t.description, doc.fields.description],
          ] as const).map(([label, value]) => (
            <div key={label}><h2 className="mb-1 font-semibold">{label}</h2><p className="whitespace-pre-wrap">{value || t.noData}</p></div>
          ))}
          <div>
            <h2 className="mb-1 text-lg">{t.dimensions}</h2>
            <p>{t.length}: {doc.fields.lengthMm || "—"} мм · {t.width}: {doc.fields.widthMm || "—"} мм · {t.height}: {doc.fields.heightMm || "—"} мм</p>
            <p>{t.volume}: {volume === null ? "—" : volume.toFixed(4) + " м³"}</p>
            <p>{t.quality}: {doc.fields.quality || t.noData}</p>
            <p>{t.material}: {doc.fields.material || t.noData}</p>
          </div>
          <div><h2 className="mb-1 text-lg">{t.economics}</h2>
            <p>{t.investment}: {doc.fields.investment || "—"} {t.currency}</p>
            <p>{t.marketPrice}: {doc.fields.marketPrice || "—"} {t.currency}</p>
          </div>
          {selectedSketch && <div><h2 className="mb-2 text-lg">{t.viewSketch}</h2><img src={selectedSketch.url} alt={selectedSketch.name} className="max-h-[380px] max-w-full object-contain" /></div>}
          <div><h2 className="mb-1 text-lg">{t.proposals}</h2>
            {doc.fields.proposals.length ? doc.fields.proposals.map((item) => (
              <p key={item.id} className="mb-2 whitespace-pre-wrap"><strong>{t.spheres[item.sphere]} · {item.status === "pending" ? t.pending : item.status === "accepted" ? t.accepted : t.rejected}:</strong> {item.text}</p>
            )) : t.noData}
          </div>
          <div><h2 className="mb-1 text-lg">{t.notes}</h2><p className="whitespace-pre-wrap">{doc.fields.notes || t.noData}</p></div>
          <p className="border-t border-black/20 pt-4 text-xs">{t.fileNote}</p>
        </div>
      </section>
    </div>
  );
};

export default UnoObjectModel;

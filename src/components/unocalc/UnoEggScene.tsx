import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { IDEA_CYCLE_KEY, newIdeaCycle, restoreIdeaCycle, UnoEggIdeaCyclePanel, type IdeaCycle } from "./UnoEggIdeaCyclePanel";
import { UnoEggDesignLoopPanel } from "./UnoEggDesignLoopPanel";
import { UnoEggFilePanel } from "./UnoEggFilePanel";
import { startLocalEggProject } from "@/lib/eggLocalPreview";
import { DESIGN_LOOP_STORAGE, createDesignLoop, restoreDesignLoop, latestDesignSubmission, type DesignLoop } from "@/lib/unocalcEggDesignLoop";
import { clearEggDesignAssets } from "@/lib/unocalcEggDesignAssets";
import { EGG_POLES, EGG_STAGES, EGG_STAGE_KEY, NEW_EGG_MATURITY, eggStageState, nextEggIteration, restoreEggMaturity, setEggStage, type EggStageNumber } from "@/lib/unocalcEggStages";
import { designCopy, EMPTY_BRIEF, makeSketchPrompt, type DesignBrief } from "@/lib/unocalcDesign";
import { listSketches, removeStoredSketch, storeSketch, type StoredSketch } from "@/lib/unocalcSketches";
import {
  convexOutline,
  eggAxisEndpoints,
  eggEquatorArcs,
  eggLowerRingArcs,
  visibleEggLowerSphereNodes,
  eggPoleNodes,
  eggFormationStageNodes,
  eggSectionAxes,
  eggSurface,
  eggIdeaLinks,
  eggSupportLinks,
  projectEggPoint,
  svgOutline,
  visibleEggSectionNodes,
  type EggOrientation,
} from "@/lib/unocalcEgg3d";

type Locale = "ru" | "uk" | "en";
type Props = { locale: Locale; onSphereOpen?: (sphere: string) => void; guest?: boolean };
type InteractiveNode = "retail" | "commerce" | "design" | "production" | "marketing" | "testDrive" | "procurement" | "legal" | "idea" | "matter";
type EggHitNode = InteractiveNode | "author";
type NodeDetail = { title: string; description: string; number: string; openLabel: string; closeLabel: string };

// Front elevation: the horizontal diameter has two side nodes, while
// the nearer node of the depth diameter hides the fourth node behind it.
const INITIAL: EggOrientation = { yaw: 0, tilt: 0 };
const SURFACE = eggSurface();
const IDEA_STORAGE_KEY = "unocalc.idea.v1";
const DESIGN_STORAGE_KEY = "unocalc.design.v1";
const MAX_SKETCHES = 6;
const MAX_SKETCH_BYTES = 10 * 1024 * 1024;
// One shared contour treatment for every functional sphere (four principal,
// four lower, two poles). The larger central core intentionally stays distinct.
const NODE_CONTOUR = { radius: 10.5, width: 1.1, idleOpacity: 0.72, activeOpacity: 0.85 } as const;
const INTERACTIVE_NODES: ReadonlySet<string> = new Set(["retail", "commerce", "design", "production", "marketing", "testDrive", "procurement", "legal", "idea", "matter"]);
const isInteractiveNode = (value: string | null): value is InteractiveNode => value !== null && INTERACTIVE_NODES.has(value);
type SketchPreview = StoredSketch & { previewUrl: string; persisted: boolean };

const text = {
  ru: {
    label: "Трёхмерная форма яйца с вертикальной осью. Вращайте жестом или стрелками клавиатуры.",
    coreLabel: "Центральная сфера — формируемый объект",
    lowerSphereLabel: "Нижняя сфера",
    marketing: "Маркетинг",
    marketingLabel: "Открыть описание узла «Маркетинг»",
    marketingCloseLabel: "Закрыть описание узла «Маркетинг»",
    marketingDescription: "Маркетинг соотносит исходную концепцию с рынком, исследует контекст и возможности, передаёт выводы Дизайну. ДНК не изменяет.",
    marketingNode: "Узел / 06",
    testDrive: "Тест-драйв",
    testDriveLabel: "Открыть описание узла «Тест-драйв»",
    testDriveCloseLabel: "Закрыть описание узла «Тест-драйв»",
    testDriveDescription: "После Дизайна исследует свойства предложенной формы и передаёт результаты Коммерции. Непроверенные гипотезы не выдаются за испытания.",
    testDriveNode: "Узел / 05",
    procurement: "Комплектация",
    procurementLabel: "Открыть описание узла «Комплектация»",
    procurementCloseLabel: "Закрыть описание узла «Комплектация»",
    procurementDescription: "После Производства исследует материалы, комплектующие и доступность ресурсов, затем передаёт выводы Ритейлу.",
    procurementNode: "Узел / 07",
    legal: "Право",
    legalLabel: "Открыть описание узла «Право»",
    legalCloseLabel: "Закрыть описание узла «Право»",
    legalDescription: "Сфера Право исследует авторство, ограничения и допустимость реализации концепции, передаёт выводы Производству.",
    legalNode: "Узел / 08",
    ideaInputLabel: "Описание идеи",
    ideaInputPlaceholder: "Опишите замысел, назначение, свойства будущего объекта…",
    ideaSave: "Сохранить идею",
    ideaSaved: "Идея сохранена в этом браузере.",
    ideaSaveError: "Не удалось сохранить. Текст остаётся в текущем сеансе.",
    ideaStorageNote: "Поле откликается на текст. Данные хранятся только в этом браузере после сохранения.",
    hint: "Вращайте форму жестом, мышью или стрелками",
    retail: "Ритейл",
    retailLabel: "Открыть описание узла «Ритейл»",
    retailCloseLabel: "Закрыть описание узла «Ритейл»",
    retailDescription: "Ритейл завершает второй поток: исследует передачу продукта пользователю и передаёт результаты в Желток для согласования с Коммерцией.",
    commerce: "Коммерция",
    commerceLabel: "Открыть описание узла «Коммерция»",
    commerceCloseLabel: "Закрыть описание узла «Коммерция»",
    commerceDescription: "Коммерция завершает первый поток: исследует экономику и передаёт результаты в Желток для согласования с данными Ритейла.",
    node: "Узел / 01",
    commerceNode: "Узел / 02",
    design: "Дизайн",
    designLabel: "Открыть описание узла «Дизайн»",
    designCloseLabel: "Закрыть описание узла «Дизайн»",
    designDescription: "Дизайн получает ДНК и возможности Маркетинга, преобразует их в эскизы и варианты формы для Тестдрайва. Исходная концепция сохраняется.",
    designNode: "Узел / 03",
    production: "Производство",
    productionLabel: "Открыть описание узла «Производство»",
    productionCloseLabel: "Закрыть описание узла «Производство»",
    productionDescription: "Производство получает ДНК и выводы Право, исследует способы воплощения и передаёт данные Комплектации.",
    productionNode: "Узел / 04",
    idea: "Идея",
    ideaLabel: "Открыть описание полюса «Идея»",
    ideaCloseLabel: "Закрыть описание полюса «Идея»",
    ideaDescription: "Исходный замысел объекта. Здесь возникает смысл, определяющий, зачем он должен существовать и что стремится воплотить.",
    ideaNode: "Полюс / 01",
    matter: "Материя",
    matterLabel: "Открыть описание полюса «Материя»",
    matterCloseLabel: "Закрыть описание полюса «Материя»",
    matterDescription: "Материальная основа объекта. Материалы, компоненты и комплектующие, из которых формируется его физическая структура.",
    matterNode: "Полюс / 02",
  },
  uk: {
    label: "Тривимірна форма яйця з вертикальною віссю. Обертайте жестом або стрілками клавіатури.",
    coreLabel: "Центральна сфера — об’єкт, що формується",
    lowerSphereLabel: "Нижня сфера",
    marketing: "Маркетинг",
    marketingLabel: "Відкрити опис вузла «Маркетинг»",
    marketingCloseLabel: "Закрити опис вузла «Маркетинг»",
    marketingDescription: "Маркетинг співвідносить вихідну концепцію з ринком, досліджує контекст і можливості, передає висновки Дизайну. ДНК не змінює.",
    marketingNode: "Вузол / 06",
    testDrive: "Тест-драйв",
    testDriveLabel: "Відкрити опис вузла «Тест-драйв»",
    testDriveCloseLabel: "Закрити опис вузла «Тест-драйв»",
    testDriveDescription: "Після Дизайну досліджує властивості запропонованої форми та передає результати Комерції. Гіпотези не видаються за випробування.",
    testDriveNode: "Вузол / 05",
    procurement: "Комплектація",
    procurementLabel: "Відкрити опис вузла «Комплектація»",
    procurementCloseLabel: "Закрити опис вузла «Комплектація»",
    procurementDescription: "Після Виробництва досліджує матеріали, комплектування та доступність ресурсів, потім передає висновки Ритейлу.",
    procurementNode: "Вузол / 07",
    legal: "Право",
    legalLabel: "Відкрити опис вузла «Право»",
    legalCloseLabel: "Закрити опис вузла «Право»",
    legalDescription: "Сфера Право досліджує авторство, обмеження й допустимість реалізації концепції, передає висновки Виробництву.",
    legalNode: "Вузол / 08",
    ideaInputLabel: "Опис ідеї",
    ideaInputPlaceholder: "Опишіть задум, призначення, властивості майбутнього об’єкта…",
    ideaSave: "Зберегти ідею",
    ideaSaved: "Ідею збережено в цьому браузері.",
    ideaSaveError: "Не вдалося зберегти. Текст залишається в поточному сеансі.",
    ideaStorageNote: "Поле реагує на текст. Дані зберігаються лише в цьому браузері після збереження.",
    hint: "Обертайте форму жестом, мишею або стрілками",
    retail: "Ритейл",
    retailLabel: "Відкрити опис вузла «Ритейл»",
    retailCloseLabel: "Закрити опис вузла «Ритейл»",
    retailDescription: "Ритейл завершує другий потік: досліджує передачу продукту користувачу й передає результати в Жовток для узгодження з Комерцією.",
    commerce: "Комерція",
    commerceLabel: "Відкрити опис вузла «Комерція»",
    commerceCloseLabel: "Закрити опис вузла «Комерція»",
    commerceDescription: "Комерція завершує перший потік: досліджує економіку й передає результати в Жовток для узгодження з даними Ритейлу.",
    node: "Вузол / 01",
    commerceNode: "Вузол / 02",
    design: "Дизайн",
    designLabel: "Відкрити опис вузла «Дизайн»",
    designCloseLabel: "Закрити опис вузла «Дизайн»",
    designDescription: "Дизайн отримує ДНК і можливості Маркетингу, перетворює їх на ескізи й варіанти форми для Тестдрайву. Вихідна концепція зберігається.",
    designNode: "Вузол / 03",
    production: "Виробництво",
    productionLabel: "Відкрити опис вузла «Виробництво»",
    productionCloseLabel: "Закрити опис вузла «Виробництво»",
    productionDescription: "Виробництво отримує ДНК і висновки Права, досліджує способи втілення та передає дані Комплектації.",
    productionNode: "Вузол / 04",
    idea: "Ідея",
    ideaLabel: "Відкрити опис полюса «Ідея»",
    ideaCloseLabel: "Закрити опис полюса «Ідея»",
    ideaDescription: "Початковий задум об’єкта. Тут виникає сенс, який визначає, навіщо він має існувати та що прагне втілити.",
    ideaNode: "Полюс / 01",
    matter: "Матерія",
    matterLabel: "Відкрити опис полюса «Матерія»",
    matterCloseLabel: "Закрити опис полюса «Матерія»",
    matterDescription: "Матеріальна основа об’єкта. Матеріали, компоненти та комплектувальні вироби, з яких формується його фізична структура.",
    matterNode: "Полюс / 02",
  },
  en: {
    label: "Three-dimensional egg with a vertical axis. Drag or use arrow keys to rotate.",
    coreLabel: "Central sphere — the object taking form",
    lowerSphereLabel: "Lower sphere",
    marketing: "Marketing",
    marketingLabel: "Open the Marketing node description",
    marketingCloseLabel: "Close the Marketing node description",
    marketingDescription: "Marketing compares the core concept with the market, researches context and opportunities, and informs Design without altering the DNA.",
    marketingNode: "Node / 06",
    testDrive: "Test drive",
    testDriveLabel: "Open the Test drive node description",
    testDriveCloseLabel: "Close the Test drive node description",
    testDriveDescription: "Following Design, examines the proposed form and passes findings to Commerce. Hypotheses are not presented as physical tests.",
    testDriveNode: "Node / 05",
    procurement: "Procurement",
    procurementLabel: "Open the Procurement node description",
    procurementCloseLabel: "Close the Procurement node description",
    procurementDescription: "Following Production, researches materials, components and resource availability, then passes findings to Retail.",
    procurementNode: "Node / 07",
    legal: "Legal",
    legalLabel: "Open the Legal node description",
    legalCloseLabel: "Close the Legal node description",
    legalDescription: "Legal examines authorship, constraints and permitted use of the concept, passing its findings to Production.",
    legalNode: "Node / 08",
    ideaInputLabel: "Describe your idea",
    ideaInputPlaceholder: "Describe the intent, purpose, and qualities of the future object…",
    ideaSave: "Save idea",
    ideaSaved: "Idea saved in this browser.",
    ideaSaveError: "Unable to save. Your text remains in this session.",
    ideaStorageNote: "The field responds to your text. Data is stored only in this browser when saved.",
    hint: "Drag or use arrow keys to rotate",
    retail: "Retail",
    retailLabel: "Open the Retail node description",
    retailCloseLabel: "Close the Retail node description",
    retailDescription: "Retail closes the second stream, bringing its distribution findings to the Yolk for reconciliation with Commerce's stream.",
    commerce: "Commerce",
    commerceLabel: "Open the Commerce node description",
    commerceCloseLabel: "Close the Commerce node description",
    commerceDescription: "Commerce closes the first stream, bringing its economic findings to the Yolk for reconciliation with Retail's stream.",
    node: "Node / 01",
    commerceNode: "Node / 02",
    design: "Design",
    designLabel: "Open the Design node description",
    designCloseLabel: "Close the Design node description",
    designDescription: "Design receives the DNA and Marketing insights, developing sketches and form variants for Test Drive while preserving the concept.",
    designNode: "Node / 03",
    production: "Production",
    productionLabel: "Open the Production node description",
    productionCloseLabel: "Close the Production node description",
    productionDescription: "Production receives the DNA and Legal findings, explores fabrication methods and passes requirements to Procurement.",
    productionNode: "Node / 04",
    idea: "Idea",
    ideaLabel: "Open the Idea pole description",
    ideaCloseLabel: "Close the Idea pole description",
    ideaDescription: "The originating concept of an object. Here, meaning emerges: why it should exist and what it seeks to embody.",
    ideaNode: "Pole / 01",
    matter: "Matter",
    matterLabel: "Open the Matter pole description",
    matterCloseLabel: "Close the Matter pole description",
    matterDescription: "The material foundation of an object. Materials, components, and parts from which its physical structure is formed.",
    matterNode: "Pole / 02",
  },
};

/** One soft click on a deliberate user action. No audio is played on load. */
const playNodeClick = () => {
  try {
    const Context = window.AudioContext;
    if (!Context) return;
    const audio = new Context();
    const oscillator = audio.createOscillator();
    const volume = audio.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(690, audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(420, audio.currentTime + 0.035);
    volume.gain.setValueAtTime(0.0001, audio.currentTime);
    volume.gain.exponentialRampToValueAtTime(0.012, audio.currentTime + 0.004);
    volume.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.048);
    oscillator.connect(volume);
    volume.connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.05);
    oscillator.onended = () => { void audio.close(); };
  } catch {
    // Browser audio permissions and unsupported devices should not block selection.
  }
};

const giveNodeFeedback = () => {
  try { navigator.vibrate?.(9); } catch { /* iPadOS Safari does not expose vibration. */ }
};

/** Each selected node owns its typing animation, so selecting another never interrupts it. */
const NodeDescription = ({ node, detail }: { node: InteractiveNode; detail: NodeDetail }) => {
  const fullCopy = detail.title + "\n" + detail.description;
  const [typedLength, setTypedLength] = useState(0);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
      setTypedLength(fullCopy.length);
      return;
    }
    setTypedLength(0);
    let index = 0;
    const interval = window.setInterval(() => {
      index = Math.min(fullCopy.length, index + 1);
      setTypedLength(index);
      if (index === fullCopy.length) window.clearInterval(interval);
    }, 26);
    return () => window.clearInterval(interval);
  }, [fullCopy]);

  return (
    <aside
      data-testid={`unocalc-${node}-panel`}
      className="w-full min-w-0 text-left"
      aria-label={detail.title}
    >
      <p className="mb-3 text-[10px] font-light tracking-[0.16em] text-foreground/40 uppercase">{detail.number}</p>
      <h2 className="min-h-[32px] text-[24px] font-extralight leading-tight tracking-[-0.03em] text-foreground/85" aria-hidden="true">
        {fullCopy.slice(0, Math.min(typedLength, detail.title.length))}
      </h2>
      <p className="mt-2 text-[13px] font-light leading-[1.8] tracking-[0.01em] text-foreground/65" aria-hidden="true">
        {fullCopy.slice(detail.title.length + 1, typedLength)}
        {typedLength < fullCopy.length && typedLength > detail.title.length && (
          <span className="unocalc-type-caret" aria-hidden="true">▍</span>
        )}
      </p>
      <span className="sr-only" role="status">{detail.title}. {detail.description}</span>
    </aside>
  );
};

const UnoEggScene = ({ locale, onSphereOpen, guest = false }: Props) => {
  const [orientation, setOrientation] = useState<EggOrientation>(INITIAL);
  const [selectedNodes, setSelectedNodes] = useState<InteractiveNode[]>([]);
  const [workspaceNode, setWorkspaceNode] = useState<EggHitNode | null>(null);
  const workspaceOpen = workspaceNode !== null;
  const [workspaceExpanded, setWorkspaceExpanded] = useState(false);
  const [workspaceVisible, setWorkspaceVisible] = useState(false);
  const workspaceExitTimer = useRef<number | null>(null);
  const [ideaDraft, setIdeaDraft] = useState(() => {
    try { return window.localStorage.getItem(IDEA_STORAGE_KEY) ?? ""; }
    catch { return ""; }
  });
  const [ideaCycle, setIdeaCycle] = useState<IdeaCycle | null>(restoreIdeaCycle);
  const [designLoop, setDesignLoop] = useState<DesignLoop | null>(restoreDesignLoop);
  const [maturity, setMaturity] = useState(restoreEggMaturity);
  const [brief, setBrief] = useState<DesignBrief>(() => {
    try {
      const raw = window.localStorage.getItem(DESIGN_STORAGE_KEY);
      if (!raw) return { ...EMPTY_BRIEF };
      const parsed = JSON.parse(raw) as Partial<DesignBrief>;
      return {
        concept: typeof parsed.concept === "string" ? parsed.concept : "",
        purpose: typeof parsed.purpose === "string" ? parsed.purpose : "",
        character: typeof parsed.character === "string" ? parsed.character : "",
        constraints: typeof parsed.constraints === "string" ? parsed.constraints : "",
        ideaSnapshot: typeof parsed.ideaSnapshot === "string" ? parsed.ideaSnapshot : "",
      };
    } catch { return { ...EMPTY_BRIEF }; }
  });
  const [briefStatus, setBriefStatus] = useState<"idle" | "saved" | "error">("idle");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const [sketches, setSketches] = useState<SketchPreview[]>([]);
  const [sketchNotice, setSketchNotice] = useState("");
  const [designNavigation, setDesignNavigation] = useState(0);
  const sketchUrls = useRef<string[]>([]);
  const designWorkspace = useRef<HTMLElement>(null);
  const pointer = useRef<{ id: number; x: number; y: number; startX: number; startY: number; moved: boolean; targetNode: string | null } | null>(null);
  const lastPointerActivation = useRef<{ node: EggHitNode; time: number } | null>(null);
  const suppressDragClick = useRef(false);
  const copy = text[locale];
  const workflowCopy = designCopy[locale];
  const nodeDetails: Record<InteractiveNode, NodeDetail> = {
    retail: { title: copy.retail, description: copy.retailDescription, number: copy.node, openLabel: copy.retailLabel, closeLabel: copy.retailCloseLabel },
    commerce: { title: copy.commerce, description: copy.commerceDescription, number: copy.commerceNode, openLabel: copy.commerceLabel, closeLabel: copy.commerceCloseLabel },
    design: { title: copy.design, description: copy.designDescription, number: copy.designNode, openLabel: copy.designLabel, closeLabel: copy.designCloseLabel },
    production: { title: copy.production, description: copy.productionDescription, number: copy.productionNode, openLabel: copy.productionLabel, closeLabel: copy.productionCloseLabel },
    marketing: { title: copy.marketing, description: copy.marketingDescription, number: copy.marketingNode, openLabel: copy.marketingLabel, closeLabel: copy.marketingCloseLabel },
    testDrive: { title: copy.testDrive, description: copy.testDriveDescription, number: copy.testDriveNode, openLabel: copy.testDriveLabel, closeLabel: copy.testDriveCloseLabel },
    procurement: { title: copy.procurement, description: copy.procurementDescription, number: copy.procurementNode, openLabel: copy.procurementLabel, closeLabel: copy.procurementCloseLabel },
    legal: { title: copy.legal, description: copy.legalDescription, number: copy.legalNode, openLabel: copy.legalLabel, closeLabel: copy.legalCloseLabel },
    idea: { title: copy.idea, description: copy.ideaDescription, number: copy.ideaNode, openLabel: copy.ideaLabel, closeLabel: copy.ideaCloseLabel },
    matter: { title: copy.matter, description: copy.matterDescription, number: copy.matterNode, openLabel: copy.matterLabel, closeLabel: copy.matterCloseLabel },
  };
  const hasIdea = ideaDraft.trim().length > 0;
  const cycleSignal = (node: InteractiveNode): "idle" | "processing" | "returned" | "attention" => {
    if (!ideaCycle) return "idle";
    if (node === "idea") return ideaCycle.phase === "synthesis" ? "attention" :
      ideaCycle.phase === "layered" ? "returned" : ideaCycle.phase === "forwarded" ? "processing" : "idle";
    if (ideaCycle.phase === "forwarded" && designLoop?.seed === ideaCycle.seed && designLoop.layer === ideaCycle.layer) {
      if (node === "design" && designLoop.status === "design") return "attention";
      if (node === "marketing" && designLoop.status === "marketing") return "attention";
      if (node === "testDrive" && designLoop.status === "testDrive") return "attention";
      if (node === "design" || node === "marketing" || node === "testDrive") return "returned";
    }
    if (node === "marketing" || node === "legal") {
      if (ideaCycle.phase === "seed") return "idle";
      if (ideaCycle.phase === "forwarded") return "returned";
      return ideaCycle[`${node}Returned` as "marketingReturned" | "legalReturned"] ? "returned" : "processing";
    }
    if ((node === "design" || node === "production") && ideaCycle.phase === "forwarded") return "attention";
    return "idle";
  };
  const signalColor = (node: InteractiveNode) => cycleSignal(node) === "attention" ? "#c49d65" :
    cycleSignal(node) !== "idle" ? "hsl(var(--primary))" : "currentColor";
  const stageLabels = locale === "ru" ? {
    stage: "Стадия", iteration: "итерация", newIteration: "Новая итерация",
    manual: "Выбор стадии и итерации вручную — не подтверждение готовности",
    completed: "Пройдена", current: "Текущая", future: "Впереди",
    axis: "Идея → пять стадий → Материя", guide: "Фиолетовый и красный — постоянные полюса",
  } : locale === "uk" ? {
    stage: "Стадія", iteration: "ітерація", newIteration: "Нова ітерація",
    manual: "Вибір стадії та ітерації вручну — не підтвердження готовності",
    completed: "Пройдена", current: "Поточна", future: "Попереду",
    axis: "Ідея → п'ять стадій → Матерія", guide: "Фіолетовий і червоний — постійні полюси",
  } : {
    stage: "Stage", iteration: "iteration", newIteration: "New iteration",
    manual: "Stage and iteration are manually selected; not a readiness approval",
    completed: "Completed", current: "Current", future: "Upcoming",
    axis: "Idea → five stages → Matter", guide: "Violet and red mark the permanent poles",
  };
  const currentStage = EGG_STAGES.find((level) => level.index === maturity.stage) ?? EGG_STAGES[0];
  const hasSketch = sketches.length > 0 || !!designLoop?.submissions.length;
  // Every sphere can be inspected at any time. Only the actual Design
  // workspace is gated by an idea; creating a sketch remains a later step.
  const canActivateNode = (_node: InteractiveNode) => true;
  const sketchPrompt = makeSketchPrompt(brief, locale);

  useEffect(() => {
    try {
      if (ideaCycle) window.localStorage.setItem(IDEA_CYCLE_KEY, JSON.stringify(ideaCycle));
      else window.localStorage.removeItem(IDEA_CYCLE_KEY);
    } catch { /* Manual prototype remains usable without persistence. */ }
  }, [ideaCycle]);

  useEffect(() => {
    if (ideaCycle?.phase !== "forwarded") return;
    setDesignLoop((current) => current?.seed === ideaCycle.seed && current.layer === ideaCycle.layer
      ? current : createDesignLoop(ideaCycle.seed, ideaCycle.layer));
  }, [ideaCycle?.phase, ideaCycle?.seed, ideaCycle?.layer]);

  useEffect(() => {
    try {
      if (designLoop) window.localStorage.setItem(DESIGN_LOOP_STORAGE, JSON.stringify(designLoop));
      else window.localStorage.removeItem(DESIGN_LOOP_STORAGE);
    } catch { /* local-only prototype */ }
  }, [designLoop]);

  useEffect(() => {
    try { window.localStorage.setItem(EGG_STAGE_KEY, JSON.stringify(maturity)); }
    catch { /* presentation remains usable without local persistence */ }
  }, [maturity]);

  const placeSeedInCore = () => {
    if (!ideaDraft.trim()) return;
    setIdeaCycle(newIdeaCycle(ideaDraft));
    // New Author cycle: keep old preview projects in the browser archive,
    // and start a fresh local file registry for this seed.
    startLocalEggProject(ideaDraft.trim(), new Date().toISOString());
    setMaturity({ ...NEW_EGG_MATURITY });
    setDesignLoop(null);
    void clearEggDesignAssets().catch(() => { /* browser may prevent storage cleanup */ });
    try { window.localStorage.setItem(IDEA_STORAGE_KEY, ideaDraft); } catch { /* local-only */ }
    openWorkspace("idea");
  };

  useEffect(() => {
    let cancelled = false;
    void listSketches().then((stored) => {
      if (cancelled) return;
      setSketches((current) => {
        const known = new Set(current.map((item) => item.id));
        const restored = stored.filter((item) => !known.has(item.id)).map((item) => {
          const previewUrl = URL.createObjectURL(item.blob);
          sketchUrls.current.push(previewUrl);
          return { ...item, previewUrl, persisted: true };
        });
        return [...restored, ...current];
      });
    }).catch(() => {
      if (!cancelled) setSketchNotice(designCopy[locale].sketchStorageError);
    });
    return () => {
      cancelled = true;
      sketchUrls.current.forEach((url) => URL.revokeObjectURL(url));
      sketchUrls.current = [];
    };
  }, []);

  const openDesignWorkspace = () => {
    if (!hasIdea) return;
    setBrief((current) => current.concept.trim()
      ? current
      : { ...current, concept: ideaDraft.trim(), ideaSnapshot: ideaDraft });
    setSelectedNodes((current) => current.includes("design") ? current : [...current, "design"]);
    setDesignNavigation((current) => current + 1);
  };

  useEffect(() => {
    if (designNavigation === 0 || !selectedNodes.includes("design")) return;
    // The workspace is rendered below the egg. Make the next step visible
    // without requiring users to find and tap the Design sphere.
    designWorkspace.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }, [designNavigation, selectedNodes]);

  const closeWorkspace = useCallback(() => {
    if (workspaceExitTimer.current !== null) window.clearTimeout(workspaceExitTimer.current);
    setWorkspaceVisible(false);
    setWorkspaceExpanded(false);
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    if (reducedMotion) {
      setWorkspaceNode(null);
      return;
    }
    workspaceExitTimer.current = window.setTimeout(() => {
      workspaceExitTimer.current = null;
      setWorkspaceNode(null);
    }, 420);
  }, []);

  const openWorkspace = (node: EggHitNode) => {
    if (onSphereOpen && node !== "idea" && node !== "matter" && node !== "author") { onSphereOpen(node); return; }
    if (workspaceExitTimer.current !== null) {
      window.clearTimeout(workspaceExitTimer.current);
      workspaceExitTimer.current = null;
    }
    setWorkspaceExpanded(false);
    setWorkspaceNode(node);
    if (workspaceOpen) window.requestAnimationFrame(() => setWorkspaceVisible(true));
  };

  useEffect(() => {
    if (!workspaceOpen) { setWorkspaceVisible(false); return; }
    const frame = window.requestAnimationFrame(() => setWorkspaceVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, [workspaceOpen]);

  useEffect(() => {
    if (!workspaceOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [workspaceOpen]);

  useEffect(() => () => {
    if (workspaceExitTimer.current !== null) window.clearTimeout(workspaceExitTimer.current);
  }, []);

  useEffect(() => {
    if (!workspaceOpen) return;
    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") closeWorkspace();
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [workspaceOpen, closeWorkspace]);

  const activateAuthor = () => {
    if (onSphereOpen) { onSphereOpen("author"); giveNodeFeedback(); return; }
    openWorkspace("author");
    giveNodeFeedback();
  };

  const activateNode = (node: InteractiveNode) => {
    if (onSphereOpen && node !== "idea" && node !== "matter") { onSphereOpen(node); giveNodeFeedback(); return; }
    if (!canActivateNode(node)) return;
    if (node === "design" && hasIdea) {
      if (!brief.concept.trim()) {
        setBrief((current) => ({ ...current, concept: ideaDraft.trim(), ideaSnapshot: ideaDraft }));
      }
      if (!selectedNodes.includes("design")) setDesignNavigation((current) => current + 1);
    }
    setSelectedNodes((current) =>
      current.includes(node) ? current.filter((selected) => selected !== node) : [...current, node]
    );
    giveNodeFeedback();
    playNodeClick();
  };

  const updateBrief = (field: "concept" | "purpose" | "character" | "constraints", value: string) => {
    setBrief((current) => ({ ...current, [field]: value }));
    setBriefStatus("idle");
    setCopyStatus("idle");
  };
  const refreshBriefIdea = () => {
    setBrief((current) => ({ ...current, concept: ideaDraft.trim(), ideaSnapshot: ideaDraft }));
    setBriefStatus("idle");
  };
  const saveBrief = () => {
    try {
      window.localStorage.setItem(DESIGN_STORAGE_KEY, JSON.stringify(brief));
      setBriefStatus("saved");
    } catch { setBriefStatus("error"); }
  };
  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(sketchPrompt);
      setCopyStatus("copied");
    } catch { setCopyStatus("error"); }
  };
  const addSketches = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    let count = sketches.length;
    for (const file of files) {
      if (count >= MAX_SKETCHES || !file.type.startsWith("image/") || file.size > MAX_SKETCH_BYTES) {
        setSketchNotice(workflowCopy.sketchInvalid);
        continue;
      }
      const sketch: StoredSketch = {
        id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()) + "-" + Math.random(),
        name: file.name,
        blob: file,
        createdAt: Date.now(),
      };
      let persisted = false;
      try {
        await storeSketch(sketch);
        persisted = true;
        setSketchNotice("");
      } catch {
        setSketchNotice(workflowCopy.sketchStorageError);
      }
      const previewUrl = URL.createObjectURL(file);
      sketchUrls.current.push(previewUrl);
      setSketches((current) => [...current, { ...sketch, previewUrl, persisted }]);
      count++;
    }
  };
  const deleteSketch = async (sketch: SketchPreview) => {
    if (sketch.persisted) {
      try {
        await removeStoredSketch(sketch.id);
        setSketchNotice("");
      } catch {
        setSketchNotice(workflowCopy.sketchDeleteError);
        return;
      }
    }
    setSketches((current) => current.filter((item) => item.id !== sketch.id));
    URL.revokeObjectURL(sketch.previewUrl);
    sketchUrls.current = sketchUrls.current.filter((url) => url !== sketch.previewUrl);
  };
  const geometry = useMemo(() => {
    const points = SURFACE.map((point) => projectEggPoint(point, orientation));
    const sectionAxes = eggSectionAxes(orientation);
    const poleNodes = eggPoleNodes(orientation);
    return {
      silhouette: svgOutline(convexOutline(points)),
      equator: eggEquatorArcs(orientation),
      lowerRing: eggLowerRingArcs(orientation),
      lowerNodes: visibleEggLowerSphereNodes(orientation),
      ideaLinks: eggIdeaLinks(orientation),
      supportLinks: eggSupportLinks(orientation),
      axis: eggAxisEndpoints(orientation),
      sectionAxes,
      sectionNodes: visibleEggSectionNodes(sectionAxes),
      poleNodes,
      stageNodes: eggFormationStageNodes(orientation),
    };
  }, [orientation]);

  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const target = event.target as Element;
    lastPointerActivation.current = null;
    suppressDragClick.current = false;
    pointer.current = {
      id: event.pointerId, x: event.clientX, y: event.clientY,
      startX: event.clientX, startY: event.clientY, moved: false,
      targetNode: target.closest("[data-egg-node]")?.getAttribute("data-egg-node") ?? null,
    };
  };
  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const active = pointer.current;
    if (!active || active.id !== event.pointerId) return;
    const dx = event.clientX - active.x;
    const dy = event.clientY - active.y;
    const moved = active.moved || Math.hypot(event.clientX - active.startX, event.clientY - active.startY) > 7;
    pointer.current = { ...active, x: event.clientX, y: event.clientY, moved };
    if (moved) {
      // Capture only after a real drag. Capturing immediately on pointerdown
      // retargets the synthesized click to the SVG in Safari/iPadOS.
      if (!active.moved) {
        try { event.currentTarget.setPointerCapture?.(event.pointerId); } catch { /* optional */ }
      }
      setOrientation((current) => ({ yaw: current.yaw + dx * 0.008, tilt: current.tilt + dy * 0.008 }));
    }
  };
  const onPointerEnd = (event: PointerEvent<SVGSVGElement>) => {
    const active = pointer.current;
    if (!active || active.id !== event.pointerId) return;
    pointer.current = null;
    suppressDragClick.current = active.moved;
    try {
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch { /* Safari can release capture automatically. */ }
    if (event.type === "pointerup" && !active.moved && (active.targetNode === "author" || isInteractiveNode(active.targetNode))) {
      lastPointerActivation.current = { node: active.targetNode, time: Date.now() };
      if (active.targetNode === "author") activateAuthor();
      else activateNode(active.targetNode);
    }
  };
  // Fallback for browsers that dispatch a click but lose SVG pointerup/capture.
  // A click following a handled pointerup is ignored to prevent double toggles.
  const onSvgClick = (event: MouseEvent<SVGSVGElement>) => {
    if (suppressDragClick.current) {
      suppressDragClick.current = false;
      return;
    }
    const target = event.target as Element;
    const node = target.closest("[data-egg-node]")?.getAttribute("data-egg-node") ?? null;
    if (!isInteractiveNode(node) && node !== "author") return;
    const previous = lastPointerActivation.current;
    lastPointerActivation.current = null;
    if (previous?.node === node && Date.now() - previous.time < 800) return;
    if (node === "author") activateAuthor();
    else activateNode(node);
  };
  const onNodeKeyDown = (event: KeyboardEvent<SVGCircleElement>, node: EggHitNode) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      if (node === "author") activateAuthor();
      else activateNode(node);
    }
  };

  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key === "Home") {
      event.preventDefault();
      setOrientation(INITIAL);
    } else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      setOrientation((current) => ({
        yaw: current.yaw + (event.key === "ArrowLeft" ? -0.09 : event.key === "ArrowRight" ? 0.09 : 0),
        tilt: current.tilt + (event.key === "ArrowUp" ? -0.09 : event.key === "ArrowDown" ? 0.09 : 0),
      }));
    }
  };

  return (
    <div className="relative mx-auto w-full min-w-0 max-w-full" data-testid="unocalc-egg-stage">
      <span id="unocalc-marketing-description" className="sr-only">{copy.marketing}. {copy.marketingDescription}</span>
      <span id="unocalc-test-drive-description" className="sr-only">{copy.testDrive}. {copy.testDriveDescription}</span>
      <span id="unocalc-procurement-description" className="sr-only">{copy.procurement}. {copy.procurementDescription}</span>
      <span id="unocalc-legal-description" className="sr-only">{copy.legal}. {copy.legalDescription}</span>
      <div className="unocalc-egg-canvas mx-auto w-full min-w-0">
        <svg
          data-testid="unocalc-egg-svg"
          viewBox="0 0 760 700"
          className="block h-auto w-full cursor-grab select-none active:cursor-grabbing"
          style={{ touchAction: "none" }}
          role="group"
          aria-label={text[locale].label}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onClick={onSvgClick}
          onKeyDown={onKeyDown}
        >
          <defs>
            <radialGradient id="unocalc-idea-pole-light" cx="35%" cy="25%" r="75%">
              <stop offset="0%" stopColor={EGG_POLES.idea.color} stopOpacity=".60" />
              <stop offset="100%" stopColor={EGG_POLES.idea.color} stopOpacity=".10" />
            </radialGradient>
            <radialGradient id="unocalc-matter-pole-light" cx="35%" cy="25%" r="75%">
              <stop offset="0%" stopColor={EGG_POLES.matter.color} stopOpacity=".60" />
              <stop offset="100%" stopColor={EGG_POLES.matter.color} stopOpacity=".10" />
            </radialGradient>
          </defs>
          <line
            data-testid="unocalc-egg-axis"
            x1={geometry.axis.start.x} y1={geometry.axis.start.y}
            x2={geometry.axis.end.x} y2={geometry.axis.end.y}
            stroke="currentColor" strokeWidth=".65" strokeOpacity=".14"
            strokeDasharray="4 9" vectorEffect="non-scaling-stroke" pointerEvents="none"
          />
          <path data-testid="unocalc-lower-ring-back" d={geometry.lowerRing.back} fill="none"
            stroke="currentColor" strokeWidth=".9" strokeOpacity=".13"
            strokeDasharray="4 7" vectorEffect="non-scaling-stroke" pointerEvents="none" />
          <path data-testid="unocalc-lower-ring-front" d={geometry.lowerRing.front} fill="none"
            stroke="currentColor" strokeWidth=".9" strokeOpacity=".28"
            strokeDasharray="4 7" vectorEffect="non-scaling-stroke" pointerEvents="none" />
          <path d={geometry.equator.back} fill="none"
            stroke="currentColor" strokeWidth=".9" strokeOpacity=".18"
            strokeDasharray="5 6" vectorEffect="non-scaling-stroke" pointerEvents="none" />
          <path d={geometry.equator.front} fill="none"
            stroke="currentColor" strokeWidth=".9" strokeOpacity=".3"
            vectorEffect="non-scaling-stroke" pointerEvents="none" />
          {/* Two perpendicular 3D diameters in the section plane.
              The four endpoint spheres sit exactly on the egg surface. */}
          {geometry.sectionAxes.map((sectionAxis, index) => (
            <line
              key={`section-axis-${index}`}
              data-testid="unocalc-section-axis"
              x1={sectionAxis.start.x}
              y1={sectionAxis.start.y}
              x2={sectionAxis.end.x}
              y2={sectionAxis.end.y}
              stroke="currentColor"
              strokeWidth=".65"
              strokeOpacity=".10"
              strokeDasharray="4 9"
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          ))}
          {/* Idea links are projected from 3D on every rotation and do not
              intercept clicks. The rear Legal link is subtler in front view. */}
          <g data-testid="unocalc-idea-links" aria-hidden="true" pointerEvents="none">
            {geometry.ideaLinks.map((link) => {
              const branch = link.id as "marketing" | "legal";
              const isActive = !!ideaCycle && (ideaCycle.phase === "research" || ideaCycle.phase === "synthesis");
              const returned = !!ideaCycle?.[`${branch}Returned` as "marketingReturned" | "legalReturned"];
              return <g key={link.id}>
                <line data-testid={`unocalc-idea-link-${link.id}`}
                  x1={link.x1} y1={link.y1} x2={link.x2} y2={link.y2}
                  stroke={isActive ? "hsl(var(--primary))" : "currentColor"}
                  strokeWidth={isActive ? "1.6" : ".75"}
                  strokeOpacity={isActive ? ".8" : link.depth < 0 ? ".22" : ".38"}
                  vectorEffect="non-scaling-stroke" pointerEvents="none" />
                {isActive && <circle r="3" fill={returned ? "#c49d65" : "hsl(var(--primary))"} className="unocalc-cycle-pulse">
                  <animateMotion dur={returned ? "2.4s" : "2s"} repeatCount="indefinite"
                    path={returned
                      ? `M ${link.x2} ${link.y2} L ${link.x1} ${link.y1}`
                      : `M ${link.x1} ${link.y1} L ${link.x2} ${link.y2}`} />
                </circle>}
              </g>;
            })}
          </g>
          {/* Additional structural relationships from the lower spheres to
              Design and Production, drawn behind the clickable nodes. */}
          <g data-testid="unocalc-support-links" aria-hidden="true" pointerEvents="none">
            {geometry.supportLinks.map((link) => {
              const nextFromIdea = ideaCycle?.phase === "forwarded";
              const pendingDesignLoop = nextFromIdea && designLoop?.seed === ideaCycle.seed && designLoop.layer === ideaCycle.layer
                ? designLoop : null;
              const originalLink = link.id === "legal-production" && nextFromIdea;
              const initialDesignLink = link.id === "marketing-design" && nextFromIdea && (!pendingDesignLoop || pendingDesignLoop.submissions.length === 0);
              const reviewMarketLink = link.id === "marketing-design" && pendingDesignLoop?.status === "marketing";
              const reviewTestLink = link.id === "design-test-drive" && pendingDesignLoop?.status === "testDrive";
              const active = originalLink || initialDesignLink || reviewMarketLink || reviewTestLink;
              const reverse = !!reviewMarketLink;
              return <g key={link.id}>
                <line data-testid={`unocalc-support-link-${link.id}`}
                  x1={link.x1} y1={link.y1} x2={link.x2} y2={link.y2}
                  stroke={active ? "hsl(var(--primary))" : "currentColor"}
                  strokeWidth={active ? "1.6" : ".75"}
                  strokeOpacity={active ? ".8" : link.depth < 0 ? ".22" : ".38"}
                  vectorEffect="non-scaling-stroke" pointerEvents="none" />
                {active && <circle r="3" fill={reviewMarketLink || reviewTestLink ? "#c49d65" : "hsl(var(--primary))"} className="unocalc-cycle-pulse">
                  <animateMotion dur="2s" repeatCount="indefinite"
                    path={reverse
                      ? `M ${link.x2} ${link.y2} L ${link.x1} ${link.y1}`
                      : `M ${link.x1} ${link.y1} L ${link.x2} ${link.y2}`} />
                </circle>}
              </g>;
            })}
          </g>
          {/* The Author is an external source and operator, ABOVE the egg,
              not a functional sphere or part of any of the five stages.
              Original seed lives in the Author page and is sent into Idea. */}
          <g data-testid="unocalc-author-source">
            <line x1="380" y1="45" x2="380" y2="61"
              stroke="currentColor" strokeWidth=".75" strokeOpacity=".27"
              strokeDasharray="2 4" pointerEvents="none" />
            <circle cx="380" cy="29" r="12.5"
              fill="hsl(var(--background))" stroke="currentColor"
              strokeWidth="1.15" strokeOpacity=".70" pointerEvents="none" />
            <circle cx="380" cy="29" r="4.4"
              fill="currentColor" fillOpacity={ideaCycle?.seed ? ".6" : ".16"} pointerEvents="none" />
            <text x="403" y="33.5" fontSize="12" fontWeight="300"
              letterSpacing="1.25" fill="currentColor" opacity=".60"
              pointerEvents="none">{locale === "ru" ? "АВТОР" : locale === "uk" ? "АВТОР" : "AUTHOR"}</text>
            <circle
              data-testid="unocalc-author-hit" data-egg-node="author"
              cx="380" cy="29" r="25"
              fill="transparent" pointerEvents="all" stroke="none"
              role="button" tabIndex={0}
              aria-label={locale === "ru" ? "Открыть страницу Автора" : locale === "uk" ? "Відкрити сторінку Автора" : "Open Author page"}
              className="cursor-pointer focus:outline-none focus-visible:stroke-primary focus-visible:stroke-[1.5px]"
              onKeyDown={(event) => onNodeKeyDown(event, "author")} />
          </g>
          {/* Five formation stages sit along the Idea-to-Matter axis.
              Colour and glow convey progress; no central yolk is drawn. */}
          <g data-testid="unocalc-axis-stages" aria-hidden="true" pointerEvents="none">
            {geometry.stageNodes.map((point) => {
              const level = EGG_STAGES[point.index - 1];
              const status = eggStageState(maturity, level.index);
              const isCurrent = status === "current";
              const isCompleted = status === "completed";
              const baseR = isCurrent ? 8.7 : isCompleted ? 7.3 : 5.9;
              return <g key={level.index}
                data-testid={`unocalc-axis-stage-${level.index}`} data-state={status}>
                {isCurrent && <>
                  <circle cx={point.x} cy={point.y} r="17.5"
                    fill={level.color} fillOpacity=".14" />
                  <circle cx={point.x} cy={point.y} r="13.2"
                    fill="none" stroke={level.color} strokeWidth="1.35"
                    strokeOpacity=".84" vectorEffect="non-scaling-stroke" />
                </>}
                <circle cx={point.x} cy={point.y} r={baseR}
                  fill={level.color}
                  fillOpacity={isCurrent ? ".98" : isCompleted ? ".86" : ".16"}
                  stroke={level.color}
                  strokeOpacity={isCurrent ? ".98" : isCompleted ? ".85" : ".38"}
                  strokeWidth=".8" vectorEffect="non-scaling-stroke" />
              </g>;
            })}
          </g>
          {geometry.sectionNodes.map((node) => {
            const nodeType: InteractiveNode | null =
              node.id === "retail" || node.id === "commerce" || node.id === "design" || node.id === "production"
                ? node.id : null;
            const active = nodeType !== null && selectedNodes.includes(nodeType);
            const unlocked = nodeType !== null && canActivateNode(nodeType);
            const label = nodeType
              ? (unlocked
                ? (active ? nodeDetails[nodeType].closeLabel : nodeDetails[nodeType].openLabel)
                : nodeDetails[nodeType].title + " — " + (nodeType === "design" ? workflowCopy.lockedBeforeIdea : workflowCopy.lockedAfterSketch))
              : "";
            return (
              <g key={`section-sphere-${node.id}`}>
                <circle
                  data-testid="unocalc-section-sphere"
                  data-node-id={node.id}
                  cx={node.x}
                  cy={node.y}
                  r={NODE_CONTOUR.radius}
                  fill={active ? "hsl(var(--primary) / 0.15)" : "none"}
                  stroke={active ? "hsl(var(--primary))" : signalColor(nodeType ?? "idea")}
                  strokeWidth={NODE_CONTOUR.width}
                  strokeOpacity={active ? NODE_CONTOUR.activeOpacity : NODE_CONTOUR.idleOpacity}
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="none"
                />
                {nodeType && cycleSignal(nodeType) !== "idle" && <circle
                  data-testid={`unocalc-signal-${nodeType}`}
                  cx={node.x + 9} cy={node.y - 9} r="3.5"
                  fill={cycleSignal(nodeType) === "attention" ? "#c49d65" : "hsl(var(--primary))"}
                  pointerEvents="none" />}

                {nodeType && (
                  <circle
                    data-testid={`unocalc-${node.id}-hit`}
                    data-egg-node={node.id}
                    cx={node.x}
                    cy={node.y}
                    r="25"
                    fill="transparent"
                    pointerEvents="all"
                    stroke="none"
                    role="button"
                    tabIndex={unlocked ? 0 : -1}
                    aria-label={label}
                    aria-pressed={active}
                    aria-disabled={!unlocked}
                    className={unlocked ? "cursor-pointer focus:outline-none focus-visible:stroke-primary focus-visible:stroke-[1.5px]" : "cursor-not-allowed"}
                    onKeyDown={(event) => onNodeKeyDown(event, nodeType)}
                  />
                )}
              </g>
            );
          })}
          {/* Four independently clickable lower nodes, no floating tooltips:
              05: Test drive, Production (+X) — Retail (+Z)
              06: Marketing, Retail (+Z) — Design (-X)
              07: Procurement, Design (-X) — Commerce (-Z)
              08: Legal, Commerce (-Z) — Production (+X). */}
          {geometry.lowerNodes.map((node) => {
            const nodeType: "testDrive" | "marketing" | "procurement" | "legal" | null =
              node.id === "support-1" ? "testDrive" :
              node.id === "support-2" ? "marketing" :
              node.id === "support-3" ? "procurement" :
              node.id === "support-4" ? "legal" : null;
            const active = nodeType !== null && selectedNodes.includes(nodeType);
            const detail = nodeType === null ? null : nodeDetails[nodeType];
            return (
              <g key={node.id} data-testid="unocalc-lower-sphere-node">
                <circle
                  data-testid="unocalc-lower-sphere"
                  data-node-id={node.id}
                  data-node-role={nodeType ?? "unassigned"}
                  cx={node.x}
                  cy={node.y}
                  r={NODE_CONTOUR.radius}
                  fill={active ? "hsl(var(--primary) / 0.22)" : "none"}
                  stroke={active ? "hsl(var(--primary))" : signalColor(nodeType ?? "idea")}
                  strokeWidth={NODE_CONTOUR.width}
                  strokeOpacity={active ? NODE_CONTOUR.activeOpacity : NODE_CONTOUR.idleOpacity}
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="none"
                />
                {nodeType && cycleSignal(nodeType) !== "idle" && <circle
                  data-testid={`unocalc-signal-${nodeType}`}
                  cx={node.x + 9} cy={node.y - 9} r="3.5"
                  fill={cycleSignal(nodeType) === "attention" ? "#c49d65" : "hsl(var(--primary))"}
                  pointerEvents="none" />}

                {nodeType && detail && (
                  <circle
                    data-testid={nodeType === "marketing" ? "unocalc-marketing-hit" :
                      nodeType === "testDrive" ? "unocalc-test-drive-hit" :
                      nodeType === "procurement" ? "unocalc-procurement-hit" : "unocalc-legal-hit"}
                    data-egg-node={nodeType}
                    cx={node.x}
                    cy={node.y}
                    r="25"
                    fill="transparent"
                    pointerEvents="all"
                    stroke="none"
                    role="button"
                    tabIndex={0}
                    aria-label={active ? detail.closeLabel : detail.openLabel}
                    aria-pressed={active}
                    aria-describedby={`unocalc-${nodeType === "testDrive" ? "test-drive" : nodeType}-description`}
                    className="cursor-pointer focus:outline-none focus-visible:stroke-primary focus-visible:stroke-[1.5px]"
                    onKeyDown={(event) => onNodeKeyDown(event, nodeType)}
                  />
                )}
              </g>
            );
          })}
          {geometry.poleNodes.map((node, index) => {
            const nodeType: InteractiveNode = index === 0 ? "idea" : "matter";
            const active = selectedNodes.includes(nodeType);
            const unlocked = canActivateNode(nodeType);
            const label = unlocked
              ? (active ? nodeDetails[nodeType].closeLabel : nodeDetails[nodeType].openLabel)
              : nodeDetails[nodeType].title + " — " + workflowCopy.lockedAfterSketch;
            return (
              <g key={`pole-sphere-${nodeType}`}>
                <circle
                  data-testid="unocalc-pole-sphere"
                  data-node-id={nodeType}
                  cx={node.x}
                  cy={node.y}
                  r={12.2}
                  fill={`url(#unocalc-${nodeType === "idea" ? "idea" : "matter"}-pole-light)`}
                  stroke={EGG_POLES[nodeType === "idea" ? "idea" : "matter"].color}
                  strokeWidth={active ? "1.8" : "1.15"}
                  strokeOpacity={active ? "1" : ".9"}
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="none"
                />
                {nodeType && cycleSignal(nodeType) !== "idle" && <circle
                  data-testid={`unocalc-signal-${nodeType}`}
                  cx={node.x + 9} cy={node.y - 9} r="3.5"
                  fill={cycleSignal(nodeType) === "attention" ? "#c49d65" : "hsl(var(--primary))"}
                  pointerEvents="none" />}

                <circle
                  data-testid={`unocalc-${nodeType}-hit`}
                  data-egg-node={nodeType}
                  cx={node.x}
                  cy={node.y}
                  r="25"
                  fill="transparent"
                  pointerEvents="all"
                  stroke="none"
                  role="button"
                  tabIndex={unlocked ? 0 : -1}
                  aria-label={label}
                  aria-pressed={active}
                  aria-disabled={!unlocked}
                  className={unlocked ? "cursor-pointer focus:outline-none focus-visible:stroke-primary focus-visible:stroke-[1.5px]" : "cursor-not-allowed"}
                  onKeyDown={(event) => onNodeKeyDown(event, nodeType)}
                />
              </g>
            );
          })}
          <path
            data-testid="unocalc-egg-outline"
            d={geometry.silhouette}
            fill="none"
            stroke="currentColor"
            strokeWidth=".95"
            strokeOpacity=".50"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />
        </svg>
      </div>
      <p data-testid="unocalc-maturity-readout"
         className="mx-auto mt-2 px-3 text-center text-[12px] font-light tracking-[0.025em] text-foreground/65">
        {stageLabels.stage} {String(maturity.stage).padStart(2, "0")} / 05 · {currentStage[locale]} · {stageLabels.iteration} {maturity.iteration}
      </p>
      <p data-testid="unocalc-rotation-hint"
        className="mt-1 px-3 text-center text-[11px] font-light tracking-[0.025em] text-foreground/50">
        {copy.hint}
      </p>
      {selectedNodes.length > 0 && (
        <div
          data-testid="unocalc-active-panels"
          className={`unocalc-active-panels mx-auto mt-5 flex w-full max-w-[320px] flex-col gap-7 pb-2 min-[900px]:absolute min-[900px]:right-0 min-[900px]:mt-0 min-[900px]:w-[23%] min-[900px]:max-w-[240px] min-[900px]:overflow-y-auto min-[900px]:pr-2 ${selectedNodes.length >= 3 ? "unocalc-active-panels--dense" : ""}`}
        >
          {selectedNodes.map((node) => (
            <div key={node} className="flex min-w-0 flex-col gap-4">
              <NodeDescription node={node} detail={nodeDetails[node]} />
              {(
                <button type="button" data-testid={`unocalc-${node}-open`} onClick={() => guest ? window.location.assign("/egg/connect") : openWorkspace(node)}
                  className="self-start border-b border-foreground/35 pb-1 text-left text-[11px] font-light text-foreground/75 hover:text-foreground">
                  {guest ? (locale === "ru" ? "Войти для работы" : locale === "uk" ? "Увійти для роботи" : "Sign in to work") : (locale === "ru" ? "Открыть рабочее пространство" : locale === "uk" ? "Відкрити робочий простір" : "Open workspace")}
                </button>
              )}
              {!guest && node === "design" && hasIdea && ideaCycle?.phase !== "forwarded" && (
                <button
                  type="button"
                  onClick={openDesignWorkspace}
                  className="self-start border-b border-foreground/35 pb-1 text-left text-[11px] font-light text-foreground/75 hover:text-foreground"
                >
                  {workflowCopy.workOpen}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {!guest && workspaceOpen && createPortal(
        <div data-testid="unocalc-sphere-workspace" className="unocalc-workspace-overlay fixed inset-0 z-[90] flex items-stretch justify-end" role="presentation">
          <button type="button" aria-label={locale === "ru" ? "Закрыть панель" : locale === "uk" ? "Закрити панель" : "Close panel"}
            className={`absolute inset-0 bg-black/35 transition-opacity duration-[420ms] ease-out motion-reduce:transition-none ${workspaceVisible ? "opacity-100" : "opacity-0"}`} onClick={closeWorkspace} />
          <section role="dialog" aria-modal="true" aria-labelledby="unocalc-sphere-workspace-title"
            className={`unocalc-workspace-dialog relative z-10 flex h-full min-h-0 flex-col overflow-hidden border-l border-foreground/15 bg-background shadow-2xl transition-[width,transform,opacity] duration-[420ms] ease-out motion-reduce:transition-none ${workspaceVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-95"} ${workspaceExpanded ? "w-full" : "w-full min-[1100px]:w-[min(520px,60vw)]"}`}>
            <header className="unocalc-workspace-header flex shrink-0 items-start justify-between gap-3 border-b border-foreground/10 pb-4 min-[1100px]:pb-6">
              <div className="min-w-0 flex-1">
                <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-foreground/45">UNO / EGG / {workspaceNode === "author" ? (locale === "en" ? "AUTHOR" : "АВТОР") : workspaceNode ? nodeDetails[workspaceNode].number : ""}</p>
                <h2 id="unocalc-sphere-workspace-title" className="break-words text-[22px] leading-snug font-extralight tracking-[-0.035em] sm:text-[26px]">{workspaceNode === "author" ? (locale === "en" ? "Author" : "Автор") : workspaceNode ? nodeDetails[workspaceNode].title : ""}</h2>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button type="button" data-testid="unocalc-sphere-expand" onClick={() => setWorkspaceExpanded((value) => !value)}
                  className="hidden min-[1100px]:inline-flex min-h-11 items-center rounded-full border border-foreground/20 px-4 py-2 text-[12px] text-foreground/70 hover:border-foreground/40">
                  {workspaceExpanded ? (locale === "ru" ? "Свернуть" : locale === "uk" ? "Згорнути" : "Collapse") : (locale === "ru" ? "Развернуть" : locale === "uk" ? "Розгорнути" : "Expand")}
                </button>
                <button type="button" data-testid="unocalc-sphere-close" onClick={closeWorkspace}
                  aria-label={locale === "ru" ? "Закрыть панель" : locale === "uk" ? "Закрити панель" : "Close panel"}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-foreground/20 text-foreground/70 hover:border-foreground/40 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                  <span aria-hidden="true" className="text-[24px] font-extralight leading-none">×</span>
                </button>
              </div>
            </header>
            <div className="unocalc-workspace-body flex min-h-0 flex-1 items-start justify-center overflow-y-auto overscroll-contain px-5 py-8 text-center sm:px-8">
              {(workspaceNode === "design" || workspaceNode === "marketing" || workspaceNode === "testDrive") &&
                ideaCycle?.phase === "forwarded" && designLoop?.seed === ideaCycle.seed && designLoop.layer === ideaCycle.layer ? (
                <UnoEggDesignLoopPanel
                  locale={locale} node={workspaceNode} loop={designLoop} setLoop={setDesignLoop}
                  originalMarketing={ideaCycle.marketing}
                  onNavigate={openWorkspace}
                />
              ) : (workspaceNode === "author" || workspaceNode === "idea" || workspaceNode === "marketing" ||
                workspaceNode === "legal" || workspaceNode === "design" || workspaceNode === "production") ? (
                <div data-testid={workspaceNode === "author" ? "unocalc-author-page" : undefined}
                     className="w-full space-y-6">
                <UnoEggIdeaCyclePanel
                  locale={locale} node={workspaceNode} draft={ideaDraft} onDraft={setIdeaDraft}
                  cycle={ideaCycle} setCycle={setIdeaCycle} onSetSeed={placeSeedInCore}
                  onNavigate={openWorkspace}
                />
                  {workspaceNode === "author" && (
          <div data-testid="unocalc-author-stage-controls"
               className="flex w-full flex-col items-start gap-3 rounded-xl border border-foreground/15 p-4">
            <p className="text-left text-[10px] font-light uppercase tracking-[0.12em] text-foreground/45">
              {stageLabels.axis}
            </p>
            <p data-testid="unocalc-maturity-status"
               className="text-left text-[12px] font-light tracking-[0.025em] text-foreground/80">
              {stageLabels.stage} {String(maturity.stage).padStart(2, "0")} / 05 · {currentStage[locale]} · {stageLabels.iteration} {maturity.iteration}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2" role="group"
                 aria-label={stageLabels.manual}>
              <span title={EGG_POLES.idea[locale]} data-testid="unocalc-pole-idea-key"
                    className="flex h-7 w-4 items-center justify-center">
                <span className="h-3 w-3 rounded-full" style={{backgroundColor: EGG_POLES.idea.color}} />
              </span>
              {EGG_STAGES.map((level) => {
                const status = eggStageState(maturity, level.index);
                const isCurrent = status === "current";
                return <button key={level.index} type="button"
                  data-testid={`unocalc-maturity-select-${level.index}`}
                  data-state={status}
                  onClick={() => setMaturity((prev) => setEggStage(prev, level.index as EggStageNumber))}
                  title={`${level[locale]} · ${stageLabels[status]}`}
                  aria-label={`${stageLabels.stage} ${level.index}: ${level[locale]} · ${stageLabels[status]}`}
                  aria-pressed={isCurrent}
                  className={`flex h-11 w-11 items-center justify-center gap-1 rounded-full border text-[12px] font-light transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${isCurrent ? "border-foreground/55 bg-foreground/[0.045] text-foreground shadow-[0_0_0_2px_rgba(120,120,120,0.10)]" : status === "completed" ? "border-foreground/25 text-foreground/80 hover:border-foreground/55" : "border-foreground/10 text-foreground/40 hover:border-foreground/35"}`}>
                  <span className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: level.color, opacity: status === "future" ? 0.23 : 1,
                          boxShadow: isCurrent ? `0 0 9px 2px ${level.color}55` : "none" }} />
                  {level.index}
                </button>;
              })}
              <span title={EGG_POLES.matter[locale]} data-testid="unocalc-pole-matter-key"
                    className="flex h-7 w-4 items-center justify-center">
                <span className="h-3 w-3 rounded-full" style={{backgroundColor: EGG_POLES.matter.color}} />
              </span>
              <button data-testid="unocalc-maturity-new-iteration" type="button"
                onClick={() => setMaturity((prev) => nextEggIteration(prev))}
                aria-label={stageLabels.newIteration}
                title={stageLabels.newIteration}
                className="flex h-11 min-w-11 items-center justify-center rounded-full border border-foreground/15 px-3 text-[11px] font-light text-foreground/65 hover:border-foreground/50">
                +1
              </button>
            </div>
            <p className="text-left text-[10px] font-light leading-relaxed text-foreground/45">
              {stageLabels.manual}
            </p>
          </div>
                  )}
                  {workspaceNode === "author" && (
                    <UnoEggFilePanel locale={locale} seed={ideaCycle?.seed ?? ""}
                      maturity={maturity} ideaCycle={ideaCycle} designLoop={designLoop}
                      brief={brief} sketches={sketches.map(item => ({ id: item.id, name: item.name }))} />
                  )}
                </div>
              ) : (
                <p className="max-w-[260px] text-[12px] font-light leading-[1.8] text-foreground/40">
                  {locale === "ru" ? "Пустое рабочее пространство. Проверяем открытие и закрытие панели." : locale === "uk" ? "Порожній робочий простір. Перевіряємо відкриття та закриття панелі." : "Empty workspace. Testing panel opening and closing."}
                </p>
              )}
            </div>
          </section>
        </div>,
        document.body
      )}
      {selectedNodes.includes("design") && hasIdea && ideaCycle?.phase !== "forwarded" && (
        <section
          ref={designWorkspace}
          data-testid="unocalc-design-workspace"
          className="mx-auto mt-10 w-full max-w-[700px] scroll-mt-8 border-t border-foreground/15 px-3 pt-7 text-left"
        >
          <p className="text-[10px] font-light uppercase tracking-[0.16em] text-foreground/45">{copy.designNode}</p>
          <h2 className="mt-2 text-[24px] font-extralight tracking-[-0.025em] text-foreground/85">{workflowCopy.workTitle}</h2>
          <p className="mt-3 text-[13px] font-light leading-relaxed text-foreground/65">{workflowCopy.workIntro}</p>
          <p className="mt-1 text-[11px] font-light leading-relaxed text-foreground/45">{workflowCopy.workCaveat}</p>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {([
              ["concept", workflowCopy.workConcept],
              ["purpose", workflowCopy.workPurpose],
              ["character", workflowCopy.workCharacter],
              ["constraints", workflowCopy.workConstraints],
            ] as const).map(([field, label]) => (
              <label key={field} className="flex min-w-0 flex-col gap-2 text-[11px] font-light text-foreground/65">
                {label}
                <textarea
                  data-testid={"unocalc-brief-" + field}
                  value={brief[field]}
                  onChange={(event) => updateBrief(field, event.target.value)}
                  rows={field === "concept" ? 5 : 3}
                  maxLength={3000}
                  placeholder={workflowCopy.workOptional}
                  className="min-h-[100px] w-full resize-y rounded-md border border-foreground/20 bg-transparent p-3 text-[13px] font-light leading-relaxed text-foreground/85 outline-none placeholder:text-foreground/35 focus-visible:border-primary"
                />
              </label>
            ))}
          </div>
          {brief.ideaSnapshot !== ideaDraft && (
            <p role="status" className="mt-4 text-[11px] font-light leading-relaxed text-foreground/60">{workflowCopy.workChanged}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={refreshBriefIdea}
              className="rounded-md border border-foreground/25 px-4 py-2 text-[12px] font-light text-foreground/75 hover:border-foreground/55">
              {workflowCopy.workRefresh}
            </button>
            <button type="button" onClick={saveBrief}
              className="rounded-md border border-foreground/25 px-4 py-2 text-[12px] font-light text-foreground/75 hover:border-foreground/55">
              {workflowCopy.workSave}
            </button>
          </div>
          <p role="status" className="mt-2 text-[11px] font-light text-foreground/55">
            {briefStatus === "saved" ? workflowCopy.workSaved : briefStatus === "error" ? workflowCopy.workSaveError : ""}
          </p>
          <div className="mt-7 border-t border-foreground/10 pt-6">
            <label htmlFor="unocalc-sketch-prompt" className="text-[13px] font-light text-foreground/80">{workflowCopy.workPrompt}</label>
            <textarea
              id="unocalc-sketch-prompt"
              data-testid="unocalc-sketch-prompt"
              value={sketchPrompt}
              readOnly
              rows={8}
              className="mt-3 w-full resize-y rounded-md border border-foreground/15 bg-foreground/[0.025] p-4 text-[12px] font-light leading-[1.8] text-foreground/75 outline-none"
            />
            <button type="button" onClick={() => { void copyPrompt(); }}
              className="mt-3 rounded-md border border-foreground/25 px-4 py-2 text-[12px] font-light text-foreground/75 hover:border-foreground/55">
              {workflowCopy.workCopy}
            </button>
            <p role="status" className="mt-2 text-[11px] font-light text-foreground/55">
              {copyStatus === "copied" ? workflowCopy.workCopied : copyStatus === "error" ? workflowCopy.workCopyError : ""}
            </p>
          </div>
          <div className="mt-8 border-t border-foreground/10 pt-6">
            <h3 className="text-[17px] font-extralight text-foreground/85">{workflowCopy.sketchTitle}</h3>
            <p className="mt-2 text-[11px] font-light text-foreground/50">{workflowCopy.sketchLimit}</p>
            <label className="mt-4 inline-flex cursor-pointer rounded-md border border-foreground/25 px-4 py-2 text-[12px] font-light text-foreground/80 hover:border-foreground/60 focus-within:outline focus-within:outline-2 focus-within:outline-primary">
              {workflowCopy.sketchAdd}
              <input data-testid="unocalc-sketch-upload" type="file" accept="image/*" multiple
                className="sr-only" onChange={(event) => { void addSketches(event); }} />
            </label>
            <p role="status" className="mt-3 text-[11px] font-light leading-relaxed text-foreground/55">
              {sketchNotice || (hasSketch ? workflowCopy.sketchReady : workflowCopy.sketchEmpty)}
            </p>
            {sketches.length > 0 && (
              <div data-testid="unocalc-sketch-gallery" className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {sketches.map((sketch) => (
                  <div key={sketch.id} className="min-w-0">
                    <img src={sketch.previewUrl} alt={sketch.name} className="aspect-square w-full rounded-md border border-foreground/10 object-contain" />
                    <p className="mt-1 truncate text-[10px] font-light text-foreground/60" title={sketch.name}>{sketch.name}</p>
                    <button type="button" onClick={() => { void deleteSketch(sketch); }}
                      className="mt-1 border-b border-foreground/30 text-[11px] font-light text-foreground/65 hover:text-foreground">
                      {workflowCopy.sketchRemove}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-4 text-[10px] font-light leading-relaxed text-foreground/45">{workflowCopy.sketchLocal}</p>
          </div>
        </section>
      )}
    </div>
  );
};

export default UnoEggScene;

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { IDEA_CYCLE_KEY, newIdeaCycle, restoreIdeaCycle, UnoEggIdeaCyclePanel, type IdeaCycle } from "./UnoEggIdeaCyclePanel";
import { designCopy, EMPTY_BRIEF, makeSketchPrompt, type DesignBrief } from "@/lib/unocalcDesign";
import { listSketches, removeStoredSketch, storeSketch, type StoredSketch } from "@/lib/unocalcSketches";
import {
  convexOutline,
  eggAxisEndpoints,
  eggEquatorArcs,
  eggLowerRingArcs,
  visibleEggLowerSphereNodes,
  EGG_EQUATOR,
  eggPoleNodes,
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
type Props = { locale: Locale };
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
    marketingDescription: "Связь между дизайном и ритейлом. Здесь можно исследовать, как будущий объект будет представлен, воспринят и найден своей аудиторией.",
    marketingNode: "Узел / 06",
    testDrive: "Тест-драйв",
    testDriveLabel: "Открыть описание узла «Тест-драйв»",
    testDriveCloseLabel: "Закрыть описание узла «Тест-драйв»",
    testDriveDescription: "Проба объекта в использовании и проверка его свойств перед выходом в ритейл. Название рабочее — назначение можно уточнить.",
    testDriveNode: "Узел / 05",
    procurement: "Комплектация",
    procurementLabel: "Открыть описание узла «Комплектация»",
    procurementCloseLabel: "Закрыть описание узла «Комплектация»",
    procurementDescription: "Подбор и согласование материалов, комплектующих и изделий, необходимых для реализации объекта. Связующее звено между дизайном и экономикой проекта.",
    procurementNode: "Узел / 07",
    legal: "Право",
    legalLabel: "Открыть описание узла «Право»",
    legalCloseLabel: "Закрыть описание узла «Право»",
    legalDescription: "Правовые условия воплощения и обращения объекта: авторство, договорённости, права и ответственность участников. Связь производства с коммерцией.",
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
    retailDescription: "Точка встречи объекта и человека. Здесь созданная форма получает представление, контекст и путь к своему пользователю.",
    commerce: "Коммерция",
    commerceLabel: "Открыть описание узла «Коммерция»",
    commerceCloseLabel: "Закрыть описание узла «Коммерция»",
    commerceDescription: "Экономическая сторона проекта. Здесь определяется, как созданная ценность превращается в устойчивый обмен и обеспечивает развитие.",
    node: "Узел / 01",
    commerceNode: "Узел / 02",
    design: "Дизайн",
    designLabel: "Открыть описание узла «Дизайн»",
    designCloseLabel: "Закрыть описание узла «Дизайн»",
    designDescription: "Формирование замысла. Здесь потребности и идеи превращаются в структуру, пропорции и форму будущего объекта.",
    designNode: "Узел / 03",
    production: "Производство",
    productionLabel: "Открыть описание узла «Производство»",
    productionCloseLabel: "Закрыть описание узла «Производство»",
    productionDescription: "Материальное воплощение замысла. Технологии, материалы и процессы превращают проект в реальный объект.",
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
    marketingDescription: "Зв’язок між дизайном і ритейлом. Тут можна досліджувати, як майбутній об’єкт буде представлений, сприйнятий і знайдений своєю аудиторією.",
    marketingNode: "Вузол / 06",
    testDrive: "Тест-драйв",
    testDriveLabel: "Відкрити опис вузла «Тест-драйв»",
    testDriveCloseLabel: "Закрити опис вузла «Тест-драйв»",
    testDriveDescription: "Проба об’єкта у використанні та перевірка його властивостей перед виходом у ритейл. Назва робоча — призначення можна уточнити.",
    testDriveNode: "Вузол / 05",
    procurement: "Комплектація",
    procurementLabel: "Відкрити опис вузла «Комплектація»",
    procurementCloseLabel: "Закрити опис вузла «Комплектація»",
    procurementDescription: "Добір і узгодження матеріалів, комплектувальних виробів та елементів, потрібних для реалізації об’єкта. Зв’язок між дизайном та економікою проєкту.",
    procurementNode: "Вузол / 07",
    legal: "Право",
    legalLabel: "Відкрити опис вузла «Право»",
    legalCloseLabel: "Закрити опис вузла «Право»",
    legalDescription: "Правові умови втілення та обігу об’єкта: авторство, домовленості, права й відповідальність учасників. Зв’язок виробництва з комерцією.",
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
    retailDescription: "Точка зустрічі об’єкта й людини. Тут створена форма отримує представлення, контекст і шлях до свого користувача.",
    commerce: "Комерція",
    commerceLabel: "Відкрити опис вузла «Комерція»",
    commerceCloseLabel: "Закрити опис вузла «Комерція»",
    commerceDescription: "Економічний бік проєкту. Тут визначається, як створена цінність перетворюється на сталий обмін і забезпечує розвиток.",
    node: "Вузол / 01",
    commerceNode: "Вузол / 02",
    design: "Дизайн",
    designLabel: "Відкрити опис вузла «Дизайн»",
    designCloseLabel: "Закрити опис вузла «Дизайн»",
    designDescription: "Формування задуму. Тут потреби та ідеї перетворюються на структуру, пропорції та форму майбутнього об’єкта.",
    designNode: "Вузол / 03",
    production: "Виробництво",
    productionLabel: "Відкрити опис вузла «Виробництво»",
    productionCloseLabel: "Закрити опис вузла «Виробництво»",
    productionDescription: "Матеріальне втілення задуму. Технології, матеріали й процеси перетворюють проєкт на реальний об’єкт.",
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
    marketingDescription: "The link between Design and Retail. Explore how the future object might be presented, perceived and discovered by its audience.",
    marketingNode: "Node / 06",
    testDrive: "Test drive",
    testDriveLabel: "Open the Test drive node description",
    testDriveCloseLabel: "Close the Test drive node description",
    testDriveDescription: "Try the object in use and verify its properties before it reaches retail. The name is provisional and can be refined.",
    testDriveNode: "Node / 05",
    procurement: "Procurement",
    procurementLabel: "Open the Procurement node description",
    procurementCloseLabel: "Close the Procurement node description",
    procurementDescription: "Selection and coordination of materials, components and products needed to realize the object. Connecting design with the project's economics.",
    procurementNode: "Node / 07",
    legal: "Legal",
    legalLabel: "Open the Legal node description",
    legalCloseLabel: "Close the Legal node description",
    legalDescription: "Legal conditions for making and distributing the object: authorship, agreements, rights and responsibilities. Connecting production with commerce.",
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
    retailDescription: "Where the object meets the person. Here, a created form gains its presentation, context, and a path to its user.",
    commerce: "Commerce",
    commerceLabel: "Open the Commerce node description",
    commerceCloseLabel: "Close the Commerce node description",
    commerceDescription: "The economic side of a project. Here, created value becomes sustainable exchange and supports further development.",
    node: "Node / 01",
    commerceNode: "Node / 02",
    design: "Design",
    designLabel: "Open the Design node description",
    designCloseLabel: "Close the Design node description",
    designDescription: "Shaping the concept. Here, needs and ideas become the structure, proportions, and form of a future object.",
    designNode: "Node / 03",
    production: "Production",
    productionLabel: "Open the Production node description",
    productionCloseLabel: "Close the Production node description",
    productionDescription: "Bringing the concept into material form. Technologies, materials, and processes turn the project into a real object.",
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

const UnoEggScene = ({ locale }: Props) => {
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
  const [ideaSaveStatus, setIdeaSaveStatus] = useState<"idle" | "saved" | "error" | "empty">("idle");
  const [ideaCycle, setIdeaCycle] = useState<IdeaCycle | null>(restoreIdeaCycle);
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
  const hasSketch = sketches.length > 0;
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

  const placeSeedInCore = () => {
    if (!ideaDraft.trim()) return;
    setIdeaCycle(newIdeaCycle(ideaDraft));
    try { window.localStorage.setItem(IDEA_STORAGE_KEY, ideaDraft); } catch { /* local-only */ }
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
    openWorkspace("author");
    giveNodeFeedback();
  };

  const activateNode = (node: InteractiveNode) => {
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
      poleNodes: eggPoleNodes(orientation),
      core: projectEggPoint({ x: 0, y: EGG_EQUATOR, z: 0 }, orientation),
    };
  }, [orientation]);

  // Prototype only: a deterministic field, not a semantic or physical measure.
  // A first sketch adds a visual stage marker to the central sphere.
  const ideaField = useMemo(() => {
    const source = ideaDraft.trim();
    if (!source) return null;
    let hash = 2166136261;
    for (const character of source) {
      hash = Math.imul(hash ^ (character.codePointAt(0) ?? 0), 16777619) >>> 0;
    }
    const words = source.split(/\s+/u).filter(Boolean).length;
    const strength = Math.min(0.9, 0.3 + Math.log2(words + 1) * 0.12);
    const lobes = Array.from({ length: 4 }, (_, index) => {
      const seed = (hash ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0;
      const x = (((seed & 255) / 255) - 0.5) * 0.85;
      const y = ((((seed >>> 8) & 255) / 255) - 0.5) * 1.5;
      const z = ((((seed >>> 16) & 255) / 255) - 0.5) * 0.8;
      const position = projectEggPoint({ x, y, z }, orientation);
      return {
        ...position,
        rx: 102 + ((seed >>> 24) & 255) / 255 * 55,
        ry: 120 + ((seed >>> 20) & 255) / 255 * 65,
      };
    });
    return { hash, strength, lobes };
  }, [ideaDraft, orientation]);

  const saveIdea = () => {
    if (!hasIdea) {
      setIdeaSaveStatus("empty");
      return;
    }
    try {
      window.localStorage.setItem(IDEA_STORAGE_KEY, ideaDraft);
      setIdeaSaveStatus("saved");
    } catch {
      setIdeaSaveStatus("error");
    }
    // Saving the idea is the transition to Design, not a dead end.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    openDesignWorkspace();
  };

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
            <radialGradient id="unocalc-core-shading" cx="36%" cy="30%" r="76%">
              <stop offset="0%" stopColor="#c9b58b" stopOpacity=".22" />
              <stop offset="68%" stopColor="#b8a076" stopOpacity=".13" />
              <stop offset="100%" stopColor="#ad9162" stopOpacity=".035" />
            </radialGradient>
            <radialGradient id="unocalc-idea-field-gradient">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity=".28" />
              <stop offset="54%" stopColor="hsl(var(--primary))" stopOpacity=".10" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </radialGradient>
            <clipPath id="unocalc-idea-field-clip">
              <path d={geometry.silhouette} />
            </clipPath>
          </defs>
          {ideaField && (
            <g
              data-testid="unocalc-idea-field"
              data-field-signature={ideaField.hash}
              clipPath="url(#unocalc-idea-field-clip)"
              pointerEvents="none"
              aria-hidden="true"
            >
              <path d={geometry.silhouette} fill="hsl(var(--primary))" fillOpacity=".025" />
              {ideaField.lobes.map((lobe, index) => (
                <ellipse
                  key={index}
                  cx={lobe.x}
                  cy={lobe.y}
                  rx={lobe.rx}
                  ry={lobe.ry}
                  fill="url(#unocalc-idea-field-gradient)"
                  opacity={ideaField.strength}
                />
              ))}
            </g>
          )}
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
            {geometry.ideaLinks.map((link) => (
              <line
                key={link.id}
                data-testid={`unocalc-idea-link-${link.id}`}
                x1={link.x1} y1={link.y1}
                x2={link.x2} y2={link.y2}
                stroke="currentColor"
                strokeWidth=".75"
                strokeOpacity={link.depth < 0 ? ".22" : ".38"}
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
              />
            ))}
          </g>
          {/* Additional structural relationships from the lower spheres to
              Design and Production, drawn behind the clickable nodes. */}
          <g data-testid="unocalc-support-links" aria-hidden="true" pointerEvents="none">
            {geometry.supportLinks.map((link) => (
              <line
                key={link.id}
                data-testid={`unocalc-support-link-${link.id}`}
                x1={link.x1} y1={link.y1}
                x2={link.x2} y2={link.y2}
                stroke="currentColor"
                strokeWidth=".75"
                strokeOpacity={link.depth < 0 ? ".22" : ".38"}
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
              />
            ))}
          </g>
          {/* The central core represents the object. Tapping opens the Author panel;
              dragging still rotates the egg without triggering panel activation. */}
          <circle
            data-testid="unocalc-core-sphere"
            cx={geometry.core.x}
            cy={geometry.core.y}
            r="45"
            fill="url(#unocalc-core-shading)"
            stroke={hasSketch ? "hsl(var(--primary))" : "#aa936d"}
            strokeWidth="1.05"
            strokeOpacity={hasSketch ? ".62" : ".43"}
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
            role="img"
            aria-label={copy.coreLabel}
          />
          <circle
            data-testid="unocalc-author-hit"
            data-egg-node="author"
            cx={geometry.core.x}
            cy={geometry.core.y}
            r="45"
            fill="transparent"
            pointerEvents="all"
            stroke="none"
            role="button"
            tabIndex={0}
            aria-label={locale === "ru" ? "Открыть панель Автора" : locale === "uk" ? "Відкрити панель Автора" : "Open Author panel"}
            className="cursor-pointer focus:outline-none focus-visible:stroke-primary focus-visible:stroke-[1.5px]"
            onKeyDown={(event) => onNodeKeyDown(event, "author")}
          />
          {hasSketch && (
            <circle
              data-testid="unocalc-core-progress"
              cx={geometry.core.x} cy={geometry.core.y} r="51"
              fill="none" stroke="hsl(var(--primary))" strokeOpacity=".25"
              strokeWidth="1" strokeDasharray="3 7" pointerEvents="none"
              aria-hidden="true"
            />
          )}
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
                  fill={active ? "hsl(var(--primary) / 0.22)" : "none"}
                  stroke={active ? "hsl(var(--primary))" : "currentColor"}
                  strokeWidth={NODE_CONTOUR.width}
                  strokeOpacity={active ? NODE_CONTOUR.activeOpacity : NODE_CONTOUR.idleOpacity}
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="none"
                />
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
                  stroke={active ? "hsl(var(--primary))" : "currentColor"}
                  strokeWidth={NODE_CONTOUR.width}
                  strokeOpacity={active ? NODE_CONTOUR.activeOpacity : NODE_CONTOUR.idleOpacity}
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="none"
                />
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
                  r={NODE_CONTOUR.radius}
                  fill={active ? "hsl(var(--primary) / 0.22)" : "none"}
                  stroke={active ? "hsl(var(--primary))" : "currentColor"}
                  strokeWidth={NODE_CONTOUR.width}
                  strokeOpacity={active ? NODE_CONTOUR.activeOpacity : NODE_CONTOUR.idleOpacity}
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="none"
                />
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
                <button type="button" data-testid={`unocalc-${node}-open`} onClick={() => openWorkspace(node)}
                  className="self-start border-b border-foreground/35 pb-1 text-left text-[11px] font-light text-foreground/75 hover:text-foreground">
                  {locale === "ru" ? "Открыть рабочее пространство" : locale === "uk" ? "Відкрити робочий простір" : "Open workspace"}
                </button>
              )}
              {node === "design" && hasIdea && (
                <button
                  type="button"
                  onClick={openDesignWorkspace}
                  className="self-start border-b border-foreground/35 pb-1 text-left text-[11px] font-light text-foreground/75 hover:text-foreground"
                >
                  {workflowCopy.workOpen}
                </button>
              )}
              {node === "idea" && (
                <form
                  data-testid="unocalc-idea-editor"
                  className="flex min-w-0 flex-col gap-3"
                  onSubmit={(event) => { event.preventDefault(); saveIdea(); }}
                >
                  <label htmlFor="unocalc-idea-input" className="text-[11px] font-light tracking-[0.03em] text-foreground/65">
                    {copy.ideaInputLabel}
                  </label>
                  <textarea
                    id="unocalc-idea-input"
                    data-testid="unocalc-idea-input"
                    value={ideaDraft}
                    onChange={(event) => {
                      setIdeaDraft(event.target.value);
                      setIdeaSaveStatus("idle");
                    }}
                    maxLength={2000}
                    rows={5}
                    placeholder={copy.ideaInputPlaceholder}
                    className="w-full min-w-0 resize-y rounded-md border border-foreground/20 bg-transparent p-3 text-[13px] font-light leading-relaxed text-foreground/85 outline-none placeholder:text-foreground/35 focus-visible:border-primary"
                  />
                  <button
                    type="submit"
                    className="self-start rounded-md border border-foreground/25 px-4 py-2 text-[12px] font-light text-foreground/80 transition-colors hover:border-foreground/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    {copy.ideaSave}
                  </button>
                  <p role="status" className="text-[10px] font-light leading-relaxed text-foreground/50">
                    {ideaSaveStatus === "saved" ? copy.ideaSaved : ideaSaveStatus === "error" ? copy.ideaSaveError : ideaSaveStatus === "empty" ? workflowCopy.ideaRequired : copy.ideaStorageNote}
                  </p>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
      {hasIdea && (
        <div className="mt-4 flex justify-center px-3">
          <button
            data-testid="unocalc-continue-design"
            type="button"
            onClick={saveIdea}
            className="rounded-md border border-foreground/35 px-5 py-3 text-[13px] font-light tracking-[0.015em] text-foreground/85 transition-colors hover:border-foreground/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            {workflowCopy.continueDesign}
          </button>
        </div>
      )}
      {workspaceOpen && createPortal(
        <div data-testid="unocalc-sphere-workspace" className="unocalc-workspace-overlay fixed inset-0 z-[90] flex items-stretch justify-end" role="presentation">
          <button type="button" aria-label={locale === "ru" ? "Закрыть панель" : locale === "uk" ? "Закрити панель" : "Close panel"}
            className={`absolute inset-0 bg-black/35 transition-opacity duration-[420ms] ease-out motion-reduce:transition-none ${workspaceVisible ? "opacity-100" : "opacity-0"}`} onClick={closeWorkspace} />
          <section role="dialog" aria-modal="true" aria-labelledby="unocalc-sphere-workspace-title"
            className={`unocalc-workspace-dialog relative z-10 flex h-full min-h-0 flex-col overflow-hidden border-l border-foreground/15 bg-background shadow-2xl transition-[width,transform,opacity] duration-[420ms] ease-out motion-reduce:transition-none ${workspaceVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-95"} ${workspaceExpanded ? "w-full" : "w-full min-[1100px]:w-[min(520px,60vw)]"}`}>
            <header className="unocalc-workspace-header flex shrink-0 items-start justify-between gap-3 border-b border-foreground/10 pb-4 min-[1100px]:pb-6">
              <div className="min-w-0 flex-1">
                <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-foreground/45">UNO / EGG / {workspaceNode === "author" ? (locale === "en" ? "CORE" : "ЯДРО") : workspaceNode ? nodeDetails[workspaceNode].number : ""}</p>
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
              {(workspaceNode === "author" || workspaceNode === "idea" || workspaceNode === "marketing" ||
                workspaceNode === "legal" || workspaceNode === "design" || workspaceNode === "production") ? (
                <UnoEggIdeaCyclePanel
                  locale={locale} node={workspaceNode} draft={ideaDraft} onDraft={setIdeaDraft}
                  cycle={ideaCycle} setCycle={setIdeaCycle} onSetSeed={placeSeedInCore}
                />
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
      {selectedNodes.includes("design") && hasIdea && (
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

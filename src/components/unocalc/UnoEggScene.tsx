import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent, type PointerEvent } from "react";
import { designCopy, EMPTY_BRIEF, makeSketchPrompt, type DesignBrief } from "@/lib/unocalcDesign";
import { listSketches, removeStoredSketch, storeSketch, type StoredSketch } from "@/lib/unocalcSketches";
import {
  convexOutline,
  eggAxisEndpoints,
  eggEquatorArcs,
  EGG_EQUATOR,
  eggPoleNodes,
  eggSectionAxes,
  eggSurface,
  projectEggPoint,
  svgOutline,
  visibleEggSectionNodes,
  type EggOrientation,
} from "@/lib/unocalcEgg3d";

type Locale = "ru" | "uk" | "en";
type Props = { locale: Locale };
type InteractiveNode = "retail" | "commerce" | "design" | "production" | "idea" | "matter";
type NodeDetail = { title: string; description: string; number: string; openLabel: string; closeLabel: string };

// Front elevation: the horizontal diameter has two side nodes, while
// the nearer node of the depth diameter hides the fourth node behind it.
const INITIAL: EggOrientation = { yaw: 0, tilt: 0 };
const SURFACE = eggSurface();
const IDEA_STORAGE_KEY = "unocalc.idea.v1";
const DESIGN_STORAGE_KEY = "unocalc.design.v1";
const MAX_SKETCHES = 6;
const MAX_SKETCH_BYTES = 10 * 1024 * 1024;
type SketchPreview = StoredSketch & { previewUrl: string };

const text = {
  ru: {
    label: "Трёхмерная форма яйца с вертикальной осью. Вращайте жестом или стрелками клавиатуры.",
    coreLabel: "Центральная сфера — формируемый объект",
    ideaInputLabel: "Описание идеи",
    ideaInputPlaceholder: "Опишите замысел, назначение, свойства будущего объекта…",
    ideaSave: "Сохранить идею",
    ideaSaved: "Идея сохранена в этом браузере.",
    ideaSaveError: "Не удалось сохранить. Текст остаётся в текущем сеансе.",
    ideaStorageNote: "Поле откликается на текст. Данные хранятся только в этом браузере после сохранения.",
    hint: "Вращайте форму жестом или мышью · коснитесь сферы",
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
    ideaInputLabel: "Опис ідеї",
    ideaInputPlaceholder: "Опишіть задум, призначення, властивості майбутнього об’єкта…",
    ideaSave: "Зберегти ідею",
    ideaSaved: "Ідею збережено в цьому браузері.",
    ideaSaveError: "Не вдалося зберегти. Текст залишається в поточному сеансі.",
    ideaStorageNote: "Поле реагує на текст. Дані зберігаються лише в цьому браузері після збереження.",
    hint: "Обертайте форму жестом або мишею · торкніться сфери",
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
    ideaInputLabel: "Describe your idea",
    ideaInputPlaceholder: "Describe the intent, purpose, and qualities of the future object…",
    ideaSave: "Save idea",
    ideaSaved: "Idea saved in this browser.",
    ideaSaveError: "Unable to save. Your text remains in this session.",
    ideaStorageNote: "The field responds to your text. Data is stored only in this browser when saved.",
    hint: "Drag to rotate · tap a sphere",
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
  const [ideaDraft, setIdeaDraft] = useState(() => {
    try { return window.localStorage.getItem(IDEA_STORAGE_KEY) ?? ""; }
    catch { return ""; }
  });
  const [ideaSaveStatus, setIdeaSaveStatus] = useState<"idle" | "saved" | "error">("idle");
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
  const [sketchesLoaded, setSketchesLoaded] = useState(false);
  const sketchUrls = useRef<string[]>([]);
  const designWorkspace = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ id: number; x: number; y: number; startX: number; startY: number; moved: boolean; targetNode: string | null } | null>(null);
  const copy = text[locale];
  const workflowCopy = designCopy[locale];
  const nodeDetails: Record<InteractiveNode, NodeDetail> = {
    retail: { title: copy.retail, description: copy.retailDescription, number: copy.node, openLabel: copy.retailLabel, closeLabel: copy.retailCloseLabel },
    commerce: { title: copy.commerce, description: copy.commerceDescription, number: copy.commerceNode, openLabel: copy.commerceLabel, closeLabel: copy.commerceCloseLabel },
    design: { title: copy.design, description: copy.designDescription, number: copy.designNode, openLabel: copy.designLabel, closeLabel: copy.designCloseLabel },
    production: { title: copy.production, description: copy.productionDescription, number: copy.productionNode, openLabel: copy.productionLabel, closeLabel: copy.productionCloseLabel },
    idea: { title: copy.idea, description: copy.ideaDescription, number: copy.ideaNode, openLabel: copy.ideaLabel, closeLabel: copy.ideaCloseLabel },
    matter: { title: copy.matter, description: copy.matterDescription, number: copy.matterNode, openLabel: copy.matterLabel, closeLabel: copy.matterCloseLabel },
  };
  const hasIdea = ideaDraft.trim().length > 0;
  const hasSketch = sketches.length > 0;
  const canActivateNode = (node: InteractiveNode) =>
    node === "idea" || (node === "design" ? hasIdea : hasSketch);
  const sketchPrompt = makeSketchPrompt(brief, locale);

  useEffect(() => {
    let cancelled = false;
    void listSketches().then((stored) => {
      if (cancelled) return;
      setSketches((current) => {
        const known = new Set(current.map((item) => item.id));
        const restored = stored.filter((item) => !known.has(item.id)).map((item) => {
          const previewUrl = URL.createObjectURL(item.blob);
          sketchUrls.current.push(previewUrl);
          return { ...item, previewUrl };
        });
        return [...restored, ...current];
      });
    }).catch(() => {
      if (!cancelled) setSketchNotice(designCopy[locale].sketchStorageError);
    }).finally(() => {
      if (!cancelled) setSketchesLoaded(true);
    });
    return () => {
      cancelled = true;
      sketchUrls.current.forEach((url) => URL.revokeObjectURL(url));
      sketchUrls.current = [];
    };
  }, []);

  useEffect(() => {
    if (sketchesLoaded && !hasSketch) {
      setSelectedNodes((current) => current.filter((node) => node === "idea" || node === "design"));
    }
  }, [hasSketch, sketchesLoaded]);

  const activateNode = (node: InteractiveNode) => {
    if (!canActivateNode(node)) return;
    if (node === "design" && !brief.concept.trim()) {
      setBrief((current) => ({ ...current, concept: ideaDraft.trim(), ideaSnapshot: ideaDraft }));
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
      try {
        await storeSketch(sketch);
        setSketchNotice("");
      } catch {
        setSketchNotice(workflowCopy.sketchStorageError);
      }
      const previewUrl = URL.createObjectURL(file);
      sketchUrls.current.push(previewUrl);
      setSketches((current) => [...current, { ...sketch, previewUrl }]);
      count++;
    }
  };
  const deleteSketch = async (sketch: SketchPreview) => {
    try {
      await removeStoredSketch(sketch.id);
      setSketchNotice("");
    } catch {
      setSketchNotice(workflowCopy.sketchDeleteError);
      return;
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
    try {
      if (ideaDraft.trim()) window.localStorage.setItem(IDEA_STORAGE_KEY, ideaDraft);
      else window.localStorage.removeItem(IDEA_STORAGE_KEY);
      setIdeaSaveStatus("saved");
    } catch {
      setIdeaSaveStatus("error");
    }
  };

  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const target = event.target as Element;
    pointer.current = {
      id: event.pointerId, x: event.clientX, y: event.clientY,
      startX: event.clientX, startY: event.clientY, moved: false,
      targetNode: target.getAttribute("data-egg-node"),
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const active = pointer.current;
    if (!active || active.id !== event.pointerId) return;
    const dx = event.clientX - active.x;
    const dy = event.clientY - active.y;
    const moved = active.moved || Math.hypot(event.clientX - active.startX, event.clientY - active.startY) > 7;
    pointer.current = { ...active, x: event.clientX, y: event.clientY, moved };
    if (moved) {
      setOrientation((current) => ({ yaw: current.yaw + dx * 0.008, tilt: current.tilt + dy * 0.008 }));
    }
  };
  const onPointerEnd = (event: PointerEvent<SVGSVGElement>) => {
    const active = pointer.current;
    if (!active || active.id !== event.pointerId) return;
    pointer.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (event.type === "pointerup" && !active.moved &&
      (active.targetNode === "retail" || active.targetNode === "commerce" ||
       active.targetNode === "design" || active.targetNode === "production" ||
       active.targetNode === "idea" || active.targetNode === "matter")) {
      activateNode(active.targetNode);
    }
  };
  const onNodeKeyDown = (event: KeyboardEvent<SVGCircleElement>, node: InteractiveNode) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      activateNode(node);
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
            stroke="currentColor" strokeWidth="1.05" strokeOpacity=".43"
            strokeDasharray="7 8" vectorEffect="non-scaling-stroke"
          />
          <path d={geometry.equator.back} fill="none"
            stroke="currentColor" strokeWidth=".9" strokeOpacity=".18"
            strokeDasharray="5 6" vectorEffect="non-scaling-stroke" />
          <path d={geometry.equator.front} fill="none"
            stroke="currentColor" strokeWidth=".9" strokeOpacity=".3"
            vectorEffect="non-scaling-stroke" />
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
              strokeWidth="1.05"
              strokeOpacity=".42"
              strokeDasharray="7 8"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {/* The unformed object: a quiet, larger sphere inside the shell.
              It is not a seventh functional node and does not intercept gestures. */}
          <circle
            data-testid="unocalc-core-sphere"
            cx={geometry.core.x}
            cy={geometry.core.y}
            r="45"
            fill="url(#unocalc-core-shading)"
            stroke="#aa936d"
            strokeWidth="1.05"
            strokeOpacity=".43"
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
            role="img"
            aria-label={copy.coreLabel}
          />
          {geometry.sectionNodes.map((node) => {
            const nodeType: InteractiveNode | null =
              node.id === "retail" || node.id === "commerce" || node.id === "design" || node.id === "production"
                ? node.id : null;
            const active = nodeType !== null && selectedNodes.includes(nodeType);
            const label = nodeType ? (active ? nodeDetails[nodeType].closeLabel : nodeDetails[nodeType].openLabel) : "";
            return (
              <g key={`section-sphere-${node.id}`}>
                <circle
                  data-testid="unocalc-section-sphere"
                  data-node-id={node.id}
                  cx={node.x}
                  cy={node.y}
                  r="10.5"
                  fill={active ? "hsl(var(--primary) / 0.22)" : "none"}
                  stroke={active ? "hsl(var(--primary))" : "currentColor"}
                  strokeWidth="1.1"
                  strokeOpacity={active ? ".85" : ".72"}
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
                    stroke="none"
                    role="button"
                    tabIndex={0}
                    aria-label={label}
                    aria-pressed={active}
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
            const label = active ? nodeDetails[nodeType].closeLabel : nodeDetails[nodeType].openLabel;
            return (
              <g key={`pole-sphere-${nodeType}`}>
                <circle
                  data-testid="unocalc-pole-sphere"
                  data-node-id={nodeType}
                  cx={node.x}
                  cy={node.y}
                  r="10.5"
                  fill={active ? "hsl(var(--primary) / 0.22)" : "none"}
                  stroke={active ? "hsl(var(--primary))" : "currentColor"}
                  strokeWidth="1.1"
                  strokeOpacity={active ? ".85" : ".72"}
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
                  stroke="none"
                  role="button"
                  tabIndex={0}
                  aria-label={label}
                  aria-pressed={active}
                  className="cursor-pointer focus:outline-none focus-visible:stroke-primary focus-visible:stroke-[1.5px]"
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
          />
        </svg>
      </div>
      {selectedNodes.length > 0 && (
        <div
          data-testid="unocalc-active-panels"
          className={`unocalc-active-panels mx-auto mt-5 flex w-full max-w-[320px] flex-col gap-7 pb-2 min-[900px]:absolute min-[900px]:right-0 min-[900px]:mt-0 min-[900px]:w-[23%] min-[900px]:max-w-[240px] min-[900px]:overflow-y-auto min-[900px]:pr-2 ${selectedNodes.length >= 3 ? "unocalc-active-panels--dense" : ""}`}
        >
          {selectedNodes.map((node) => (
            <div key={node} className="flex min-w-0 flex-col gap-4">
              <NodeDescription node={node} detail={nodeDetails[node]} />
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
                    {ideaSaveStatus === "saved" ? copy.ideaSaved : ideaSaveStatus === "error" ? copy.ideaSaveError : copy.ideaStorageNote}
                  </p>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
      <p className="mt-1 text-center text-[11px] font-light tracking-[0.025em] text-foreground/50">
        {text[locale].hint}
      </p>
    </div>
  );
};

export default UnoEggScene;

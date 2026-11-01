import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import {
  convexOutline,
  eggAxisEndpoints,
  eggEquatorArcs,
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
type InteractiveNode = "retail" | "commerce" | "design" | "production";

// Front elevation: the horizontal diameter has two side nodes, while
// the nearer node of the depth diameter hides the fourth node behind it.
const INITIAL: EggOrientation = { yaw: 0, tilt: 0 };
const SURFACE = eggSurface();

const text = {
  ru: {
    label: "Трёхмерная форма яйца с вертикальной осью. Вращайте жестом или стрелками клавиатуры.",
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
  },
  uk: {
    label: "Тривимірна форма яйця з вертикальною віссю. Обертайте жестом або стрілками клавіатури.",
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
  },
  en: {
    label: "Three-dimensional egg with a vertical axis. Drag or use arrow keys to rotate.",
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

const UnoEggScene = ({ locale }: Props) => {
  const [orientation, setOrientation] = useState<EggOrientation>(INITIAL);
  const [selectedNode, setSelectedNode] = useState<InteractiveNode | null>(null);
  const [typedLength, setTypedLength] = useState(0);
  const pointer = useRef<{ id: number; x: number; y: number; startX: number; startY: number; moved: boolean; targetNode: string | null } | null>(null);
  const copy = text[locale];
  const nodeDetails: Record<InteractiveNode, { title: string; description: string; number: string; openLabel: string; closeLabel: string }> = {
    retail: { title: copy.retail, description: copy.retailDescription, number: copy.node, openLabel: copy.retailLabel, closeLabel: copy.retailCloseLabel },
    commerce: { title: copy.commerce, description: copy.commerceDescription, number: copy.commerceNode, openLabel: copy.commerceLabel, closeLabel: copy.commerceCloseLabel },
    design: { title: copy.design, description: copy.designDescription, number: copy.designNode, openLabel: copy.designLabel, closeLabel: copy.designCloseLabel },
    production: { title: copy.production, description: copy.productionDescription, number: copy.productionNode, openLabel: copy.productionLabel, closeLabel: copy.productionCloseLabel },
  };
  const activeCopy = selectedNode ? nodeDetails[selectedNode] : null;
  const fullCopy = activeCopy ? activeCopy.title + "\n" + activeCopy.description : "";

  useEffect(() => {
    if (!selectedNode) {
      setTypedLength(0);
      return;
    }
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
  }, [selectedNode, fullCopy]);

  const activateNode = (node: InteractiveNode) => {
    // One active sphere at a time; tapping it again removes both the highlight and the note.
    setSelectedNode((current) => current === node ? null : node);
    giveNodeFeedback();
    playNodeClick();
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
    };
  }, [orientation]);

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
       active.targetNode === "design" || active.targetNode === "production")) {
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
          {geometry.sectionNodes.map((node) => {
            const nodeType: InteractiveNode | null =
              node.id === "retail" || node.id === "commerce" || node.id === "design" || node.id === "production"
                ? node.id : null;
            const active = nodeType !== null && selectedNode === nodeType;
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
          {geometry.poleNodes.map((node, index) => (
            <circle
              key={`pole-sphere-${index}`}
              data-testid="unocalc-pole-sphere"
              cx={node.x}
              cy={node.y}
              r="10.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.1"
              strokeOpacity=".72"
              vectorEffect="non-scaling-stroke"
            />
          ))}
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
      {activeCopy && (
        <aside
          data-testid={`unocalc-${selectedNode}-panel`}
          className="mx-auto mt-4 w-full max-w-[320px] min-h-[100px] text-left min-[900px]:absolute min-[900px]:right-0 min-[900px]:top-[43%] min-[900px]:mt-0 min-[900px]:w-[23%] min-[900px]:max-w-[240px]"
          aria-label={activeCopy.title}
        >
          <p className="mb-4 text-[10px] font-light tracking-[0.16em] text-foreground/40 uppercase">{activeCopy.number}</p>
          <h2 className="min-h-[32px] text-[24px] font-extralight leading-tight tracking-[-0.03em] text-foreground/85" aria-hidden="true">
            {fullCopy.slice(0, Math.min(typedLength, activeCopy.title.length))}
          </h2>
          <p className="mt-3 text-[13px] font-light leading-[1.8] tracking-[0.01em] text-foreground/65" aria-hidden="true">
            {fullCopy.slice(activeCopy.title.length + 1, typedLength)}
            {typedLength < fullCopy.length && typedLength > activeCopy.title.length && (
              <span className="unocalc-type-caret" aria-hidden="true">▍</span>
            )}
          </p>
          <span className="sr-only" role="status">{activeCopy.title}. {activeCopy.description}</span>
        </aside>
      )}
      <p className="mt-1 text-center text-[11px] font-light tracking-[0.025em] text-foreground/50">
        {text[locale].hint}
      </p>
    </div>
  );
};

export default UnoEggScene;

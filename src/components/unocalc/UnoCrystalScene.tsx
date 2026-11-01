import { useRef, useState, type PointerEvent } from "react";
import { buildEggOutline } from "@/lib/unocalcEgg";

type Locale = "ru" | "en" | "uk";
type Point3 = [number, number, number];
type NodeId = "retail" | "commerce" | "production" | "design";
type Props = { locale: Locale; dimensions: [string, string, string]; onOpenInputs: () => void };

const labels = {
  ru: {
    title: "Кристалл ресурса", hint: "Вращайте поле жестом или мышью. Выберите узел или центральную форму.",
    cloud: "Ввести параметры", edit: "Изменить параметры", top: "Сверху", bottom: "Снизу", reset: "Исходный вид",
    retail: "ритейл", commerce: "коммерция", production: "производство", design: "дизайн",
    details: {
      retail: "Взаимодействие с конечным пользователем и каналами предложения.",
      commerce: "Организация обмена, коммерческие условия и жизнеспособность модели.",
      production: "Технология, изготовление и практическое воплощение.",
      design: "Замысел, проектирование и качество формообразования.",
    },
    cube: "Габаритный объём в пропорциях введённых размеров. Не чертёж.",
  },
  en: {
    title: "Resource crystal", hint: "Drag to rotate the field. Select a node or the central form.",
    cloud: "Enter dimensions", edit: "Edit dimensions", top: "Top view", bottom: "Bottom view", reset: "Reset view",
    retail: "retail", commerce: "commerce", production: "production", design: "design",
    details: {
      retail: "Contact with the end user and channels of presentation.",
      commerce: "The organization of exchange, commercial conditions and viability.",
      production: "Technology, fabrication and practical execution.",
      design: "Intent, design development and the quality of form.",
    },
    cube: "Bounding volume in the proportions of the entered dimensions. Not a technical drawing.",
  },
  uk: {
    title: "Кристал ресурсу", hint: "Обертайте поле жестом або мишею. Оберіть вузол чи центральну форму.",
    cloud: "Увести параметри", edit: "Змінити параметри", top: "Зверху", bottom: "Знизу", reset: "Початковий вигляд",
    retail: "ритейл", commerce: "комерція", production: "виробництво", design: "дизайн",
    details: {
      retail: "Взаємодія з кінцевим користувачем і каналами пропозиції.",
      commerce: "Організація обміну, комерційні умови та життєздатність моделі.",
      production: "Технологія, виготовлення та практичне втілення.",
      design: "Задум, проєктування та якість формоутворення.",
    },
    cube: "Габаритний об'єм у пропорціях уведених розмірів. Не креслення.",
  },
} as const;

const nodes: { id: NodeId; point: Point3; color: string }[] = [
  { id: "retail", point: [0, 0, 1.18], color: "#c49be2" },
  { id: "commerce", point: [0, 0, -1.18], color: "#e6a1cb" },
  { id: "production", point: [1.18, 0, 0], color: "#e9ba6d" },
  { id: "design", point: [-1.18, 0, 0], color: "#62cbd0" },
];
const top: Point3 = [0, 1.57, 0];
const bottom: Point3 = [0, -1.57, 0];
const initialOrbit = { yaw: 0.28, pitch: 0.56 };
// The shell uses a mathematically constructed asymmetric ovoid, not a
// manually approximated ellipse. Broad pole up; narrow pole down.
const EGG_PATH = buildEggOutline();
type Projected = { x: number; y: number; depth: number };
const project = ([x, y, z]: Point3, yaw: number, pitch: number): Projected => {
  const rx = x * Math.cos(yaw) + z * Math.sin(yaw);
  const rz = z * Math.cos(yaw) - x * Math.sin(yaw);
  return {
    x: 380 + rx * 172,
    y: 343 - (y * Math.cos(pitch) - rz * Math.sin(pitch)) * 172,
    depth: y * Math.sin(pitch) + rz * Math.cos(pitch),
  };
};
const coord = (point: Projected) => point.x.toFixed(2) + "," + point.y.toFixed(2);
const polygon = (points: Projected[]) => points.map(coord).join(" ");

const UnoCrystalScene = ({ locale, dimensions, onOpenInputs }: Props) => {
  const t = labels[locale];
  const [orbit, setOrbit] = useState(initialOrbit);
  const [selected, setSelected] = useState<NodeId | null>(null);
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const p = (point: Point3) => project(point, orbit.yaw, orbit.pitch);
  const topP = p(top);
  const bottomP = p(bottom);
  const projectedNodes = nodes.map((node) => ({ ...node, projected: p(node.point) }));
  const plane = (["commerce", "production", "retail", "design"] as NodeId[]).map((id) =>
    projectedNodes.find((node) => node.id === id)!.projected
  );
  const raw = dimensions.map(Number);
  const valid = dimensions.every((value) => value.trim() !== "") &&
    raw.every((value) => Number.isFinite(value) && value > 0);
  const largest = valid ? Math.max(...raw) : 1;
  // A = x, B = z, C = y; uniform scale preserves all three ratios.
  const hx = valid ? (raw[0] / largest) * 0.55 : 0;
  const hz = valid ? (raw[1] / largest) * 0.55 : 0;
  const hy = valid ? (raw[2] / largest) * 0.55 : 0;
  const vertices: Point3[] = [
    [-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz],
    [-hx, hy, -hz], [hx, hy, -hz], [hx, hy, hz], [-hx, hy, hz],
  ];
  const cubePoints = vertices.map(p);
  const faces = [
    { ids: [0, 1, 5, 4], fill: "#c3e5db" },
    { ids: [1, 2, 6, 5], fill: "#a9d8ce" },
    { ids: [2, 3, 7, 6], fill: "#a4d4c9" },
    { ids: [3, 0, 4, 7], fill: "#cdece3" },
    { ids: [4, 5, 6, 7], fill: "#d6f0e7" },
    { ids: [3, 2, 1, 0], fill: "#b4ded3" },
  ].map((face) => ({
    ...face,
    depth: face.ids.reduce((sum, id) => sum + cubePoints[id].depth, 0) / 4,
  })).sort((a, b) => a.depth - b.depth);

  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const active = pointer.current;
    if (!active || active.id !== event.pointerId) return;
    const dx = event.clientX - active.x;
    const dy = event.clientY - active.y;
    pointer.current = { ...active, x: event.clientX, y: event.clientY };
    setOrbit((current) => ({
      yaw: current.yaw + dx * 0.009,
      pitch: Math.max(-1.5, Math.min(1.5, current.pitch + dy * 0.008)),
    }));
  };
  const stopPointer = (event: PointerEvent<SVGSVGElement>) => {
    if (pointer.current?.id !== event.pointerId) return;
    pointer.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div className="w-full min-w-0 max-w-full">
      <style>{"@keyframes uno-crystal-breathe {0%,100%{opacity:.7;transform:translateY(0px) scale(1)}50%{opacity:.95;transform:translateY(-3px) scale(1.035)}} @media (prefers-reduced-motion:reduce){.uno-crystal-cloud{animation:none!important}}"}</style>
      <div
        data-testid="unocalc-crystal-stage"
        className="relative mx-auto w-full min-w-0"
        style={{
          // The entire six-point field must fit the visible screen, not just
          // the page width. On short/landscape viewports, height is limiting.
          maxWidth: "min(100%, 64vh, 700px)",
        }}
      >
        <svg viewBox="0 0 760 690" className="block h-auto w-full cursor-grab select-none active:cursor-grabbing"
          style={{ touchAction: "none" }} role="img" aria-label={t.title + ". " + t.hint}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove}
          onPointerUp={stopPointer} onPointerCancel={stopPointer}>
          <defs>
            <clipPath id="uno-egg-clip">
              <path d={EGG_PATH} />
            </clipPath>
            <radialGradient id="uno-egg-fill" gradientUnits="userSpaceOnUse"
              cx="264" cy="163" r="520" gradientTransform="translate(0 8) scale(1 1.04)">
              <stop offset="0" stopColor="#f6fffc" stopOpacity=".35" />
              <stop offset=".34" stopColor="#dceee7" stopOpacity=".28" />
              <stop offset=".68" stopColor="#b4d3c8" stopOpacity=".18" />
              <stop offset="1" stopColor="#789f94" stopOpacity=".23" />
            </radialGradient>
            <linearGradient id="uno-egg-side-shadow" x1="105" y1="340" x2="660" y2="340" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#e8fff7" stopOpacity=".25" />
              <stop offset=".24" stopColor="#ffffff" stopOpacity=".04" />
              <stop offset=".59" stopColor="#6f9e91" stopOpacity="0" />
              <stop offset=".85" stopColor="#557f75" stopOpacity=".14" />
              <stop offset="1" stopColor="#3e6b60" stopOpacity=".29" />
            </linearGradient>
            <linearGradient id="uno-egg-lower-shadow" x1="380" y1="300" x2="380" y2="670" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#7eac9d" stopOpacity="0" />
              <stop offset=".58" stopColor="#6b988b" stopOpacity=".045" />
              <stop offset="1" stopColor="#50786d" stopOpacity=".22" />
            </linearGradient>
            <radialGradient id="uno-egg-reflection" gradientUnits="userSpaceOnUse"
              cx="221" cy="168" r="255" gradientTransform="translate(0 50) scale(1 .78)">
              <stop offset="0" stopColor="#ffffff" stopOpacity=".58" />
              <stop offset=".34" stopColor="#f5fffb" stopOpacity=".25" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="uno-egg-rim" x1="110" y1="240" x2="640" y2="420" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#9bbeb2" stopOpacity=".42" />
              <stop offset=".45" stopColor="#789e91" stopOpacity=".18" />
              <stop offset="1" stopColor="#47766a" stopOpacity=".48" />
            </linearGradient>
            <radialGradient id="uno-cloud-fill">
              <stop offset="0" stopColor="#b9e8d0" stopOpacity=".83" />
              <stop offset=".65" stopColor="#c6ead9" stopOpacity=".45" />
              <stop offset="1" stopColor="#c6ead9" stopOpacity="0" />
            </radialGradient>
            <filter id="uno-cloud-blur" x="-30%" y="-60%" width="160%" height="220%">
              <feGaussianBlur stdDeviation="12" />
            </filter>
          </defs>
          {/* Layered, translucent shell: broad upper shoulder, tapered lower end,
              soft specular reflection and gentle right/bottom shadow. */}
          <path d={EGG_PATH} fill="url(#uno-egg-fill)" />
          <g clipPath="url(#uno-egg-clip)" aria-hidden="true">
            <path d={EGG_PATH} fill="url(#uno-egg-side-shadow)" />
            <path d={EGG_PATH} fill="url(#uno-egg-lower-shadow)" />
            <ellipse cx="227" cy="176" rx="200" ry="185" fill="url(#uno-egg-reflection)" />
            <path d="M 157 159 C 101 267 132 392 222 497"
              fill="none" stroke="#f9fffd" strokeWidth="18" strokeOpacity=".11"
              strokeLinecap="round" />
            <path d="M 593 156 C 653 260 633 386 548 497"
              fill="none" stroke="#4b786d" strokeWidth="12" strokeOpacity=".08"
              strokeLinecap="round" />
          </g>
          <path d={EGG_PATH} fill="none" stroke="url(#uno-egg-rim)" strokeWidth="1.65" />
          <path d="M 115 274 C 189 213 568 208 645 274" fill="none"
            stroke="#799d91" strokeOpacity=".13" strokeDasharray="5 9" />
          <path d="M 136 399 C 232 487 527 486 624 399" fill="none"
            stroke="#799d91" strokeOpacity=".11" strokeDasharray="5 9" />
          <path d="M 380 44 C 307 160 305 516 380 649" fill="none"
            stroke="#819b91" strokeOpacity=".09" strokeDasharray="4 9" />
          <path d="M 380 44 C 453 160 455 516 380 649" fill="none"
            stroke="#819b91" strokeOpacity=".09" strokeDasharray="4 9" />
          <line x1={topP.x} y1={topP.y} x2={bottomP.x} y2={bottomP.y}
            stroke="#3e5b54" strokeWidth="1.15" strokeOpacity=".38" strokeDasharray="7 10" />
          {projectedNodes.filter((node) => node.projected.depth < 0).map((node) => (
            <g key={"back-" + node.id}>
              <line x1={topP.x} y1={topP.y} x2={node.projected.x} y2={node.projected.y}
                stroke="#3d5953" strokeWidth="1" strokeOpacity=".3" strokeDasharray="6 8" />
              <line x1={bottomP.x} y1={bottomP.y} x2={node.projected.x} y2={node.projected.y}
                stroke="#3d5953" strokeWidth="1" strokeOpacity=".3" strokeDasharray="6 8" />
            </g>
          ))}
          <polygon points={polygon(plane)} fill="#bcebd0" fillOpacity=".43"
            stroke="#5e8e7b" strokeWidth="1.4" strokeOpacity=".62" />
          <path d={"M " + coord(plane[0]) + " L " + coord(plane[2])}
            fill="none" stroke="#4f7e70" strokeOpacity=".26" strokeDasharray="7 8" />
          <path d={"M " + coord(plane[1]) + " L " + coord(plane[3])}
            fill="none" stroke="#4f7e70" strokeOpacity=".26" strokeDasharray="7 8" />
          <g className="uno-crystal-cloud"
            style={{ transformOrigin: "380px 343px", animation: "uno-crystal-breathe 7s ease-in-out infinite" }}>
            <ellipse cx="380" cy="343" rx="139" ry="84" fill="url(#uno-cloud-fill)" filter="url(#uno-cloud-blur)" />
            <ellipse cx="380" cy="343" rx="97" ry="56" fill="url(#uno-cloud-fill)" opacity=".65" />
            <ellipse cx="332" cy="339" rx="47" ry="49" fill="url(#uno-cloud-fill)" opacity=".65" />
            <ellipse cx="427" cy="323" rx="53" ry="40" fill="url(#uno-cloud-fill)" opacity=".52" />
            <ellipse cx="393" cy="366" rx="67" ry="34" fill="url(#uno-cloud-fill)" opacity=".5" />
          </g>
          {valid && (
            <g aria-label={t.cube}>
              {faces.map((face, index) => (
                <polygon key={index} points={polygon(face.ids.map((id) => cubePoints[id]))}
                  fill={face.fill} fillOpacity=".32" stroke="#316e62" strokeOpacity=".59" strokeWidth="1.25" />
              ))}
            </g>
          )}
          {projectedNodes.filter((node) => node.projected.depth >= 0).map((node) => (
            <g key={"front-" + node.id}>
              <line x1={topP.x} y1={topP.y} x2={node.projected.x} y2={node.projected.y}
                stroke="#38574e" strokeWidth="1.25" strokeOpacity=".58" />
              <line x1={bottomP.x} y1={bottomP.y} x2={node.projected.x} y2={node.projected.y}
                stroke="#38574e" strokeWidth="1.25" strokeOpacity=".58" />
            </g>
          ))}
          <circle cx={topP.x} cy={topP.y} r="18" fill="#47b9df" fillOpacity=".74" />
          <circle cx={topP.x} cy={topP.y} r="4" fill="#244b58" fillOpacity=".65" />
          <circle cx={bottomP.x} cy={bottomP.y} r="18" fill="#f0aa86" fillOpacity=".7" />
          <circle cx={bottomP.x} cy={bottomP.y} r="4" fill="#785b4a" fillOpacity=".65" />
        </svg>
        <div className="pointer-events-none absolute inset-0">
          {projectedNodes.map((node) => (
            <button key={node.id} type="button" title={t[node.id]}
              aria-label={t[node.id]} aria-pressed={selected === node.id}
              onClick={() => setSelected((current) => current === node.id ? null : node.id)}
              className="pointer-events-auto absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
              style={{ left: (node.projected.x / 760 * 100) + "%", top: (node.projected.y / 690 * 100) + "%" }}>
              <span className="absolute h-8 w-8 rounded-full border border-black/15 transition-transform duration-200 hover:scale-110"
                style={{ backgroundColor: node.color, opacity: selected === node.id ? 1 : .78 }} />
              <span className="relative h-2 w-2 rounded-full bg-foreground/60" />
              <span className="pointer-events-none absolute top-[38px] whitespace-nowrap rounded-sm bg-background/75 px-1.5 py-0.5 text-[10px] tracking-[0.02em] text-foreground/80 sm:text-[12px]">
                {t[node.id]}
              </span>
            </button>
          ))}
          <button type="button" onClick={onOpenInputs} aria-label={valid ? t.edit : t.cloud}
            className="pointer-events-auto absolute left-1/2 top-[49.7%] flex h-[13%] w-[26%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[50%] text-[11px] text-foreground/85 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground/50 sm:text-[13px]">
            <span className={valid
              ? "absolute top-[112%] whitespace-nowrap rounded-full border border-foreground/20 bg-background/80 px-3 py-1.5 shadow-sm backdrop-blur-sm"
              : "rounded-full border border-foreground/20 bg-background/70 px-3 py-1.5 shadow-sm backdrop-blur-sm"}>
              {valid ? t.edit : t.cloud} <span aria-hidden="true">+</span>
            </span>
          </button>
        </div>
      </div>
      <div className="mx-auto flex max-w-[760px] flex-wrap items-center justify-between gap-3 border-t border-foreground/15 pt-3">
        <p className="max-w-[390px] text-[11px] font-light leading-[1.6] text-foreground/65">
          {selected ? t.details[selected] : valid ? t.cube : t.hint}
        </p>
        <div className="flex shrink-0 flex-wrap gap-3">
          <button type="button" onClick={() => setOrbit({ yaw: orbit.yaw, pitch: 1.48 })}
            className="border-b border-foreground/25 py-1 text-[11px] text-foreground/75 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-foreground">{t.top}</button>
          <button type="button" onClick={() => setOrbit({ yaw: orbit.yaw, pitch: -1.48 })}
            className="border-b border-foreground/25 py-1 text-[11px] text-foreground/75 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-foreground">{t.bottom}</button>
          <button type="button" onClick={() => setOrbit(initialOrbit)}
            className="border-b border-foreground/25 py-1 text-[11px] text-foreground/75 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-foreground">{t.reset}</button>
        </div>
      </div>
    </div>
  );
};

export default UnoCrystalScene;

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sketchStore = vi.hoisted(() => ({
  items: [] as Array<{ id: string; name: string; blob: Blob; createdAt: number }>,
}));
vi.mock("@/lib/unocalcSketches", () => ({
  listSketches: async () => [...sketchStore.items],
  storeSketch: async (sketch: (typeof sketchStore.items)[number]) => { sketchStore.items.push(sketch); },
  removeStoredSketch: async (id: string) => {
    sketchStore.items = sketchStore.items.filter((item) => item.id !== id);
  },
}));
import UnoEggScene from "@/components/unocalc/UnoEggScene";
import { EGG_BOTTOM, EGG_TOP, EGG_EQUATOR, LOWER_SPHERE_SECTION_Y, LOWER_SPHERE_Y, eggLowerSphereNodes, visibleEggLowerSphereNodes, eggLowerRingArcs, eggRadiusAtSection, eggPoleNodes, eggSectionAxes, visibleEggSectionNodes, eggSurface, projectEggPoint, convexOutline } from "@/lib/unocalcEgg3d";

describe("UNOcalc egg-only geometry", () => {
  beforeEach(() => {
    window.localStorage.removeItem("unocalc.idea.v1");
    window.localStorage.removeItem("unocalc.design.v1");
    sketchStore.items = [];
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:unocalc-test") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
  });
  const withExistingSketch = () => {
    window.localStorage.setItem("unocalc.idea.v1", "Кресло для чтения");
    sketchStore.items.push({ id: "initial-sketch", name: "draft.png", blob: new Blob(["image"], { type: "image/png" }), createdAt: 1 });
  };
  const waitForUnlockedNodes = async () => {
    await waitFor(() => expect(screen.getByTestId("unocalc-retail-hit")).toHaveAttribute("aria-disabled", "false"));
  };
  it("builds a closed 3D ovoid of revolution with a narrow upper pole and broad lower pole", () => {
    expect(eggRadiusAtSection(-1)).toBe(0);
    expect(eggRadiusAtSection(0)).toBe(1);
    expect(eggRadiusAtSection(Math.SQRT2)).toBeCloseTo(Math.SQRT2 - 1, 8);
    expect(eggRadiusAtSection(3 - Math.SQRT2)).toBeCloseTo(0, 8);
    expect(EGG_TOP).toBeGreaterThan(0);
    expect(EGG_BOTTOM).toBeLessThan(0);
    expect(EGG_EQUATOR).toBeLessThan(0);
    const surface = eggSurface(24, 16);
    expect(surface).toHaveLength(25 * 16);
    const hull = convexOutline(surface.map(p => projectEggPoint(p, { yaw: 0, tilt: 0.22 })));
    expect(hull.length).toBeGreaterThan(20);
  });

  it("opens in front elevation with three visible contour spheres and a hidden rear sphere", () => {
    render(<UnoEggScene locale="ru" />);
    const outline = screen.getByTestId("unocalc-egg-outline");
    const axis = screen.getByTestId("unocalc-egg-axis");
    expect(outline).toHaveAttribute("fill", "none");
    expect(outline).toHaveAttribute("stroke-width", ".95");
    expect(axis).toHaveAttribute("stroke-dasharray", "4 9");
    expect(axis).toHaveAttribute("stroke-width", ".65");
    expect(axis).toHaveAttribute("stroke-opacity", ".14");
    const spheres = screen.getAllByTestId("unocalc-section-sphere");
    expect(spheres).toHaveLength(3);
    spheres.forEach((sphere) => expect(sphere).toHaveAttribute("fill", "none"));
    expect(screen.getAllByTestId("unocalc-section-axis")).toHaveLength(2);
    screen.getAllByTestId("unocalc-section-axis").forEach((line) => {
      expect(line).toHaveAttribute("stroke-width", ".65");
      expect(line).toHaveAttribute("stroke-opacity", ".10");
      expect(line).toHaveAttribute("stroke-dasharray", "4 9");
    });
    const core = screen.getByTestId("unocalc-core-sphere");
    expect(core).toHaveAttribute("cx", "380");
    expect(Number(core.getAttribute("cy"))).toBeCloseTo(350 - 212 * EGG_EQUATOR, 6);
    expect(core).toHaveAttribute("r", "45");
    expect(core).toHaveAttribute("stroke-opacity", ".43");
    expect(core).toHaveAttribute("pointer-events", "none");
    expect(core).toHaveAttribute("aria-label", "Центральная сфера — формируемый объект");
    const poles = screen.getAllByTestId("unocalc-pole-sphere");
    expect(poles).toHaveLength(2);
    poles.forEach((sphere) => {
      expect(sphere).toHaveAttribute("fill", "none");
      expect(sphere.getAttribute("cx")).toBe("380");
    });
    expect(screen.getAllByTestId("unocalc-section-sphere")).toHaveLength(3);
    const functionalSpheres = [...spheres, ...poles, ...screen.getAllByTestId("unocalc-lower-sphere")];
    expect(functionalSpheres).toHaveLength(7);
    functionalSpheres.forEach((sphere) => {
      expect(sphere).toHaveAttribute("r", "10.5");
      expect(sphere).toHaveAttribute("stroke-width", "1.1");
      expect(sphere).toHaveAttribute("stroke-opacity", "0.72");
      expect(sphere).toHaveAttribute("stroke", "currentColor");
    });
    const xs = spheres.map((sphere) => Number(sphere.getAttribute("cx"))).sort((a, b) => a - b);
    expect(xs).toEqual([168, 380, 592]);
    const ys = spheres.map((sphere) => Number(sphere.getAttribute("cy")));
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(0, 5);
    expect(screen.getByRole("button", { name: "Ритейл — Доступно после первого эскиза" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Дизайн — Сначала опишите идею" })).toHaveAttribute("cx", "168");
    expect(screen.getByRole("button", { name: "Производство — Доступно после первого эскиза" })).toHaveAttribute("cx", "592");
    expect(screen.getByRole("button", { name: "Открыть описание полюса «Идея»" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Материя — Доступно после первого эскиза" })).toHaveAttribute("aria-disabled", "true");
  });

  it("places two nodes at the sides and two in depth, with the rear node occluded in front view", () => {
    const front = eggSectionAxes({ yaw: 0, tilt: 0 });
    expect(front).toHaveLength(2);
    expect(front[0].nodes.map((p) => p.x)).toEqual([168, 592]);
    expect(front[0].nodes.map((p) => p.id)).toEqual(["design", "production"]);
    expect(front[1].nodes.every((p) => Math.abs(p.x - 380) < 0.001)).toBe(true);
    expect(front[1].nodes[0].y).toBeCloseTo(front[1].nodes[1].y, 6);
    expect(front[1].nodes[0].depth).toBeLessThan(front[1].nodes[1].depth);
    expect(visibleEggSectionNodes(front)).toHaveLength(3);
    expect(visibleEggSectionNodes(front).map((node) => node.id)).toContain("retail");
    expect(visibleEggSectionNodes(front).map((node) => node.id)).not.toContain("commerce");
    const opposite = visibleEggSectionNodes(eggSectionAxes({ yaw: Math.PI, tilt: 0 }));
    expect(opposite.map((node) => node.id)).toContain("commerce");
    expect(opposite.map((node) => node.id)).not.toContain("retail");

    const tilted = eggSectionAxes({ yaw: 0, tilt: 0.2 });
    expect(visibleEggSectionNodes(tilted)).toHaveLength(4);
    const projectedCenter = 350 - 212 * EGG_EQUATOR * Math.cos(0.2);
    expect(tilted[1].nodes[0].y).toBeLessThan(projectedCenter);
    expect(tilted[1].nodes[1].y).toBeGreaterThan(projectedCenter);
  });

  it("positions all four lower spheres between their designated principal nodes", () => {
    const orientation = { yaw: 0, tilt: 0 };
    const lower = eggLowerSphereNodes(orientation);
    expect(lower).toHaveLength(4);
    expect(lower.map((node) => node.id)).toEqual(["support-1", "support-2", "support-3", "support-4"]);
    expect(lower.map((node) => node.number)).toEqual([5, 6, 7, 8]);
    expect(LOWER_SPHERE_Y).toBeLessThan(EGG_EQUATOR);
    const radius = eggRadiusAtSection(LOWER_SPHERE_SECTION_Y);
    lower.forEach((node, index) => {
      expect(node.angle).toBeCloseTo(Math.PI / 4 + index * Math.PI / 2, 8);
      expect(Math.hypot((node.x - 380) / 212, node.depth)).toBeCloseTo(radius, 8);
      expect(node.y).toBeCloseTo(350 - 212 * LOWER_SPHERE_Y, 8);
    });
    expect(visibleEggLowerSphereNodes(orientation)).toHaveLength(2);
    expect(visibleEggLowerSphereNodes({ yaw: 0, tilt: 0.2 })).toHaveLength(4);
    expect(eggLowerRingArcs(orientation).front).toContain("M ");

    const { rerender } = render(<UnoEggScene locale="ru" />);
    expect(screen.getAllByTestId("unocalc-lower-sphere")).toHaveLength(2);
    expect(screen.getAllByTestId("unocalc-lower-sphere").every((node) => node.getAttribute("pointer-events") === "none")).toBe(true);
    screen.getAllByTestId("unocalc-lower-sphere").forEach((circle) => {
      expect(circle).toHaveAttribute("fill", "none");
      expect(circle).toHaveAttribute("stroke-width", "1.1");
      expect(circle).toHaveAttribute("stroke-opacity", "0.72");
    });
    expect(screen.getAllByTestId("unocalc-lower-sphere-node").every((group) => group.querySelector("text") === null)).toBe(true);
    expect(screen.queryByTestId("unocalc-lower-ring-hint")).not.toBeInTheDocument();
    expect(screen.queryByText("Идея → Дизайн → Эскиз → Производство / Коммерция / Ритейл / Материя")).not.toBeInTheDocument();
    expect(screen.getByTestId("unocalc-rotation-hint")).toHaveTextContent("Вращайте форму жестом, мышью или стрелками");
    expect(screen.getAllByTestId("unocalc-lower-sphere").find((node) => node.getAttribute("data-node-id") === "support-1"))
      .toHaveAttribute("data-node-role", "testDrive");
    expect(screen.getAllByTestId("unocalc-lower-sphere").find((node) => node.getAttribute("data-node-id") === "support-2"))
      .toHaveAttribute("data-node-role", "marketing");
    expect(screen.getAllByRole("button")).toHaveLength(7);
    const svg = screen.getByTestId("unocalc-egg-svg");
    fireEvent.keyDown(svg, { key: "ArrowDown" });
    expect(screen.getAllByTestId("unocalc-lower-sphere")).toHaveLength(4);
    expect(screen.getAllByTestId("unocalc-lower-sphere-node").every((group) => group.querySelector("text") === null)).toBe(true);
    expect(screen.getAllByTestId("unocalc-lower-sphere").find((node) => node.getAttribute("data-node-id") === "support-3"))
      .toHaveAttribute("data-node-role", "procurement");
    expect(screen.getAllByTestId("unocalc-lower-sphere").find((node) => node.getAttribute("data-node-id") === "support-4"))
      .toHaveAttribute("data-node-role", "legal");
    expect(screen.getByTestId("unocalc-procurement-hit")).toHaveAttribute("aria-label", "Открыть описание узла «Комплектация»");
    expect(screen.getByTestId("unocalc-legal-hit")).toHaveAttribute("aria-label", "Открыть описание узла «Право»");
    expect(screen.getAllByRole("button")).toHaveLength(10);
    expect(screen.queryByTestId("unocalc-active-panels")).not.toBeInTheDocument();
    rerender(<UnoEggScene locale="uk" />);
    expect(screen.getByTestId("unocalc-rotation-hint")).toHaveTextContent("Обертайте форму жестом, мишею або стрілками");
    rerender(<UnoEggScene locale="en" />);
    expect(screen.getByTestId("unocalc-rotation-hint")).toHaveTextContent("Drag or use arrow keys to rotate");
  });

  it("uses identical contours for all visible functional spheres after tilting and when selected", () => {
    render(<UnoEggScene locale="ru" />);
    const svg = screen.getByTestId("unocalc-egg-svg");
    fireEvent.keyDown(svg, { key: "ArrowDown" });
    const groups = [
      ...screen.getAllByTestId("unocalc-section-sphere"),
      ...screen.getAllByTestId("unocalc-lower-sphere"),
      ...screen.getAllByTestId("unocalc-pole-sphere"),
    ];
    expect(groups).toHaveLength(10);
    groups.forEach((sphere) => {
      expect(sphere).toHaveAttribute("r", "10.5");
      expect(sphere).toHaveAttribute("stroke-width", "1.1");
      expect(sphere).toHaveAttribute("stroke-opacity", "0.72");
      expect(sphere).toHaveAttribute("stroke", "currentColor");
    });
    fireEvent.keyDown(screen.getByTestId("unocalc-marketing-hit"), { key: "Enter" });
    const selected = screen.getAllByTestId("unocalc-lower-sphere").find((sphere) => sphere.getAttribute("data-node-role") === "marketing");
    expect(selected).toHaveAttribute("stroke-opacity", "0.85");
    expect(selected).toHaveAttribute("stroke", "hsl(var(--primary))");
    expect(selected).toHaveAttribute("stroke-width", "1.1");
  });

  it("opens Marketing on tap before an idea or sketch, and closes it on a second tap", () => {
    render(<UnoEggScene locale="ru" />);
    const hit = screen.getByTestId("unocalc-marketing-hit");
    const svg = screen.getByTestId("unocalc-egg-svg");
    expect(hit).toHaveAttribute("aria-label", "Открыть описание узла «Маркетинг»");
    expect(hit).toHaveAttribute("aria-pressed", "false");
    expect(hit).toHaveAttribute("tabindex", "0");
    expect(hit).not.toHaveAttribute("aria-disabled", "true");
    expect(screen.queryByTestId("unocalc-marketing-panel")).not.toBeInTheDocument();

    fireEvent.pointerDown(hit, { pointerId: 70, clientX: 240, clientY: 430 });
    fireEvent.pointerUp(svg, { pointerId: 70, clientX: 240, clientY: 430 });
    expect(screen.getByTestId("unocalc-marketing-panel")).toHaveAttribute("aria-label", "Маркетинг");
    expect(screen.getByTestId("unocalc-marketing-panel")).toHaveTextContent("Узел / 06");
    expect(screen.queryByTestId("unocalc-marketing-tooltip")).not.toBeInTheDocument();
    expect(hit).toHaveAttribute("aria-pressed", "true");
    expect(hit).toHaveAttribute("aria-label", "Закрыть описание узла «Маркетинг»");

    fireEvent.pointerDown(hit, { pointerId: 71, clientX: 240, clientY: 430 });
    fireEvent.pointerUp(svg, { pointerId: 71, clientX: 240, clientY: 430 });
    expect(screen.queryByTestId("unocalc-marketing-panel")).not.toBeInTheDocument();
    expect(hit).toHaveAttribute("aria-pressed", "false");
  });

  it("opens Test drive 05 independently of Marketing, without a sketch or floating tooltip", () => {
    render(<UnoEggScene locale="ru" />);
    const hit = screen.getByTestId("unocalc-test-drive-hit");
    const marketing = screen.getByTestId("unocalc-marketing-hit");
    const svg = screen.getByTestId("unocalc-egg-svg");
    expect(hit).toHaveAttribute("aria-label", "Открыть описание узла «Тест-драйв»");
    expect(hit).toHaveAttribute("aria-pressed", "false");
    expect(hit).toHaveAttribute("tabindex", "0");
    expect(screen.queryByTestId("unocalc-testDrive-panel")).not.toBeInTheDocument();
    fireEvent.pointerDown(hit, { pointerId: 81, clientX: 240, clientY: 430 });
    fireEvent.pointerUp(svg, { pointerId: 81, clientX: 240, clientY: 430 });
    expect(screen.getByTestId("unocalc-testDrive-panel")).toHaveAttribute("aria-label", "Тест-драйв");
    expect(screen.getByTestId("unocalc-testDrive-panel")).toHaveTextContent("Узел / 05");
    expect(hit).toHaveAttribute("aria-pressed", "true");
    expect(marketing).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByTestId("unocalc-marketing-tooltip")).not.toBeInTheDocument();
    expect(screen.queryByTestId("unocalc-test-drive-tooltip")).not.toBeInTheDocument();
    fireEvent.pointerDown(hit, { pointerId: 82, clientX: 240, clientY: 430 });
    fireEvent.pointerUp(svg, { pointerId: 82, clientX: 240, clientY: 430 });
    expect(screen.queryByTestId("unocalc-testDrive-panel")).not.toBeInTheDocument();
    fireEvent.keyDown(hit, { key: "Enter" });
    expect(screen.getByTestId("unocalc-testDrive-panel")).toBeInTheDocument();
  });

  it("does not select Test drive during a drag, and localizes its panel", () => {
    const { rerender } = render(<UnoEggScene locale="ru" />);
    const hit = screen.getByTestId("unocalc-test-drive-hit");
    const svg = screen.getByTestId("unocalc-egg-svg");
    fireEvent.pointerDown(hit, { pointerId: 83, clientX: 240, clientY: 430 });
    fireEvent.pointerMove(svg, { pointerId: 83, clientX: 270, clientY: 430 });
    fireEvent.pointerUp(svg, { pointerId: 83, clientX: 270, clientY: 430 });
    expect(screen.queryByTestId("unocalc-testDrive-panel")).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByTestId("unocalc-test-drive-hit"), { key: " " });
    expect(screen.getByTestId("unocalc-testDrive-panel")).toHaveAttribute("aria-label", "Тест-драйв");
    rerender(<UnoEggScene locale="en" />);
    expect(screen.getByTestId("unocalc-testDrive-panel")).toHaveAttribute("aria-label", "Test drive");
  });

  it("opens Procurement 07 and Legal 08 independently with no idea, sketch or floating tooltip", () => {
    render(<UnoEggScene locale="ru" />);
    const svg = screen.getByTestId("unocalc-egg-svg");
    fireEvent.keyDown(svg, { key: "ArrowDown" });
    const procurement = screen.getByTestId("unocalc-procurement-hit");
    const legal = screen.getByTestId("unocalc-legal-hit");
    expect(procurement).toHaveAttribute("aria-pressed", "false");
    expect(legal).toHaveAttribute("aria-pressed", "false");
    expect(procurement).toHaveAttribute("tabindex", "0");
    expect(legal).toHaveAttribute("tabindex", "0");

    fireEvent.pointerDown(procurement, { pointerId: 90, clientX: 260, clientY: 430 });
    fireEvent.pointerUp(svg, { pointerId: 90, clientX: 260, clientY: 430 });
    expect(screen.getByTestId("unocalc-procurement-panel")).toHaveAttribute("aria-label", "Комплектация");
    expect(screen.getByTestId("unocalc-procurement-panel")).toHaveTextContent("Узел / 07");
    expect(procurement).toHaveAttribute("aria-pressed", "true");
    expect(legal).toHaveAttribute("aria-pressed", "false");

    fireEvent.keyDown(legal, { key: "Enter" });
    expect(screen.getByTestId("unocalc-legal-panel")).toHaveAttribute("aria-label", "Право");
    expect(screen.getByTestId("unocalc-legal-panel")).toHaveTextContent("Узел / 08");
    expect(screen.getByTestId("unocalc-procurement-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("unocalc-procurement-tooltip")).not.toBeInTheDocument();
    expect(screen.queryByTestId("unocalc-legal-tooltip")).not.toBeInTheDocument();

    fireEvent.pointerDown(procurement, { pointerId: 91, clientX: 260, clientY: 430 });
    fireEvent.pointerUp(svg, { pointerId: 91, clientX: 260, clientY: 430 });
    expect(screen.queryByTestId("unocalc-procurement-panel")).not.toBeInTheDocument();
    expect(screen.getByTestId("unocalc-legal-panel")).toBeInTheDocument();
    fireEvent.keyDown(legal, { key: " " });
    expect(screen.queryByTestId("unocalc-legal-panel")).not.toBeInTheDocument();
  });

  it("localizes Procurement and Legal, and dragging their spheres does not open panels", () => {
    const { rerender } = render(<UnoEggScene locale="ru" />);
    const svg = screen.getByTestId("unocalc-egg-svg");
    fireEvent.keyDown(svg, { key: "ArrowDown" });
    const legal = screen.getByTestId("unocalc-legal-hit");
    fireEvent.pointerDown(legal, { pointerId: 92, clientX: 260, clientY: 430 });
    fireEvent.pointerMove(svg, { pointerId: 92, clientX: 290, clientY: 430 });
    fireEvent.pointerUp(svg, { pointerId: 92, clientX: 290, clientY: 430 });
    expect(screen.queryByTestId("unocalc-legal-panel")).not.toBeInTheDocument();
    fireEvent.keyDown(svg, { key: "Home" });
    fireEvent.keyDown(svg, { key: "ArrowDown" });
    fireEvent.keyDown(screen.getByTestId("unocalc-procurement-hit"), { key: "Enter" });
    fireEvent.keyDown(screen.getByTestId("unocalc-legal-hit"), { key: "Enter" });
    rerender(<UnoEggScene locale="uk" />);
    expect(screen.getByTestId("unocalc-procurement-panel")).toHaveAttribute("aria-label", "Комплектація");
    expect(screen.getByTestId("unocalc-legal-panel")).toHaveAttribute("aria-label", "Право");
    rerender(<UnoEggScene locale="en" />);
    expect(screen.getByTestId("unocalc-procurement-panel")).toHaveAttribute("aria-label", "Procurement");
    expect(screen.getByTestId("unocalc-legal-panel")).toHaveAttribute("aria-label", "Legal");
  });

  it("keeps the view clear on hover and focus while allowing keyboard activation", () => {
    const { rerender } = render(<UnoEggScene locale="ru" />);
    const hit = screen.getByTestId("unocalc-marketing-hit");
    fireEvent.pointerEnter(hit);
    fireEvent.focus(hit);
    expect(screen.queryByTestId("unocalc-marketing-tooltip")).not.toBeInTheDocument();
    fireEvent.keyDown(hit, { key: "Enter" });
    expect(screen.getByTestId("unocalc-marketing-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("unocalc-marketing-tooltip")).not.toBeInTheDocument();
    rerender(<UnoEggScene locale="en" />);
    expect(screen.getByTestId("unocalc-marketing-panel")).toHaveAttribute("aria-label", "Marketing");
  });

  it("does not select Marketing when dragging its sphere to rotate the egg", () => {
    render(<UnoEggScene locale="ru" />);
    const hit = screen.getByTestId("unocalc-marketing-hit");
    const svg = screen.getByTestId("unocalc-egg-svg");
    fireEvent.pointerDown(hit, { pointerId: 80, clientX: 240, clientY: 430 });
    fireEvent.pointerMove(svg, { pointerId: 80, clientX: 270, clientY: 430 });
    fireEvent.pointerUp(svg, { pointerId: 80, clientX: 270, clientY: 430 });
    expect(screen.queryByTestId("unocalc-marketing-panel")).not.toBeInTheDocument();
  });

  it("spins horizontally around the upright axis, tilts vertically and resets", () => {
    render(<UnoEggScene locale="ru" />);
    const svg = screen.getByTestId("unocalc-egg-svg");
    const axis = screen.getByTestId("unocalc-egg-axis");
    const initialAxisX = axis.getAttribute("x1");
    const initialAxisY = axis.getAttribute("y1");
    const firstSideSphere = screen.getAllByTestId("unocalc-section-sphere")[0];
    const initialSphereX = firstSideSphere.getAttribute("cx");
    const core = screen.getByTestId("unocalc-core-sphere");
    const initialCoreX = core.getAttribute("cx");
    const initialCoreY = core.getAttribute("cy");
    fireEvent.keyDown(svg, { key: "ArrowRight" });
    expect(axis.getAttribute("x1")).toBe(initialAxisX);
    expect(axis.getAttribute("y1")).toBe(initialAxisY);
    expect(firstSideSphere.getAttribute("cx")).not.toBe(initialSphereX);
    fireEvent.keyDown(svg, { key: "ArrowDown" });
    expect(axis.getAttribute("y1")).not.toBe(initialAxisY);
    expect(screen.getAllByTestId("unocalc-section-sphere")).toHaveLength(4);
    expect(core).toHaveAttribute("cx", initialCoreX);
    expect(core).toHaveAttribute("cy", initialCoreY);
    fireEvent.keyDown(svg, { key: "Home" });
    expect(axis.getAttribute("y1")).toBe(initialAxisY);
    expect(screen.getAllByTestId("unocalc-section-sphere")).toHaveLength(3);
  });

  it("keeps the yolk-like core separate from interactive nodes and preserves locale labels", () => {
    const { rerender } = render(<UnoEggScene locale="ru" />);
    const core = screen.getByTestId("unocalc-core-sphere");
    expect(core).not.toHaveAttribute("role", "button");
    expect(screen.getAllByRole("button")).toHaveLength(7);
    expect(screen.queryByTestId("unocalc-active-panels")).not.toBeInTheDocument();
    rerender(<UnoEggScene locale="uk" />);
    expect(core).toHaveAttribute("aria-label", "Центральна сфера — об’єкт, що формується");
    rerender(<UnoEggScene locale="en" />);
    expect(core).toHaveAttribute("aria-label", "Central sphere — the object taking form");
  });

  it("lets the Idea pole edit a local idea and previews a changing field without deforming the core", () => {
    const { unmount } = render(<UnoEggScene locale="ru" />);
    const idea = screen.getByTestId("unocalc-idea-hit");
    expect(screen.queryByTestId("unocalc-idea-editor")).not.toBeInTheDocument();
    expect(screen.queryByTestId("unocalc-idea-field")).not.toBeInTheDocument();
    fireEvent.keyDown(idea, { key: "Enter" });
    const input = screen.getByRole("textbox", { name: "Описание идеи" });
    const core = screen.getByTestId("unocalc-core-sphere");
    const initialCore = { x: core.getAttribute("cx"), y: core.getAttribute("cy"), r: core.getAttribute("r") };
    fireEvent.change(input, { target: { value: "Кресло для чтения из гибких материалов" } });
    const field = screen.getByTestId("unocalc-idea-field");
    expect(field.querySelectorAll("ellipse")).toHaveLength(4);
    const signature = field.getAttribute("data-field-signature");
    fireEvent.change(input, { target: { value: "Светильник для чтения из гибких материалов" } });
    expect(field.getAttribute("data-field-signature")).not.toBe(signature);
    expect(core).toHaveAttribute("cx", initialCore.x);
    expect(core).toHaveAttribute("cy", initialCore.y);
    expect(core).toHaveAttribute("r", initialCore.r);
    expect(window.localStorage.getItem("unocalc.idea.v1")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Сохранить идею" }));
    expect(window.localStorage.getItem("unocalc.idea.v1")).toBe("Светильник для чтения из гибких материалов");
    expect(screen.getByTestId("unocalc-idea-editor").querySelector('[role="status"]')).toHaveTextContent("Идея сохранена в этом браузере.");
    expect(screen.getByTestId("unocalc-design-workspace")).toBeInTheDocument();
    expect(screen.getByTestId("unocalc-brief-concept")).toHaveValue("Светильник для чтения из гибких материалов");
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
    unmount();
    render(<UnoEggScene locale="ru" />);
    expect(screen.getByTestId("unocalc-idea-field")).toBeInTheDocument();
    expect(screen.queryByTestId("unocalc-design-workspace")).not.toBeInTheDocument();
    expect(screen.getByTestId("unocalc-continue-design")).toHaveTextContent("Продолжить → Дизайн");
    fireEvent.click(screen.getByTestId("unocalc-continue-design"));
    expect(screen.getByTestId("unocalc-design-workspace")).toBeInTheDocument();
    fireEvent.keyDown(screen.getByTestId("unocalc-idea-hit"), { key: "Enter" });
    expect(screen.getByRole("textbox", { name: "Описание идеи" })).toHaveValue("Светильник для чтения из гибких материалов");
  });

  it("does not advance with an empty idea, and exposes a direct Design action while typing", () => {
    render(<UnoEggScene locale="ru" />);
    expect(screen.queryByTestId("unocalc-continue-design")).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByTestId("unocalc-idea-hit"), { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить идею" }));
    expect(screen.getByTestId("unocalc-idea-editor")).toHaveTextContent("Введите описание идеи");
    expect(screen.queryByTestId("unocalc-design-workspace")).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Описание идеи" }), {
      target: { value: "Новая настольная лампа" },
    });
    expect(screen.getByTestId("unocalc-continue-design")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("unocalc-continue-design"));
    expect(window.localStorage.getItem("unocalc.idea.v1")).toBe("Новая настольная лампа");
    expect(screen.getByTestId("unocalc-design-workspace")).toBeInTheDocument();
    expect(screen.getByTestId("unocalc-brief-concept")).toHaveValue("Новая настольная лампа");
  });

  it("unlocks Design after the idea, builds an editable brief, and unlocks other nodes only after a sketch", async () => {
    render(<UnoEggScene locale="ru" />);
    const design = screen.getByTestId("unocalc-design-hit");
    const retail = screen.getByTestId("unocalc-retail-hit");
    expect(design).toHaveAttribute("aria-disabled", "true");
    expect(retail).toHaveAttribute("aria-disabled", "true");
    fireEvent.keyDown(design, { key: "Enter" });
    expect(screen.queryByTestId("unocalc-design-workspace")).not.toBeInTheDocument();

    fireEvent.keyDown(screen.getByTestId("unocalc-idea-hit"), { key: "Enter" });
    fireEvent.change(screen.getByRole("textbox", { name: "Описание идеи" }), {
      target: { value: "Кресло для чтения с мягким силуэтом" },
    });
    expect(design).toHaveAttribute("aria-disabled", "false");
    fireEvent.keyDown(design, { key: "Enter" });
    expect(screen.getByTestId("unocalc-design-workspace")).toBeInTheDocument();
    expect(screen.getByTestId("unocalc-brief-concept")).toHaveValue("Кресло для чтения с мягким силуэтом");
    expect(screen.getByTestId("unocalc-sketch-prompt")).toHaveValue(expect.stringContaining("Кресло для чтения"));

    fireEvent.change(screen.getByTestId("unocalc-brief-purpose"), { target: { value: "Тихое чтение" } });
    expect(screen.getByTestId("unocalc-sketch-prompt")).toHaveValue(expect.stringContaining("Тихое чтение"));
    fireEvent.click(screen.getByRole("button", { name: "Сохранить бриф" }));
    expect(JSON.parse(window.localStorage.getItem("unocalc.design.v1") ?? "{}").purpose).toBe("Тихое чтение");
    expect(retail).toHaveAttribute("aria-disabled", "true");
    expect(screen.queryByTestId("unocalc-core-progress")).not.toBeInTheDocument();

    const sketch = new File(["sketch"], "first-sketch.png", { type: "image/png" });
    fireEvent.change(screen.getByTestId("unocalc-sketch-upload"), { target: { files: [sketch] } });
    await waitFor(() => expect(screen.getByTestId("unocalc-sketch-gallery")).toBeInTheDocument());
    expect(retail).toHaveAttribute("aria-disabled", "false");
    expect(screen.getByTestId("unocalc-core-progress")).toBeInTheDocument();
    expect(sketchStore.items).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Удалить" }));
    await waitFor(() => expect(screen.queryByTestId("unocalc-sketch-gallery")).not.toBeInTheDocument());
    expect(retail).toHaveAttribute("aria-disabled", "true");
    expect(screen.queryByTestId("unocalc-core-progress")).not.toBeInTheDocument();
  });

  it("restores the saved design brief and browser-local sketches after reopening", async () => {
    window.localStorage.setItem("unocalc.idea.v1", "Настольный светильник");
    window.localStorage.setItem("unocalc.design.v1", JSON.stringify({
      concept: "Настольный светильник", purpose: "Чтение", character: "Мягкий свет",
      constraints: "", ideaSnapshot: "Настольный светильник",
    }));
    withExistingSketch();
    const { unmount } = render(<UnoEggScene locale="ru" />);
    await waitForUnlockedNodes();
    expect(screen.getByTestId("unocalc-core-progress")).toBeInTheDocument();
    unmount();
    render(<UnoEggScene locale="ru" />);
    await waitForUnlockedNodes();
    fireEvent.keyDown(screen.getByTestId("unocalc-design-hit"), { key: "Enter" });
    expect(screen.getByTestId("unocalc-brief-purpose")).toHaveValue("Чтение");
    expect(screen.getByTestId("unocalc-brief-character")).toHaveValue("Мягкий свет");
    expect(screen.getByTestId("unocalc-sketch-gallery")).toBeInTheDocument();
  });

  it("opens the retail explanation only after tapping the central front sphere", async () => {
    withExistingSketch();
    render(<UnoEggScene locale="ru" />);
    await waitForUnlockedNodes();
    const hit = screen.getByTestId("unocalc-retail-hit");
    const svg = screen.getByTestId("unocalc-egg-svg");
    expect(hit).toHaveAttribute("cx", "380");
    expect(screen.queryByTestId("unocalc-retail-panel")).not.toBeInTheDocument();
    fireEvent.pointerDown(hit, { pointerId: 1, clientX: 380, clientY: 400 });
    fireEvent.pointerUp(svg, { pointerId: 1, clientX: 380, clientY: 400 });
    expect(screen.getByTestId("unocalc-retail-panel")).toBeInTheDocument();
    expect(hit).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByTestId("unocalc-section-sphere").find((sphere) => sphere.getAttribute("cx") === "380")).toHaveAttribute("fill", "hsl(var(--primary) / 0.22)");
    expect(hit).toHaveAttribute("aria-label", "Закрыть описание узла «Ритейл»");
    fireEvent.pointerDown(hit, { pointerId: 3, clientX: 380, clientY: 400 });
    fireEvent.pointerUp(svg, { pointerId: 3, clientX: 380, clientY: 400 });
    expect(screen.queryByTestId("unocalc-retail-panel")).not.toBeInTheDocument();
    expect(hit).toHaveAttribute("aria-pressed", "false");
    expect(hit).toHaveAttribute("aria-label", "Открыть описание узла «Ритейл»");
    expect(screen.getAllByTestId("unocalc-section-sphere").find((sphere) => sphere.getAttribute("cx") === "380")).toHaveAttribute("fill", "none");
    fireEvent.keyDown(hit, { key: "Enter" });
    expect(screen.getByTestId("unocalc-retail-panel")).toBeInTheDocument();
  });

  it("opens Commerce after turning the egg around, and closes it on the second tap", async () => {
    withExistingSketch();
    render(<UnoEggScene locale="ru" />);
    await waitForUnlockedNodes();
    const svg = screen.getByTestId("unocalc-egg-svg");
    expect(screen.queryByTestId("unocalc-commerce-hit")).not.toBeInTheDocument();
    fireEvent.pointerDown(svg, { pointerId: 10, clientX: 100, clientY: 300 });
    fireEvent.pointerMove(svg, { pointerId: 10, clientX: 493, clientY: 300 });
    fireEvent.pointerUp(svg, { pointerId: 10, clientX: 493, clientY: 300 });
    const hit = screen.getByTestId("unocalc-commerce-hit");
    expect(screen.queryByTestId("unocalc-retail-hit")).not.toBeInTheDocument();
    expect(hit).toHaveAttribute("aria-label", "Открыть описание узла «Коммерция»");
    fireEvent.pointerDown(hit, { pointerId: 11, clientX: 380, clientY: 400 });
    fireEvent.pointerUp(svg, { pointerId: 11, clientX: 380, clientY: 400 });
    expect(screen.getByTestId("unocalc-commerce-panel")).toBeInTheDocument();
    expect(hit).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("unocalc-commerce-panel")).toHaveAttribute("aria-label", "Коммерция");
    expect(screen.getAllByTestId("unocalc-section-sphere").find((sphere) => sphere.getAttribute("data-node-id") === "commerce")).toHaveAttribute("fill", "hsl(var(--primary) / 0.22)");
    fireEvent.pointerDown(hit, { pointerId: 12, clientX: 380, clientY: 400 });
    fireEvent.pointerUp(svg, { pointerId: 12, clientX: 380, clientY: 400 });
    expect(screen.queryByTestId("unocalc-commerce-panel")).not.toBeInTheDocument();
    expect(hit).toHaveAttribute("aria-pressed", "false");
    expect(screen.getAllByTestId("unocalc-section-sphere").find((sphere) => sphere.getAttribute("data-node-id") === "commerce")).toHaveAttribute("fill", "none");
  });

  it("keeps Design and Production active independently and toggles only the tapped sphere", async () => {
    withExistingSketch();
    render(<UnoEggScene locale="ru" />);
    await waitForUnlockedNodes();
    const svg = screen.getByTestId("unocalc-egg-svg");
    const design = screen.getByTestId("unocalc-design-hit");
    const production = screen.getByTestId("unocalc-production-hit");
    expect(design).toHaveAttribute("cx", "168");
    expect(production).toHaveAttribute("cx", "592");
    fireEvent.pointerDown(design, { pointerId: 20, clientX: 168, clientY: 400 });
    fireEvent.pointerUp(svg, { pointerId: 20, clientX: 168, clientY: 400 });
    expect(screen.getByTestId("unocalc-design-panel")).toHaveAttribute("aria-label", "Дизайн");
    expect(design).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByTestId("unocalc-section-sphere").find((sphere) => sphere.getAttribute("data-node-id") === "design")).toHaveAttribute("fill", "hsl(var(--primary) / 0.22)");
    fireEvent.pointerDown(production, { pointerId: 21, clientX: 592, clientY: 400 });
    fireEvent.pointerUp(svg, { pointerId: 21, clientX: 592, clientY: 400 });
    expect(screen.getByTestId("unocalc-design-panel")).toHaveAttribute("aria-label", "Дизайн");
    expect(screen.getByTestId("unocalc-production-panel")).toHaveAttribute("aria-label", "Производство");
    expect(design).toHaveAttribute("aria-pressed", "true");
    expect(production).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByTestId("unocalc-section-sphere").find((sphere) => sphere.getAttribute("data-node-id") === "design")).toHaveAttribute("fill", "hsl(var(--primary) / 0.22)");
    fireEvent.pointerDown(production, { pointerId: 22, clientX: 592, clientY: 400 });
    fireEvent.pointerUp(svg, { pointerId: 22, clientX: 592, clientY: 400 });
    expect(screen.queryByTestId("unocalc-production-panel")).not.toBeInTheDocument();
    expect(screen.getByTestId("unocalc-design-panel")).toBeInTheDocument();
    expect(production).toHaveAttribute("aria-pressed", "false");
    expect(design).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByTestId("unocalc-section-sphere").find((sphere) => sphere.getAttribute("data-node-id") === "production")).toHaveAttribute("fill", "none");
    fireEvent.keyDown(design, { key: "Enter" });
    expect(screen.queryByTestId("unocalc-design-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("unocalc-active-panels")).not.toBeInTheDocument();
  });

  it("allows all four nodes to be active simultaneously, including the one behind the egg", async () => {
    withExistingSketch();
    render(<UnoEggScene locale="ru" />);
    await waitForUnlockedNodes();
    const svg = screen.getByTestId("unocalc-egg-svg");
    const tap = (node: Element, id: number) => {
      fireEvent.pointerDown(node, { pointerId: id, clientX: 380, clientY: 400 });
      fireEvent.pointerUp(svg, { pointerId: id, clientX: 380, clientY: 400 });
    };
    tap(screen.getByTestId("unocalc-design-hit"), 31);
    tap(screen.getByTestId("unocalc-production-hit"), 32);
    tap(screen.getByTestId("unocalc-retail-hit"), 33);
    expect(screen.getByTestId("unocalc-active-panels").querySelectorAll("aside")).toHaveLength(3);
    expect(screen.getByTestId("unocalc-active-panels")).toHaveClass("unocalc-active-panels--dense");
    fireEvent.pointerDown(svg, { pointerId: 34, clientX: 100, clientY: 300 });
    fireEvent.pointerMove(svg, { pointerId: 34, clientX: 493, clientY: 300 });
    fireEvent.pointerUp(svg, { pointerId: 34, clientX: 493, clientY: 300 });
    expect(screen.queryByTestId("unocalc-retail-hit")).not.toBeInTheDocument();
    expect(screen.getByTestId("unocalc-retail-panel")).toBeInTheDocument();
    tap(screen.getByTestId("unocalc-commerce-hit"), 35);
    expect(screen.getByTestId("unocalc-active-panels").querySelectorAll("aside")).toHaveLength(4);
    expect(screen.getByTestId("unocalc-active-panels")).toHaveClass("unocalc-active-panels--dense");
    for (const node of ["retail", "commerce", "design", "production"]) {
      expect(screen.getByTestId(`unocalc-${node}-panel`)).toBeInTheDocument();
    }
    tap(screen.getByTestId("unocalc-commerce-hit"), 36);
    expect(screen.queryByTestId("unocalc-commerce-panel")).not.toBeInTheDocument();
    expect(screen.getByTestId("unocalc-active-panels").querySelectorAll("aside")).toHaveLength(3);
  });

  it("toggles Idea and Matter independently, keeping the four functional nodes selected", async () => {
    withExistingSketch();
    render(<UnoEggScene locale="ru" />);
    await waitForUnlockedNodes();
    const svg = screen.getByTestId("unocalc-egg-svg");
    const tap = (node: Element, id: number) => {
      fireEvent.pointerDown(node, { pointerId: id, clientX: 380, clientY: 400 });
      fireEvent.pointerUp(svg, { pointerId: id, clientX: 380, clientY: 400 });
    };
    tap(screen.getByTestId("unocalc-retail-hit"), 41);
    tap(screen.getByTestId("unocalc-design-hit"), 42);
    tap(screen.getByTestId("unocalc-production-hit"), 43);
    fireEvent.pointerDown(svg, { pointerId: 44, clientX: 100, clientY: 300 });
    fireEvent.pointerMove(svg, { pointerId: 44, clientX: 493, clientY: 300 });
    fireEvent.pointerUp(svg, { pointerId: 44, clientX: 493, clientY: 300 });
    tap(screen.getByTestId("unocalc-commerce-hit"), 45);
    const idea = screen.getByTestId("unocalc-idea-hit");
    const matter = screen.getByTestId("unocalc-matter-hit");
    expect(idea).toHaveAttribute("aria-pressed", "false");
    expect(matter).toHaveAttribute("aria-pressed", "false");
    tap(idea, 46);
    tap(matter, 47);
    expect(screen.getByTestId("unocalc-idea-panel")).toHaveAttribute("aria-label", "Идея");
    expect(screen.getByTestId("unocalc-matter-panel")).toHaveAttribute("aria-label", "Материя");
    expect(screen.getByTestId("unocalc-active-panels").querySelectorAll("aside")).toHaveLength(6);
    expect(idea).toHaveAttribute("aria-pressed", "true");
    expect(matter).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByTestId("unocalc-pole-sphere").every((sphere) => sphere.getAttribute("fill") === "hsl(var(--primary) / 0.22)")).toBe(true);
    tap(idea, 48);
    expect(screen.queryByTestId("unocalc-idea-panel")).not.toBeInTheDocument();
    expect(screen.getByTestId("unocalc-matter-panel")).toBeInTheDocument();
    expect(screen.getByTestId("unocalc-retail-panel")).toBeInTheDocument();
    expect(screen.getByTestId("unocalc-active-panels").querySelectorAll("aside")).toHaveLength(5);
    expect(idea).toHaveAttribute("aria-pressed", "false");
    fireEvent.keyDown(matter, { key: "Enter" });
    expect(screen.queryByTestId("unocalc-matter-panel")).not.toBeInTheDocument();
    expect(screen.getByTestId("unocalc-active-panels").querySelectorAll("aside")).toHaveLength(4);
  });

  it("does not activate the node when the user drags to rotate", async () => {
    withExistingSketch();
    render(<UnoEggScene locale="ru" />);
    await waitForUnlockedNodes();
    const hit = screen.getByTestId("unocalc-retail-hit");
    const svg = screen.getByTestId("unocalc-egg-svg");
    fireEvent.pointerDown(hit, { pointerId: 2, clientX: 380, clientY: 400 });
    fireEvent.pointerMove(svg, { pointerId: 2, clientX: 410, clientY: 400 });
    fireEvent.pointerUp(svg, { pointerId: 2, clientX: 410, clientY: 400 });
    expect(screen.queryByTestId("unocalc-retail-panel")).not.toBeInTheDocument();
  });

  it("puts both pole spheres at the egg's axial endpoints", () => {
    const initial = eggPoleNodes({ yaw: 0, tilt: 0 });
    expect(initial).toHaveLength(2);
    expect(initial[0].x).toBeCloseTo(380);
    expect(initial[1].x).toBeCloseTo(380);
    expect(initial[0].y).toBeCloseTo(350 - 212 * EGG_TOP);
    expect(initial[1].y).toBeCloseTo(350 - 212 * EGG_BOTTOM);
    const spun = eggPoleNodes({ yaw: Math.PI / 3, tilt: 0 });
    expect(spun).toEqual(initial);
  });
});

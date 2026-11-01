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
import { EGG_BOTTOM, EGG_TOP, EGG_EQUATOR, eggRadiusAtSection, eggPoleNodes, eggSectionAxes, visibleEggSectionNodes, eggSurface, projectEggPoint, convexOutline } from "@/lib/unocalcEgg3d";

describe("UNOcalc egg-only geometry", () => {
  beforeEach(() => {
    window.localStorage.removeItem("unocalc.idea.v1");
    window.localStorage.removeItem("unocalc.design.v1");
    sketchStore.items = [];
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:unocalc-test") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
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
    expect(axis).toHaveAttribute("stroke-dasharray", "7 8");
    const spheres = screen.getAllByTestId("unocalc-section-sphere");
    expect(spheres).toHaveLength(3);
    spheres.forEach((sphere) => expect(sphere).toHaveAttribute("fill", "none"));
    expect(screen.getAllByTestId("unocalc-section-axis")).toHaveLength(2);
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

  it("keeps the yolk-like core separate from six interactive nodes and preserves locale labels", () => {
    const { rerender } = render(<UnoEggScene locale="ru" />);
    const core = screen.getByTestId("unocalc-core-sphere");
    expect(core).not.toHaveAttribute("role", "button");
    expect(screen.getAllByRole("button")).toHaveLength(5);
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
    unmount();
    render(<UnoEggScene locale="ru" />);
    expect(screen.getByTestId("unocalc-idea-field")).toBeInTheDocument();
    fireEvent.keyDown(screen.getByTestId("unocalc-idea-hit"), { key: "Enter" });
    expect(screen.getByRole("textbox", { name: "Описание идеи" })).toHaveValue("Светильник для чтения из гибких материалов");
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

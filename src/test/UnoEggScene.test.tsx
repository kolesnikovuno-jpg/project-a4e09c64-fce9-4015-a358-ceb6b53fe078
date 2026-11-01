import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import UnoEggScene from "@/components/unocalc/UnoEggScene";
import { EGG_BOTTOM, EGG_TOP, EGG_EQUATOR, eggRadiusAtSection, eggPoleNodes, eggSectionAxes, visibleEggSectionNodes, eggSurface, projectEggPoint, convexOutline } from "@/lib/unocalcEgg3d";

describe("UNOcalc egg-only geometry", () => {
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
    expect(screen.getByRole("button", { name: "Открыть описание узла «Ритейл»" })).toBeInTheDocument();
  });

  it("places two nodes at the sides and two in depth, with the rear node occluded in front view", () => {
    const front = eggSectionAxes({ yaw: 0, tilt: 0 });
    expect(front).toHaveLength(2);
    expect(front[0].nodes.map((p) => p.x)).toEqual([168, 592]);
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
    fireEvent.keyDown(svg, { key: "ArrowRight" });
    expect(axis.getAttribute("x1")).toBe(initialAxisX);
    expect(axis.getAttribute("y1")).toBe(initialAxisY);
    expect(firstSideSphere.getAttribute("cx")).not.toBe(initialSphereX);
    fireEvent.keyDown(svg, { key: "ArrowDown" });
    expect(axis.getAttribute("y1")).not.toBe(initialAxisY);
    expect(screen.getAllByTestId("unocalc-section-sphere")).toHaveLength(4);
    fireEvent.keyDown(svg, { key: "Home" });
    expect(axis.getAttribute("y1")).toBe(initialAxisY);
    expect(screen.getAllByTestId("unocalc-section-sphere")).toHaveLength(3);
  });

  it("opens the retail explanation only after tapping the central front sphere", () => {
    render(<UnoEggScene locale="ru" />);
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

  it("opens Commerce after turning the egg around, and closes it on the second tap", () => {
    render(<UnoEggScene locale="ru" />);
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

  it("does not activate the node when the user drags to rotate", () => {
    render(<UnoEggScene locale="ru" />);
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

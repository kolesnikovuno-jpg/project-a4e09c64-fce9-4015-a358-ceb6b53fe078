import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import UnoEggScene from "@/components/unocalc/UnoEggScene";
import { EGG_BOTTOM, EGG_TOP, EGG_EQUATOR, eggRadiusAtSection, eggSectionAxes, visibleEggSectionNodes, eggSurface, projectEggPoint, convexOutline } from "@/lib/unocalcEgg3d";

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
    const hull = convexOutline(surface.map(p => projectEggPoint(p, { roll: 0, tilt: 0.22 })));
    expect(hull.length).toBeGreaterThan(20);
  });

  it("opens in front elevation with three visible contour spheres and a hidden rear sphere", () => {
    render(<UnoEggScene locale="ru" />);
    const outline = screen.getByTestId("unocalc-egg-outline");
    const axis = screen.getByTestId("unocalc-egg-axis");
    expect(outline).toHaveAttribute("fill", "none");
    expect(outline).toHaveAttribute("stroke-width", "1.3");
    expect(axis).toHaveAttribute("stroke-dasharray", "7 8");
    const spheres = screen.getAllByTestId("unocalc-section-sphere");
    expect(spheres).toHaveLength(3);
    spheres.forEach((sphere) => expect(sphere).toHaveAttribute("fill", "none"));
    expect(screen.getAllByTestId("unocalc-section-axis")).toHaveLength(2);
    expect(screen.getByTestId("unocalc-egg-svg").querySelectorAll("circle")).toHaveLength(3);
    const xs = spheres.map((sphere) => Number(sphere.getAttribute("cx"))).sort((a, b) => a - b);
    expect(xs).toEqual([168, 380, 592]);
    const ys = spheres.map((sphere) => Number(sphere.getAttribute("cy")));
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(0, 5);
    expect(screen.queryByRole("button", { name: "дизайн" })).not.toBeInTheDocument();
  });

  it("places two nodes at the sides and two in depth, with the rear node occluded in front view", () => {
    const front = eggSectionAxes({ roll: 0, tilt: 0 });
    expect(front).toHaveLength(2);
    expect(front[0].nodes.map((p) => p.x)).toEqual([168, 592]);
    expect(front[1].nodes.every((p) => Math.abs(p.x - 380) < 0.001)).toBe(true);
    expect(front[1].nodes[0].y).toBeCloseTo(front[1].nodes[1].y, 6);
    expect(front[1].nodes[0].depth).toBeLessThan(front[1].nodes[1].depth);
    expect(visibleEggSectionNodes(front)).toHaveLength(3);

    const tilted = eggSectionAxes({ roll: 0, tilt: 0.2 });
    expect(visibleEggSectionNodes(tilted)).toHaveLength(4);
    const projectedCenter = 350 - 212 * EGG_EQUATOR * Math.cos(0.2);
    expect(tilted[1].nodes[0].y).toBeLessThan(projectedCenter);
    expect(tilted[1].nodes[1].y).toBeGreaterThan(projectedCenter);
  });

  it("rotates the projected silhouette, section nodes and axis by keyboard, and resets", () => {
    render(<UnoEggScene locale="ru" />);
    const svg = screen.getByTestId("unocalc-egg-svg");
    const outline = screen.getByTestId("unocalc-egg-outline");
    const axis = screen.getByTestId("unocalc-egg-axis");
    const original = outline.getAttribute("d");
    const x = axis.getAttribute("x1");
    const sphere = screen.getAllByTestId("unocalc-section-sphere")[0];
    const originalSphereX = sphere.getAttribute("cx");
    fireEvent.keyDown(svg, { key: "ArrowRight" });
    expect(outline.getAttribute("d")).not.toBe(original);
    expect(axis.getAttribute("x1")).not.toBe(x);
    expect(sphere.getAttribute("cx")).not.toBe(originalSphereX);
    fireEvent.keyDown(svg, { key: "Home" });
    expect(outline.getAttribute("d")).toBe(original);
    expect(sphere.getAttribute("cx")).toBe(originalSphereX);
    fireEvent.keyDown(svg, { key: "ArrowDown" });
    expect(screen.getAllByTestId("unocalc-section-sphere")).toHaveLength(4);
  });
});

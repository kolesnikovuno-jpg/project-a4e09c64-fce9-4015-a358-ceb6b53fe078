import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import UnoEggScene from "@/components/unocalc/UnoEggScene";
import { EGG_BOTTOM, EGG_TOP, EGG_EQUATOR, eggRadiusAtSection, eggSectionAxes, eggSurface, projectEggPoint, convexOutline } from "@/lib/unocalcEgg3d";

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

  it("shows a thin outline, equator, extended vertical axis and four contour-only spheres", () => {
    render(<UnoEggScene locale="ru" />);
    const outline = screen.getByTestId("unocalc-egg-outline");
    const axis = screen.getByTestId("unocalc-egg-axis");
    expect(outline).toHaveAttribute("fill", "none");
    expect(outline).toHaveAttribute("stroke-width", "1.3");
    expect(axis).toHaveAttribute("stroke-dasharray", "7 8");
    const spheres = screen.getAllByTestId("unocalc-section-sphere");
    expect(spheres).toHaveLength(4);
    spheres.forEach((sphere) => expect(sphere).toHaveAttribute("fill", "none"));
    expect(screen.getAllByTestId("unocalc-section-axis")).toHaveLength(2);
    expect(screen.getByTestId("unocalc-egg-svg").querySelectorAll("circle")).toHaveLength(4);
    expect(screen.queryByRole("button", { name: "дизайн" })).not.toBeInTheDocument();
  });

  it("places four section nodes on two perpendicular 3D diameters", () => {
    const axes = eggSectionAxes({ roll: 0, tilt: 0.46 });
    expect(axes).toHaveLength(2);
    const cx = 380;
    const cy = 350 - 212 * EGG_EQUATOR * Math.cos(0.46);
    for (const axis of axes) {
      expect(axis.nodes).toHaveLength(2);
      for (const node of axis.nodes) {
        const x = (node.x - cx) / 212;
        const z = (node.y - cy) / (212 * Math.sin(0.46));
        expect(x * x + z * z).toBeCloseTo(1, 5);
      }
    }
    const v1 = { x: axes[0].nodes[1].x - cx, y: axes[0].nodes[1].y - cy };
    const v2 = { x: axes[1].nodes[1].x - cx, y: axes[1].nodes[1].y - cy };
    // In 3D the diameters are perpendicular; in this tilted projection
    // the visible diagonals do not have to meet at a 90° screen angle.
    expect(v1.x * v2.x + (v1.y * v2.y) / Math.sin(0.46) ** 2).toBeCloseTo(0, 5);
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
  });
});

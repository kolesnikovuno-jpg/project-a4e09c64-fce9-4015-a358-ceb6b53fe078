import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import UnoEggScene from "@/components/unocalc/UnoEggScene";
import { EGG_BOTTOM, EGG_TOP, eggRadiusAtSection, eggSurface, projectEggPoint, convexOutline } from "@/lib/unocalcEgg3d";

describe("UNOcalc egg-only geometry", () => {
  it("builds a closed 3D ovoid of revolution with a broad upper pole and rounded lower pole", () => {
    expect(eggRadiusAtSection(-1)).toBe(0);
    expect(eggRadiusAtSection(0)).toBe(1);
    expect(eggRadiusAtSection(Math.SQRT2)).toBeCloseTo(Math.SQRT2 - 1, 8);
    expect(eggRadiusAtSection(3 - Math.SQRT2)).toBeCloseTo(0, 8);
    expect(EGG_TOP).toBeGreaterThan(0);
    expect(EGG_BOTTOM).toBeLessThan(0);
    const surface = eggSurface(24, 16);
    expect(surface).toHaveLength(25 * 16);
    const hull = convexOutline(surface.map(p => projectEggPoint(p, { roll: 0, tilt: 0.22 })));
    expect(hull.length).toBeGreaterThan(20);
  });

  it("shows only a thin outline, equator and an axis extending beyond the egg", () => {
    render(<UnoEggScene locale="ru" />);
    const outline = screen.getByTestId("unocalc-egg-outline");
    const axis = screen.getByTestId("unocalc-egg-axis");
    expect(outline).toHaveAttribute("fill", "none");
    expect(outline).toHaveAttribute("stroke-width", "1.3");
    expect(axis).toHaveAttribute("stroke-dasharray", "7 8");
    expect(screen.getByTestId("unocalc-egg-svg").querySelectorAll("circle")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "дизайн" })).not.toBeInTheDocument();
  });

  it("rotates the actual projected silhouette and axis by keyboard, and resets", () => {
    render(<UnoEggScene locale="ru" />);
    const svg = screen.getByTestId("unocalc-egg-svg");
    const outline = screen.getByTestId("unocalc-egg-outline");
    const axis = screen.getByTestId("unocalc-egg-axis");
    const original = outline.getAttribute("d");
    const x = axis.getAttribute("x1");
    fireEvent.keyDown(svg, { key: "ArrowRight" });
    expect(outline.getAttribute("d")).not.toBe(original);
    expect(axis.getAttribute("x1")).not.toBe(x);
    fireEvent.keyDown(svg, { key: "Home" });
    expect(outline.getAttribute("d")).toBe(original);
  });
});

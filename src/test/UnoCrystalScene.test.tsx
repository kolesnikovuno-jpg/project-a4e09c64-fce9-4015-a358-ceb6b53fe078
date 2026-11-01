import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import UnoCrystalScene from "@/components/unocalc/UnoCrystalScene";
import { buildEggOutline, getEggConstruction } from "@/lib/unocalcEgg";

describe("UNOcalc crystal entry scene", () => {
  it("exposes four independent interactive perspectives and opens the input panel", () => {
    const onOpenInputs = vi.fn();
    render(<UnoCrystalScene locale="ru" dimensions={["", "", ""]} onOpenInputs={onOpenInputs} />);
    for (const name of ["ритейл", "коммерция", "производство", "дизайн"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole("button", { name: "коммерция" }));
    expect(screen.getByRole("button", { name: "коммерция" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Ввести параметры" }));
    expect(onOpenInputs).toHaveBeenCalledOnce();
  });

  it("caps the crystal scene by viewport height so all six nodes stay on screen", () => {
    const { container } = render(
      <UnoCrystalScene locale="ru" dimensions={["", "", ""]} onOpenInputs={vi.fn()} />
    );
    const stage = screen.getByTestId("unocalc-crystal-stage");
    expect(stage.style.maxWidth).toContain("64vh");
    expect(stage.querySelector("svg")).toHaveAttribute("viewBox", "0 0 760 690");
    expect(container.querySelectorAll("svg > circle")).toHaveLength(4);
  });

  it("renders a tapered egg shell with transparent shading layers", () => {
    const { container } = render(
      <UnoCrystalScene locale="ru" dimensions={["", "", ""]} onOpenInputs={vi.fn()} />
    );
    const egg = container.querySelector('clipPath#uno-egg-clip path');
    expect(egg).not.toBeNull();
    expect(egg?.getAttribute("d")).toBe(buildEggOutline());
    const construction = getEggConstruction();
    const { radius, sideRadius, lowerRadius, joinOffsetX, joinY, equatorY, cx } = construction;
    // The path is made from four exact circular arcs, not sampled line segments.
    expect((egg?.getAttribute("d")?.match(/ A /g) ?? [])).toHaveLength(4);
    expect(sideRadius).toBe(2 * radius);
    expect(lowerRadius).toBeCloseTo((2 - Math.SQRT2) * radius, 8);
    expect(construction.bottomY - construction.topY).toBeGreaterThan(2 * radius);
    // Tangency: each lower join lies on both the side and bottom circles.
    expect(Math.hypot(joinOffsetX, joinY - (equatorY + radius))).toBeCloseTo(lowerRadius, 8);
    expect(Math.hypot(cx + joinOffsetX - (cx - radius), joinY - equatorY)).toBeCloseTo(sideRadius, 8);
    expect(container.querySelector("#uno-egg-side-shadow")).not.toBeNull();
    expect(container.querySelector("#uno-egg-lower-shadow")).not.toBeNull();
    expect(container.querySelector("#uno-egg-reflection")).not.toBeNull();
    expect(container.querySelector('g[clip-path="url(#uno-egg-clip)"]')).not.toBeNull();
  });

  it("shows a proportional 3D cuboid only for valid dimensions", () => {
    const onOpenInputs = vi.fn();
    const { container, rerender } = render(
      <UnoCrystalScene locale="en" dimensions={["", "", ""]} onOpenInputs={onOpenInputs} />
    );
    expect(container.querySelectorAll("g[aria-label] polygon")).toHaveLength(0);
    rerender(<UnoCrystalScene locale="en" dimensions={["10000", "10000", "3000"]} onOpenInputs={onOpenInputs} />);
    const cuboid = container.querySelectorAll("g[aria-label] polygon");
    expect(cuboid).toHaveLength(6);
    const firstFace = cuboid[0].getAttribute("points");
    rerender(<UnoCrystalScene locale="en" dimensions={["10000", "5000", "3000"]} onOpenInputs={onOpenInputs} />);
    expect(container.querySelectorAll("g[aria-label] polygon")[0].getAttribute("points")).not.toBe(firstFace);
    expect(screen.getByRole("button", { name: "Edit dimensions" })).toBeInTheDocument();
  });
});

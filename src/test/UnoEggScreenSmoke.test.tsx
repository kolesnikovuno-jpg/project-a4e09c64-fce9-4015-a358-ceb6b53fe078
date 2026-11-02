// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import UnoEggScene from "../components/unocalc/UnoEggScene";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("Egg screen smoke test", () => {
  it("renders the actual 3D component rather than a blank page", () => {
    render(<UnoEggScene locale="ru" />);
    expect(screen.getByTestId("unocalc-egg-svg")).toBeTruthy();
    expect(screen.getByTestId("unocalc-author-source")).toBeTruthy();
    expect(screen.getByTestId("unocalc-axis-stages")).toBeTruthy();
    expect(screen.getAllByTestId("unocalc-pole-sphere")).toHaveLength(2);
    expect(screen.queryByTestId("unocalc-core-matryoshka")).toBeNull();
  });

  it("opens the external Author sphere and preserves the input workflow", () => {
    render(<UnoEggScene locale="ru" />);
    fireEvent.click(screen.getByTestId("unocalc-author-hit"));
    expect(screen.getByTestId("unocalc-author-page")).toBeTruthy();
    expect(screen.getByTestId("unocalc-cycle-seed")).toBeTruthy();
    expect(screen.getByTestId("unocalc-author-stage-controls")).toBeTruthy();
    expect(screen.getByTestId("unocalc-cycle-set-seed").textContent).toContain("Идею");
  });
});

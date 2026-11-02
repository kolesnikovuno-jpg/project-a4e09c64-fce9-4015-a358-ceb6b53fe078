// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { newIdeaCycle, IDEA_CYCLE_KEY } from "../components/unocalc/UnoEggIdeaCyclePanel";
import UnoEggScene from "../components/unocalc/UnoEggScene";
import { loadLocalEggProject } from "../lib/eggLocalPreview";

const seed = "Airy linen chair with wooden frame";
const fileId = "1X4SaJX6d_Uh9y7S2H3lHIM4Gie4alYcY";
const link = "https://docs.google.com/document/d/" + fileId + "/edit?usp=sharing";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("Author file workflow in existing Egg UI", () => {
  it("registers a linked Drive document, confirms it and restores after a new render", () => {
    localStorage.setItem(IDEA_CYCLE_KEY, JSON.stringify(newIdeaCycle(seed)));
    render(<UnoEggScene locale="ru" />);
    fireEvent.click(screen.getByTestId("unocalc-author-hit"));
    expect(screen.getByTestId("unocalc-author-files")).toBeTruthy();
    fireEvent.change(screen.getByTestId("unocalc-file-link"), { target: { value: link } });
    fireEvent.change(screen.getByTestId("unocalc-file-name"), { target: { value: "Эскизы" } });
    fireEvent.change(screen.getByTestId("unocalc-file-sphere"), { target: { value: "design" } });
    fireEvent.click(screen.getByTestId("unocalc-file-register"));
    expect(screen.getByTestId("unocalc-file-list").textContent).toContain("Эскизы");
    expect(screen.getByTestId("unocalc-file-list").textContent).toContain("не подтверждена");
    const saved = loadLocalEggProject(seed);
    expect(saved?.artifacts?.[0]?.sphere).toBe("design");
    expect(saved?.artifacts?.[0]?.fileId).toBe(fileId);
    const artId = saved!.artifacts![0].id;
    fireEvent.click(screen.getByTestId("unocalc-file-confirm-" + artId));
    expect(screen.getByTestId("unocalc-file-list").textContent).toContain("Подтверждено Автором");
    cleanup();
    render(<UnoEggScene locale="ru" />);
    fireEvent.click(screen.getByTestId("unocalc-author-hit"));
    expect(screen.getByTestId("unocalc-file-list").textContent).toContain("Эскизы");
    expect(screen.getByTestId("unocalc-file-list").textContent).toContain("Подтверждено Автором");
  });

  it("does not allow a bogus link to enter the registry", () => {
    localStorage.setItem(IDEA_CYCLE_KEY, JSON.stringify(newIdeaCycle(seed)));
    render(<UnoEggScene locale="ru" />);
    fireEvent.click(screen.getByTestId("unocalc-author-hit"));
    fireEvent.change(screen.getByTestId("unocalc-file-link"), {
      target: { value: "https://drive.google.com.evil.example/file/d/" + fileId + "/view" },
    });
    fireEvent.change(screen.getByTestId("unocalc-file-name"), { target: { value: "Bogus" } });
    fireEvent.click(screen.getByTestId("unocalc-file-register"));
    expect(screen.getByTestId("unocalc-file-notice").textContent).toContain("действительная ссылка");
    expect(loadLocalEggProject(seed)?.artifacts).toEqual([]);
  });
});

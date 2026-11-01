import { describe, expect, it } from "vitest";
import {
  addTextileElement, calculateTextileCut, emptyObjectCore,
  recordSphereAssessment, setTextileProperty,
} from "@/lib/unocalcObjectCore";
import { approveObjectRevision, emptyObjectDocument } from "@/lib/unocalcObject";
import { EMPTY_BRIEF } from "@/lib/unocalcDesign";

describe("Egg object core and cross-sphere dependencies", () => {
  const initial = () => addTextileElement(emptyObjectCore(), "Сиденье", "seat-1");

  it("keeps a new element empty without inventing dimensions or supplier data", () => {
    const element = initial().elements[0];
    expect(element.properties.materialName).toBe("");
    expect(element.properties.rollWidthMm).toBe("");
    expect(element.assessments).toEqual({});
    expect(calculateTextileCut(element.properties).status).toBe("incomplete");
  });

  it("flags production and commerce when roll width changes without overwriting other data", () => {
    const core = setTextileProperty(initial(), "seat-1", "rollWidthMm", "1400", "author", "2026-11-01T10:00:00Z");
    const element = core.elements[0];
    expect(element.pendingChecks.production).toContain("rollWidthMm");
    expect(element.pendingChecks.commerce).toContain("rollWidthMm");
    expect(element.pendingChecks.components).toContain("rollWidthMm");
    expect(element.pendingChecks.law).toBeUndefined();
    expect(element.events).toHaveLength(1);
    expect(element.events[0].previous).toBe("");
    expect(element.events[0].next).toBe("1400");
  });

  it("records a sphere's evidence and reopens its review after a dependent change", () => {
    const core = setTextileProperty(initial(), "seat-1", "composition", "linen");
    const reviewed = recordSphereAssessment(core, "seat-1", {
      sphere: "law", status: "verified", note: "Checked for jurisdiction X", source: "legal assessment #1",
    }, "2026-11-01T10:00:00Z");
    expect(reviewed.elements[0].pendingChecks.law).toBeUndefined();
    const changed = setTextileProperty(reviewed, "seat-1", "originCountry", "Country B");
    expect(changed.elements[0].pendingChecks.law).toContain("originCountry");
    expect(changed.elements[0].assessments.law?.note).toBe("Checked for jurisdiction X");
    expect(changed.elements[0].assessments.law?.source).toBe("legal assessment #1");
    expect(changed.elements[0].pendingChecks.testing).toContain("composition");
  });

  it("does not accept a verified conclusion without a source", () => {
    const core = initial();
    expect(recordSphereAssessment(core, "seat-1", {
      sphere: "testing", status: "verified", note: "Passed", source: "",
    })).toBe(core);
  });

  it("calculates a single-piece rectangular layout and cost without treating it as physical evidence", () => {
    const properties = {
      ...initial().elements[0].properties,
      rollWidthMm: "1400", finishedWidthMm: "900", finishedLengthMm: "1000",
      seamAllowanceMm: "20", quantity: "2", pricePerMetre: "750",
    };
    const result = calculateTextileCut(properties);
    expect(result.status).toBe("calculated");
    if (result.status !== "calculated") return;
    expect(result.cutWidthMm).toBe(940);
    expect(result.cutLengthMm).toBe(1040);
    expect(result.orientation).toBe("rotated");
    expect(result.linearMetres).toBeCloseTo(1.88, 5);
    expect(result.materialCost).toBeCloseTo(1410, 5);
    expect(result.wastePercent).toBeGreaterThan(25);
    expect(result.wastePercent).toBeLessThan(27);
  });

  it("signals a material-width conflict instead of inventing a stitched solution", () => {
    const properties = {
      ...initial().elements[0].properties,
      rollWidthMm: "500", finishedWidthMm: "900", finishedLengthMm: "1000",
      seamAllowanceMm: "20", quantity: "1",
    };
    expect(calculateTextileCut(properties).status).toBe("does_not_fit");
  });

  it("rejects invalid quantity and negative price", () => {
    const properties = {
      ...initial().elements[0].properties,
      rollWidthMm: "1400", finishedWidthMm: "900", finishedLengthMm: "1000",
      seamAllowanceMm: "20", quantity: "1.5", pricePerMetre: "-5",
    };
    const result = calculateTextileCut(properties);
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.fields).toContain("quantity");
      expect(result.fields).toContain("pricePerMetre");
    }
  });

  it("captures the core in an approved revision without changing the previous snapshot", () => {
    const original = { ...emptyObjectDocument(), core: initial() };
    const approved = approveObjectRevision(original, "Chair", EMPTY_BRIEF, "2026-11-01T10:00:00Z");
    expect(approved.revisions[0].core?.elements[0].title).toBe("Сиденье");
    const edited = { ...approved, core: setTextileProperty(approved.core, "seat-1", "rollWidthMm", "1400") };
    expect(edited.core.elements[0].properties.rollWidthMm).toBe("1400");
    expect(edited.revisions[0].core?.elements[0].properties.rollWidthMm).toBe("");
  });
});

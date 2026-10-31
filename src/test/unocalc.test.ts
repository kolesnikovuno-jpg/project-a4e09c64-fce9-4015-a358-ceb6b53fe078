import { describe, expect, it } from "vitest";
import {
  calculateUno,
  formatUer,
  formatVolume,
  isInvalidDimension,
  type UnoLevel,
} from "@/lib/unocalc";

const run = (a: string, b: string, c: string, q: UnoLevel = 108) =>
  calculateUno({ a, b, c, q });

describe("UNOcalc validation and formatting", () => {
  it("does not calculate until all three sizes are entered", () => {
    expect(run("", "", "").status).toBe("incomplete");
    expect(run("1000", "", "1000").status).toBe("incomplete");
  });

  it.each(["0", "-1", "Infinity", "1e309", "abc", "10mm"])(
    "rejects a non-positive or malformed dimension: %s",
    (value) => {
      expect(isInvalidDimension(value)).toBe(true);
      expect(run(value, "1000", "1000").status).toBe("invalid");
    },
  );

  it("keeps the original U.E.R. equation for the three tuning levels", () => {
    const expected: Array<[UnoLevel, string]> = [[108, "193"], [270, "482"], [432, "772"]];
    for (const [level, displayed] of expected) {
      const result = run("1000", "1000", "1000", level);
      expect(result.status).toBe("ok");
      if (result.status !== "ok") continue;
      expect(result.volume).toBeCloseTo(1, 9);
      expect(formatUer(result.energy)).toBe(displayed);
    }
  });

  it("does not display a small positive object as zero", () => {
    const result = run("100", "100", "100");
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(formatVolume(result.volume)).toBe("0.001");
    expect(formatUer(result.energy)).toBe("0.193");
  });

  it("retains useful precision for even smaller objects", () => {
    const result = run("1", "1", "1");
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(formatVolume(result.volume)).toBe("1e-9");
    expect(Number(formatUer(result.energy))).toBeGreaterThan(0);
  });

  it("never renders Infinity or silent underflow as a valid result", () => {
    expect(run("1e200", "1e200", "1e200").status).toBe("out-of-range");
    expect(run("1e-200", "1e-200", "1e-200").status).toBe("out-of-range");
  });

  it("preserves ordinary two-decimal volume presentation", () => {
    expect(formatVolume(1)).toBe("1.00");
    expect(formatVolume(0.125)).toBe("0.13");
  });
});

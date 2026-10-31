import { describe, expect, it } from "vitest";
import { calculateRoom, compareRooms, initialLabState, readMeters, restoreLabState } from "@/lib/unoLab";

describe("UNOcalc Lab geometry and observations", () => {
  it("converts metric input to the established UNOcalc equation", () => {
    const dimensions = { length: "1", width: "1", height: "1" };
    const result = calculateRoom(dimensions, 108);
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.volume).toBe(1);
      expect(Math.round(result.energy)).toBe(193);
    }
  });

  it("accepts decimal commas, and rejects invalid and negative values", () => {
    expect(readMeters("4,8")).toBe(4.8);
    expect(readMeters(" 3.6 ")).toBe(3.6);
    for (const value of ["", "0", "-2", "NaN", "1e500", "hello", "4.5.2"]) {
      expect(readMeters(value)).toBeNull();
    }
  });

  it("compares the proposed height with a mathematically grounded volume delta", () => {
    const data = initialLabState();
    const { baseline, proposal, percent } = compareRooms(data);
    expect(baseline.status).toBe("ok");
    expect(proposal.status).toBe("ok");
    if (baseline.status === "ok" && proposal.status === "ok") {
      expect(baseline.volume).toBeCloseTo(46.656, 8);
      expect(proposal.volume).toBeCloseTo(51.84, 8);
    }
    expect(percent).toBeCloseTo(11.111111, 4);
  });

  it("does not invent a comparison for malformed or overflowed geometry", () => {
    const data = initialLabState();
    data.dimensions.proposedHeight = "0";
    expect(compareRooms(data).percent).toBeNull();
    data.dimensions.proposedHeight = "1e300";
    expect(compareRooms(data).percent).toBeNull();
  });

  it("restores only whitelisted user-controlled data", () => {
    const restored = restoreLabState(JSON.stringify({
      dimensions: { length: "5,5", width: "4", height: "3", proposedHeight: "3,2" },
      level: 270, zone: "entrance", focus: 4, signals: ["noise", "unknown"],
      note: "quiet corner", unrelated: "discard",
    }));
    expect(restored.dimensions.length).toBe("5,5");
    expect(restored.level).toBe(270);
    expect(restored.signals).toEqual(["noise"]);
    expect(restored.zone).toBe("entrance");
    expect(restored.focus).toBe(4);
    expect(restored).not.toHaveProperty("unrelated");
    expect(restoreLabState("{oops")).toEqual(initialLabState());
  });
});

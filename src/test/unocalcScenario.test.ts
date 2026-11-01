import { describe, expect, it } from "vitest";
import { readUnoScenario, writeUnoScenario } from "@/lib/unocalcScenario";

describe("UNOcalc scenario links", () => {
  it("restores the same supported scenario with a custom balance", () => {
    const source = {
      a: "10000", b: "6500", c: "3000",
      quality: "functional" as const,
      country: "UA" as const,
      cityId: "ua-kyiv",
      shares: [21, 19.5, 19.5, 40] as const,
    };
    const params = writeUnoScenario(source);
    expect(readUnoScenario(params)).toEqual(source);
  });

  it("ignores invalid shares, quality and injected region IDs", () => {
    const restored = readUnoScenario(
      new URLSearchParams("a=-10&b=3200&quality=unlimited&country=UA&city=de-berlin&shares=99,1,0,0"),
    );
    expect(restored.a).toBe("");
    expect(restored.b).toBe("3200");
    expect(restored.quality).toBe("basic");
    expect(restored.country).toBe("UA");
    expect(restored.cityId).toBe("ua-kyiv");
    expect(restored.shares).toEqual([20, 20, 20, 40]);
  });

  it("does not write a city for a mismatched country", () => {
    const params = writeUnoScenario({
      a: "", b: "", c: "",
      quality: "basic",
      country: "PL",
      cityId: "ua-kyiv",
      shares: [20, 20, 20, 40],
    });
    expect(params.has("city")).toBe(false);
    expect(params.has("shares")).toBe(false);
    expect(params.get("country")).toBe("PL");
  });
});

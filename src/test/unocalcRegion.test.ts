import { describe, expect, it } from "vitest";
import {
  REGION_CITIES,
  regionCitiesForCountry,
  regionCoefficient,
  regionalUsdEstimate,
  regionalOfficeEuroEstimate,
} from "@/lib/unocalcRegion";

const find = (id: string) => {
  const city = REGION_CITIES.find((item) => item.id === id);
  if (!city) throw new Error("Missing region: " + id);
  return city;
};

describe("UNOcalc regional benchmark boundaries", () => {
  it("keeps Kyiv as the local reference at 1.00", () => {
    expect(regionCoefficient(find("ua-kyiv"))).toBe(1);
  });
  it("models Lviv using 50% local labor and 50% unchanged materials", () => {
    expect(regionCoefficient(find("ua-lviv"))).toBe(0.94);
    expect(regionalUsdEstimate(15625, find("ua-lviv"))).toBeCloseTo(14687.5);
  });
  it("uses documented Warsaw benchmark for European cities", () => {
    expect(regionCoefficient(find("pl-warsaw"))).toBe(1);
    expect(regionCoefficient(find("de-berlin"), 270)).toBeCloseTo(2333 / 1313, 8);
    expect(regionCoefficient(find("de-munich"), 270)).toBeCloseTo(2432 / 1313, 8);
  });
  it("updates office costs between Warsaw, Berlin and Munich, with correct euro units", () => {
    expect(regionalOfficeEuroEstimate(30, find("pl-warsaw"), 270)).toBe(39390);
    expect(regionalOfficeEuroEstimate(30, find("de-berlin"), 270)).toBeCloseTo(69990, 8);
    expect(regionalOfficeEuroEstimate(30, find("de-munich"), 270)).toBe(72960);
  });
  it("changes European office fit-out price by selected quality level", () => {
    expect(regionCoefficient(find("de-berlin"), 108)).toBeCloseTo(1480 / 806, 8);
    expect(regionCoefficient(find("de-berlin"), 432)).toBeCloseTo(2910 / 2003, 8);
    expect(regionalOfficeEuroEstimate(30, find("de-berlin"), 108)).toBe(44400);
    expect(regionalOfficeEuroEstimate(30, find("de-berlin"), 432)).toBe(87300);
  });
  it("does not extrapolate European office rates to Ukrainian projects", () => {
    expect(regionalOfficeEuroEstimate(30, find("ua-kyiv"), 270)).toBeNull();
    expect(regionalOfficeEuroEstimate(0, find("de-berlin"), 270)).toBeNull();
    expect(regionalOfficeEuroEstimate(NaN, find("de-berlin"), 270)).toBeNull();
  });
  it("never converts Kyiv-calibrated U.E.R. to European USD using office-only comparisons", () => {
    expect(regionalUsdEstimate(15625, find("de-berlin"))).toBeNull();
    expect(regionalUsdEstimate(15625, find("pl-warsaw"))).toBeNull();
  });
  it("restricts city selection to the chosen country", () => {
    expect(regionCitiesForCountry("DE").every((item) => item.country === "DE")).toBe(true);
    expect(regionCitiesForCountry("UA").some((item) => item.id === "ua-kyiv")).toBe(true);
  });
  it("does not accept invalid financial inputs", () => {
    expect(regionalUsdEstimate(NaN, find("ua-kyiv"))).toBeNull();
    expect(regionalUsdEstimate(0, find("ua-kyiv"))).toBeNull();
  });
});

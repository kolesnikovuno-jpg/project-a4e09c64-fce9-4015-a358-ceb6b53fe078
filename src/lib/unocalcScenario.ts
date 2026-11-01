import {
  BASE_RESOURCE_PERCENTAGES,
  isValidResourcePercentages,
  type ResourcePercentages,
} from "@/lib/unocalcAllocation";
import {
  REGION_CITIES,
  REGION_COUNTRIES,
  regionCitiesForCountry,
  type RegionCountryCode,
} from "@/lib/unocalcRegion";

export type UnoQualityId = "basic" | "functional" | "field";

export type UnoScenario = {
  a: string;
  b: string;
  c: string;
  quality: UnoQualityId;
  country: RegionCountryCode | "none";
  cityId: string;
  shares: ResourcePercentages;
};

const safeDimension = (raw: string | null): string => {
  if (!raw || raw.length > 24) return "";
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 && value <= 100_000_000 ? raw : "";
};

export const readUnoScenario = (params: URLSearchParams): UnoScenario => {
  const quality = params.get("quality");
  const requestedCountry = params.get("country");
  const country = REGION_COUNTRIES.some((item) => item.code === requestedCountry)
    ? requestedCountry as RegionCountryCode : "none";
  const countryCities = country === "none" ? [] : regionCitiesForCountry(country);
  const requestedCity = params.get("city");
  const cityId = countryCities.find((item) => item.id === requestedCity)?.id
    ?? countryCities[0]?.id ?? "";

  const sharesString = params.get("shares");
  const parsed = sharesString?.split(",").map(Number);
  const shares = parsed?.length === 4 &&
    isValidResourcePercentages(parsed as ResourcePercentages)
      ? parsed as ResourcePercentages
      : BASE_RESOURCE_PERCENTAGES;

  return {
    a: safeDimension(params.get("a")),
    b: safeDimension(params.get("b")),
    c: safeDimension(params.get("c")),
    quality: quality === "basic" || quality === "functional" || quality === "field" ? quality : "basic",
    country,
    cityId,
    shares,
  };
};

/** Scenario URL contains inputs only; no personal information or saved server state. */
export const writeUnoScenario = (scenario: UnoScenario): URLSearchParams => {
  const params = new URLSearchParams();
  for (const key of ["a", "b", "c"] as const) {
    const valid = safeDimension(scenario[key]);
    if (valid !== "") params.set(key, valid);
  }
  params.set("quality", scenario.quality);
  if (scenario.country !== "none") {
    params.set("country", scenario.country);
    if (REGION_CITIES.some((item) => item.id === scenario.cityId && item.country === scenario.country)) {
      params.set("city", scenario.cityId);
    }
  }
  if (isValidResourcePercentages(scenario.shares) &&
      scenario.shares.some((share, index) => share !== BASE_RESOURCE_PERCENTAGES[index])) {
    params.set("shares", scenario.shares.join(","));
  }
  return params;
};

/**
 * Regional context for UNOcalc, 2026.
 *
 * These are NOT validated universal UNOcalc coefficients.
 *
 * Ukraine: one contractor-published 2026 apartment finishing labor price list,
 * with a modelling assumption of 50% locally varying labor and 50% shared-cost
 * materials. K = 0.5 + 0.5 * (city labor midpoint / Kyiv labor midpoint).
 * Reference: https://grs.in.ua/blog/skilky-koshtuye-remont-kvartyry.html
 *
 * Europe: Cushman & Wakefield EMEA Office Fit Out Cost Guide 2026, medium "all-in"
 * EUR/m² office-fit-out costs. K = city medium price / Warsaw medium price.
 * Reference: https://digital.cushmanwakefield.com/fitoutcostguide-03-2026-emea-regional-en-content-pds-office
 *
 * No supported Kyiv-Warsaw price bridge is available. EU coefficients must not
 * be applied to the Kyiv-calibrated USD UNOcalc starting value as price predictions.
 */
export type RegionFamily = "ua-apartment" | "eu-office";
export type RegionLocale = "ru" | "uk" | "en";
export type RegionCountryCode = "UA" | "PL" | "DE" | "CZ" | "HU" | "SK" | "NL" | "RO" | "ES" | "FR";

type Names = Record<RegionLocale, string>;

export interface RegionCountry {
  code: RegionCountryCode;
  name: Names;
}

export interface RegionCity {
  id: string;
  country: RegionCountryCode;
  name: Names;
  family: RegionFamily;
  benchmark: number;
}

export const REGION_COUNTRIES: RegionCountry[] = [
  { code: "UA", name: { ru: "Украина", uk: "Україна", en: "Ukraine" } },
  { code: "PL", name: { ru: "Польша", uk: "Польща", en: "Poland" } },
  { code: "DE", name: { ru: "Германия", uk: "Німеччина", en: "Germany" } },
  { code: "CZ", name: { ru: "Чехия", uk: "Чехія", en: "Czechia" } },
  { code: "HU", name: { ru: "Венгрия", uk: "Угорщина", en: "Hungary" } },
  { code: "SK", name: { ru: "Словакия", uk: "Словаччина", en: "Slovakia" } },
  { code: "NL", name: { ru: "Нидерланды", uk: "Нідерланди", en: "Netherlands" } },
  { code: "RO", name: { ru: "Румыния", uk: "Румунія", en: "Romania" } },
  { code: "ES", name: { ru: "Испания", uk: "Іспанія", en: "Spain" } },
  { code: "FR", name: { ru: "Франция", uk: "Франція", en: "France" } },
];

// Ukrainian values are midpoints of published 2026 labor-only rates in UAH/m².
// Materials are NOT part of these benchmark prices; that is modelled separately.
export const REGION_CITIES: RegionCity[] = [
  { id: "ua-kyiv", country: "UA", family: "ua-apartment", benchmark: 10000, name: { ru: "Киев", uk: "Київ", en: "Kyiv" } },
  { id: "ua-lviv", country: "UA", family: "ua-apartment", benchmark: 8800, name: { ru: "Львов", uk: "Львів", en: "Lviv" } },
  { id: "ua-odesa", country: "UA", family: "ua-apartment", benchmark: 8800, name: { ru: "Одесса", uk: "Одеса", en: "Odesa" } },
  { id: "ua-dnipro", country: "UA", family: "ua-apartment", benchmark: 8800, name: { ru: "Днепр", uk: "Дніпро", en: "Dnipro" } },
  { id: "ua-kharkiv", country: "UA", family: "ua-apartment", benchmark: 8000, name: { ru: "Харьков", uk: "Харків", en: "Kharkiv" } },
  { id: "ua-zhytomyr", country: "UA", family: "ua-apartment", benchmark: 7800, name: { ru: "Житомир", uk: "Житомир", en: "Zhytomyr" } },
  { id: "ua-vinnytsia", country: "UA", family: "ua-apartment", benchmark: 7800, name: { ru: "Винница", uk: "Вінниця", en: "Vinnytsia" } },
  { id: "ua-poltava", country: "UA", family: "ua-apartment", benchmark: 7800, name: { ru: "Полтава", uk: "Полтава", en: "Poltava" } },
  // EU cities: medium "all-in" office fit-out prices, EUR/m², published in 2026.
  { id: "pl-warsaw", country: "PL", family: "eu-office", benchmark: 1313, name: { ru: "Варшава", uk: "Варшава", en: "Warsaw" } },
  { id: "de-berlin", country: "DE", family: "eu-office", benchmark: 2333, name: { ru: "Берлин", uk: "Берлін", en: "Berlin" } },
  { id: "de-munich", country: "DE", family: "eu-office", benchmark: 2432, name: { ru: "Мюнхен", uk: "Мюнхен", en: "Munich" } },
  { id: "de-frankfurt", country: "DE", family: "eu-office", benchmark: 2408, name: { ru: "Франкфурт", uk: "Франкфурт", en: "Frankfurt" } },
  { id: "de-hamburg", country: "DE", family: "eu-office", benchmark: 2512, name: { ru: "Гамбург", uk: "Гамбург", en: "Hamburg" } },
  { id: "cz-prague", country: "CZ", family: "eu-office", benchmark: 1266, name: { ru: "Прага", uk: "Прага", en: "Prague" } },
  { id: "hu-budapest", country: "HU", family: "eu-office", benchmark: 1250, name: { ru: "Будапешт", uk: "Будапешт", en: "Budapest" } },
  { id: "sk-bratislava", country: "SK", family: "eu-office", benchmark: 1300, name: { ru: "Братислава", uk: "Братислава", en: "Bratislava" } },
  { id: "nl-amsterdam", country: "NL", family: "eu-office", benchmark: 1250, name: { ru: "Амстердам", uk: "Амстердам", en: "Amsterdam" } },
  { id: "ro-bucharest", country: "RO", family: "eu-office", benchmark: 1077, name: { ru: "Бухарест", uk: "Бухарест", en: "Bucharest" } },
  { id: "es-madrid", country: "ES", family: "eu-office", benchmark: 1124, name: { ru: "Мадрид", uk: "Мадрид", en: "Madrid" } },
  { id: "es-barcelona", country: "ES", family: "eu-office", benchmark: 1186, name: { ru: "Барселона", uk: "Барселона", en: "Barcelona" } },
  { id: "fr-paris", country: "FR", family: "eu-office", benchmark: 1500, name: { ru: "Париж", uk: "Париж", en: "Paris" } },
];

export const REGION_SOURCES: Record<RegionFamily, { url: string; year: number }> = {
  "ua-apartment": { url: "https://grs.in.ua/blog/skilky-koshtuye-remont-kvartyry.html", year: 2026 },
  "eu-office": { url: "https://digital.cushmanwakefield.com/fitoutcostguide-03-2026-emea-regional-en-content-pds-office", year: 2026 },
};

export const regionCitiesForCountry = (code: RegionCountryCode): RegionCity[] =>
  REGION_CITIES.filter((region) => region.country === code);

export const regionCoefficient = (city: RegionCity): number => {
  const raw = city.family === "ua-apartment"
    ? 0.5 + 0.5 * city.benchmark / 10000
    : city.benchmark / 1313;
  return Math.round(raw * 100) / 100;
};

export const canApplyRegionalUsd = (city: RegionCity): boolean =>
  city.family === "ua-apartment";

// Returning null here (rather than pretending 1.78 is a valid Kyiv->Berlin
// price ratio) explicitly prevents uncalibrated cross-market conversions.
export const regionalUsdEstimate = (uer: number, city: RegionCity): number | null =>
  Number.isFinite(uer) && uer > 0 && canApplyRegionalUsd(city)
    ? uer * regionCoefficient(city)
    : null;

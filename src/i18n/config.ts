// Supported locales for the multilingual system.
// EN is the source of truth; RU and UA are adapted from EN.
// URL slug for Ukrainian uses ISO 639-1 "uk", but the visible label is "UA".
export const LOCALES = ["en", "ru", "uk"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_LABEL: Record<Locale, string> = {
  en: "EN",
  ru: "RU",
  uk: "UA",
};

// HTML lang attribute values per locale.
export const LOCALE_HTML_LANG: Record<Locale, string> = {
  en: "en",
  ru: "ru",
  uk: "uk",
};

export const isLocale = (s: string | undefined): s is Locale =>
  !!s && (LOCALES as readonly string[]).includes(s);
import { DEFAULT_LOCALE, isLocale, type Locale } from "./config";

const STORAGE_KEY = "uno.locale";

/**
 * Persistent locale preference. Stored in localStorage so the user's
 * language choice survives across navigation, refreshes, and sessions —
 * independent of browser history.
 */
export const getStoredLocale = (): Locale | null => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return isLocale(v ?? undefined) ? (v as Locale) : null;
  } catch {
    return null;
  }
};

export const setStoredLocale = (locale: Locale): void => {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // storage may be unavailable (private mode, quota) — silently ignore.
  }
};

/** Locale to assume when nothing has been stored yet. */
export const initialLocale = (): Locale => getStoredLocale() ?? DEFAULT_LOCALE;
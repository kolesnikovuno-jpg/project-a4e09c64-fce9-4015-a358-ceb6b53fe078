import { useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  DEFAULT_LOCALE,
  LOCALE_HTML_LANG,
  LOCALES,
  isLocale,
  type Locale,
} from "./config";
import { getDict, type Dictionary } from "./dictionary";
import { setStoredLocale } from "./storage";

/**
 * Resolves the active locale from the `:locale` route param, exposes the
 * dictionary, and provides helpers to build locale-aware paths and switch
 * languages while staying on the same logical page.
 */
export function useLocale() {
  const navigate = useNavigate();
  const location = useLocation();

  // Parse locale from the first path segment so the hook works whether
  // routes are declared with a `:locale` param or as static `/en/...` paths.
  const firstSegment = location.pathname.split("/").filter(Boolean)[0];
  const locale: Locale = isLocale(firstSegment) ? firstSegment : DEFAULT_LOCALE;
  const t: Dictionary = useMemo(() => getDict(locale), [locale]);

  // Keep <html lang> in sync for accessibility and SEO.
  useEffect(() => {
    document.documentElement.lang = LOCALE_HTML_LANG[locale];
  }, [locale]);

  /** Build a path with the given locale prefix preserved. */
  const localePath = (path: string, target: Locale = locale) => {
    const clean = path.startsWith("/") ? path : `/${path}`;
    return `/${target}${clean}`;
  };

  /** Switch language while staying on the same logical page. */
  const switchTo = (target: Locale) => {
    // Persist the choice so it survives navigation, refreshes and sessions.
    setStoredLocale(target);
    const segments = location.pathname.split("/").filter(Boolean);
    if (isLocale(segments[0])) segments[0] = target;
    else segments.unshift(target);
    navigate("/" + segments.join("/") + location.search + location.hash);
  };

  return { locale, t, localePath, switchTo, locales: LOCALES };
}
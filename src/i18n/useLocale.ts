import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  DEFAULT_LOCALE,
  LOCALE_HTML_LANG,
  LOCALES,
  isLocale,
  type Locale,
} from "./config";
import { getDict, type Dictionary } from "./dictionary";
import { getStoredLocale, setStoredLocale } from "./storage";

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
  // EGG account / Yolk routes intentionally stay unprefixed: the Supabase
  // magic-link callback must remain /egg/connect on the canonical origin.
  // For these routes, use the saved choice rather than silently showing EN.
  const isBareEggRoute = firstSegment === "egg";
  const [bareEggLocale, setBareEggLocale] = useState<Locale>(() => getStoredLocale() ?? DEFAULT_LOCALE);
  const locale: Locale = isLocale(firstSegment) ? firstSegment :
    isBareEggRoute ? bareEggLocale : DEFAULT_LOCALE;
  useEffect(() => {
    if (!isBareEggRoute) return;
    const refresh = () => setBareEggLocale(getStoredLocale() ?? DEFAULT_LOCALE);
    window.addEventListener("egg:locale-change", refresh);
    return () => window.removeEventListener("egg:locale-change", refresh);
  }, [isBareEggRoute]);
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
    if (isBareEggRoute) {
      // Change the language in place: don't interrupt authentication callbacks,
      // Yolk data loads, or the project's current route/query/hash.
      setBareEggLocale(target);
      window.dispatchEvent(new Event("egg:locale-change"));
      return;
    }
    const segments = location.pathname.split("/").filter(Boolean);
    if (isLocale(segments[0])) segments[0] = target;
    else segments.unshift(target);
    navigate("/" + segments.join("/") + location.search + location.hash);
  };

  return { locale, t, localePath, switchTo, locales: LOCALES };
}
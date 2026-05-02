import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { isLocale } from "./config";
import { getStoredLocale } from "./storage";

/**
 * Watches every URL change and, if the URL's locale segment doesn't match
 * the user's stored language preference, redirects to the matching version
 * of the same page.
 *
 * - Only acts on URLs whose first segment is already a known locale
 *   (i.e. localized pages). Non-localized utility routes like /doodle,
 *   /unocalc, /pixels, /lyra-concept are left untouched.
 * - Skips when no preference is stored yet (lets the default routing flow
 *   decide), and skips when stored locale already matches the URL.
 */
const LocalePersistenceGuard = () => {
  const navigate = useNavigate();
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    const stored = getStoredLocale();
    if (!stored) return;

    const segments = pathname.split("/").filter(Boolean);
    const first = segments[0];
    // Only redirect when the URL is already locale-prefixed — otherwise
    // App.tsx redirects bare paths to the default locale and that handler
    // will land us here on the next tick where we can correct it.
    if (!isLocale(first)) return;
    if (first === stored) return;

    segments[0] = stored;
    navigate("/" + segments.join("/") + search + hash, { replace: true });
  }, [pathname, search, hash, navigate]);

  return null;
};

export default LocalePersistenceGuard;
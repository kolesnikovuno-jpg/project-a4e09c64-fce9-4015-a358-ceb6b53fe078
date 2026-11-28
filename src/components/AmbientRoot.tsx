import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAmbient } from "@/lib/useAmbient";
import { isLocale } from "@/i18n/config";

// Public presentation routes opt in; precision tools and workspaces retain their own palette.
const publicRoutes = new Set(["", "method", "cases", "exchange", "studio", "start", "spatial", "research", "about", "pricing", "garden", "gateway", "unostudio", "void", "clarity", "semantic", "semantic/about", "semantic-time", "semantic-time/about", "unocalc/about", "lyra-concept", "nava", "lyra"]);
export default function AmbientRoot() {
  const { pathname } = useLocation();
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] && isLocale(segments[0])) segments.shift();
  const enabled = publicRoutes.has(segments.join("/")) && !["color.kolesnikov.studio","egg.kolesnikov.studio"].includes(window.location.hostname);
  const { palette } = useAmbient();
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (!enabled) return;
    root.dataset.studioAmbient = "true";
    return () => { delete root.dataset.studioAmbient; };
  }, [enabled]);
  useLayoutEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    const values = Object.entries(palette).map(([key,value])=>["--studio-"+key.slice(2),String(value)]);
    for (const [key,value] of values) root.style.setProperty(key,value);
    return () => { for(const [key] of values) root.style.removeProperty(key); };
  }, [enabled,palette]);
  return null;
}

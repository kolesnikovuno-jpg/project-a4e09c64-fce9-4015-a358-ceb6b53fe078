import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import Canvas from "./pages/Canvas";
import Pricing from "./pages/Pricing";
import UnoCalc from "./pages/UnoCalc";
import About from "./pages/About";
import NotFound from "./pages/NotFound";
import PixelTransition from "./pages/PixelTransition";
import Lyra from "./pages/Lyra";
import LyraConcept from "./pages/LyraConcept";
import Garden from "./pages/Garden";
import Gateway from "./pages/Gateway";
import UnoStudio from "./pages/UnoStudio";
import { DEFAULT_LOCALE, LOCALES, isLocale } from "./i18n/config";
import { initialLocale } from "./i18n/storage";
import LocalePersistenceGuard from "./i18n/LocalePersistenceGuard";

const queryClient = new QueryClient();

/**
 * Redirect bare paths (e.g. /about) to the default locale (/en/about),
 * preserving search and hash. Used for any route that should always be
 * locale-prefixed.
 */
const RedirectToDefaultLocale = () => {
  const { pathname, search, hash } = useLocation();
  const segments = pathname.split("/").filter(Boolean);
  // If first segment is already a locale, leave alone (defensive).
  if (isLocale(segments[0])) {
    return <Navigate to={pathname + search + hash} replace />;
  }
  // Honour the persisted user choice when available; fall back to default.
  const target = `/${initialLocale()}${pathname === "/" ? "" : pathname}`;
  return <Navigate to={target + search + hash} replace />;
};

// Pages that exist under each locale prefix.
const localizedPages: Array<{ path: string; element: JSX.Element }> = [
  { path: "", element: <Index /> },
  { path: "lyra", element: <Lyra /> },
  { path: "about", element: <About /> },
  { path: "pricing", element: <Pricing /> },
  { path: "garden", element: <Garden /> },
  { path: "gateway", element: <Gateway /> },
  { path: "unostudio", element: <UnoStudio /> },
];

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <LocalePersistenceGuard />
        <Routes>
          {/* Root → default locale */}
          <Route path="/" element={<RedirectToDefaultLocale />} />

          {/* Localized routes — generated for each supported locale. */}
          {LOCALES.map((loc) =>
            localizedPages.map(({ path, element }) => (
              <Route
                key={`${loc}/${path}`}
                path={path ? `/${loc}/${path}` : `/${loc}`}
                element={element}
              />
            ))
          )}

          {/* Bare paths → default locale equivalents. */}
          {localizedPages
            .filter((p) => p.path !== "")
            .map(({ path }) => (
              <Route key={`bare-${path}`} path={`/${path}`} element={<RedirectToDefaultLocale />} />
            ))}

          {/* Non-localized utility routes. */}
          <Route path="/doodle" element={<Canvas />} />
          <Route path="/pixels" element={<PixelTransition />} />
          <Route path="/unocalc" element={<UnoCalc />} />
          <Route path="/lyra-concept" element={<LyraConcept />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

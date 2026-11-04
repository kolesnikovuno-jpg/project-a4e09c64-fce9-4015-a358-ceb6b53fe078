import { useEffect, type ReactNode } from "react";

/**
 * EGG sessions are browser-origin scoped. Links to individual Vercel builds
 * must resolve to the stable TEST branch hostname before Supabase Auth starts.
 * Never redirect the production/custom domains.
 */
export const EGG_TEST_ORIGIN = "https://project-a4e09c64-fce9-40-git-e8febd-kolesnikovuno-jpgs-projects.vercel.app";

export default function EggStablePreview({ children }: { children: ReactNode }) {
  const hostname = window.location.hostname;
  const temporaryBuildHost = hostname.startsWith("project-a4e09c64-fce9-4015-a358-ceb6b53fe078-") &&
    hostname.endsWith(".vercel.app") &&
    !hostname.endsWith("-kolesnikovuno-jpgs-projects.vercel.app");
  const destination = temporaryBuildHost
    ? EGG_TEST_ORIGIN + window.location.pathname + window.location.search + window.location.hash
    : null;
  useEffect(() => { if (destination) window.location.replace(destination); }, [destination]);
  if (destination) return <main className="mx-auto max-w-lg p-8 text-sm text-foreground">Открываем постоянный адрес тестовой версии EGG…</main>;
  return <>{children}</>;
}

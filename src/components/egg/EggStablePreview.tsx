import { useEffect, type ReactNode } from "react";
import { EGG_CANONICAL_ORIGIN } from "../../lib/eggAuthRedirect";

/**
 * EGG uses one canonical origin for BOTH project authorization and UI.
 * Existing Vercel branch/deployment aliases are not allowed to start a
 * separate Supabase session (localStorage is origin-scoped).
 *
 * The target is FIXED and only our known Vercel host patterns qualify.
 * In particular, a legacy magic-link fragment or PKCE code is preserved
 * unchanged, so Supabase consumes it on the canonical origin.
 */
const EGG_DEPLOYMENT_PREFIX = "project-a4e09c64-fce9-4015-a358-ceb6b53fe078-";
const EGG_LEGACY_BRANCH_HOST =
  "project-a4e09c64-fce9-40-git-e8febd-kolesnikovuno-jpgs-projects.vercel.app";

export function eggCanonicalRedirect(location:{
  protocol:string;hostname:string;pathname:string;search:string;hash:string;
}):string|null {
  if(location.protocol!=="https:")return null;
  const host=location.hostname.toLowerCase();
  const knownBranch=host===EGG_LEGACY_BRANCH_HOST;
  const knownDeployment=host.startsWith(EGG_DEPLOYMENT_PREFIX)&&
    host.endsWith(".vercel.app");
  if(!knownBranch&&!knownDeployment)return null;
  const path=location.pathname;
  if(!/^\/(?:egg(?:\/|$)|(?:ru|uk|en)\/egg(?:\/|$))/.test(path))return null;
  return EGG_CANONICAL_ORIGIN+path+location.search+location.hash;
}

export default function EggStablePreview({ children }: { children: ReactNode }) {
  const destination=eggCanonicalRedirect(window.location);
  useEffect(()=>{if(destination)window.location.replace(destination);},[destination]);
  if(destination)return <main className="mx-auto max-w-lg p-8 text-sm text-foreground"
    role="status" data-testid="egg-canonical-redirect">
    Открываем постоянный адрес EGG…
  </main>;
  return <>{children}</>;
}

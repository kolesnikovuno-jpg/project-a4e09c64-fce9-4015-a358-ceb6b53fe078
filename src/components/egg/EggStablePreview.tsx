import type { ReactNode } from "react";

/**
 * Preview deployments must stay on their own origin. Supabase sessions are
 * origin-scoped; silently forwarding the page to production makes preview
 * testing impossible and hides authentication failures.
 */
export function eggCanonicalRedirect(_location:{protocol:string;hostname:string;pathname:string;search:string;hash:string}):null{return null;}

export default function EggStablePreview({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

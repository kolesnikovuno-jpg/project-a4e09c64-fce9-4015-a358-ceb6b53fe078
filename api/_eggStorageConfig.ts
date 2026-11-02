/**
 * Server-only Egg storage configuration. The existing website's Lovable Cloud
 * Supabase instance MUST NOT be used as a fallback.
 *
 * A separate Egg Supabase project (or independently hosted Postgres adapter)
 * can later be configured without touching the existing site's data.
 */
export type EggStorageEnv = {
  EGG_SUPABASE_URL?: string;
  EGG_SUPABASE_PUBLISHABLE_KEY?: string;
  EGG_SUPABASE_SERVICE_ROLE_KEY?: string;
  VITE_SUPABASE_URL?: string; // Used ONLY for accidental shared-DB detection.
};

export type EggStorageConfig = {
  url: string;
  publishableKey: string;
  serviceKey: string;
};

export const getEggStorageConfig = (env: EggStorageEnv): EggStorageConfig | null => {
  const url = env.EGG_SUPABASE_URL?.trim();
  const publishableKey = env.EGG_SUPABASE_PUBLISHABLE_KEY?.trim();
  const serviceKey = env.EGG_SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !publishableKey || !serviceKey || publishableKey === serviceKey) return null;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.hash ||
        parsed.port || parsed.search || parsed.pathname !== "/") return null;
    const siteUrl = env.VITE_SUPABASE_URL?.trim();
    // Refuse to connect Egg to the same Supabase host as the existing site.
    // The check is preventive, not proof of independent infrastructure; a
    // test deployment must still verify the project's actual database identity.
    if (siteUrl && new URL(siteUrl).hostname === parsed.hostname) return null;
  } catch {
    return null;
  }

  return { url, publishableKey, serviceKey };
};

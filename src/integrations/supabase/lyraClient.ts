import { createClient } from "@supabase/supabase-js";

// Independent commercial Lyra backend; never reuse EGG or legacy site credentials.
const url = import.meta.env.VITE_LYRA_SUPABASE_URL;
const key = import.meta.env.VITE_LYRA_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error("Lyra Supabase environment is not configured");
export const lyraSupabase = createClient(url, key, {
  auth: { storageKey: "kolesnikov-lyra-auth", persistSession: true, autoRefreshToken: true },
});

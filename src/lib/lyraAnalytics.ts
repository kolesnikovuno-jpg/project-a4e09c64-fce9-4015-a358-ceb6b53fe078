import { lyraSupabase } from "@/integrations/supabase/lyraClient";

export type LyraEvent = "page_view" | "scroll_3d" | "scroll_details" | "model_interact" | "ar_click" | "info_open" | "request_open" | "request_success";
type Source = "direct" | "google" | "bing" | "instagram" | "facebook" | "telegram" | "other_search" | "other_social" | "referral" | "campaign";
const SESSION_KEY = "lyra_analytics_session_v2";
const SOURCE_KEY = "lyra_analytics_source_v2";
const CAMPAIGN_KEY = "lyra_analytics_campaign_v2";
let fallbackSession = crypto.randomUUID();

function sourceFromLocation(): Source {
  const params = new URLSearchParams(window.location.search);
  const utm = (params.get("utm_source") || "").toLowerCase();
  const ref = document.referrer;
  let host = "";
  try { host = ref ? new URL(ref).hostname.toLowerCase() : ""; } catch { /* ignore invalid referrer */ }
  const input = utm || host;
  if (/google/.test(input)) return "google";
  if (/bing/.test(input)) return "bing";
  if (/instagram/.test(input)) return "instagram";
  if (/facebook|fb\.com/.test(input)) return "facebook";
  if (/telegram|t\.me/.test(input)) return "telegram";
  if (/yandex|duckduckgo|yahoo|search/.test(input)) return "other_search";
  if (/tiktok|pinterest|linkedin|threads/.test(input)) return "other_social";
  if (utm) return "campaign";
  if (!host || host === window.location.hostname || host.endsWith(".kolesnikov.studio")) return "direct";
  return "referral";
}
function context() {
  try {
    let session = sessionStorage.getItem(SESSION_KEY);
    if (!session) { session = crypto.randomUUID(); sessionStorage.setItem(SESSION_KEY, session); }
    let source = sessionStorage.getItem(SOURCE_KEY);
    if (!source) { source = sourceFromLocation(); sessionStorage.setItem(SOURCE_KEY, source); }
    let campaign = sessionStorage.getItem(CAMPAIGN_KEY);
    if (campaign === null) {
      campaign = (new URLSearchParams(window.location.search).get("utm_campaign") || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
      sessionStorage.setItem(CAMPAIGN_KEY, campaign);
    }
    return { session_id: session, source: source as Source, campaign: campaign || null };
  } catch {
    return { session_id: fallbackSession, source: sourceFromLocation(), campaign: null };
  }
}
export function trackLyra(event_type: LyraEvent, locale: string) {
  void lyraSupabase.from("lyra_interaction_events").insert({
    event_type, locale, ...context(),
  }).then(({ error }) => { if (error) console.warn("Lyra interaction analytics:", event_type, error.message); });
}

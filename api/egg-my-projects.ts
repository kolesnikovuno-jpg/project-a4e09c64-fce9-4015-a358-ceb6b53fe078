/** Read-only Author dashboard: verified Supabase user token, owner-filtered projects.
 * No service credentials or write actions are exposed to the browser.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import { createClient } from "@supabase/supabase-js";
import { getEggStorageConfig } from "../src/server/eggStorageConfig.js";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Vary", "Authorization");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") { res.statusCode = 405; res.end(); return; }
  const config = getEggStorageConfig(process.env);
  if (!config) { res.statusCode = 503; res.end(JSON.stringify({ error: "not_configured" })); return; }
  const bearer = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization ?? "");
  if (!bearer) { res.statusCode = 401; res.end(JSON.stringify({ error: "sign_in_required" })); return; }
  try {
    const auth = createClient(config.url, config.publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: identity, error: authError } = await auth.auth.getUser(bearer[1]);
    if (authError || !identity.user?.id) { res.statusCode = 401; res.end(JSON.stringify({ error: "invalid_session" })); return; }
    const db = createClient(config.url, config.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await db.from("egg_engine_projects")
      .select("id,revision,document,updated_at").eq("owner_id", identity.user.id)
      .order("updated_at", { ascending: false }).limit(30);
    if (error) { res.statusCode = 503; res.end(JSON.stringify({ error: "database_unavailable" })); return; }
    const projects = (data ?? []).map(row => {
      const doc = row.document as { seed?: { text?: string }; level?: number; iteration?: number; tasks?: Array<{ id: string; sphere: string; status: string; findings?: unknown[] }> };
      return { id: row.id, revision: row.revision, updatedAt: row.updated_at,
        seed: doc?.seed?.text ?? "", level: doc?.level ?? 1, iteration: doc?.iteration ?? 1,
        tasks: (doc?.tasks ?? []).map(task => ({ id: task.id, sphere: task.sphere, status: task.status, findings: task.findings?.length ?? 0 })) };
    });
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.statusCode = 200;
    res.end(JSON.stringify({ projects }));
  } catch {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: "internal_error" }));
  }
}

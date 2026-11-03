/** Authenticated, owner-scoped, read-only EGG project detail. */
import type { IncomingMessage, ServerResponse } from "node:http";
import { createClient } from "@supabase/supabase-js";
import { getEggStorageConfig } from "../src/server/eggStorageConfig.js";
import type { EggProject } from "../src/lib/eggEngine.js";
import { readEggState } from "../src/lib/eggCommands.js";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Vary", "Authorization");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  const fail = (status: number, error: string) => { res.statusCode = status; res.end(JSON.stringify({ error })); };
  if (req.method !== "GET") { fail(405, "method_not_allowed"); return; }
  const requestUrl = new URL(req.url ?? "/", "https://egg.invalid");
  const projectId = requestUrl.searchParams.get("project") ?? "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(projectId)) { fail(400, "invalid_project_id"); return; }
  const bearer = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization ?? "");
  if (!bearer) { fail(401, "sign_in_required"); return; }
  const config = getEggStorageConfig(process.env);
  if (!config) { fail(503, "not_configured"); return; }
  try {
    const auth = createClient(config.url, config.publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: identity, error: authError } = await auth.auth.getUser(bearer[1]);
    if (authError || !identity.user?.id) { fail(401, "invalid_session"); return; }
    const db = createClient(config.url, config.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await db.from("egg_engine_projects")
      .select("id,owner_id,revision,document").eq("id", projectId).eq("owner_id", identity.user.id).maybeSingle();
    if (error) { fail(503, "database_unavailable"); return; }
    if (!data) { fail(404, "project_not_found"); return; }
    const document = data.document as EggProject;
    if (document.schema !== "egg.engine/0.1" || document.id !== data.id) { fail(409, "invalid_document"); return; }
    res.statusCode = 200;
    res.end(JSON.stringify({ revision: data.revision, project: readEggState(document) }));
  } catch { fail(500, "internal_error"); }
}

import type { IncomingMessage, ServerResponse } from "node:http";
import { createClient } from "@supabase/supabase-js";
import { getEggStorageConfig } from "../src/server/eggStorageConfig.js";
import type { EggProject } from "../src/lib/eggEngine.js";

export default async function handler(req: IncomingMessage & { body?: unknown }, res: ServerResponse) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Vary", "Authorization");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  const fail = (status: number, error: string) => { res.statusCode = status; res.end(JSON.stringify({ error })); };
  if (req.method !== "POST") return fail(405, "method_not_allowed");
  const config = getEggStorageConfig(process.env);
  if (!config) return fail(503, "not_configured");
  const bearer = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization ?? "");
  if (!bearer || bearer[1].startsWith("egg_v1_")) return fail(401, "author_login_required");
  try {
    let body: unknown = req.body;
    if (body === undefined) {
      const chunks: Buffer[] = []; let size = 0;
      for await (const chunk of req) { const buf = Buffer.from(chunk); size += buf.length; if (size > 4096) return fail(413, "too_large"); chunks.push(buf); }
      body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    }
    if (typeof body === "string") body = JSON.parse(body);
    if (!body || typeof body !== "object") return fail(400, "invalid_request");
    const input = body as Record<string, unknown>;
    if (typeof input.projectId !== "string" || !/^[0-9a-f-]{36}$/i.test(input.projectId) ||
      !["archive", "restore", "delete"].includes(String(input.action)) ||
      !Number.isSafeInteger(input.expectedRevision) || Number(input.expectedRevision) < 1) return fail(400, "invalid_request");
    const auth = createClient(config.url, config.publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: identity, error: authError } = await auth.auth.getUser(bearer[1]);
    if (authError || !identity.user?.id) return fail(401, "invalid_session");
    const db = createClient(config.url, config.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: row, error } = await db.from("egg_engine_projects").select("id,revision,document").eq("id", input.projectId).eq("owner_id", identity.user.id).maybeSingle();
    if (error) return fail(503, "database_unavailable");
    if (!row) return fail(404, "project_not_found");
    if (row.revision !== input.expectedRevision) return fail(409, "revision_conflict");
    const doc = row.document as EggProject;
    if (!doc || doc.id !== input.projectId) return fail(409, "invalid_project");
    if (input.action === "delete") {
      if (input.confirmTitle !== (doc.title || doc.seed.text)) return fail(400, "title_confirmation_required");
      const { data: deleted, error: deleteError } = await db.from("egg_engine_projects").delete().eq("id", row.id).eq("owner_id", identity.user.id).eq("revision", row.revision).select("id");
      if (deleteError) return fail(503, "delete_failed");
      if (!deleted?.length) return fail(409, "revision_conflict");
      res.statusCode = 200; return res.end(JSON.stringify({ ok: true, deleted: row.id }));
    }
    const next: EggProject = { ...doc, archivedAt: input.action === "archive" ? new Date().toISOString() : undefined };
    const { data: updated, error: updateError } = await db.rpc("egg_engine_cas_update", {
      p_project_id: row.id, p_owner_id: identity.user.id, p_expected_revision: row.revision, p_document: next,
    });
    if (updateError) return fail(503, "update_failed");
    if (!Array.isArray(updated) || !updated.length) return fail(409, "revision_conflict");
    res.statusCode = 200; return res.end(JSON.stringify({ ok: true, revision: updated[0].new_revision }));
  } catch { return fail(400, "invalid_request"); }
}

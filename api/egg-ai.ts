/**
 * Author-triggered, one-task-at-a-time AI pilot.
 * Requires an independent Egg Supabase instance and OPENAI_API_KEY server secret.
 * No browser-visible API keys, no agent authority to approve, no auto-loop.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import { createClient } from "@supabase/supabase-js";
import { getEggStorageConfig } from "../src/server/eggStorageConfig.js";
import { aiWorkRequest, buildSpherePrompt, parseSphereOutput } from "../src/lib/eggAiWorker.js";
import { runEggMutation, readEggState } from "../src/lib/eggCommands.js";
import type { EggProject } from "../src/lib/eggEngine.js";

type Request = IncomingMessage & { body?: unknown };
const send = (res: ServerResponse, status: number, value: unknown) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, private");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(JSON.stringify(value));
};
export default async function handler(req: Request, res: ServerResponse) {
  res.setHeader("Allow", "POST");
  if (req.method !== "POST") return send(res, 405, { ok: false, error: "method_not_allowed" });
  // Permit same-origin Author UI calls; cross-origin browser requests remain blocked.\n  if (req.headers.origin) {\n    let sameOrigin = false;\n    try {\n      const origin = new URL(req.headers.origin);\n      sameOrigin = origin.protocol === "https:" &&\n        origin.host === String(req.headers["x-forwarded-host"] || req.headers.host || "");\n    } catch { /* invalid origin */ }\n    if (!sameOrigin) return send(res, 403, { ok: false, error: "cross_origin_forbidden" });\n  }
  const config = getEggStorageConfig(process.env);
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!config || !apiKey) return send(res, 503, { ok: false, error: "ai_worker_not_configured" });
  const bearer = /^Bearer\s+(\S+)$/i.exec(String(req.headers.authorization ?? ""));
  if (!bearer || bearer[1].startsWith("egg_v1_"))
    return send(res, 401, { ok: false, error: "author_session_required" });

  try {
    let body: unknown = req.body;
    if (body === undefined) {
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of req) {
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
        size += buf.length;
        if (size > 16000) return send(res, 413, { ok: false, error: "body_too_large" });
        chunks.push(buf);
      }
      body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } else if (typeof body === "string") {
      if (Buffer.byteLength(body) > 16000) return send(res, 413, { ok: false, error: "body_too_large" });
      body = JSON.parse(body);
    } else if (Buffer.byteLength(JSON.stringify(body)) > 16000) {
      return send(res, 413, { ok: false, error: "body_too_large" });
    }
    const parsed = aiWorkRequest.safeParse(body);
    if (!parsed.success) return send(res, 400, { ok: false, error: "invalid_request" });
    const input = parsed.data;
    const auth = createClient(config.url, config.publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data: userData, error: userError } = await auth.auth.getUser(bearer[1]);
    if (userError || !userData.user?.id)
      return send(res, 401, { ok: false, error: "invalid_author_session" });
    const ownerId = userData.user.id;
    const db = createClient(config.url, config.serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data: row, error: readError } = await db.from("egg_engine_projects")
      .select("id,owner_id,revision,document").eq("id", input.projectId)
      .eq("owner_id", ownerId).maybeSingle();
    if (readError) return send(res, 503, { ok: false, error: "database_unavailable" });
    if (!row) return send(res, 404, { ok: false, error: "project_not_found" });
    if (row.revision !== input.expectedRevision)
      return send(res, 409, { ok: false, error: "revision_conflict" });
    const project = row.document as EggProject;
    if (project.schema !== "egg.engine/0.1" || project.id !== input.projectId)
      return send(res, 409, { ok: false, error: "unsupported_project_schema" });
    const task = project.tasks.find(t => t.id === input.taskId);
    if (!task || task.status !== "question" || task.iteration !== project.iteration)
      return send(res, 409, { ok: false, error: "task_not_ready" });

    const prompt = buildSpherePrompt(project, task);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    let generated: unknown;
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: process.env.EGG_AI_MODEL || "gpt-6-luna",
          instructions: prompt.instructions,
          input: prompt.input,
          max_output_tokens: 1200,
          store: false,
          text: { format: { type: "json_object" } },
        }),
      });
      if (!response.ok) return send(res, 502, { ok: false, error: "model_request_failed" });
      generated = await response.json();
    } finally { clearTimeout(timeout); }
    const result = generated as {
      status?: string; output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
    };
    if (result.status !== "completed")
      return send(res, 502, { ok: false, error: "model_incomplete" });
    const raw = result.output?.flatMap(o => o.type === "message" ? (o.content ?? []) : [])
      .filter(c => c.type === "output_text").map(c => c.text ?? "").join("") ?? "";
    const finding = parseSphereOutput(raw);
    const agent = { kind: "agent" as const, projectId: project.id, ownerId, scopes: ["contribute" as const] };
    const at = new Date().toISOString();
    const started = runEggMutation(project, {
      command: "start", projectId: project.id, expectedRevision: row.revision, taskId: task.id,
    }, agent, ownerId, at);
    const next = runEggMutation(started, {
      command: "return", projectId: project.id, expectedRevision: row.revision, taskId: task.id,
      text: finding.text, evidence: finding.evidence,
    }, agent, ownerId, at);
    const { data: saved, error: saveError } = await db.rpc("egg_engine_cas_update", {
      p_project_id: project.id, p_owner_id: ownerId,
      p_expected_revision: row.revision, p_document: next,
    });
    if (saveError) return send(res, 503, { ok: false, error: "database_unavailable" });
    if (!Array.isArray(saved) || !saved.length)
      return send(res, 409, { ok: false, error: "revision_conflict" });
    return send(res, 200, {
      ok: true, revision: saved[0].new_revision, finding,
      project: readEggState(next), note: "Finding awaits Author review",
    });
  } catch {
    return send(res, 500, { ok: false, error: "ai_worker_failed" });
  }
}

/**
 * Vercel server function. API lives separately from the Vite/React UI.
 *
 * Authentication:
 *  - Supabase user bearer token: trusted Author controls own projects.
 *  - egg_v1_ scoped key: read + contribute to ONE project, NEVER Author actions.
 *
 * Storage: Supabase service role and atomic RPC from egg_engine_tables migration.
 * Fail-closed: without all required env vars / migration no project can be read
 * or written. No CORS wildcards, no secrets in browser JS or URL parameters.
 */
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getEggStorageConfig } from "../src/server/eggStorageConfig.js";
import { ZodError } from "zod";
import { exportEggManifest } from "../src/lib/eggArtifacts.js";
import { createEggProject, EggEngineError, type EggProject } from "../src/lib/eggEngine.js";
import {
  eggCommandSchema, eggMutationSchema, mayAccessEgg, readEggState,
  runEggMutation, type EggPermission,
} from "../src/lib/eggCommands.js";

type Request = IncomingMessage & { body?: unknown };
type Response = ServerResponse;
type ProjectRow = { id: string; owner_id: string; document: EggProject; revision: number };
type KeyRow = {
  project_id: string; owner_id: string; scopes: Array<"read" | "contribute">;
  expires_at: string; revoked_at: string | null;
};
type EggDatabase = {
  public: {
    Tables: {
      egg_engine_projects: {
        Row: ProjectRow & { created_at: string; updated_at: string };
        Insert: { id: string; owner_id: string; document: EggProject; revision?: number };
        Update: { document?: EggProject; revision?: number; updated_at?: string };
        Relationships: [];
      };
      egg_engine_access_keys: {
        Row: KeyRow & {
          id: string; key_hash: string; label: string; created_at: string;
        };
        Insert: {
          project_id: string; owner_id: string; key_hash: string; label: string;
          scopes: Array<"read" | "contribute">; expires_at: string;
        };
        Update: { revoked_at?: string | null };
        Relationships: [];
      };
    };
    Views: {};
    Functions: {
      egg_engine_cas_update: {
        Args: {
          p_project_id: string; p_owner_id: string;
          p_expected_revision: number; p_document: EggProject;
        };
        Returns: Array<{ new_revision: number }>;
      };
    };
    Enums: {};
    CompositeTypes: {};
  };
};
type ServerDb = SupabaseClient<EggDatabase>;

const respond = (res: Response, status: number, data: unknown): void => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, private");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(JSON.stringify(data));
};
const apiError = (res: Response, status: number, code: string): void =>
  respond(res, status, { ok: false, error: code });
const uuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const makeDb = (url: string, key: string): ServerDb =>
  createClient<EggDatabase>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

const readJson = async (req: Request): Promise<unknown> => {
  if (req.body !== undefined) {
    const value = req.body;
    if (typeof value === "string") {
      if (Buffer.byteLength(value) > 64_000) throw new RequestFailure(413, "body_too_large");
      return JSON.parse(value) as unknown;
    }
    if (Buffer.byteLength(JSON.stringify(value ?? null)) > 64_000)
      throw new RequestFailure(413, "body_too_large");
    return value;
  }
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
    total += buf.length;
    if (total > 64_000) throw new RequestFailure(413, "body_too_large");
    chunks.push(buf);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf-8")) as unknown;
};
class RequestFailure extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

const bearer = (req: Request): string => {
  const match = /^Bearer\s+(\S+)$/i.exec(String(req.headers.authorization || ""));
  if (!match) throw new RequestFailure(401, "authentication_required");
  return match[1];
};
const verify = async (
  req: Request, db: ServerDb, url: string, publishableKey: string,
): Promise<EggPermission> => {
  const token = bearer(req);
  if (token.startsWith("egg_v1_")) {
    const hash = createHash("sha256").update(token).digest("hex");
    const { data, error } = await db.from("egg_engine_access_keys")
      .select("owner_id,project_id,scopes,revoked_at,expires_at")
      .eq("key_hash", hash).maybeSingle();
    if (error) throw new RequestFailure(503, "database_unavailable");
    const row = data as KeyRow | null;
    if (!row || row.revoked_at || new Date(row.expires_at).getTime() <= Date.now())
      throw new RequestFailure(401, "invalid_or_expired_key");
    if (!Array.isArray(row.scopes) || !row.scopes.every(s => s === "read" || s === "contribute"))
      throw new RequestFailure(401, "invalid_key_scopes");
    return { kind: "agent", projectId: row.project_id, ownerId: row.owner_id, scopes: row.scopes };
  }
  // The user JWT is verified by Supabase Auth, never decoded or trusted locally.
  const auth = makeDb(url, publishableKey);
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user?.id) throw new RequestFailure(401, "invalid_user_session");
  return { kind: "author", ownerId: data.user.id };
};

const getProject = async (db: ServerDb, id: string): Promise<ProjectRow> => {
  if (!uuid(id)) throw new RequestFailure(400, "invalid_project_id");
  const { data, error } = await db.from("egg_engine_projects")
    .select("id,owner_id,document,revision")
    .eq("id", id).maybeSingle();
  if (error) throw new RequestFailure(503, "database_unavailable");
  if (!data) throw new RequestFailure(404, "project_not_found");
  const row = data as ProjectRow;
  if (!row.document || row.document.schema !== "egg.engine/0.1" || row.document.id !== id)
    throw new RequestFailure(409, "unsupported_project_schema");
  return row;
};

const checkedProject = async (
  db: ServerDb, id: string, identity: EggPermission, action: "read" | "contribute" | "author",
): Promise<ProjectRow> => {
  // An agent can never enumerate another project's existence via its key.
  if (identity.kind === "agent" && identity.projectId !== id)
    throw new RequestFailure(403, "forbidden");
  const project = await getProject(db, id);
  if (!mayAccessEgg(identity, project.id, project.owner_id, action))
    throw new RequestFailure(403, "forbidden");
  return project;
};

const updateProject = async (
  db: ServerDb, row: ProjectRow, expectedRevision: number, next: EggProject,
): Promise<number> => {
  const { data, error } = await db.rpc("egg_engine_cas_update", {
    p_project_id: row.id,
    p_owner_id: row.owner_id,
    p_expected_revision: expectedRevision,
    p_document: next,
  });
  if (error) throw new RequestFailure(503, "database_unavailable");
  if (!Array.isArray(data) || !data.length) throw new RequestFailure(409, "revision_conflict");
  return Number(data[0].new_revision);
};

export default async function handler(req: Request, res: Response) {
  res.setHeader("Allow", "GET, POST");
  res.setHeader("Cache-Control", "no-store, private");
  if (req.method !== "GET" && req.method !== "POST") {
    apiError(res, 405, "method_not_allowed");
    return;
  }
  const config = getEggStorageConfig(process.env);
  if (!config) {
    apiError(res, 503, "egg_engine_not_configured");
    return;
  }
  try {
    const db = makeDb(config.url, config.serviceKey);
    const identity = await verify(req, db, config.url, config.publishableKey);

    if (req.method === "GET") {
      const url = new URL(req.url || "/", "https://local.invalid");
      if (url.searchParams.get("list") === "1") {
        if (identity.kind !== "author") throw new RequestFailure(403, "author_required");
        const { data, error } = await db.from("egg_engine_projects")
          .select("id,revision,document,updated_at")
          .eq("owner_id", identity.ownerId)
          .order("updated_at", { ascending: false }).limit(50);
        if (error) throw new RequestFailure(503, "database_unavailable");
        respond(res, 200, {
          ok: true,
          projects: (data ?? []).map(item => ({
            projectId: item.id, revision: item.revision,
            seed: item.document?.seed?.text ?? "", title: item.document?.title ?? item.document?.seed?.text ?? "",
            updatedAt: item.updated_at,
          })),
        });
        return;
      }
      const projectId = url.searchParams.get("projectId") || "";
      const format = url.searchParams.get("format") || "state";
      if (format !== "state" && format !== "manifest")
        throw new RequestFailure(400, "invalid_export_format");
      const project = await checkedProject(db, projectId, identity,
        format === "manifest" ? "author" : "read");
      if (format === "manifest") {
        res.setHeader("Content-Disposition", `attachment; filename="egg-project-${projectId}.json"`);
        respond(res, 200, {
          ok: true, revision: project.revision,
          export: exportEggManifest(project.document, new Date().toISOString()),
        });
      } else {
        respond(res, 200, {
          ok: true, revision: project.revision, project: readEggState(project.document),
        });
      }
      return;
    }

    const raw = await readJson(req);
    const parsed = eggCommandSchema.safeParse(raw);
    if (!parsed.success) throw new RequestFailure(400, "invalid_command");
    const input = parsed.data;
    const at = new Date().toISOString();

    if (input.command === "create") {
      if (identity.kind !== "author") throw new RequestFailure(403, "author_required");
      const projectId = randomUUID();
      const state = createEggProject({ id: projectId, title: input.title, seed: input.seed, at });
      const { error } = await db.from("egg_engine_projects").insert({
        id: projectId, owner_id: identity.ownerId, document: state, revision: 1,
      });
      if (error) throw new RequestFailure(503, "database_unavailable");
      respond(res, 201, {
        ok: true, projectId, revision: 1, project: readEggState(state),
      });
      return;
    }

    if (input.command === "issue_key") {
      const project = await checkedProject(db, input.projectId, identity, "author");
      if (identity.kind !== "author") throw new RequestFailure(403, "author_required");
      const plaintextKey = "egg_v1_" + randomBytes(32).toString("base64url");
      const hash = createHash("sha256").update(plaintextKey).digest("hex");
      const expiresAt = new Date(Date.now() + input.expiresInDays * 86_400_000).toISOString();
      const { data, error } = await db.from("egg_engine_access_keys").insert({
        project_id: project.id, owner_id: identity.ownerId, key_hash: hash,
        label: input.label, scopes: ["read", "contribute"], expires_at: expiresAt,
      }).select("id").single();
      if (error || !data) throw new RequestFailure(503, "database_unavailable");
      // Returned once; only SHA-256 hash is persisted.
      respond(res, 201, {
        ok: true, projectId: project.id, keyId: data.id, expiresAt,
        scopes: ["read", "contribute"], accessKey: plaintextKey,
      });
      return;
    }

    if (input.command === "revoke_key") {
      const project = await checkedProject(db, input.projectId, identity, "author");
      if (identity.kind !== "author") throw new RequestFailure(403, "author_required");
      const { data, error } = await db.from("egg_engine_access_keys")
        .update({ revoked_at: at })
        .eq("id", input.keyId).eq("project_id", project.id)
        .eq("owner_id", identity.ownerId).is("revoked_at", null)
        .select("id").maybeSingle();
      if (error) throw new RequestFailure(503, "database_unavailable");
      if (!data) throw new RequestFailure(404, "key_not_found");
      respond(res, 200, { ok: true, revoked: data.id });
      return;
    }

    const mutation = eggMutationSchema.parse(input);
    const project = await checkedProject(db, mutation.projectId, identity,
      mutation.command === "decide" || mutation.command === "set_level" ||
      mutation.command === "next_iteration" || mutation.command === "confirm_file"
        ? "author" : "contribute");
    if (mutation.expectedRevision !== project.revision)
      throw new RequestFailure(409, "revision_conflict");
    const next = runEggMutation(project.document, mutation, identity, project.owner_id, at);
    if (next === project.document) {
      respond(res, 200, { ok: true, revision: project.revision, project: readEggState(next) });
      return;
    }
    const revision = await updateProject(db, project, project.revision, next);
    respond(res, 200, { ok: true, revision, project: readEggState(next) });
  } catch (err) {
    if (err instanceof RequestFailure) {
      apiError(res, err.status, err.code);
    } else if (err instanceof EggEngineError || err instanceof ZodError) {
      apiError(res, 400, "invalid_state_transition");
    } else if (err instanceof SyntaxError) {
      apiError(res, 400, "invalid_json");
    } else {
      // Avoid leaking tokens, secrets, database internals or full user documents.
      apiError(res, 500, "internal_error");
    }
  }
}

/**
 * Egg v0.5 stateless MCP server for external AI. Streamable HTTP JSON responses.
 * The ONLY credential accepted here is an expiring, project-scoped egg_v1_ key.
 * No user session, Google OAuth credential or Author approval can pass through.
 *
 * Until a TEST Supabase schema and server secret are configured this endpoint
 * deliberately returns 503, including on MCP initialize and tools/list.
 */
import { createHash } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createClient } from "@supabase/supabase-js";
import { getEggStorageConfig } from "../src/server/eggStorageConfig.js";
import type { EggProject } from "../src/lib/eggEngine.js";
import { eggMutationSchema, mayAccessEgg, readEggState, runEggMutation, type EggPermission } from "../src/lib/eggCommands.js";
import { processEggMcp } from "../src/lib/eggMcpProtocol.js";
import { getEggAiReadHandoff } from "../src/lib/eggAiOnboarding.js";

type Incoming = IncomingMessage & { body?: unknown };
type ProjectRow = { id: string; owner_id: string; revision: number; document: EggProject };
type McpDb = {
  public: {
    Tables: {
      egg_engine_projects: {
        Row: ProjectRow & { created_at: string; updated_at: string };
        Insert: { id: string; owner_id: string; document: EggProject; revision?: number };
        Update: { document?: EggProject; revision?: number };
        Relationships: [];
      };
      egg_engine_access_keys: {
        Row: KeyRow & { id: string; key_hash: string; label: string; created_at: string };
        Insert: { project_id: string; owner_id: string; key_hash: string; label: string;
          scopes: Array<"read" | "contribute">; expires_at: string };
        Update: { revoked_at?: string | null };
        Relationships: [];
      };
    };
    Views: {};
    Functions: {
      egg_engine_cas_update: {
        Args: {
          p_project_id: string; p_owner_id: string; p_expected_revision: number; p_document: EggProject;
        };
        Returns: Array<{ new_revision: number }>;
      };
    };
    Enums: {};
    CompositeTypes: {};
  };
};
type KeyRow = {
  project_id: string; owner_id: string; expires_at: string;
  revoked_at: string | null; scopes: Array<"read" | "contribute">;
};
class ServiceError extends Error {
  constructor(public readonly code: string, public readonly status: number) { super(code); }
}
const uuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const send = (res: ServerResponse, status: number, body?: unknown) => {
  res.statusCode = status;
  res.setHeader("Cache-Control", "no-store, private");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Vary", "Authorization");
  if (body === undefined) { res.end(); return; }
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
};
const readJson = async (req: Incoming): Promise<unknown> => {
  if (req.body !== undefined) {
    if (typeof req.body === "string") {
      if (Buffer.byteLength(req.body) > 64_000) throw new ServiceError("request_too_large", 413);
      return JSON.parse(req.body);
    }
    if (Buffer.byteLength(JSON.stringify(req.body)) > 64_000) throw new ServiceError("request_too_large", 413);
    return req.body;
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const value of req) {
    const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value as Uint8Array);
    size += chunk.byteLength;
    if (size > 64_000) throw new ServiceError("request_too_large", 413);
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
};

export default async function handler(req: Incoming, res: ServerResponse) {
  res.setHeader("Allow", "POST");
  // MCP server-to-server only. Reject all Origin-bearing browser requests:
  // no CORS wildcard, no browser-visible service tokens.
  if (req.headers.origin) { send(res, 403, { error: "origin_not_permitted" }); return; }
  if (req.method === "GET" && !req.headers.authorization) {
    const origin = process.env.EGG_MCP_PUBLIC_ORIGIN?.trim();
    if (origin) res.setHeader("WWW-Authenticate",
      'Bearer resource_metadata="' + origin + '/.well-known/oauth-protected-resource"');
    send(res, 401, { error: "authorization_required" });
    return;
  }
  if (req.method !== "POST") { send(res, 405, { error: "method_not_allowed" }); return; }
  const config = getEggStorageConfig(process.env);
  if (!config) { send(res, 503, { error: "egg_engine_not_configured" }); return; }
  const authHeader = req.headers.authorization;
  const match = typeof authHeader === "string"
    ? /^Bearer\s+(\S+)$/i.exec(authHeader) : null;
  const origin = process.env.EGG_MCP_PUBLIC_ORIGIN?.trim();
  const challenge = origin
    ? 'Bearer resource_metadata="' + origin + '/.well-known/oauth-protected-resource"'
    : "Bearer";
  if (!match) {
    res.setHeader("WWW-Authenticate", challenge);
    send(res, 401, { error: "authorization_required" }); return;
  }

  try {
    const db = createClient<McpDb>(config.url, config.serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    let agent: EggPermission;
    let oauthIdentity = false;
    if (match[1].startsWith("egg_v1_")) {
      const keyHash = createHash("sha256").update(match[1]).digest("hex");
      const { data: keyData, error: keyError } = await db.from("egg_engine_access_keys")
        .select("project_id,owner_id,scopes,expires_at,revoked_at")
        .eq("key_hash", keyHash).maybeSingle();
      if (keyError) throw new ServiceError("database_unavailable", 503);
      const key = keyData as KeyRow | null;
      if (!key || key.revoked_at || !Number.isFinite(Date.parse(key.expires_at)) ||
          Date.parse(key.expires_at) <= Date.now())
        throw new ServiceError("invalid_or_expired_key", 401);
      if (!Array.isArray(key.scopes) || !key.scopes.every(v => v === "read" || v === "contribute"))
        throw new ServiceError("invalid_key_scopes", 401);
      agent = { kind: "agent", projectId: key.project_id, ownerId: key.owner_id, scopes: key.scopes };
    } else {
      // OAuth access tokens are validated by Supabase Auth, not trusted by decoding alone.
      // Require OAuth client_id and a resource-bound audience; reject ordinary Author JWTs.
      if (!origin) throw new ServiceError("oauth_not_configured", 503);
      const auth = createClient(config.url, config.publishableKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      const { data: userData, error: userError } = await auth.auth.getUser(match[1]);
      if (userError || !userData.user?.id) throw new ServiceError("invalid_oauth_token", 401);
      let claims: { client_id?: unknown; aud?: unknown };
      try {
        claims = JSON.parse(Buffer.from(match[1].split(".")[1], "base64url").toString("utf8"));
      } catch { throw new ServiceError("invalid_oauth_token", 401); }
      // Supabase OAuth access tokens normally have aud="authenticated", NOT
      // the MCP resource URL. Supabase Auth verifies the token and issuer above.
      // A client_id claim distinguishes OAuth grants from ordinary Author JWTs.
      const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
      if (typeof claims.client_id !== "string" || !claims.client_id ||
          !audiences.includes("authenticated"))
        throw new ServiceError("invalid_oauth_token_claims", 401);
      oauthIdentity = true;
      agent = { kind: "agent", projectId: "", ownerId: userData.user.id,
        scopes: ["read", "contribute"] };
    }
    const agentFor = (projectId: string): EggPermission =>
      oauthIdentity ? { ...agent, projectId } : agent;
    // Reject read-only token when called with write operation; no way to
    // authenticate as Author on MCP endpoint, even with a genuine user JWT.
    const getProject = async (projectId: string, action: "read" | "contribute"): Promise<ProjectRow> => {
      if (!uuid(projectId)) throw new ServiceError("invalid_project_id", 400);
      if (!oauthIdentity && projectId !== agent.projectId)
        throw new ServiceError("forbidden", 403);
      const { data, error } = await db.from("egg_engine_projects")
        .select("id,owner_id,document,revision")
        .eq("id", projectId).maybeSingle();
      if (error) throw new ServiceError("database_unavailable", 503);
      const row = data as ProjectRow | null;
      if (!row) throw new ServiceError("project_not_found", 404);
      if (row.owner_id !== agent.ownerId ||
          !mayAccessEgg(agentFor(row.id), row.id, row.owner_id, action))
        throw new ServiceError("forbidden", 403);
      if (!row.document || row.document.schema !== "egg.engine/0.1" ||
          row.document.id !== projectId) throw new ServiceError("operation_failed", 409);
      return row;
    };
    const rpc = await processEggMcp(await readJson(req), {
      getState: async (projectId) => {
        const row = await getProject(projectId, "read");
        return { ok: true, revision: row.revision, project: readEggState(row.document), aiFirstContact: getEggAiReadHandoff() };
      },
      proposeSeed: async (args) => {
        const row = await getProject(args.projectId, "contribute");
        if (args.expectedRevision !== row.revision) throw new ServiceError("revision_conflict", 409);
        const parsed = eggMutationSchema.parse({ command: "propose_seed", ...args });
        let next: EggProject;
        try {
          next = runEggMutation(row.document, parsed, agentFor(row.id), row.owner_id, new Date().toISOString());
        } catch {
          throw new ServiceError("invalid_state_transition", 400);
        }
        const { data, error } = await db.rpc("egg_engine_cas_update", {
          p_project_id: row.id, p_owner_id: row.owner_id,
          p_expected_revision: row.revision, p_document: next,
        });
        if (error) throw new ServiceError("database_unavailable", 503);
        if (!Array.isArray(data) || !data.length) throw new ServiceError("revision_conflict", 409);
        return { ok: true, revision: data[0].new_revision, note: "Proposal saved; Author approval required" };
      },
      contributeSphere: async (args) => {
        const row = await getProject(args.projectId, "contribute");
        if (args.expectedRevision !== row.revision)
          throw new ServiceError("revision_conflict", 409);
        // Backward-compatible flow result: existing ChatGPT EGG v4 only exposes
        // egg_contribute_sphere(command=return), so use the flow task ID provided
        // by egg_get_project_state.flowCompatibility.awaiting. Do NOT infer IDs.
        let parsed: ReturnType<typeof eggMutationSchema.parse>;
        if (args.command === "return" && args.taskId.startsWith("flow:")) {
          const current=row.document.flowCycles?.[row.document.flowCycles.length-1];
          const match=/^flow:(cycle-[0-9]+):([a-zA-Z]+)$/.exec(args.taskId);
          if (!current || !match || match[1]!==current.id)
            throw new ServiceError("invalid_state_transition",400);
          const station=[...current.first,...current.second].find(v=>v.sphere===match[2]);
          if (!station || station.status!=="awaiting_result")
            throw new ServiceError("invalid_state_transition",400);
          parsed=eggMutationSchema.parse({
            command:"complete_flow_sphere",projectId:args.projectId,
            expectedRevision:args.expectedRevision,sphere:station.sphere,
            text:args.text,evidence:args.evidence,sourceRefs:args.sourceRefs,
          });
        } else {
          parsed=eggMutationSchema.parse(args);
        }
        let next: EggProject;
        try {
          next = runEggMutation(row.document, parsed, agentFor(row.id), row.owner_id, new Date().toISOString());
        } catch {
          throw new ServiceError("invalid_state_transition", 400);
        }
        const { data, error } = await db.rpc("egg_engine_cas_update", {
          p_project_id: row.id, p_owner_id: row.owner_id,
          p_expected_revision: row.revision, p_document: next,
        });
        if (error) throw new ServiceError("database_unavailable", 503);
        if (!Array.isArray(data) || data.length === 0)
          throw new ServiceError("revision_conflict", 409);
        return { ok: true, revision: data[0].new_revision,
          project: readEggState(next),
          note: "AI sphere contribution recorded; fixed-flow progress and the Yolk synthesis are updated automatically when applicable. Only the Author may decide the integrated cycle." };
      },
      proposeConcept: async (args) => {
        const row=await getProject(args.projectId,"contribute");
        if(args.expectedRevision!==row.revision)
          throw new ServiceError("revision_conflict",409);
        const parsed=eggMutationSchema.parse({command:"propose_concept",...args});
        let next:EggProject;
        try {
          next=runEggMutation(row.document,parsed,agentFor(row.id),row.owner_id,new Date().toISOString());
        } catch {
          throw new ServiceError("invalid_state_transition",400);
        }
        const {data,error}=await db.rpc("egg_engine_cas_update",{
          p_project_id:row.id,p_owner_id:row.owner_id,
          p_expected_revision:row.revision,p_document:next,
        });
        if(error)throw new ServiceError("database_unavailable",503);
        if(!Array.isArray(data)||!data.length)throw new ServiceError("revision_conflict",409);
        return {ok:true,revision:data[0].new_revision,
          proposedConcept:next.concepts?.[next.concepts.length-1],
          note:"Concept proposal recorded. Only Author may accept, revise or route its tasks."};
      },
      registerFieldItem: async (args) => {
        const row = await getProject(args.projectId, "contribute");
        const fieldDb = createClient(config.url, config.serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        });
        const payload = {
          project_id: row.id, sphere: args.sphere, flow: args.flow, origin: args.origin,
          source_kind: args.sourceKind, title: args.title, content: args.content,
          source_uri: args.sourceUri ?? null, claim_type: args.claimType,
          level: row.document.level, iteration: row.document.iteration,
          actor_kind: "agent", operation_id: args.operationId, created_by: null,
        };
        // Retry-safe source import without mutating the Author-approved project revision.
        const lookup = async () => {
          const { data, error } = await fieldDb.from("egg_field_items")
            .select("id,sphere,flow,origin,source_kind,title,content,source_uri,claim_type")
            .eq("project_id", row.id).eq("operation_id", args.operationId).maybeSingle();
          if (error) throw new ServiceError("database_unavailable", 503);
          return data;
        };
        const same = (data: Record<string, unknown>) =>
          data.sphere === payload.sphere && data.flow === payload.flow &&
          data.origin === payload.origin && data.source_kind === payload.source_kind &&
          data.title === payload.title && data.content === payload.content &&
          data.source_uri === payload.source_uri && data.claim_type === payload.claim_type;
        const existing = await lookup();
        if (existing) {
          if (!same(existing)) throw new ServiceError("invalid_state_transition", 409);
          return { ok: true, id: existing.id, idempotentReplay: true, approved: false };
        }
        const {data:created,error:writeError} = await fieldDb.from("egg_field_items")
          .insert(payload).select("id").single();
        if (writeError || !created) {
          const repeated = await lookup();
          if (repeated && same(repeated))
            return { ok: true, id: repeated.id, idempotentReplay: true, approved: false };
          throw new ServiceError("database_unavailable", 503);
        }
        return { ok: true, id: created.id, approved: false,
          note: "External AI research stored in the knowledge field, not approved into the Egg core" };
      },
      registerDriveFile: async (args) => {
        const row = await getProject(args.projectId, "contribute");
        const parsed = eggMutationSchema.parse({
          command: "register_file", provider: "google_drive", ...args,
        });
        // A successful write may be followed by a lost HTTP response.
        // Before rejecting a stale revision, check whether this is a repeat
        // of exactly the same operation (no new event, no new version).
        const existing = row.document.artifacts?.find(item => item.operationId === args.operationId);
        if (existing) {
          try {
            const repeat = runEggMutation(row.document, parsed, agentFor(row.id), row.owner_id, new Date().toISOString());
            if (repeat !== row.document) throw new Error("Duplicate did not resolve");
          } catch {
            throw new ServiceError("invalid_state_transition", 400);
          }
          return { ok: true, revision: row.revision, artifact: existing,
            idempotentReplay: true, note: "Reference already registered; Author confirmation required" };
        }
        if (args.expectedRevision !== row.revision)
          throw new ServiceError("revision_conflict", 409);
        let next: EggProject;
        try {
          next = runEggMutation(row.document, parsed, agentFor(row.id), row.owner_id, new Date().toISOString());
        } catch {
          throw new ServiceError("invalid_state_transition", 400);
        }
        const { data, error } = await db.rpc("egg_engine_cas_update", {
          p_project_id: row.id, p_owner_id: row.owner_id,
          p_expected_revision: row.revision, p_document: next,
        });
        if (error) throw new ServiceError("database_unavailable", 503);
        if (!Array.isArray(data) || data.length === 0)
          throw new ServiceError("revision_conflict", 409);
        const files = next.artifacts ?? [];
        const artifact = files[files.length - 1];
        return { ok: true, revision: data[0].new_revision, artifact,
          note: "Reference registered as reported; Author confirmation required" };
      },
    });
    send(res, rpc.status, rpc.body);
  } catch (error) {
    if (error instanceof ServiceError) {
      send(res, error.status, { error: error.code });
    } else if (error instanceof SyntaxError) {
      send(res, 400, { error: "invalid_json" });
    } else {
      send(res, 500, { error: "internal_error" });
    }
  }
}

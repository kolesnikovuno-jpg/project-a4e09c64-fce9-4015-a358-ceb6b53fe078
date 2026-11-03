/**
 * Minimal browser → independent Egg API bridge. No Lovable / existing site
 * Supabase client, no service-role key in the browser, no silent sync.
 */
import type { EggArtifact, EggProject } from "./eggArtifacts";

export type EggPublicAuthConfig = {
  ok: true;
  supabaseUrl: string;
  publishableKey: string;
  authMode: "email_otp";
};

export type EggServerProjectSummary = {
  projectId: string;
  revision: number;
  seed: string;
  updatedAt: string;
};
export type EggServerState = {
  ok: true;
  revision: number;
  project: {
    core: { seed: EggProject["seed"]; level: number; iteration: number };
    files: EggArtifact[];
    tasks: unknown[];
    events: unknown[];
  };
};
export type EggRemoteErrorCode =
  | "egg_engine_not_configured" | "authentication_required" | "invalid_user_session"
  | "database_unavailable" | "revision_conflict" | "project_not_found"
  | "forbidden" | "author_required" | "invalid_command" | "internal_error";

export class EggRemoteError extends Error {
  constructor(public readonly status: number, public readonly code: string) {
    super(code);
  }
}

const request = async (url: string, init?: RequestInit): Promise<Record<string, unknown>> => {
  const response = await fetch(url, { ...init, cache: "no-store", credentials: "omit" });
  let data: unknown;
  try { data = await response.json(); }
  catch { throw new EggRemoteError(response.status, "invalid_server_response"); }
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw new EggRemoteError(response.status, "invalid_server_response");
  const payload = data as Record<string, unknown>;
  if (!response.ok || payload.ok !== true)
    throw new EggRemoteError(response.status, String(payload.error ?? "server_error"));
  return payload;
};

const bearer = (token: string) => {
  if (!token || !/^[A-Za-z0-9._-]{20,4096}$/.test(token) ||
      token.startsWith("egg_v1_"))
    throw new EggRemoteError(401, "invalid_user_session");
  return { Authorization: "Bearer " + token };
};

export const getEggAuthConfig = async (): Promise<EggPublicAuthConfig> => {
  const response = await request("/api/egg-config");
  const url = response.supabaseUrl;
  const key = response.publishableKey;
  if (typeof url !== "string" || typeof key !== "string" ||
      !key.startsWith("sb_publishable_") || response.authMode !== "email_otp")
    throw new EggRemoteError(502, "invalid_server_response");
  const u = new URL(url);
  if (u.protocol !== "https:" || !u.hostname.endsWith(".supabase.co") ||
      u.pathname !== "/" || u.search || u.hash)
    throw new EggRemoteError(502, "invalid_server_response");
  return { ok: true, supabaseUrl: url, publishableKey: key, authMode: "email_otp" };
};

export const listEggServerProjects = async (token: string): Promise<EggServerProjectSummary[]> => {
  const data = await request("/api/egg?list=1", { headers: bearer(token) });
  if (!Array.isArray(data.projects)) throw new EggRemoteError(502, "invalid_server_response");
  return data.projects as EggServerProjectSummary[];
};

export const readEggServerProject = async (
  token: string, projectId: string,
): Promise<EggServerState> => {
  const data = await request("/api/egg?projectId=" + encodeURIComponent(projectId), {
    headers: bearer(token),
  });
  return data as EggServerState;
};

export const writeEggServerProject = async (
  token: string, command: Record<string, unknown>,
): Promise<Record<string, unknown>> => request("/api/egg", {
  method: "POST",
  headers: { ...bearer(token), "Content-Type": "application/json" },
  body: JSON.stringify(command),
});

export const stableFileOperationId = (projectId: string, artifactId: string): string => {
  const id = "local-" + projectId + "-" + artifactId;
  if (!/^[A-Za-z0-9_-]{8,100}$/.test(id))
    throw new EggRemoteError(400, "invalid_artifact_identity");
  return id;
};

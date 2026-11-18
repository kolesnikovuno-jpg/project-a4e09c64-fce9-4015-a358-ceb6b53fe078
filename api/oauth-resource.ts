import type { IncomingMessage, ServerResponse } from "node:http";
import { getEggStorageConfig } from "../src/server/eggStorageConfig.js";
import { eggMcpTools, processEggMcp } from "../src/lib/eggMcpProtocol.js";

/**
 * Two public, read-only routes share one Vercel function to respect the
 * Hobby function-count limit. Neither route needs bearer credentials.
 * /api/mcp-health is rewritten to this handler with mode=health.
 */
async function mcpHealth(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET") { res.statusCode = 405; res.setHeader("Allow", "GET"); return res.end(); }
  const unavailable = async (): Promise<never> => { throw new Error("not_available"); };
  const operations = { getState: unavailable, contributeSphere: unavailable,
    registerDriveFile: unavailable, proposeSeed: unavailable,
    registerFieldItem: unavailable, proposeConcept: unavailable };
  const init = await processEggMcp({ jsonrpc: "2.0", id: 1, method: "initialize" }, operations);
  const listed = await processEggMcp({ jsonrpc: "2.0", id: 2, method: "tools/list" }, operations);
  const version = (init.body as any)?.result?.protocolVersion;
  const tools = (listed.body as any)?.result?.tools;
  const protocolOk = init.status === 200 && listed.status === 200 &&
    version === "2025-06-18" && Array.isArray(tools) && tools.length === eggMcpTools.length;
  const storageConfigured = Boolean(getEggStorageConfig(process.env));
  const ok = protocolOk && storageConfigured;
  res.statusCode = ok ? 200 : 503;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify({ok,protocolVersion:version ?? null,
    checks:{protocol:protocolOk,storageConfigured},
    toolNames:Array.isArray(tools)?tools.map((t:{name:string})=>t.name):[],
    note:"Protocol and storage configuration only; OAuth and real authenticated database access not tested."}));
}

/** RFC 9728 discovery for EGG's dedicated Supabase OAuth 2.1 issuer. */
export default function handler(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "/api/oauth-resource", "https://egg.invalid");
  if (url.searchParams.get("mode") === "health" || url.pathname === "/api/mcp-health")
    return mcpHealth(req, res);
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET");
    return res.end();
  }
  const config = getEggStorageConfig(process.env);
  if (!config) {
    res.statusCode = 503;
    return res.end(JSON.stringify({ error: "egg_engine_not_configured" }));
  }
  const origin = process.env.EGG_MCP_PUBLIC_ORIGIN?.trim();
  if (!origin || !/^https:\/\/[^/]+$/.test(origin)) {
    res.statusCode = 503;
    return res.end(JSON.stringify({ error: "oauth_origin_not_configured" }));
  }
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300");
  res.end(JSON.stringify({
    resource: origin + "/api/mcp",
    authorization_servers: [config.url.replace(/\/$/, "") + "/auth/v1"],
    bearer_methods_supported: ["header"],
  }));
}

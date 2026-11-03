import type { IncomingMessage, ServerResponse } from "node:http";
import { getEggStorageConfig } from "../src/server/eggStorageConfig.js";

/** RFC 9728 discovery for EGG's dedicated Supabase OAuth 2.1 issuer. */
export default function handler(req: IncomingMessage, res: ServerResponse) {
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
    authorization_servers: [config.url + "/auth/v1"],
    bearer_methods_supported: ["header"],
  }));
}

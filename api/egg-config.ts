/**
 * Public configuration for browser authentication in the independent Egg test.
 * Supabase publishable keys are public by design; the server's sb_secret key
 * must NEVER be sent here. No user/session/project data is exposed.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import { getEggStorageConfig } from "../src/server/eggStorageConfig.js";

export default function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("Allow", "GET");
  res.setHeader("Cache-Control", "no-store, private");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: "method_not_allowed" }));
    return;
  }
  const config = getEggStorageConfig(process.env);
  if (!config) {
    res.statusCode = 503;
    res.end(JSON.stringify({ ok: false, error: "egg_engine_not_configured" }));
    return;
  }
  res.statusCode = 200;
  res.end(JSON.stringify({
    ok: true,
    supabaseUrl: config.url,
    publishableKey: config.publishableKey,
    authMode: "email_otp",
  }));
}

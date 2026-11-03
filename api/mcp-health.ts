import type { IncomingMessage, ServerResponse } from "node:http";
import { eggMcpTools, processEggMcp } from "../src/lib/eggMcpProtocol.js";
/** Read-only protocol self-test. No tokens, no database, no user data. */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET") { res.statusCode = 405; res.setHeader("Allow", "GET"); return res.end(); }
  const unavailable = async (): Promise<never> => { throw new Error("not_available"); };
  const operations = { getState: unavailable, contributeSphere: unavailable, registerDriveFile: unavailable, proposeSeed: unavailable };
  const init = await processEggMcp({ jsonrpc: "2.0", id: 1, method: "initialize" }, operations);
  const listed = await processEggMcp({ jsonrpc: "2.0", id: 2, method: "tools/list" }, operations);
  const version = (init.body as any)?.result?.protocolVersion;
  const tools = (listed.body as any)?.result?.tools;
  const ok = init.status === 200 && listed.status === 200 && version === "2025-06-18" &&
    Array.isArray(tools) && tools.length === eggMcpTools.length;
  res.statusCode = ok ? 200 : 503;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify({ ok, protocolVersion: version ?? null,
    toolNames: Array.isArray(tools) ? tools.map((t: {name:string}) => t.name) : [],
    note: "Local protocol check only; OAuth and ChatGPT not tested." }));
}

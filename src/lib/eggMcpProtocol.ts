/**
 * Egg v0.5: small stateless MCP JSON-RPC adapter for external AI clients.
 * The protocol layer knows NOTHING about secrets, Drive files or databases.
 * It delegates three safe scoped operations to authenticated server handlers.
 *
 * The "register" tool only stores a Drive reference. It cannot upload files,
 * prove that an upload succeeded, confirm an Author's decision, or grant access.
 */
import { z } from "zod";

export const eggMcpTools = [
  {
    name: "egg_get_project_state",
    title: "Read Egg project",
    description: "Read the Author's Egg project state, sphere work, registered files and current revision. Requires a project-scoped Egg access key.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", format: "uuid", description: "Egg project UUID provided by the Author" },
      },
      required: ["projectId"], additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "egg_contribute_sphere",
    title: "Contribute to an Egg sphere",
    description: "Submit a scoped AI question, start work, or return a finding for Author review. Cannot approve decisions or advance iterations. Read state to get expectedRevision and task IDs; retry after revision conflict only after rereading state.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", format: "uuid" },
        expectedRevision: { type: "integer", minimum: 1 },
        command: { type: "string", enum: ["route", "start", "return"] },
        from: { type: "string", enum: ["idea", "marketing", "legal", "design", "production", "testDrive", "procurement", "commerce", "retail"] },
        to: { type: "string", enum: ["marketing", "legal", "design", "production", "testDrive", "procurement", "commerce", "retail"] },
        question: { type: "string" }, taskId: { type: "string" }, text: { type: "string" },
        evidence: { type: "string", enum: ["observation", "hypothesis", "question"] },
        sourceRefs: { type: "array", items: { type: "string" } },
      },
      required: ["projectId", "expectedRevision", "command"], additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: "egg_propose_seed",
    title: "Propose initial idea for Author review",
    description: "Save a draft initial idea to an empty Egg project. This does not approve the idea or launch sphere tasks. Only the Author can approve it in EGG.",
    inputSchema: { type: "object", properties: { projectId: { type: "string", format: "uuid" }, expectedRevision: { type: "integer", minimum: 1 }, seed: { type: "string", minLength: 1, maxLength: 10000 } }, required: ["projectId", "expectedRevision", "seed"], additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: "egg_register_field_item",
    title: "Register knowledge or a work proposal",
    description: "Contribute a source-backed research note, question or proposal into the Egg knowledge field, attributed to an external AI agent. Requires a scoped contribute key and a stable operationId. Never modifies Author-approved core, level or iteration; external facts are not automatically verified.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", format: "uuid" },
        operationId: { type: "string", minLength: 8, maxLength: 100, description: "Unique stable ID, reuse for the same contribution on retries" },
        sphere: { type: "string", enum: ["marketing","legal","design","production","testDrive","procurement","commerce","retail"] },
        flow: { type: "string", enum: ["field","work"], description: "field = reusable knowledge, work = unapproved sphere proposal" },
        origin: { type: "string", enum: ["internal","external"] },
        sourceKind: { type: "string", enum: ["idea","concept","web","document","database","service","human","observation","device","ai","other"] },
        title: { type: "string", minLength: 1, maxLength: 180 },
        content: { type: "string", minLength: 1, maxLength: 8000 },
        sourceUri: { type: "string", format: "uri", description: "Optional original http(s) reference; must be real, never invented" },
        claimType: { type: "string", enum: ["fact","hypothesis","question","proposal"] },
      },
      required: ["projectId","operationId","sphere","flow","origin","sourceKind","title","content","claimType"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "egg_register_drive_file",
    title: "Register a Google Drive file",
    description: "After your Google Drive connector ACTUALLY returns a file ID, register only its reference in the Egg project. This does NOT upload the file or independently verify it. The Author reviews it separately. Read state first to obtain expectedRevision. Generate a stable operationId once for the file-save action, and reuse it on retries. On revision conflict, read the latest revision and retry with the SAME operationId.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", format: "uuid", description: "Egg project UUID" },
        expectedRevision: { type: "integer", minimum: 1, description: "Revision returned by egg_get_project_state" },
        operationId: { type: "string", minLength: 8, maxLength: 100, description: "Stable ID for this save action. MUST reuse on retries; never reuse for a different file." },
        fileId: { type: "string", minLength: 10, maxLength: 256, description: "Actual Drive file ID returned by Google Drive, never invent a value" },
        title: { type: "string", minLength: 1, maxLength: 250 },
        mimeType: { type: "string", minLength: 1, maxLength: 140, description: "MIME type returned by Google Drive" },
        collectionKey: { type: "string", minLength: 1, maxLength: 80, description: "Stable material group, e.g. design/sketches" },
        sphere: { type: "string", enum: ["marketing", "legal", "design", "production", "testDrive", "procurement", "commerce", "retail"] },
        taskId: { type: "string", minLength: 1, maxLength: 100 },
        webUrl: { type: "string", format: "uri", description: "Optional URL returned by Drive and pointing to the same file ID" },
      },
      required: ["projectId", "expectedRevision", "operationId", "fileId", "title", "mimeType", "collectionKey"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
] as const;

const baseParams = z.object({ projectId: z.string().uuid() }).strict();
const registerParams = baseParams.extend({
  expectedRevision: z.number().int().positive(),
  operationId: z.string().regex(/^[A-Za-z0-9_-]{8,100}$/),
  fileId: z.string().regex(/^[a-zA-Z0-9_-]{10,256}$/),
  title: z.string().trim().min(1).max(250),
  mimeType: z.string().trim().min(1).max(140),
  collectionKey: z.string().trim().min(1).max(80),
  sphere: z.enum(["marketing", "legal", "design", "production", "testDrive",
    "procurement", "commerce", "retail"]).optional(),
  taskId: z.string().min(1).max(100).optional(),
  webUrl: z.string().url().max(1200).optional(),
}).strict();

const fieldParams = baseParams.extend({
  operationId: z.string().regex(/^[A-Za-z0-9_-]{8,100}$/),
  sphere: z.enum(["marketing","legal","design","production","testDrive","procurement","commerce","retail"]),
  flow: z.enum(["field","work"]),
  origin: z.enum(["internal","external"]),
  sourceKind: z.enum(["idea","concept","web","document","database","service","human","observation","device","ai","other"]),
  title: z.string().trim().min(1).max(180),
  content: z.string().trim().min(1).max(8000),
  sourceUri: z.string().url().max(1000).refine(u=>/^https?:\\/\\//i.test(u), "HTTP(S) only").optional(),
  claimType: z.enum(["fact","hypothesis","question","proposal"]),
}).strict();

const proposalParams = baseParams.extend({ expectedRevision: z.number().int().positive(), seed: z.string().trim().min(1).max(10000) }).strict();

const contributeParams = z.discriminatedUnion("command", [
  baseParams.extend({ expectedRevision: z.number().int().positive(), command: z.literal("route"), from: z.enum(["idea", "marketing", "legal", "design", "production", "testDrive", "procurement", "commerce", "retail"]), to: z.enum(["marketing", "legal", "design", "production", "testDrive", "procurement", "commerce", "retail"]), question: z.string().trim().min(1).max(10000) }).strict(),
  baseParams.extend({ expectedRevision: z.number().int().positive(), command: z.literal("start"), taskId: z.string().min(1).max(100) }).strict(),
  baseParams.extend({ expectedRevision: z.number().int().positive(), command: z.literal("return"), taskId: z.string().min(1).max(100), text: z.string().trim().min(1).max(10000), evidence: z.enum(["observation", "hypothesis", "question"]), sourceRefs: z.array(z.string().min(1).max(600)).max(20).optional() }).strict(),
]);

export type EggMcpOperations = {
  contributeSphere: (args: z.infer<typeof contributeParams>) => Promise<unknown>;
  getState: (projectId: string) => Promise<unknown>;
  proposeSeed: (args: z.infer<typeof proposalParams>) => Promise<unknown>;
  registerDriveFile: (args: z.infer<typeof registerParams>) => Promise<unknown>;
  registerFieldItem: (args: z.infer<typeof fieldParams>) => Promise<unknown>;
};

const jsonError = (id: unknown, code: number, message: string) => ({
  jsonrpc: "2.0", id: id ?? null, error: { code, message },
});
const response = (id: unknown, result: unknown) => ({ jsonrpc: "2.0", id, result });
const toolResponse = (value: unknown, error = false) => ({
  content: [{ type: "text", text: JSON.stringify(value) }],
  isError: error,
});

export const processEggMcp = async (
  incoming: unknown, operations: EggMcpOperations,
): Promise<{ status: number; body?: unknown }> => {
  if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
    return { status: 400, body: jsonError(null, -32600, "Invalid request") };
  }
  const msg = incoming as Record<string, unknown>;
  const { id, method, params } = msg;
  if (msg.jsonrpc !== "2.0" || typeof method !== "string" ||
      (id !== undefined && !(typeof id === "number" || typeof id === "string"))) {
    return { status: 400, body: jsonError(null, -32600, "Invalid request") };
  }
  // MCP client initialized notification contains no id and needs no response.
  if (id === undefined) {
    if (method === "notifications/initialized" || method === "notifications/cancelled")
      return { status: 202 };
    return { status: 400, body: jsonError(null, -32600, "Unexpected notification") };
  }
  if (method === "initialize") {
    return {
      status: 200,
      body: response(id, {
        protocolVersion: "2025-06-18",
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "egg-engine", version: "0.5.0" },
        instructions: "Use this server only for a project explicitly authorized by the Author. Upload or create documents with a separate, authorized Google Drive tool BEFORE registering their real file IDs here. Never infer that a registered link is verified.",
      }),
    };
  }
  if (method === "ping") return { status: 200, body: response(id, {}) };
  if (method === "tools/list") {
    return { status: 200, body: response(id, { tools: eggMcpTools }) };
  }
  if (method !== "tools/call") return { status: 200, body: jsonError(id, -32601, "Method not found") };
  const invocation = z.object({
    name: z.enum(["egg_get_project_state", "egg_register_drive_file", "egg_contribute_sphere", "egg_propose_seed", "egg_register_field_item"]),
    arguments: z.unknown().optional(),
  }).passthrough().safeParse(params);
  if (!invocation.success) return { status: 200, body: jsonError(id, -32602, "Invalid tool call") };

  const { name, arguments: args } = invocation.data;
  const validation = name === "egg_get_project_state"
    ? baseParams.safeParse(args)
    : name === "egg_contribute_sphere" ? contributeParams.safeParse(args)
    : name === "egg_propose_seed" ? proposalParams.safeParse(args)
    : name === "egg_register_field_item" ? fieldParams.safeParse(args) : registerParams.safeParse(args);
  if (!validation.success) return { status: 200, body: jsonError(id, -32602, "Invalid tool arguments") };

  try {
    const value = name === "egg_get_project_state"
      ? await operations.getState((validation.data as { projectId: string }).projectId)
      : name === "egg_contribute_sphere"
        ? await operations.contributeSphere(validation.data as z.infer<typeof contributeParams>)
        : name === "egg_propose_seed"
          ? await operations.proposeSeed(validation.data as z.infer<typeof proposalParams>)
          : name === "egg_register_field_item"
            ? await operations.registerFieldItem(validation.data as z.infer<typeof fieldParams>)
            : await operations.registerDriveFile(validation.data as z.infer<typeof registerParams>);
    return { status: 200, body: response(id, toolResponse(value)) };
  } catch (error) {
    // Tool errors are tool results (not protocol failures). Avoid stack traces,
    // secrets, arbitrary user material, server internals or raw error text.
    const code = typeof error === "object" && error !== null && "code" in error &&
      typeof (error as { code: unknown }).code === "string"
      ? (error as { code: string }).code : "operation_failed";
    const safe = [
      "forbidden", "project_not_found", "revision_conflict", "database_unavailable",
      "invalid_state_transition", "invalid_project_id",
    ].includes(code) ? code : "operation_failed";
    return { status: 200, body: response(id, toolResponse({ ok: false, error: safe }, true)) };
  }
};

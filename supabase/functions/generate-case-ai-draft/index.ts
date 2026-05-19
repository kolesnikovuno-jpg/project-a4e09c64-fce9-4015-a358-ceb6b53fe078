import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const isAdmin = Array.isArray(roles) && roles.some((r: { role: string }) => r.role === "admin");
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const caseId = body?.case_id;
    if (!caseId || typeof caseId !== "string") return json({ error: "case_id required" }, 400);

    const { data: c, error: caseErr } = await admin
      .from("cases")
      .select("id, language, raw_input, client_name, email, submission_id")
      .eq("id", caseId)
      .maybeSingle();
    if (caseErr || !c) return json({ error: caseErr?.message ?? "Case not found" }, 404);

    // Pull the original submission (intake text, attachments, prior assessment)
    let submission: {
      name: string | null;
      email: string | null;
      language: string | null;
      situation: string | null;
      uncertainty: string | null;
      scope: string | null;
      supporting_links: string | null;
      assessment_notes: string | null;
    } | null = null;
    if (c.submission_id) {
      const { data: s } = await admin
        .from("submissions")
        .select("name, email, language, situation, uncertainty, scope, supporting_links, assessment_notes")
        .eq("id", c.submission_id)
        .maybeSingle();
      submission = s ?? null;
    }

    // --- Ingest submission attachments (same pipeline as primary assessment) ---
    const supportingLinks = submission?.supporting_links ?? "";
    const linkLines = supportingLinks.split("\n");
    const attachmentPaths: { name: string; path: string }[] = [];
    for (const line of linkLines) {
      const m = line.match(/(intake\/[^\s]+)\s*$/);
      if (m) {
        const path = m[1];
        const name = line.split("—")[0]?.trim() || path.split("/").pop() || path;
        attachmentPaths.push({ name, path });
      }
    }

    type AttachmentPart =
      | { type: "image_url"; image_url: { url: string }; _name: string }
      | { type: "pdf_text"; name: string; text: string };
    const attachmentParts: AttachmentPart[] = [];
    const attachmentSummary: string[] = [];

    for (const att of attachmentPaths) {
      try {
        const { data: dl, error: dlErr } = await admin.storage
          .from("clarity-attachments")
          .download(att.path);
        if (dlErr || !dl) {
          attachmentSummary.push(`- ${att.name}: download failed (${dlErr?.message ?? "no data"})`);
          continue;
        }
        const buf = new Uint8Array(await dl.arrayBuffer());
        const mime = dl.type || guessMime(att.name);

        if (mime.startsWith("image/")) {
          const MAX_IMAGE_BYTES = 3_500_000;
          if (buf.length > MAX_IMAGE_BYTES) {
            attachmentSummary.push(`- ${att.name}: image skipped (${buf.length} bytes > ${MAX_IMAGE_BYTES} cap)`);
            continue;
          }
          const b64img = base64Encode(buf);
          attachmentParts.push({
            type: "image_url",
            image_url: { url: `data:${mime};base64,${b64img}` },
            _name: att.name,
          });
          attachmentSummary.push(`- ${att.name}: image (${mime}, ${buf.length} bytes) — sent to vision model`);
        } else if (mime === "application/pdf" || att.name.toLowerCase().endsWith(".pdf")) {
          let extracted = "";
          try {
            const { extractText, getDocumentProxy } = await import("https://esm.sh/unpdf@0.12.1");
            const pdf = await getDocumentProxy(buf);
            const out = await extractText(pdf, { mergePages: true });
            extracted = (Array.isArray(out.text) ? out.text.join("\n") : out.text ?? "")
              .replace(/\s+/g, " ")
              .trim();
          } catch (e) {
            console.error("[ai-draft] pdf text extract failed", att.path, e);
          }
          if (extracted.length > 50) {
            const capped = extracted.length > 50_000 ? extracted.slice(0, 50_000) + " …[truncated]" : extracted;
            attachmentParts.push({ type: "pdf_text", name: att.name, text: capped });
            attachmentSummary.push(`- ${att.name}: PDF text extracted (${capped.length} chars)`);
          } else {
            attachmentSummary.push(`- ${att.name}: PDF text unreadable, skipped`);
          }
        } else {
          attachmentSummary.push(`- ${att.name}: skipped (unsupported mime ${mime})`);
        }
      } catch (e) {
        attachmentSummary.push(`- ${att.name}: error ${String(e)}`);
      }
    }

    const pdfTextBlocks = attachmentParts
      .filter((p): p is Extract<AttachmentPart, { type: "pdf_text" }> => p.type === "pdf_text")
      .map((p) => `--- BEGIN PDF: ${p.name} ---\n${p.text}\n--- END PDF: ${p.name} ---`)
      .join("\n\n");

    const lang = c.language ?? submission?.language ?? "match client";

    const prompt = `ROLE:
Internal structural diagnostic expert producing a working draft for the case (not client-facing).

INPUT BUNDLE:
You receive the FULL original submission context — intake text, client metadata, prior structural assessment, and the same multimodal attachments (images + PDFs) that were ingested upstream. Treat attachments as first-class evidence.

DISCIPLINE:
- Precision over invention. Interpretation allowed, fabrication not.
- Separate FACT from HYPOTHESIS. Mark provisional reasoning explicitly.
- Do NOT say "images absent" / "signal absent" if attachments are listed below — they are present in this message as multimodal parts.

CLIENT:
Name: ${c.client_name ?? submission?.name ?? "Not provided"}
Email: ${c.email ?? submission?.email ?? ""}
Language: ${lang}

ORIGINAL SUBMISSION:
Situation:
${submission?.situation ?? ""}

Uncertainty:
${submission?.uncertainty ?? ""}

Scope:
${submission?.scope ?? ""}

Supporting links:
${supportingLinks}

CASE RAW INPUT (post-intake compiled):
${c.raw_input ?? ""}

PRIOR STRUCTURAL ASSESSMENT (from primary pipeline):
${submission?.assessment_notes ?? "(none)"}

ATTACHMENTS:
${attachmentSummary.length ? attachmentSummary.join("\n") : "(none)"}

${pdfTextBlocks ? "PDF text content:\n" + pdfTextBlocks + "\n" : ""}
${attachmentParts.some((p) => p.type === "image_url")
  ? "Image attachments are included as multimodal image_url parts in this same user message. You MUST visually inspect them and explicitly reference their content where relevant."
  : ""}

REQUIRED OUTPUT:

1. Explicit client problem
2. Hidden structural tension (evidence-based, may reference attachments)
3. Structural diagnosis
4. Correction vectors
5. Internal expert working draft (preliminary response, not client-facing)

HARD RULES:
- Use attachment content (images + PDF text) where it strengthens diagnosis.
- Do NOT invent identity, ownership, legal narratives, or psychology.
- If a section truly has no signal, say so explicitly — but only after considering attachments.
- Output language: ${lang}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

    const userContent: Array<Record<string, unknown>> = [{ type: "text", text: prompt }];
    for (const p of attachmentParts) {
      if (p.type === "image_url") {
        userContent.push({ type: "text", text: `Attachment image: ${p._name}` });
        userContent.push({ type: "image_url", image_url: p.image_url });
      }
    }

    console.log("[ai-draft] calling AI gateway for case", caseId, "attachments:", attachmentSummary);
    const t0 = Date.now();
    let aiResp: Response;
    try {
      aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: "You are an internal structural diagnostic expert. You do not invent facts, you do not infer psychology, and you do not use customer-support tone. You separate facts from hypotheses. You visually inspect any image attachments provided and explicitly reference them in your output." },
            { role: "user", content: userContent },
          ],
        }),
      });
    } catch (e) {
      console.error("[ai-draft] fetch failed", e);
      return json({ error: `AI fetch failed: ${String(e)}` }, 500);
    }
    console.log("[ai-draft] AI gateway responded", aiResp.status, "in", Date.now() - t0, "ms");

    if (!aiResp.ok) {
      const text = await aiResp.text();
      console.error("[ai-draft] AI error body", text);
      if (aiResp.status === 429) return json({ error: "Rate limit exceeded, try again later" }, 429);
      if (aiResp.status === 402) return json({ error: "AI credits exhausted" }, 402);
      return json({ error: `AI error: ${text}` }, 500);
    }

    const aiJson = await aiResp.json();
    const draft = aiJson?.choices?.[0]?.message?.content;
    if (!draft || typeof draft !== "string") {
      console.error("[ai-draft] empty response", JSON.stringify(aiJson).slice(0, 500));
      return json({ error: "Empty AI response" }, 500);
    }

    const { error: updErr } = await admin
      .from("cases")
      .update({ ai_draft: draft, service_status: "drafting" })
      .eq("id", caseId);
    if (updErr) {
      console.error("[ai-draft] db update failed", updErr.message);
      return json({ error: updErr.message }, 500);
    }

    return json({ ai_draft: draft, service_status: "drafting" }, 200);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function base64Encode(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function guessMime(name: string): string {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (ext === "pdf") return "application/pdf";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "heic") return "image/heic";
  return "application/octet-stream";
}

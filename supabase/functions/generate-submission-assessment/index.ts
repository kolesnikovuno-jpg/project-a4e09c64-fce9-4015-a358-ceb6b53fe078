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
    const submissionId = body?.submission_id;
    if (!submissionId || typeof submissionId !== "string") {
      return json({ error: "submission_id required" }, 400);
    }

    const { data: s, error: subErr } = await admin
      .from("submissions")
      .select("id, name, email, language, situation, uncertainty, scope, supporting_links")
      .eq("id", submissionId)
      .maybeSingle();
    if (subErr || !s) return json({ error: subErr?.message ?? "Submission not found" }, 404);

    // --- Ingest submission attachments ---
    // supporting_links lines look like: "filename.ext — intake/<session>/<ts>-<file>"
    const linkLines = (s.supporting_links ?? "").split("\n");
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
      | { type: "pdf_text"; name: string; text: string }
      | { type: "pdf_inline"; name: string; dataUrl: string };
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
          // Downscale large images so the request stays well under gateway body limits
          // and the vision model reliably ingests them.
          let outBytes = buf;
          let outMime = mime;
          if (buf.length > 600_000) {
            try {
              const { Image } = await import("https://deno.land/x/imagescript@1.2.17/mod.ts");
              const img = await Image.decode(buf);
              const maxDim = 1280;
              const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
              if (scale < 1) img.resize(Math.round(img.width * scale), Math.round(img.height * scale));
              outBytes = await img.encodeJPEG(82);
              outMime = "image/jpeg";
            } catch (e) {
              console.error("[assessment] image resize failed, sending original", att.name, e);
            }
          }
          const b64img = base64Encode(outBytes);
          attachmentParts.push({
            type: "image_url",
            image_url: { url: `data:${outMime};base64,${b64img}` },
            _name: att.name,
          });
          attachmentSummary.push(
            `- ${att.name}: image (${outMime}, ${outBytes.length} bytes${outBytes.length !== buf.length ? `, resized from ${buf.length}` : ""}) — sent to vision model`,
          );
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
            console.error("[assessment] pdf text extract failed", att.path, e);
          }
          if (extracted.length > 50) {
            attachmentParts.push({ type: "pdf_text", name: att.name, text: extracted });
            attachmentSummary.push(`- ${att.name}: PDF text extracted (${extracted.length} chars)`);
          } else {
            // fall back to inline PDF for vision model OCR
            const b64pdf = base64Encode(buf);
            attachmentParts.push({
              type: "pdf_inline",
              name: att.name,
              dataUrl: `data:application/pdf;base64,${b64pdf}`,
            });
            attachmentSummary.push(`- ${att.name}: PDF inline (${buf.length} bytes) — sent to vision model for OCR`);
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

    const prompt = `Internal pre-payment evaluation of an incoming client request.

Client language:
${s.language ?? "unspecified"}

Client:
${s.name ?? "Not provided"} <${s.email}>

Situation:
${s.situation ?? ""}

Uncertainty:
${s.uncertainty ?? ""}

Scope:
${s.scope ?? ""}

Supporting links:
${s.supporting_links ?? ""}

Attachments ingested:
${attachmentSummary.length ? attachmentSummary.join("\n") : "(none)"}

${pdfTextBlocks ? "PDF text content:\n" + pdfTextBlocks + "\n" : ""}
${attachmentParts.some((p) => p.type === "image_url" || p.type === "pdf_inline")
  ? "Image and/or PDF attachments are included as multimodal parts in this same user message. You MUST inspect them and explicitly reflect their content in your assessment. Do NOT say 'image context unknown' or 'PDF relation unknown' — those attachments are present in this request.\n"
  : ""}
Task:
Produce an internal pre-payment evaluation of this request for the operator.

Required output:

1. Explicit request
What the client is directly asking for.

2. Ambiguities / missing signal
Unclear assumptions, contradictions, or missing framing. Label uncertainty clearly.

3. Structural fit assessment
How well this request fits the studio's structural diagnostic work.

4. Risks / blockers
Concrete risks, red flags, or critical missing context.

5. Recommendation
One of: accept / clarify / reject — with a short reason.

Hard rules:
- Do NOT invent facts. If input lacks signal, explicitly state insufficient information.
- Separate facts from hypotheses. Label uncertainty clearly.
- Do NOT infer client psychology, motives, or hidden causes without evidence.
- If input is semantically invalid, diagnose intake failure instead of inventing a case analysis.
- Internal expert draft only. Not customer support. Not client-facing communication. Not sales tone.
- Focus on structural mismatch, constraints, dependencies, ambiguity, and system conditions.
- Prefer diagnostic precision over helpful verbosity.
- If analysis is impossible, explicitly say: "Analysis impossible due to insufficient signal."
- No generic therapeutic language.
- No fabricated assumptions.
- No support-agent style responses.
- If attachments are present, explicitly describe what each image/PDF contains and how it relates (or fails to relate) to the request.
- Output language: ${s.language ?? "match client"}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

    // Build multimodal user content: text + image_url parts (images and inline PDFs)
    const userContent: Array<Record<string, unknown>> = [{ type: "text", text: prompt }];
    for (const p of attachmentParts) {
      if (p.type === "image_url") {
        userContent.push({ type: "text", text: `Attachment image: ${p._name}` });
        userContent.push({ type: "image_url", image_url: p.image_url });
      } else if (p.type === "pdf_inline") {
        userContent.push({ type: "text", text: `Attachment PDF (inline): ${p.name}` });
        userContent.push({ type: "image_url", image_url: { url: p.dataUrl } });
      }
    }
    const approxBytes = JSON.stringify(userContent).length;
    console.log("[assessment] user content parts:", userContent.length, "approx bytes:", approxBytes);

    console.log("[assessment] calling AI gateway for submission", submissionId);
    console.log("[assessment] attachments:", attachmentSummary);
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
            { role: "system", content: "You are an internal structural diagnostic evaluator. You do not invent facts, you do not infer psychology, and you do not use customer-support tone. Your output is terse, precise, and strictly separates facts from hypotheses. When signal is insufficient, you say so explicitly." },
            { role: "user", content: userContent },
          ],
        }),
      });
    } catch (e) {
      console.error("[assessment] fetch failed", e);
      return json({ error: `AI fetch failed: ${String(e)}` }, 500);
    }
    console.log("[assessment] AI responded", aiResp.status, "in", Date.now() - t0, "ms");

    if (!aiResp.ok) {
      const text = await aiResp.text();
      console.error("[assessment] AI error body", text);
      if (aiResp.status === 429) return json({ error: "Rate limit exceeded, try again later" }, 429);
      if (aiResp.status === 402) return json({ error: "AI credits exhausted" }, 402);
      return json({ error: `AI error: ${text}` }, 500);
    }

    const aiJson = await aiResp.json();
    const assessment = aiJson?.choices?.[0]?.message?.content;
    if (!assessment || typeof assessment !== "string") {
      console.error("[assessment] empty response", JSON.stringify(aiJson).slice(0, 500));
      return json({ error: "Empty AI response" }, 500);
    }

    const { error: updErr } = await admin
      .from("submissions")
      .update({ assessment_notes: assessment })
      .eq("id", submissionId);
    if (updErr) {
      console.error("[assessment] db update failed", updErr.message);
      return json({ error: updErr.message }, 500);
    }

    return json({ assessment_notes: assessment }, 200);
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
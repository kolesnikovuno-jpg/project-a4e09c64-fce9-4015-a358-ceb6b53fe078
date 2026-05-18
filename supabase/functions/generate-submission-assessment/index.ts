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

Task:
Produce an internal pre-payment evaluation of this request for the operator.

Required output:

1. Explicit request
What the client is directly asking for.

2. Hidden ambiguity / uncertainty
Unclear assumptions, contradictions, or missing framing.

3. Structural fit assessment
How well this request fits the studio's structural diagnostic work.

4. Potential risks / missing information
Concrete risks, red flags, or critical missing context.

5. Preliminary recommendation
One of: accept / clarify / reject — with a short reason.

Rules:
- match output language to client language (${s.language ?? "match client"})
- internal operator use only, not client-facing
- no sales language`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

    console.log("[assessment] calling AI gateway for submission", submissionId);
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
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You are an internal pre-payment evaluator producing concise operator assessments." },
            { role: "user", content: prompt },
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
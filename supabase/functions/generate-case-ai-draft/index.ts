import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }

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
      .select("id, language, raw_input, client_name")
      .eq("id", caseId)
      .maybeSingle();
    if (caseErr || !c) return json({ error: caseErr?.message ?? "Case not found" }, 404);

    const prompt = `Use this client case as an expert structural diagnostic draft.

Client language:
${c.language ?? "unspecified"}

Client:
${c.client_name ?? "Not provided"}

Case input:
${c.raw_input ?? ""}

Task:
Generate an internal working draft for expert review, not final client output.

Required output:

1. Explicit client problem
What the client directly describes.

2. Hidden structural tension
What underlying contradiction, mismatch, uncertainty, or pattern may be driving the issue.

3. Structural diagnosis
Interpret the architecture of the situation.

4. Possible correction vectors
Suggest meaningful structural shifts, reframing directions, or interventions.

5. Draft expert response
Create a preliminary expert working response.

Rules:
- match output language to client language (${c.language ?? "match client"})
- do not create client-facing sales language
- this is internal production draft only`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: "You are an expert structural diagnostic assistant producing internal expert drafts." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResp.ok) {
      const text = await aiResp.text();
      if (aiResp.status === 429) return json({ error: "Rate limit exceeded, try again later" }, 429);
      if (aiResp.status === 402) return json({ error: "AI credits exhausted" }, 402);
      return json({ error: `AI error: ${text}` }, 500);
    }

    const aiJson = await aiResp.json();
    const draft = aiJson?.choices?.[0]?.message?.content;
    if (!draft || typeof draft !== "string") {
      return json({ error: "Empty AI response" }, 500);
    }

    const { error: updErr } = await admin
      .from("cases")
      .update({ ai_draft: draft, service_status: "drafting" })
      .eq("id", caseId);
    if (updErr) return json({ error: updErr.message }, 500);

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
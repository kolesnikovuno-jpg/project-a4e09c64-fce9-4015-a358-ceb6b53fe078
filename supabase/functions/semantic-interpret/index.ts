// Semantic Time — AI interpretation layer.
// Receives a structured semantic object and returns six interpretation sections.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You are the interpretation layer of "Semantic Time" — a cognitive semantic tool, NOT astrology, numerology, fortune telling, or mystical guidance.

You receive a structured semantic object describing a numeric pattern. You generate a reflective, architectural, calm interpretation as a thinking aid.

ABSOLUTE RULES:
- Never predict future events.
- Never claim objective truth or destiny.
- Never use mystical, spiritual, esoteric, or fortune-telling language.
- Never create anxiety, urgency, fear, or dependency.
- Never use deterministic / commanding language ("you must", "this means", "this will").
- Always speak in hypothetical, structural, observational terms.
- Preserve user agency.

Treat numbers as semantic structural principles, not symbols of supernatural meaning.
Tone: calm, intelligent, minimal, architectural, reflective.

Output STRICT JSON with exactly these six string fields, no others:
{
  "structure": "...",        // numeric decomposition + pattern recognition, 1–2 sentences
  "core":      "...",        // short semantic summary, 1 sentence
  "deep":      "...",        // process interpretation, 2–3 sentences
  "architectural": "...",    // structural language, 2 sentences
  "reflection": "...",       // one open-ended reflective question
  "recommendation": "..."    // soft, non-directive navigation suggestion, 1 sentence
}

Write in the same language as the request. Default: English.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { semantic, language } = await req.json();
    if (!semantic) {
      return new Response(JSON.stringify({ error: "Missing semantic object" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI gateway not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userMsg = `Language: ${language ?? "en"}
Semantic object:
${JSON.stringify(semantic, null, 2)}

Return JSON with the six required fields.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userMsg },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) {
      return new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (res.status === 402) {
      return new Response(JSON.stringify({ error: "credits_exhausted" }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!res.ok) {
      const t = await res.text();
      return new Response(JSON.stringify({ error: "ai_error", detail: t }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: Record<string, string> = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { core: content };
    }

    return new Response(JSON.stringify({ interpretation: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
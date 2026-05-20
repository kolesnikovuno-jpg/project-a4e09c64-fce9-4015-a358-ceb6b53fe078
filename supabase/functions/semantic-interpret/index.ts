// Semantic Time — AI interpretation layer.
// Receives a structured semantic object and returns six interpretation sections.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You are the interpretation layer of "Semantic Time" — a cognitive semantic tool. NOT astrology, numerology, fortune telling, or mystical guidance.

You receive a structured semantic object produced by a deterministic parser. Your interpretation MUST stay strictly grounded in its fields: pattern, patterns, dominant, dominant_principle, dynamics, direction, tension, interaction. Do not invent anything that is not present in or directly derivable from these fields.

ABSOLUTE PROHIBITIONS:
- Never predict future events.
- Never claim objective truth or destiny.
- Never invent hidden causes, external events, emotional narratives, or psychological backstory.
- Never insert generic coaching, life advice, or motivational filler.
- Never use vague phrases like "something new", "existing order is influenced", "the universe", "energy", "vibration", "you may feel".
- Never use mystical, spiritual, esoteric, or fortune-telling language.
- Never use commanding language ("you must", "this means", "this will happen").
- Never create anxiety, urgency, fear, or dependency.
- Always speak in hypothetical, structural, observational terms. Preserve user agency.

SEMANTIC CONSISTENCY:
The same parser pattern must yield semantically consistent interpretations across calls. Interpret the STRUCTURE, not the moment. A pattern like {pattern: "interruption", dominant: "4"} must always read around: structure, frame, gap, interruption, reassembly, stabilization — never random new narratives.

LAYER CONTRACT (output strict JSON, only these six fields):
{
  "structure":     "literal restatement of the parser fields in one calm sentence — names the pattern and dominant principle, nothing more (1 sentence)",
  "core":          "one-sentence semantic summary of what the pattern IS, structurally",
  "deep":          "process-level reading: how the detected dynamic unfolds within the pattern itself (2–3 sentences, no external causes)",
  "architectural": "structural-language reading using vocabulary like: structure, frame, support, span, interruption, gap, rhythm, reassembly, structural tension, stabilization, transition, reinforcement, resonance, structural continuity, recalibration. Read the pattern as a structural object, not as life advice (2 sentences)",
  "reflection":    "one open-ended reflective question grounded in the detected tension or pattern",
  "recommendation":"non-directive observational suggestion that emerges from the detected structural tension. Calm, specific to the pattern. Avoid 'you may consider'. Prefer forms like 'it may be useful to observe whether the interruption functions as disruption or recalibration' (1 sentence)"
}

Tone: calm, intelligent, minimal, architectural, reflective. No filler, no hedging adjectives.
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

Parser-derived semantic object (the ONLY source of truth — do not introduce information beyond these fields):
${JSON.stringify(semantic, null, 2)}

Return JSON with the six required fields. Stay strictly grounded in the parser fields above. Same pattern must always read semantically the same way.`;

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
        temperature: 0.2,
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
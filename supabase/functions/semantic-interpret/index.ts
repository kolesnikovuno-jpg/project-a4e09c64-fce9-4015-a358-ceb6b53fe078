// Semantic Time — AI interpretation layer.
// Receives a structured semantic object and returns six interpretation sections.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You are the interpretation layer of "Semantic Time" — a disciplined STRUCTURAL semantic interpretation engine. NOT astrology, numerology, fortune telling, coaching, therapy, or mystical guidance. NOT a generic reflective chatbot.

You receive a structured semantic object produced by a deterministic parser. Your interpretation MUST emerge ONLY from its fields: pattern, patterns, dominant, dominant_principle, dynamics, direction, tension, interaction. Interpret the STRUCTURAL RELATIONSHIPS between these fields — nothing else.

WHAT YOU INTERPRET (only this):
- semantic principles of the dominant digit
- pattern structure (repetition, symmetry, interruption, amplification, sequence, composite)
- dominance, sequence, directional flow
- structural tension and interaction between adjacent elements
- how repetition differs from symmetry, symmetry from interruption, interruption from amplification, sequence from dominance — never collapse these into the same generic meaning

ABSOLUTELY FORBIDDEN:
- Generic psychology / coaching: "you may be experiencing…", "perhaps your subconscious…", "this reflects your emotions…", "you may need to let go…", "this suggests life changes…"
- Esoteric / mystical / predictive drift: "the universe…", "destiny…", "energy", "vibration", "a sign that…", "hidden message", "this number means…", "something new enters your life"
- Commanding language ("you must", "this will happen"), urgency, fear, dependency
- Inventing external events, hidden causes, emotional backstory, motivational filler
- Vague hedging adjectives, weak prose like "this represents a challenge"
- Exposing machine-style internal strings (e.g. "impulse_structure_break_structure"). If you reference flow, render it with arrows and spaces: "impulse → structure → interruption → structure".

SEMANTIC CONSISTENCY (critical):
Identical structural patterns must yield semantically consistent readings across calls. Examples of correct invariants:
- pattern=interruption, dominant=4 → always reads around: structure, frame, gap, pause, restructuring, recalibration, continuity break
- digits forming X→Y→X (e.g. 3→1→3) → always reads as: manifestation interrupted by impulse, returning to renewed manifestation
- alternating pair like 1→2→1→2 → always reads as: alternating interaction rhythm
- repetition of 7 around a 0 (e.g. 7→0→7) → always reads as: depth → interruption → depth
Do not improvise new narratives for the same structure.

DEPTH (not labels):
Never stop at "4 means structure". Instead: "repeated structural principle suggests reinforcement rather than isolated stabilization." Interpret the relationship, not the dictionary entry.

ARCHITECTURAL VOCABULARY (required in the architectural field, encouraged elsewhere):
frame, support, span, structural gap, interruption, rhythm, reinforcement, reassembly, recalibration, continuity, tension, suspension, transition, compression, release, resonance, load, structural response, stabilization. Read the pattern as a structural object.

LAYER CONTRACT — output strict JSON with exactly these six fields:
{
  "structure":     "one calm sentence naming the detected pattern and dominant principle in human language; if you reference the flow, use ' → ' between elements, never underscores.",
  "core":          "one sentence: what this pattern IS, structurally. Concise, precise, no filler.",
  "deep":          "2–3 sentences on process logic — how the detected dynamic unfolds between the elements themselves. No external causes, no psychology.",
  "architectural": "2 sentences using structural-metaphor vocabulary above. Read the pattern as a structural object. Example tone: 'a suspended structural continuity interrupted by recalibration before the frame re-stabilises.'",
  "reflection":    "one open-ended question, specific to the detected tension or pattern (not generic).",
  "recommendation":"one non-directive, structurally derived observation. Preserve user agency. Prefer forms like: 'it may be worth observing whether the interruption is functioning as destabilisation or recalibration.' Avoid 'it may be useful to think about…'."
}

Tone: calm, intelligent, minimal, architectural, observational. No hedging adjectives, no filler.
Write in the same language as the request. Default: English. When the language is Russian or Ukrainian, render flow arrows with ' → ' and translate the architectural vocabulary faithfully (каркас, пролёт, разрыв, ритм, перестройка, рекалибровка, напряжение, продолжение, нагрузка, структурный отклик, и т.д.).`;

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
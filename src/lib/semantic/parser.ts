// Semantic parser v0.3 — trajectory-aware hierarchical classification.
// Internal taxonomy ids are NEVER user-facing; the UI maps them via dictionary.

export type InputType = "time" | "symbol";

export interface SemanticObject {
  input_type: InputType;
  value: string;
  digits: string;
  pattern: string;                  // legacy alias of primary_pattern
  patterns: string[];                // all detected (internal ids)
  primary_pattern: string;           // top of hierarchy (internal id)
  secondary_pattern: string | null;  // (internal id)
  dominant: string;                  // most frequent digit
  dominant_principle: string;        // full principle string (en fallback)
  leading_digit: string;             // initiating digit (digits[0])
  trajectory: string;                // "ascent_to_inquiry" | "descent" | "toward_structure" | "toward_closure" | "flat" | "mixed"
  dynamics: string;
  direction: string;                 // principle short names joined " → "
  chain: string;                     // digits joined " → "
  tension: "low" | "medium" | "high";
  interaction: string[];             // pairwise transitions (internal)
}

export const PRINCIPLES: Record<string, string> = {
  "0": "pause / potential / gap",
  "1": "impulse / initiation",
  "2": "connection / interaction",
  "3": "expression / manifestation",
  "4": "structure / stabilization",
  "5": "movement / change",
  "6": "balance / integration",
  "7": "inquiry / depth",
  "8": "force / materialization",
  "9": "completion / cycle integration",
};

const PRINCIPLE_SHORT: Record<string, string> = {
  "0": "pause", "1": "impulse", "2": "connection", "3": "expression",
  "4": "structure", "5": "movement", "6": "balance",
  "7": "inquiry", "8": "force", "9": "completion",
};

function dominantDigit(digits: string): string {
  const counts: Record<string, number> = {};
  for (const d of digits) counts[d] = (counts[d] ?? 0) + 1;
  let best = digits[0]; let bestCount = 0;
  for (const [d, c] of Object.entries(counts)) if (c > bestCount) { best = d; bestCount = c; }
  return best;
}

function isRepetition(d: string) { return d.length >= 2 && d.split("").every((c) => c === d[0]); }
function isResonance(d: string)  { return isRepetition(d) && d.length >= 4; }
function isMirror(d: string)     { return d.length >= 3 && d === d.split("").reverse().join(""); }
function isAmplification(d: string) {
  if (d.length < 3) return false;
  const tail = d.slice(-3);
  if (!tail.split("").every((c) => c === tail[0])) return false;
  const prefix = d.slice(0, -3);
  return prefix.length > 0 && !prefix.includes(tail[0]);
}
function hasGap(d: string)  { return /[1-9]0[1-9]?/.test(d) || /[1-9]0+[1-9]/.test(d); }
function isSequence(d: string) {
  if (d.length < 3) return false;
  let asc = 0, desc = 0;
  for (let i = 1; i < d.length; i++) {
    const diff = Number(d[i]) - Number(d[i - 1]);
    if (diff === 1) asc++; else if (diff === -1) desc++;
  }
  return asc >= 2 || desc >= 2;
}
function sequenceAscending(d: string) {
  if (d.length < 3) return false;
  for (let i = 1; i < d.length; i++) if (Number(d[i]) <= Number(d[i - 1])) return false;
  return true;
}
function sequenceDescending(d: string) {
  if (d.length < 3) return false;
  for (let i = 1; i < d.length; i++) if (Number(d[i]) >= Number(d[i - 1])) return false;
  return true;
}
function isAlternation(d: string) {
  if (d.length < 4) return false;
  for (let i = 2; i < d.length; i++) if (d[i] !== d[i - 2]) return false;
  return d[0] !== d[1];
}
function isLoop(d: string) {
  // X … X — same first and last, length ≥ 3, not pure repetition
  return d.length >= 3 && d[0] === d[d.length - 1] && !isRepetition(d);
}

function buildInteractions(d: string): string[] {
  const out: string[] = [];
  for (let i = 1; i < d.length; i++) out.push(`${d[i - 1]}→${d[i]}`);
  return out;
}
function direction(d: string): string {
  return d.split("").map((c) => PRINCIPLE_SHORT[c] ?? c).join(" → ");
}
function chainOf(d: string): string { return d.split("").join(" → "); }

function tensionLevel(patterns: string[], digits: string): "low" | "medium" | "high" {
  if (patterns.includes("interruption")) return "high";
  if (patterns.includes("resonance") || patterns.includes("amplification")) return "high";
  if (patterns.includes("escalation")) return "high";
  if (patterns.includes("repetition")) return "high";
  if (patterns.includes("mirror") || patterns.includes("loop")) return "medium";
  if (digits.length <= 2) return "low";
  return "medium";
}

// Hierarchy — most structurally dominant pattern wins.
const PRIMARY_ORDER = [
  "interruption",
  "mirror",
  "resonance",
  "loop",
  "escalation",
  "progression",
  "closure",
  "alternation",
  "amplification",
  "repetition",
  "composite",
];

const DYNAMICS: Record<string, string> = {
  interruption: "restructuring / semantic pause",
  mirror: "reflection / feedback loop",
  resonance: "amplified resonance field",
  loop: "return / recursion",
  escalation: "ascent toward depth / inquiry",
  progression: "directional development",
  closure: "approach to integration",
  alternation: "rhythmic exchange / oscillation",
  amplification: "concentration / strengthening",
  repetition: "reinforcement / resonance",
  composite: "layered composition",
};

function trajectoryOf(d: string, patterns: string[]): string {
  const last = d[d.length - 1];
  if (patterns.includes("escalation")) {
    if (last === "7") return "ascent_to_inquiry";
    if (last === "0") return "ascent_to_gap";
    if (last === "9") return "ascent_to_completion";
  }
  if (patterns.includes("progression")) {
    if (sequenceAscending(d)) {
      if (last === "4") return "toward_structure";
      if (last === "9") return "toward_closure";
      return "ascent";
    }
    if (sequenceDescending(d)) return "descent";
  }
  if (patterns.includes("interruption")) return "interrupted";
  if (patterns.includes("mirror")) return "return";
  if (patterns.includes("loop")) return "return";
  if (patterns.includes("resonance") || patterns.includes("repetition")) return "flat";
  return "mixed";
}

// Pattern families — secondary is only meaningful when it lives in a different family.
const FAMILY: Record<string, string> = {
  interruption: "interruption",
  mirror: "mirror",
  loop: "mirror",
  resonance: "repetition",
  repetition: "repetition",
  amplification: "repetition",
  progression: "progression",
  escalation: "progression",
  closure: "progression",
  alternation: "alternation",
  composite: "composite",
};

function rankPrimary(patterns: string[]): { primary: string; secondary: string | null } {
  const ranked = PRIMARY_ORDER.filter((p) => patterns.includes(p));
  const primary = ranked[0] ?? patterns[0] ?? "composite";
  const primaryFamily = FAMILY[primary] ?? primary;
  // Secondary must be from a different family and not a generic fallback.
  const secondary =
    ranked.find(
      (p) => p !== primary && (FAMILY[p] ?? p) !== primaryFamily && p !== "composite"
    ) ?? null;
  return { primary, secondary };
}

export function parse(raw: string, type: InputType, displayValue: string): SemanticObject {
  const digits = raw.replace(/\D/g, "");
  const patterns: string[] = [];

  if (isResonance(digits)) patterns.push("resonance");
  if (isRepetition(digits)) patterns.push("repetition");
  if (isMirror(digits)) patterns.push("mirror");
  if (isAmplification(digits)) patterns.push("amplification");
  if (hasGap(digits)) patterns.push("interruption");

  // Progression / escalation are mutually exclusive primaries:
  // ascent toward inquiry/gap (7 or 0) → escalation, otherwise progression.
  if (isSequence(digits)) {
    const asc = sequenceAscending(digits);
    const last = digits[digits.length - 1];
    if (asc && (last === "7" || last === "0")) patterns.push("escalation");
    else patterns.push("progression");
  } else if (
    digits.length >= 3 &&
    Number(digits[digits.length - 1]) > Number(digits[0]) &&
    (digits[digits.length - 1] === "7" || digits[digits.length - 1] === "0")
  ) {
    patterns.push("escalation");
  }
  if (isAlternation(digits)) patterns.push("alternation");
  // Loop only when it is NOT also a mirror (mirror is the stronger reading).
  if (isLoop(digits) && !isMirror(digits)) patterns.push("loop");
  if (patterns.length === 0) patterns.push("composite");

  const dom = dominantDigit(digits);
  const { primary, secondary } = rankPrimary(patterns);
  const traj = trajectoryOf(digits, patterns);

  return {
    input_type: type,
    value: displayValue,
    digits,
    pattern: primary,
    patterns,
    primary_pattern: primary,
    secondary_pattern: secondary,
    dominant: dom,
    dominant_principle: PRINCIPLES[dom] ?? "—",
    leading_digit: digits[0] ?? dom,
    trajectory: traj,
    dynamics: DYNAMICS[primary] ?? "layered composition",
    direction: direction(digits),
    chain: chainOf(digits),
    tension: tensionLevel(patterns, digits),
    interaction: buildInteractions(digits),
  };
}

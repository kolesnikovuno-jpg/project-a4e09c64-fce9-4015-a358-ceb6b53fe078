// Semantic parser v0.2 — pattern detection over numeric strings.
// Hierarchical pattern classification, structural dominance typing.

export type InputType = "time" | "symbol";

export interface SemanticObject {
  input_type: InputType;
  value: string;
  digits: string;
  pattern: string;            // alias of primary_pattern (legacy)
  patterns: string[];          // all detected patterns
  primary_pattern: string;     // top of hierarchy
  secondary_pattern: string | null;
  primary_label: string;
  secondary_label: string | null;
  dominant: string;            // most frequent digit
  dominant_principle: string;
  dominance_type: string;      // structural dominance class
  dominance_label: string;
  dynamics: string;
  direction: string;           // principle short names joined " → "
  chain: string;               // digits joined "d → d → d"
  tension: "low" | "medium" | "high";
  interaction: string[];       // pairwise transitions (internal)
}

export const PRINCIPLES: Record<string, string> = {
  "0": "potential / semantic gap",
  "1": "impulse / initiation",
  "2": "connection / interaction",
  "3": "manifestation / expression",
  "4": "structure / stabilization",
  "5": "change / movement",
  "6": "harmonization",
  "7": "inquiry / depth",
  "8": "materialization / density",
  "9": "completion / transition",
};

const PRINCIPLE_SHORT: Record<string, string> = {
  "0": "gap",
  "1": "impulse",
  "2": "connection",
  "3": "expression",
  "4": "structure",
  "5": "movement",
  "6": "harmony",
  "7": "inquiry",
  "8": "density",
  "9": "completion",
};

function dominantDigit(digits: string): string {
  const counts: Record<string, number> = {};
  for (const d of digits) counts[d] = (counts[d] ?? 0) + 1;
  let best = digits[0];
  let bestCount = 0;
  for (const [d, c] of Object.entries(counts)) {
    if (c > bestCount) { best = d; bestCount = c; }
  }
  return best;
}

function isRepetition(d: string) {
  return d.length >= 2 && d.split("").every((c) => c === d[0]);
}
function isResonance(d: string) {
  // repetition of length ≥ 4 reads as resonance field
  return isRepetition(d) && d.length >= 4;
}
function isMirror(d: string) {
  if (d.length < 3) return false;
  return d === d.split("").reverse().join("");
}
function isAmplification(d: string) {
  if (d.length < 3) return false;
  const tail = d.slice(-3);
  if (!tail.split("").every((c) => c === tail[0])) return false;
  const prefix = d.slice(0, -3);
  return prefix.length > 0 && !prefix.includes(tail[0]);
}
function hasGap(d: string) {
  return /[1-9]0[1-9]?/.test(d) || /[1-9]0+[1-9]/.test(d);
}
function isSequence(d: string) {
  if (d.length < 3) return false;
  let asc = 0, desc = 0;
  for (let i = 1; i < d.length; i++) {
    const diff = Number(d[i]) - Number(d[i - 1]);
    if (diff === 1) asc++;
    else if (diff === -1) desc++;
  }
  return asc >= 2 || desc >= 2;
}
function isAlternation(d: string) {
  if (d.length < 4) return false;
  for (let i = 2; i < d.length; i++) if (d[i] !== d[i - 2]) return false;
  return d[0] !== d[1];
}
function isLoop(d: string) {
  // X … X — same first and last digit, length ≥ 3, not pure repetition, not mirror
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
function chainOf(d: string): string {
  return d.split("").join(" → ");
}

function tensionLevel(patterns: string[], digits: string): "low" | "medium" | "high" {
  if (patterns.includes("resonance") || patterns.includes("amplification")) return "high";
  if (patterns.includes("repetition")) return "high";
  if (patterns.includes("interruption") || patterns.includes("mirror") || patterns.includes("loop")) return "medium";
  if (digits.length <= 2) return "low";
  return "medium";
}

// Hierarchy: which detected pattern becomes the *primary* reading.
const PRIMARY_ORDER = [
  "resonance",
  "mirror",
  "interruption",
  "sequence",
  "alternation",
  "loop",
  "amplification",
  "repetition",
  "composite",
];

const PRIMARY_LABELS: Record<string, string> = {
  resonance: "resonance repetition",
  repetition: "repetition dominance",
  mirror: "reflective mirror loop",
  interruption: "structural interruption",
  sequence: "progressive sequence",
  alternation: "alternating interaction loop",
  loop: "return loop",
  amplification: "amplification field",
  composite: "layered composition",
};

const SECONDARY_LABELS: Record<string, string> = {
  resonance: "amplified resonance field",
  repetition: "reinforcement",
  mirror: "symmetry",
  interruption: "recalibration",
  sequence: "directed development",
  alternation: "rhythmic exchange",
  loop: "closure / return",
  amplification: "intensification",
  composite: "multi-layer composition",
};

const DOMINANCE_LABELS: Record<string, string> = {
  resonance: "resonance dominance",
  repetition: "repetition dominance",
  mirror: "mirror dominance",
  interruption: "interruption dominance",
  sequence: "progression dominance",
  alternation: "loop dominance",
  loop: "loop dominance",
  amplification: "amplification dominance",
  composite: "element dominance",
};

const DYNAMICS: Record<string, string> = {
  resonance: "amplified resonance field",
  repetition: "reinforcement / resonance",
  mirror: "reflection / feedback loop",
  amplification: "concentration / strengthening",
  interruption: "restructuring / semantic pause",
  sequence: "progression / directional development",
  alternation: "rhythmic exchange / oscillation",
  loop: "return / recursion",
  composite: "layered composition",
};

function rankPrimary(patterns: string[]): { primary: string; secondary: string | null } {
  const ranked = PRIMARY_ORDER.filter((p) => patterns.includes(p));
  const primary = ranked[0] ?? patterns[0] ?? "composite";
  const secondary = ranked.find((p) => p !== primary) ?? null;
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
  if (isSequence(digits)) patterns.push("sequence");
  if (isAlternation(digits)) patterns.push("alternation");
  if (isLoop(digits)) patterns.push("loop");
  if (patterns.length === 0) patterns.push("composite");

  const dom = dominantDigit(digits);
  const { primary, secondary } = rankPrimary(patterns);

  return {
    input_type: type,
    value: displayValue,
    digits,
    pattern: primary,
    patterns,
    primary_pattern: primary,
    secondary_pattern: secondary,
    primary_label: PRIMARY_LABELS[primary] ?? primary,
    secondary_label: secondary ? (SECONDARY_LABELS[secondary] ?? secondary) : null,
    dominant: dom,
    dominant_principle: PRINCIPLES[dom] ?? "—",
    dominance_type: primary,
    dominance_label: DOMINANCE_LABELS[primary] ?? "element dominance",
    dynamics: DYNAMICS[primary] ?? "layered composition",
    direction: direction(digits),
    chain: chainOf(digits),
    tension: tensionLevel(patterns, digits),
    interaction: buildInteractions(digits),
  };
}

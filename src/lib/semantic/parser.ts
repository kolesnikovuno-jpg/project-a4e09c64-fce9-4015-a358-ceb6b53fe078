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
  interaction: string[];             // pairwise transitions (internal)
  structural_class: string;          // higher-order class: progressive | resonant | mirrored | interrupted | composite
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

// Deterministic leading-principle rule (calibrated):
//   A. If any digit appears >=2 times → leader = that digit
//      (tie-broken by first to reach the maximum frequency in chain order).
//   B. Else if "0" appears anywhere → leader = 0.
//   C. Else → leader = first digit.
function leadingDigit(digits: string): string {
  if (!digits) return "";
  const counts: Record<string, number> = {};
  for (const d of digits) counts[d] = (counts[d] ?? 0) + 1;
  let best = ""; let bestCount = 1;
  for (const c of digits) {
    if (counts[c] > bestCount) { best = c; bestCount = counts[c]; }
  }
  if (best) return best;
  if (digits.includes("0")) return "0";
  return digits[0];
}
// Most frequent digit (used internally only — for dominance counting, not for leader).
function mostFrequent(digits: string): string {
  const counts: Record<string, number> = {};
  for (const d of digits) counts[d] = (counts[d] ?? 0) + 1;
  let best = digits[0]; let bestCount = 0;
  for (const c of digits) if (counts[c] > bestCount) { best = c; bestCount = counts[c]; }
  return best;
}

function isRepetition(d: string) { return d.length >= 2 && d.split("").every((c) => c === d[0]); }
function isResonance(d: string)  { return isRepetition(d) && d.length >= 4; }
// Partial repetition: any digit appears >=2 times in a non-all-equal chain.
function hasRepeatedDigit(d: string) {
  if (d.length < 2 || isRepetition(d)) return false;
  const counts: Record<string, number> = {};
  for (const c of d) counts[c] = (counts[c] ?? 0) + 1;
  return Object.values(counts).some((n) => n >= 2);
}
function isMirror(d: string)     { return isSymmetry(d); }
// Topology: palindrome with at least TWO distinct digits.
// Identity persistence (1111) is not symmetry.
function isSymmetry(d: string) {
  if (d.length < 3) return false;
  if (d !== d.split("").reverse().join("")) return false;
  return new Set(d.split("")).size >= 2;
}
// Topology: last node === first node, length >= 3, not pure repetition.
function isLoopTopology(d: string) {
  return d.length >= 3 && d[0] === d[d.length - 1] && !isRepetition(d);
}
// Topology: last node equals an earlier internal node, but NOT the first node,
// and that earlier occurrence is non-adjacent to the last node.
// 1232 → partial return (last=2 at idx 1, length-2=2, 1<2). 1122 → recurrence (only adjacent).
function isPartialReturn(d: string) {
  if (d.length < 3) return false;
  const last = d[d.length - 1];
  if (last === d[0]) return false; // that is loop, not partial return
  for (let i = 0; i < d.length - 2; i++) {
    if (d[i] === last) return true;
  }
  return false;
}
// Topology: any digit appears >=2 times AND chain is not symmetry / loop / partial return.
// Pure identity (1111) still counts as resonance via repetition family, not recurrence.
function isRecurrence(d: string) {
  if (d.length < 2) return false;
  if (isSymmetry(d) || isLoopTopology(d) || isPartialReturn(d)) return false;
  if (isRepetition(d)) return false;
  const counts: Record<string, number> = {};
  for (const c of d) counts[c] = (counts[c] ?? 0) + 1;
  return Object.values(counts).some((n) => n >= 2);
}
// Recurrence with a non-adjacent repeat mediated by another digit, e.g. 2→1→2→3.
function isMediatedRecurrence(d: string) {
  if (!isRecurrence(d)) return false;
  for (let i = 0; i < d.length; i++) {
    for (let j = i + 2; j < d.length; j++) {
      if (d[i] === d[j]) return true;
    }
  }
  return false;
}
function isAmplification(d: string) {
  if (d.length < 3) return false;
  const tail = d.slice(-3);
  if (!tail.split("").every((c) => c === tail[0])) return false;
  const prefix = d.slice(0, -3);
  return prefix.length > 0 && !prefix.includes(tail[0]);
}
function hasGap(d: string)  { return /[1-9]0[1-9]?/.test(d) || /[1-9]0+[1-9]/.test(d); }
// Calibrated progression: only strict full monotonic ascent or descent across the chain.
// Partial returns (e.g. 2→3→4→2) are NOT progression.
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
function isStrictMonotonic(d: string) {
  return sequenceAscending(d) || sequenceDescending(d);
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
// Two distinct digits read as a directed structural transition: A → B.
function isDirectedTransition(d: string) {
  return d.length === 2 && d[0] !== d[1];
}

function buildInteractions(d: string): string[] {
  const out: string[] = [];
  for (let i = 1; i < d.length; i++) out.push(`${d[i - 1]}→${d[i]}`);
  return out;
}
// Trajectory describes emergent structural BEHAVIOR, not the literal digit chain.
// The literal digit-by-digit reading is already exposed via `chain`.
function direction(d: string, primary: string): string {
  switch (primary) {
    case "resonance":
      return "self-sustaining resonance";
    case "repetition":
      return "recursive reinforcement";
    case "amplification":
      return "tail-weighted intensification";
    case "mirror":
      return "mirrored return";
    case "loop":
      return "circuit returning to origin";
    case "progression":
      return "progressive structural assembly";
    case "escalation":
      return "ascent toward open state";
    case "alternation":
      return "two-state oscillation";
    case "interruption":
      return "broken continuity / recalibration";
    case "directed_transition":
      return "directed transition between principles";
    case "activation_cycle":
      return "pause-to-movement pulsation";
    case "latent_activation":
      return "deferred initiation";
    case "interrupted_movement":
      return "movement re-entering after gap";
    case "recursive_return":
      return "fold back to origin";
    case "layered_composition":
    case "composite":
    default:
      return "distributed structural behavior";
  }
}
function chainOf(d: string): string { return d.split("").join(" → "); }

// Higher-order structural class — narrative engine derives behavior from class + local pattern.
const STRUCTURAL_CLASS: Record<string, string> = {
  interruption: "interrupted",
  mirror: "mirrored",
  loop: "mirrored",
  resonance: "resonant",
  repetition: "resonant",
  amplification: "resonant",
  progression: "progressive",
  escalation: "progressive",
  closure: "progressive",
  alternation: "progressive",
  directed_transition: "progressive",
  activation_cycle: "composite",
  latent_activation: "composite",
  interrupted_movement: "interrupted",
  recursive_return: "mirrored",
  layered_composition: "composite",
  composite: "composite",
};

// Calibrated topology hierarchy (V2):
//   symmetry > loop > partial_return > mediated_recurrence > recurrence
//   > resonance > amplification (resonance-family modifiers for identical-digit chains)
//   > progression > escalation > directed_transition > alternation
//   > interruption
//   > composite-family subtypes.
// Note: "repetition" and "mirror" are kept as legacy aliases mapped from the new
// topology ids (mirror ← symmetry, recurrence replaces generic repetition for
// mixed-digit chains). Identical-digit chains still read as resonance/repetition.
const PRIMARY_ORDER = [
  "symmetry",
  "loop",
  "partial_return",
  "mediated_recurrence",
  "recurrence",
  "resonance",
  "amplification",
  "repetition",
  "mirror",
  "progression",
  "escalation",
  "directed_transition",
  "alternation",
  "interruption",
  "activation_cycle",
  "latent_activation",
  "interrupted_movement",
  "recursive_return",
  "layered_composition",
  "composite",
];

const DYNAMICS: Record<string, string> = {
  interruption: "restructuring / semantic pause",
  mirror: "reflection / feedback loop",
  resonance: "amplified resonance field",
  loop: "return / recursion",
  escalation: "ascent toward depth / inquiry",
  progression: "directional development",
  directed_transition: "directed transition / state change",
  closure: "approach to integration",
  alternation: "rhythmic exchange / oscillation",
  amplification: "concentration / strengthening",
  repetition: "reinforcement / resonance",
  activation_cycle: "pulsation between pause and movement",
  latent_activation: "emergence from pause into impulse",
  interrupted_movement: "movement interrupted by gap",
  recursive_return: "circuit closing to its origin",
  layered_composition: "layered structure",
  composite: "layered structure",
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
  if (patterns.includes("directed_transition")) return "transition";
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
  directed_transition: "progression",
  alternation: "alternation",
  activation_cycle: "composite",
  latent_activation: "composite",
  interrupted_movement: "composite",
  recursive_return: "composite",
  layered_composition: "composite",
  composite: "composite",
};

function rankPrimary(patterns: string[]): { primary: string; secondary: string | null } {
  const ranked = PRIMARY_ORDER.filter((p) => patterns.includes(p));
  const primary = ranked[0] ?? patterns[0] ?? "composite";
  const primaryFamily = FAMILY[primary] ?? primary;
  // Secondary must be from a different family and not a generic fallback.
  const secondary =
    ranked.find(
      (p) =>
        p !== primary &&
        (FAMILY[p] ?? p) !== primaryFamily &&
        (FAMILY[p] ?? p) !== "composite"
    ) ?? null;
  return { primary, secondary };
}

// Refine the generic "composite" into a diagnostic structural subtype.
function compositeSubtype(d: string): string {
  if (d.length < 2) return "layered_composition";
  const fives = (d.match(/5/g) ?? []).length;
  const startsZero = d[0] === "0";
  const interior = d.length >= 3 ? d.slice(1, -1) : "";
  const hasInteriorZero = interior.includes("0");
  const firstLastSame = d.length >= 3 && d[0] === d[d.length - 1];
  if (startsZero && fives >= 2) return "activation_cycle";
  if (startsZero && /[1-9]/.test(d)) return "latent_activation";
  if (hasInteriorZero && fives >= 1) return "interrupted_movement";
  if (firstLastSame) return "recursive_return";
  return "layered_composition";
}

export function parse(raw: string, type: InputType, displayValue: string): SemanticObject {
  const digits = raw.replace(/\D/g, "");
  const patterns: string[] = [];

  if (isResonance(digits)) patterns.push("resonance");
  if (isRepetition(digits)) patterns.push("repetition");
  // Non-all-equal partial repetition counts as repetition for hierarchy purposes
  // (so it overrides interruption per calibrated rule).
  if (!isRepetition(digits) && hasRepeatedDigit(digits)) patterns.push("repetition");
  if (isMirror(digits)) patterns.push("mirror");
  if (isAmplification(digits)) patterns.push("amplification");
  if (hasGap(digits)) patterns.push("interruption");

  // Strict monotonic-only progression / escalation. Partial returns never qualify.
  if (isStrictMonotonic(digits)) {
    const asc = sequenceAscending(digits);
    const last = digits[digits.length - 1];
    if (asc && (last === "7" || last === "0")) patterns.push("escalation");
    else patterns.push("progression");
  }
  if (isAlternation(digits)) patterns.push("alternation");
  // Loop only when it is NOT also a mirror (mirror is the stronger reading).
  if (isLoop(digits) && !isMirror(digits)) patterns.push("loop");
  // Two-digit non-repeating pair = directed transition between two principles.
  if (isDirectedTransition(digits)) patterns.push("directed_transition");
  if (patterns.length === 0) patterns.push("composite");

  const leader = leadingDigit(digits);
  let { primary, secondary } = rankPrimary(patterns);
  // Replace the generic "composite" classification with a diagnostic subtype.
  if (primary === "composite") {
    primary = compositeSubtype(digits);
  }
  const traj = trajectoryOf(digits, patterns);

  return {
    input_type: type,
    value: displayValue,
    digits,
    pattern: primary,
    patterns,
    primary_pattern: primary,
    secondary_pattern: secondary,
    dominant: leader,
    dominant_principle: PRINCIPLES[leader] ?? "—",
    leading_digit: leader,
    trajectory: traj,
    dynamics: DYNAMICS[primary] ?? "layered composition",
    direction: direction(digits, primary),
    chain: chainOf(digits),
    interaction: buildInteractions(digits),
    structural_class: STRUCTURAL_CLASS[primary] ?? "composite",
  };
}

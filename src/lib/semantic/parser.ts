// Semantic parser v0.1 — pattern detection over numeric strings.
// Input: cleaned digit string (no separators). Output: semantic object.

export type InputType = "time" | "symbol";

export interface SemanticObject {
  input_type: InputType;
  value: string;
  digits: string;
  pattern: string;
  patterns: string[];
  dominant: string;
  dominant_principle: string;
  dynamics: string;
  direction: string;
  tension: "low" | "medium" | "high";
  interaction: string[];
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
    if (c > bestCount) {
      best = d;
      bestCount = c;
    }
  }
  return best;
}

function isRepetition(d: string) {
  return d.length >= 2 && d.split("").every((c) => c === d[0]);
}

function isMirror(d: string) {
  if (d.length < 3) return false;
  return d === d.split("").reverse().join("");
}

function isAmplification(d: string) {
  // e.g. 1333, 1444, 13:33 → ends with 3+ identical digits, prefix differs
  if (d.length < 3) return false;
  const tail = d.slice(-3);
  if (!tail.split("").every((c) => c === tail[0])) return false;
  const prefix = d.slice(0, -3);
  return prefix.length > 0 && !prefix.includes(tail[0]);
}

function hasGap(d: string) {
  // active 0 between non-zero digits, or 0 inside structure
  return /[1-9]0[1-9]?/.test(d) || /[1-9]0+[1-9]/.test(d);
}

function isSequence(d: string) {
  if (d.length < 3) return false;
  let asc = 0;
  let desc = 0;
  for (let i = 1; i < d.length; i++) {
    const diff = Number(d[i]) - Number(d[i - 1]);
    if (diff === 1) asc++;
    else if (diff === -1) desc++;
  }
  return asc >= 2 || desc >= 2;
}

function buildInteractions(d: string): string[] {
  const out: string[] = [];
  for (let i = 1; i < d.length; i++) {
    out.push(`${d[i - 1]}→${d[i]}`);
  }
  return out;
}

function direction(d: string): string {
  return d.split("").map((c) => PRINCIPLE_SHORT[c] ?? c).join(" → ");
}

function tensionLevel(patterns: string[], digits: string): "low" | "medium" | "high" {
  if (patterns.includes("amplification") || patterns.includes("repetition")) return "high";
  if (patterns.includes("interruption") || patterns.includes("mirror")) return "medium";
  if (digits.length <= 2) return "low";
  return "medium";
}

export function parse(raw: string, type: InputType, displayValue: string): SemanticObject {
  const digits = raw.replace(/\D/g, "");
  const patterns: string[] = [];

  if (isRepetition(digits)) patterns.push("repetition");
  if (isMirror(digits)) patterns.push("mirror");
  if (isAmplification(digits)) patterns.push("amplification");
  if (hasGap(digits)) patterns.push("interruption");
  if (isSequence(digits)) patterns.push("sequence");
  if (patterns.length === 0) patterns.push("composite");

  const dom = dominantDigit(digits);
  const primary = patterns[0];

  const dynamicsMap: Record<string, string> = {
    repetition: "reinforcement / resonance",
    mirror: "reflection / feedback loop",
    amplification: "concentration / strengthening",
    interruption: "restructuring / semantic pause",
    sequence: "progression / directional development",
    composite: "layered composition",
  };

  return {
    input_type: type,
    value: displayValue,
    digits,
    pattern: primary,
    patterns,
    dominant: dom,
    dominant_principle: PRINCIPLES[dom] ?? "—",
    dynamics: dynamicsMap[primary],
    direction: direction(digits),
    tension: tensionLevel(patterns, digits),
    interaction: buildInteractions(digits),
  };
}
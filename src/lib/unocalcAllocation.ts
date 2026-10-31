import { formatUer } from "@/lib/unocalc";

// The author's model for allocating a projected resource; not a verified
// breakdown of supplier invoices, local budgets or published office cost data.
export const RESOURCE_SHARES = [
  { id: "retail", percent: 20 },
  { id: "design", percent: 20 },
  { id: "installation", percent: 20 },
  { id: "components", percent: 40 },
] as const;

export type ResourceShareId = (typeof RESOURCE_SHARES)[number]["id"];

// "Not needed" and "done by owner" remove direct payment, not the value
// or time contribution of that function. No shares are redistributed by mode.
export type ResourceCostMode = "paid" | "self" | "not-needed";
export type ResourceCostModes = readonly [ResourceCostMode, ResourceCostMode, ResourceCostMode, ResourceCostMode];
export const DEFAULT_RESOURCE_COST_MODES: ResourceCostModes = ["paid", "paid", "paid", "paid"];

export const resourcePaidMask = (modes: ResourceCostModes): readonly boolean[] =>
  modes.map((mode) => mode === "paid");


// 5 percentage-point window: ±2.5 pp around each base share.
export const FLEXIBILITY_PP = 2.5;
export const SHARE_STEP_PP = 0.5;
export type ResourcePercentages = readonly [number, number, number, number];
export const BASE_RESOURCE_PERCENTAGES: ResourcePercentages = [20, 20, 20, 40];

const BASE_TICKS = BASE_RESOURCE_PERCENTAGES.map((value) => value * 2);
const MIN_TICKS = BASE_TICKS.map((value) => value - 5);
const MAX_TICKS = BASE_TICKS.map((value) => value + 5);

export const isValidResourcePercentages = (shares: ResourcePercentages): boolean =>
  shares.length === 4 &&
  shares.reduce((sum, value) => sum + value, 0) === 100 &&
  shares.every((value, i) =>
    Number.isFinite(value) && Number.isInteger(value / SHARE_STEP_PP) &&
    value >= BASE_RESOURCE_PERCENTAGES[i] - FLEXIBILITY_PP &&
    value <= BASE_RESOURCE_PERCENTAGES[i] + FLEXIBILITY_PP
  );

/**
 * In linked-pair mode, move only the selected share and its explicit counterpart.
 * In automatic mode, redistribute the difference
 * across the other three shares, favoring the smallest increase in squared
 * percentage deviation from the baseline, weighted by each baseline share.
 * This spreads compensation across related functions instead of mechanically
 * draining the first row. Existing deviations are restored before creating
 * new ones where possible. The requested share remains fixed.
 *
 * Constraints: ±2.5 percentage points per share, 0.5 pp increments,
 * all four shares always total exactly 100%.
 */
export const adaptResourcePercentages = (
  current: ResourcePercentages,
  index: number,
  requested: number,
  counterpart: number | null = null,
  allowed: readonly boolean[] = [true, true, true, true],
): ResourcePercentages => {
  if (!isValidResourcePercentages(current) ||
      !Number.isInteger(index) || index < 0 || index >= 4 ||
      !Number.isFinite(requested) || allowed.length !== 4 || !allowed[index]) return current;

  if (counterpart !== null) {
    if (!Number.isInteger(counterpart) || counterpart < 0 || counterpart >= 4 || counterpart === index || !allowed[counterpart]) return current;
    const { min, max } = resourceShareRange(current, index, counterpart, allowed);
    const target = Math.max(min, Math.min(max, Math.round(requested / SHARE_STEP_PP) * SHARE_STEP_PP));
    const updated = [...current];
    updated[index] = target;
    updated[counterpart] = current[index] + current[counterpart] - target;
    const next = updated as unknown as ResourcePercentages;
    return isValidResourcePercentages(next) ? next : current;
  }

  const ticks = current.map((percent) => Math.round(percent / SHARE_STEP_PP));
  const autoRange = resourceShareRange(current, index, null, allowed);
  const target = Math.max(Math.round(autoRange.min / SHARE_STEP_PP), Math.min(Math.round(autoRange.max / SHARE_STEP_PP), Math.round(requested / SHARE_STEP_PP)));
  const change = target - ticks[index];
  if (change === 0) return current;
  ticks[index] = target;

  const direction = change > 0 ? -1 : 1;
  for (let step = 0; step < Math.abs(change); step += 1) {
    const options = [0, 1, 2, 3].filter((candidate) =>
      candidate !== index && allowed[candidate] &&
      ticks[candidate] + direction >= MIN_TICKS[candidate] &&
      ticks[candidate] + direction <= MAX_TICKS[candidate]
    );
    if (options.length === 0) return current;
    // Distribute the offset in proportion to each category's baseline
    // capacity. The 40% components category may absorb more of a correction
    // than a 20% category without taking the entire burden.
    const changePenalty = (candidate: number) => {
      const deviation = ticks[candidate] - BASE_TICKS[candidate];
      const nextDeviation = deviation + direction;
      return (nextDeviation ** 2 - deviation ** 2) / BASE_TICKS[candidate];
    };
    options.sort((a, b) => changePenalty(a) - changePenalty(b) || a - b);
    ticks[options[0]] += direction;
  }
  const next = ticks.map((tick) => tick * SHARE_STEP_PP) as ResourcePercentages;
  return isValidResourcePercentages(next) ? next : current;
};

/**
 * A linked pair transfers shares exclusively between its two members.
 * Reciprocal links are kept in sync: choosing Design ↔ Installation on either
 * row gives the same behavior in both slider directions.
 */
export type ResourceCounterparts = readonly [number | null, number | null, number | null, number | null];
export const INITIAL_RESOURCE_COUNTERPARTS: ResourceCounterparts = [null, null, null, null];

export const linkResourceCounterparts = (
  current: ResourceCounterparts,
  selected: number,
  counterpart: number | null,
): ResourceCounterparts => {
  if (!Number.isInteger(selected) || selected < 0 || selected >= 4 ||
      (counterpart !== null && (!Number.isInteger(counterpart) ||
      counterpart < 0 || counterpart >= 4 || counterpart === selected))) return current;

  const links = [...current];
  const unlink = (index: number) => {
    const previous = links[index];
    links[index] = null;
    if (previous !== null && links[previous] === index) links[previous] = null;
  };
  unlink(selected);
  if (counterpart !== null) {
    unlink(counterpart);
    links[selected] = counterpart;
    links[counterpart] = selected;
  }
  return links as unknown as ResourceCounterparts;
};

export const resourceShareRange = (
  current: ResourcePercentages,
  index: number,
  counterpart: number | null = null,
  allowed: readonly boolean[] = [true, true, true, true],
): { min: number; max: number } => {
  if (!isValidResourcePercentages(current) || allowed.length !== 4 ||
      !Number.isInteger(index) || index < 0 || index >= 4) return { min: 0, max: 0 };
  const ownMin = BASE_RESOURCE_PERCENTAGES[index] - FLEXIBILITY_PP;
  const ownMax = BASE_RESOURCE_PERCENTAGES[index] + FLEXIBILITY_PP;
  if (!allowed[index]) return { min: current[index], max: current[index] };
  if (counterpart === null) {
    const companions = [0, 1, 2, 3].filter((i) => i !== index && allowed[i]);
    const availableReduction = companions.reduce((sum, i) => sum + current[i] -
      (BASE_RESOURCE_PERCENTAGES[i] - FLEXIBILITY_PP), 0);
    const availableIncrease = companions.reduce((sum, i) => sum +
      (BASE_RESOURCE_PERCENTAGES[i] + FLEXIBILITY_PP) - current[i], 0);
    return {
      min: Math.max(ownMin, current[index] - availableIncrease),
      max: Math.min(ownMax, current[index] + availableReduction),
    };
  }
  if (!Number.isInteger(counterpart) || counterpart < 0 || counterpart >= 4 || counterpart === index || !allowed[counterpart]) {
    return { min: current[index], max: current[index] };
  }
  const pairTotal = current[index] + current[counterpart];
  return {
    min: Math.max(ownMin, pairTotal - (BASE_RESOURCE_PERCENTAGES[counterpart] + FLEXIBILITY_PP)),
    max: Math.min(ownMax, pairTotal - (BASE_RESOURCE_PERCENTAGES[counterpart] - FLEXIBILITY_PP)),
  };
};

export type ResourceAllocation = {
  displayedTotal: number;
  parts: Array<{ id: ResourceShareId; percent: number; amount: number }>;
};

/**
 * Allocate the *displayed* monetary reference rather than the hidden
 * pre-rounded number. Largest-remainder rounding guarantees that four
 * displayed amounts sum to the displayed total, including uneven totals.
 * For sub-unit results, retain the precision of formatUer().
 */
export const allocateResource = (total: number, shares: ResourcePercentages = BASE_RESOURCE_PERCENTAGES): ResourceAllocation | null => {
  if (!isValidResourcePercentages(shares)) return null;
  if (!Number.isFinite(total) || total <= 0) return null;

  const formatted = formatUer(total);
  const displayedTotal = Number(formatted);
  if (!Number.isFinite(displayedTotal) || displayedTotal <= 0) return null;

  const decimalDigits = formatted.includes("e-")
    ? Number(formatted.split("e-")[1])
    : (formatted.split(".")[1]?.length ?? 0);
  const precision = Math.min(12, Math.max(0, decimalDigits));
  const scale = Math.pow(10, precision);
  const units = Math.round(displayedTotal * scale);
  if (!Number.isSafeInteger(units) || units < 1) return null;

  const parts = RESOURCE_SHARES.map((share, index) => {
    const exactUnits = units * shares[index] / 100;
    const roundedDown = Math.floor(exactUnits);
    return { ...share, index, amountUnits: roundedDown, fraction: exactUnits - roundedDown };
  });
  const unassigned = units - parts.reduce((sum, part) => sum + part.amountUnits, 0);
  const order = parts.slice().sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (let i = 0; i < unassigned; i += 1) order[i % order.length].amountUnits += 1;

  return {
    displayedTotal,
    parts: parts.map(({ id, percent, amountUnits }) => ({
      id, percent: shares[RESOURCE_SHARES.findIndex((share) => share.id === id)], amount: amountUnits / scale,
    })),
  };
};


export type ResourceCashSummary = {
  paid: number;
  noDirectPayment: number;
  paidPercentOfReference: number;
  lines: Array<{
    id: ResourceShareId;
    mode: ResourceCostMode;
    referenceAmount: number;
    directPayment: number;
  }>;
};

/**
 * A monetary scenario layer, not an invoice or a validated contractor quote.
 * Deactivating a function does not increase other shares.
 * Own work has an economic contribution but no modeled external payment.
 */
export const resourceCashSummary = (
  allocation: ResourceAllocation | null,
  modes: ResourceCostModes,
): ResourceCashSummary | null => {
  if (!allocation || modes.length !== 4 ||
    !modes.every((mode) => mode === "paid" || mode === "self" || mode === "not-needed")) return null;

  const lines = allocation.parts.map((part, index) => ({
    id: part.id,
    mode: modes[index],
    referenceAmount: part.amount,
    directPayment: modes[index] === "paid" ? part.amount : 0,
  }));
  const paid = lines.reduce((sum, line) => sum + line.directPayment, 0);
  const noDirectPayment = allocation.displayedTotal - paid;

  return {
    paid,
    noDirectPayment,
    paidPercentOfReference: allocation.displayedTotal > 0 ? paid / allocation.displayedTotal * 100 : 0,
    lines,
  };
};

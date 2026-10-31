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
export const allocateResource = (total: number): ResourceAllocation | null => {
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
    const exactUnits = units * share.percent / 100;
    const roundedDown = Math.floor(exactUnits);
    return { ...share, index, amountUnits: roundedDown, fraction: exactUnits - roundedDown };
  });
  const unassigned = units - parts.reduce((sum, part) => sum + part.amountUnits, 0);
  const order = parts.slice().sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (let i = 0; i < unassigned; i += 1) order[i % order.length].amountUnits += 1;

  return {
    displayedTotal,
    parts: parts.map(({ id, percent, amountUnits }) => ({
      id, percent, amount: amountUnits / scale,
    })),
  };
};

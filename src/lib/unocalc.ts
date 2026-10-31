// UNOcalc is an author's index, not a physical energy measurement.
// Keep the existing U.E.R. equation unchanged; validation/formatting are separate.
export type UnoLevel = 108 | 270 | 432;

export type UnoResult =
  | { status: "incomplete" | "invalid" | "out-of-range"; volume: null; energy: null }
  | { status: "ok"; volume: number; energy: number };

export const isInvalidDimension = (value: string): boolean => {
  if (value.trim() === "") return false;
  const number = Number(value);
  return !Number.isFinite(number) || number <= 0;
};

export const calculateUno = ({
  a,
  b,
  c,
  q,
}: {
  a: string;
  b: string;
  c: string;
  q: UnoLevel;
}): UnoResult => {
  const values = [a.trim(), b.trim(), c.trim()];
  if (values.some(isInvalidDimension)) {
    return { status: "invalid", volume: null, energy: null };
  }
  if (values.some((value) => value === "")) {
    return { status: "incomplete", volume: null, energy: null };
  }

  const [length, width, height] = values.map(Number);
  const volume = (length / 1000) * (width / 1000) * (height / 1000);
  // Original author-defined equation, before display rounding.
  const energy = (length / 432) * (width / 432) * (height / 432) * (q / 3) * 0.432;

  if (!Number.isFinite(volume) || !Number.isFinite(energy) || volume <= 0 || energy <= 0) {
    return { status: "out-of-range", volume: null, energy: null };
  }

  return { status: "ok", volume, energy };
};

// Use three significant digits under 0.01 m³ so a small item never appears
// to have zero volume. For ordinary objects retain the original 2 decimals.
export const formatVolume = (value: number): string =>
  value >= 0.01 ? value.toFixed(2) : String(Number(value.toPrecision(3)));

// Preserve the original integer result from 1 U.E.R. upwards. Display small
// positive values with useful precision instead of rounding them to zero.
export const formatUer = (value: number): string =>
  value >= 1 ? String(Math.round(value)) : String(Number(value.toPrecision(3)));

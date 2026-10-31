import { calculateUno, type UnoLevel, type UnoResult } from "@/lib/unocalc";

export type LabZone = "window" | "center" | "entrance";
export type LabSignal = "light" | "noise" | "movement" | "layout";
export type LabStep = "space" | "attention" | "compare";
export type LabDimensions = { length: string; width: string; height: string; proposedHeight: string };
export type LabState = {
  dimensions: LabDimensions;
  level: UnoLevel;
  zone: LabZone;
  focus: number;
  signals: LabSignal[];
  note: string;
};

export const LAB_STORAGE_KEY = "unocalc.lab.v1";

export const initialLabState = (): LabState => ({
  dimensions: { length: "4.8", width: "3.6", height: "2.7", proposedHeight: "3.0" },
  level: 108,
  zone: "window",
  focus: 3,
  signals: [],
  note: "",
});

export const readMeters = (text: string): number | null => {
  const normalized = text.trim().replace(",", ".");
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return null;
  const number = Number(normalized);
  return Number.isFinite(number) && number > 0 ? number : null;
};

export const calculateRoom = (
  dimensions: Pick<LabDimensions, "length" | "width" | "height">,
  level: UnoLevel,
): UnoResult => {
  const values = [dimensions.length, dimensions.width, dimensions.height].map(readMeters);
  if (values.some((value) => value === null)) {
    return { status: "invalid", volume: null, energy: null };
  }
  const [length, width, height] = values as [number, number, number];
  return calculateUno({
    a: String(length * 1000),
    b: String(width * 1000),
    c: String(height * 1000),
    q: level,
  });
};

export const compareRooms = (state: LabState) => {
  const baseline = calculateRoom(state.dimensions, state.level);
  const proposal = calculateRoom({
    length: state.dimensions.length,
    width: state.dimensions.width,
    height: state.dimensions.proposedHeight,
  }, state.level);
  const percent = baseline.status === "ok" && proposal.status === "ok"
    ? ((proposal.volume / baseline.volume) - 1) * 100
    : null;
  return { baseline, proposal, percent: Number.isFinite(percent) ? percent : null };
};

// Treat restored browser state as untrusted data. No cloud storage is used.
export const restoreLabState = (raw: string | null): LabState => {
  const defaults = initialLabState();
  if (!raw) return defaults;
  try {
    const input: unknown = JSON.parse(raw);
    if (!input || typeof input !== "object") return defaults;
    const data = input as Partial<LabState>;
    const dim = data.dimensions;
    const safeDimension = (value: unknown, fallback: string) =>
      typeof value === "string" && value.length <= 32 ? value : fallback;
    const validSignals: LabSignal[] = ["light", "noise", "movement", "layout"];
    return {
      dimensions: {
        length: safeDimension(dim?.length, defaults.dimensions.length),
        width: safeDimension(dim?.width, defaults.dimensions.width),
        height: safeDimension(dim?.height, defaults.dimensions.height),
        proposedHeight: safeDimension(dim?.proposedHeight, defaults.dimensions.proposedHeight),
      },
      level: data.level === 108 || data.level === 270 || data.level === 432 ? data.level : 108,
      zone: data.zone === "center" || data.zone === "entrance" || data.zone === "window" ? data.zone : defaults.zone,
      focus: typeof data.focus === "number" && Number.isInteger(data.focus) && data.focus >= 1 && data.focus <= 5
        ? data.focus : defaults.focus,
      signals: Array.isArray(data.signals) ? validSignals.filter((s) => data.signals?.includes(s)) : [],
      note: typeof data.note === "string" ? data.note.slice(0, 1200) : "",
    };
  } catch {
    return defaults;
  }
};

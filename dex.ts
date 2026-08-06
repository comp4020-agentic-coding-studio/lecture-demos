import { DEX, type Entry, type Origin } from "./dex-data";

export interface Cell {
  readonly entry: Entry;
  readonly obtainable: boolean;
  /** Why this one is out of reach, or null when it isn't. */
  readonly reason: string | null;
}

/**
 * How many people are in your world. A second cartridge is the whole variable:
 * it carries Blue's exclusives, and it is what makes a trade — and so a trade
 * evolution — possible at all.
 */
export type Company = "alone" | "blue-friend";

const BLOCKED: Record<Exclude<Origin, "both" | "red">, string> = {
  blue: "only appears in Blue",
  trade: "only evolves while being traded",
  never: "never released in normal play",
};

function blocks(origin: Origin, company: Company): string | null {
  switch (origin) {
    case "both":
    case "red":
      return null;
    case "blue":
    case "trade":
      return company === "alone" ? BLOCKED[origin] : null;
    case "never":
      return BLOCKED.never;
  }
}

export function reach(company: Company): readonly Cell[] {
  return DEX.map((entry: Entry) => {
    const reason = blocks(entry.origin, company);
    return { entry, obtainable: reason === null, reason };
  });
}

export function completable(company: Company): number {
  return reach(company).filter((cell) => cell.obtainable).length;
}

export const TOTAL = DEX.length;

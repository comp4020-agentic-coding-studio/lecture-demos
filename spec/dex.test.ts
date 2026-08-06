import { describe, expect, it } from "vitest";
import { TOTAL, completable, reach } from "../dex";

// The week's contract, not the invariants: what the page must DO. These pin the
// numbers derived from PokeAPI when dex-data.ts was generated, so a silent edit
// to the data shows up here rather than on the projector.
const SOLO = 135;
const WITH_A_FRIEND = 150;

const BLUE_ONLY = [
  "Sandshrew",
  "Sandslash",
  "Vulpix",
  "Ninetales",
  "Meowth",
  "Persian",
  "Bellsprout",
  "Weepinbell",
  "Victreebel",
  "Magmar",
  "Pinsir",
];

const TRADE_ONLY = ["Alakazam", "Machamp", "Golem", "Gengar"];

const names = (company: "alone" | "blue-friend", obtainable: boolean) =>
  reach(company)
    .filter((cell) => cell.obtainable === obtainable)
    .map((cell) => cell.entry.name);

describe("the dex", () => {
  it("holds all 151", () => {
    expect(TOTAL).toBe(151);
    expect(reach("alone")).toHaveLength(151);
  });

  it("numbers them 1 to 151 in order", () => {
    expect(reach("alone").map((cell) => cell.entry.no)).toEqual(
      Array.from({ length: 151 }, (_, i) => i + 1),
    );
  });
});

describe("the core interaction: changing who you know", () => {
  it("leaves a solo Red player short of the full set", () => {
    expect(completable("alone")).toBe(SOLO);
    expect(SOLO).toBeLessThan(TOTAL);
  });

  it("climbs when a second cartridge enters the picture", () => {
    expect(completable("blue-friend")).toBe(WITH_A_FRIEND);
    expect(completable("blue-friend")).toBeGreaterThan(completable("alone"));
  });

  it("unlocks exactly Blue's exclusives and the trade evolutions", () => {
    const freed = names("blue-friend", true).filter(
      (name) => !names("alone", true).includes(name),
    );
    expect(freed.sort()).toEqual([...BLUE_ONLY, ...TRADE_ONLY].sort());
  });

  it("never takes anything away", () => {
    const alone = new Set(names("alone", true));
    for (const name of alone) {
      expect(names("blue-friend", true)).toContain(name);
    }
  });
});

describe("what stays out of reach", () => {
  it("tells you why, for every single one", () => {
    for (const cell of [...reach("alone"), ...reach("blue-friend")]) {
      if (cell.obtainable) {
        expect(cell.reason).toBeNull();
      } else {
        expect(cell.reason).toBeTruthy();
      }
    }
  });

  it("keeps Mew unobtainable however many friends you have", () => {
    for (const company of ["alone", "blue-friend"] as const) {
      const mew = reach(company).find((cell) => cell.entry.name === "Mew");
      expect(mew?.obtainable).toBe(false);
      expect(mew?.reason).toBe("never released in normal play");
    }
  });

  it("blocks Blue's exclusives and the trade evolutions when alone", () => {
    expect(names("alone", false).sort()).toEqual(
      [...BLUE_ONLY, ...TRADE_ONLY, "Mew"].sort(),
    );
  });
});

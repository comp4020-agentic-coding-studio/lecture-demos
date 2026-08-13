import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

// Brand guideline: this site ships in red, white and blue.
//
// Red and blue are hue *bands*, not single swatches, so tints and shades count
// — a pale blue panel and a deep navy rule are both blue. White is the neutral
// leg: anything with almost no colour left in it, which covers #fff, the greys,
// and near-black body text. Everything else (the teals, ambers and purples a
// palette drifts into) is off-brand and fails.
//
// Scope: every colour literal in the CSS that actually ships — the <style>
// blocks and style="" attributes of the built pages, so it checks the output
// rather than the source. Named CSS colours (tomato, navy) are not parsed; the
// site uses none, and `transparent`/`currentColor` carry no hue to judge.
const DIST = resolve("dist");

const NEUTRAL_CHROMA = 0.05; // below this a colour reads as grey, not as a hue
const RED = (hue: number) => hue >= 340 || hue <= 15;
const BLUE = (hue: number) => hue >= 200 && hue <= 260;

type Family = "red" | "white" | "blue";

function family(hue: number, chroma: number): Family | null {
  if (chroma <= NEUTRAL_CHROMA) return "white";
  if (RED(hue)) return "red";
  if (BLUE(hue)) return "blue";
  return null;
}

// Hue in degrees and chroma in 0..1 are all the classifier needs, so hsl() is
// read straight off rather than converted.
type Hue = { hue: number; chroma: number };

function fromChannels(r: number, g: number, b: number): Hue {
  const max = Math.max(r, g, b);
  const chroma = max - Math.min(r, g, b);
  if (chroma === 0) return { hue: 0, chroma: 0 };
  const sixth =
    max === r
      ? (((g - b) / chroma) % 6 + 6) % 6
      : max === g
        ? (b - r) / chroma + 2
        : (r - g) / chroma + 4;
  return { hue: sixth * 60, chroma };
}

function fromHex(literal: string): Hue | null {
  const digits = literal.slice(1);
  const size = digits.length === 3 || digits.length === 4 ? 1 : 2;
  if (digits.length !== size * 3 && digits.length !== size * 4) return null;
  const channel = (i: number) => {
    const pair = digits.slice(i * size, i * size + size);
    return parseInt(size === 1 ? pair + pair : pair, 16) / 255;
  };
  return fromChannels(channel(0), channel(1), channel(2));
}

// Both the legacy comma syntax and the modern space syntax; alpha is dropped,
// since a translucent off-brand colour is still off-brand.
function args(inside: string): string[] {
  return inside.split("/")[0].split(/[\s,]+/).filter(Boolean);
}

function fromRgb(inside: string): Hue | null {
  const parts = args(inside);
  if (parts.length < 3) return null;
  const channel = (v: string) =>
    v.endsWith("%") ? parseFloat(v) / 100 : parseFloat(v) / 255;
  const [r, g, b] = parts.slice(0, 3).map(channel);
  return [r, g, b].some(Number.isNaN) ? null : fromChannels(r, g, b);
}

function fromHsl(inside: string): Hue | null {
  const parts = args(inside);
  if (parts.length < 3) return null;
  const hue = parseFloat(parts[0]);
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;
  if ([hue, s, l].some(Number.isNaN)) return null;
  return { hue: ((hue % 360) + 360) % 360, chroma: (1 - Math.abs(2 * l - 1)) * s };
}

const COLOUR = /#[0-9a-f]{3,8}\b|\b(rgba?|hsla?)\(([^)]*)\)/gi;

function parse(literal: string, fn: string | undefined, inside: string | undefined) {
  if (literal.startsWith("#")) return fromHex(literal);
  if (fn?.startsWith("rgb")) return fromRgb(inside ?? "");
  if (fn?.startsWith("hsl")) return fromHsl(inside ?? "");
  return null;
}

function coloursIn(css: string) {
  return Array.from(css.matchAll(COLOUR)).flatMap(([literal, fn, inside]) => {
    const colour = parse(literal, fn, inside);
    return colour ? [{ literal, ...colour, family: family(colour.hue, colour.chroma) }] : [];
  });
}

function htmlFiles(dir: string = DIST): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(path);
    return entry.name.endsWith(".html") ? [path] : [];
  });
}

function shippedCss(doc: Document): string {
  const blocks = Array.from(doc.querySelectorAll("style"), (el) => el.textContent ?? "");
  const attrs = Array.from(doc.querySelectorAll("[style]"), (el) => el.getAttribute("style") ?? "");
  return [...blocks, ...attrs].join("\n");
}

const pages = htmlFiles().map((path) => ({
  name: relative(DIST, path),
  colours: coloursIn(shippedCss(new JSDOM(readFileSync(path, "utf8")).window.document)),
}));

describe("brand: red, white and blue", () => {
  it("found colours to check", () => {
    expect(pages.flatMap((page) => page.colours).length).toBeGreaterThan(0);
  });

  for (const { name, colours } of pages) {
    it(`${name} ships only red, white and blue`, () => {
      const offBrand = colours.filter((c) => c.family === null);
      const listed = [...new Set(offBrand.map((c) => `${c.literal} (hue ${Math.round(c.hue)}°)`))];
      expect(
        listed,
        `off-brand colours on ${name}: the guideline allows reds (hue ≥340° or ≤15°), ` +
          `blues (200°–260°) and neutrals (chroma ≤${NEUTRAL_CHROMA})`,
      ).toEqual([]);
    });
  }

  // Forbidding the other hues is only half the guideline: a site with no colour
  // at all would sail through the test above.
  for (const leg of ["red", "white", "blue"] as const) {
    it(`uses ${leg}`, () => {
      const used = pages.some(({ colours }) => colours.some((c) => c.family === leg));
      expect(used, `nothing on the site is ${leg}`).toBe(true);
    });
  }
});

import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

// Brand guideline: this site ships a palette of five rainbow pastels.
//
// Pastel is a shape in colour space, not a list of swatches: light, and tinted
// rather than saturated. Rainbow is a claim about the *set* — five hues, spread
// around the wheel, not five versions of blue. So the check has three parts:
// every colour that carries a hue must be a pastel, the pastels must fall into
// exactly five families, and those families must be spread apart.
//
// Neutrals (chroma ≤ NEUTRAL_CHROMA) are exempt, and that exemption is load
// bearing: a pastel is far too light to carry text, so the type, the rules and
// the page ground have to come from somewhere outside the five.
//
// Scope: every colour literal in the CSS that actually ships — the <style>
// blocks and style="" attributes of the built pages, so it checks the output
// rather than the source. Named CSS colours (tomato, navy) are not parsed; the
// site uses none, and `transparent`/`currentColor` carry no hue to judge.
const DIST = resolve("dist");

const NEUTRAL_CHROMA = 0.05; // below this a colour reads as grey, not as a hue
const PASTEL_LIGHTNESS = 0.72; // pastels are pale: nothing mid-toned or deep
const PASTEL_CHROMA = 0.45; // ...and tinted, not fully saturated
const FAMILY_GAP = 20; // hues closer than this are the same pastel
const FAMILY_SPREAD = 45; // ...and neighbouring pastels must be at least this far apart
const FAMILIES = 5;

type Tone = { hue: number; chroma: number; lightness: number };

function fromChannels(r: number, g: number, b: number): Tone {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;
  const lightness = (max + min) / 2;
  if (chroma === 0) return { hue: 0, chroma: 0, lightness };
  const sixth =
    max === r
      ? ((((g - b) / chroma) % 6) + 6) % 6
      : max === g
        ? (b - r) / chroma + 2
        : (r - g) / chroma + 4;
  return { hue: sixth * 60, chroma, lightness };
}

function fromHex(literal: string): Tone | null {
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

function fromRgb(inside: string): Tone | null {
  const parts = args(inside);
  if (parts.length < 3) return null;
  const channel = (v: string) => (v.endsWith("%") ? parseFloat(v) / 100 : parseFloat(v) / 255);
  const [r, g, b] = parts.slice(0, 3).map(channel);
  return [r, g, b].some(Number.isNaN) ? null : fromChannels(r, g, b);
}

function fromHsl(inside: string): Tone | null {
  const parts = args(inside);
  if (parts.length < 3) return null;
  const hue = parseFloat(parts[0]);
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;
  if ([hue, s, l].some(Number.isNaN)) return null;
  return {
    hue: ((hue % 360) + 360) % 360,
    chroma: (1 - Math.abs(2 * l - 1)) * s,
    lightness: l,
  };
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
    const tone = parse(literal, fn, inside);
    return tone ? [{ literal, ...tone }] : [];
  });
}

const isNeutral = (tone: Tone) => tone.chroma <= NEUTRAL_CHROMA;
const isPastel = (tone: Tone) =>
  tone.lightness >= PASTEL_LIGHTNESS && tone.chroma <= PASTEL_CHROMA;

// Hues are angles, so the families wrap: a pink at 358° and one at 4° are one
// family, and the mean of the two is 1°, not 181°.
function circularMean(hues: number[]): number {
  const x = hues.reduce((sum, h) => sum + Math.cos((h * Math.PI) / 180), 0);
  const y = hues.reduce((sum, h) => sum + Math.sin((h * Math.PI) / 180), 0);
  return (((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360;
}

function families(hues: number[]): number[] {
  const sorted = [...hues].sort((a, b) => a - b);
  const groups = sorted.reduce<number[][]>((acc, hue) => {
    const open = acc.at(-1);
    if (open && hue - open.at(-1)! <= FAMILY_GAP) open.push(hue);
    else acc.push([hue]);
    return acc;
  }, []);
  // The wheel closes: the group nearest 360° may belong with the one nearest 0°.
  if (groups.length > 1 && 360 - groups.at(-1)!.at(-1)! + groups[0][0] <= FAMILY_GAP) {
    groups[0].push(...groups.pop()!);
  }
  return groups.map(circularMean).sort((a, b) => a - b);
}

function neighbourGaps(centres: number[]): number[] {
  return centres.map((hue, i) => (centres[(i + 1) % centres.length] - hue + 360) % 360);
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

const hues = pages
  .flatMap((page) => page.colours)
  .filter((colour) => !isNeutral(colour))
  .map((colour) => colour.hue);

describe("brand: five rainbow pastels", () => {
  it("found colours to check", () => {
    expect(pages.flatMap((page) => page.colours).length).toBeGreaterThan(0);
  });

  for (const { name, colours } of pages) {
    it(`${name} colours only in pastels`, () => {
      const offBrand = colours.filter((c) => !isNeutral(c) && !isPastel(c));
      const listed = [
        ...new Set(
          offBrand.map(
            (c) =>
              `${c.literal} (lightness ${c.lightness.toFixed(2)}, chroma ${c.chroma.toFixed(2)})`,
          ),
        ),
      ];
      expect(
        listed,
        `not pastel on ${name}: a pastel needs lightness ≥${PASTEL_LIGHTNESS} and ` +
          `chroma ≤${PASTEL_CHROMA}. Neutrals (chroma ≤${NEUTRAL_CHROMA}) are exempt`,
      ).toEqual([]);
    });
  }

  it(`uses exactly ${FAMILIES} pastels`, () => {
    const centres = families(hues);
    expect(
      centres.map((hue) => Math.round(hue)),
      `expected ${FAMILIES} pastel hues, each its own family (hues within ` +
        `${FAMILY_GAP}° of one another count as one)`,
    ).toHaveLength(FAMILIES);
  });

  // A rainbow is spread out. Five pastels bunched between 200° and 260° satisfy
  // the count above while being, to the eye, five blues.
  it("spreads them around the wheel", () => {
    const centres = families(hues);
    const tightest = Math.min(...neighbourGaps(centres));
    expect(
      Math.round(tightest),
      `the two closest pastels sit ${Math.round(tightest)}° apart; a rainbow ` +
        `wants at least ${FAMILY_SPREAD}° between neighbours`,
    ).toBeGreaterThanOrEqual(FAMILY_SPREAD);
  });
});

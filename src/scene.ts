// The thing being photographed: a windowsill at dusk, with a bare bulb swinging
// above it. Everything here is *authored* radiance --- how much light of each
// colour leaves each point towards the lens --- not a rendering. The
// simulation's only job is to sample it one photon at a time.
import { blackbodyRgb, CHANNELS, type Rgb } from "./colour.ts";
import { CELLS, HEIGHT, WIDTH } from "./grid.ts";

export { CELLS, HEIGHT, WIDTH } from "./grid.ts";

/** The plane the lens is focused on. The sill and its objects sit here. */
export const FOCUS_DEPTH = 0;

/** The bulb's filament temperature. The room is lit by it, so the room is warm. */
export const BULB_KELVIN = 2700;
/** Dusk through the window: cold, and much bluer than the room. */
export const SKY_KELVIN = 12000;

export interface Preset {
  readonly id: string;
  readonly label: string;
  /** Multiplies the ambient light. Three stops apart, either side of lamplit. */
  readonly lightLevel: number;
  readonly note: string;
}

export const PRESETS: readonly Preset[] = [
  { id: "daylight", label: "Daylight", lightLevel: 8, note: "three stops brighter than lamplit" },
  { id: "lamplit", label: "Lamplit", lightLevel: 1, note: "the reference: correct at ISO 100, f/4, 1/60 s" },
  { id: "candlelit", label: "Candlelit", lightLevel: 0.125, note: "three stops darker than lamplit" },
];

/** The swinging bulb. Self-luminous, so the ambient preset does not touch it. */
export interface Subject {
  readonly anchorX: number;
  readonly anchorY: number;
  readonly cordLength: number;
  readonly cordHalfWidth: number;
  readonly cordRadiance: number;
  readonly bulbRadius: number;
  readonly bulbRadiance: number;
  /** Peak swing away from vertical, in radians. */
  readonly amplitude: number;
  readonly periodSeconds: number;
  /** Chroma of the filament, summing to one. */
  readonly chroma: Rgb;
}

export const SUBJECT: Subject = {
  anchorX: 86,
  anchorY: -6,
  cordLength: 80,
  cordHalfWidth: 0.7,
  cordRadiance: 0.1,
  bulbRadius: 5.5,
  bulbRadiance: 1.7,
  amplitude: 0.34,
  periodSeconds: 2.4,
  chroma: blackbodyRgb(BULB_KELVIN),
};

export interface Scene {
  /**
   * Radiance of the static scene under the reference lamplit illumination,
   * interleaved RGB. Each cell's three values sum to the total light that cell
   * sends the lens, so the metering maths never has to know about colour.
   */
  readonly base: Float32Array;
  /** Distance from the focal plane. Negative is nearer the camera. */
  readonly depth: Float32Array;
  readonly subject: Subject;
}

/** Split a total radiance across the three bands in the given proportion. */
export function tint(total: number, chroma: Rgb): Rgb {
  return [total * chroma[0], total * chroma[1], total * chroma[2]];
}

/**
 * The chroma of a surface of the given reflectance, lit by the given
 * illuminant. A surface can only send back light that fell on it, so this is a
 * per-band product --- which is why a neutral wall under a tungsten bulb has
 * the bulb's own colour, and white-balancing for the bulb renders it grey.
 */
function reflect(illuminant: Rgb, reflectance: Rgb): Rgb {
  const r = illuminant[0] * reflectance[0];
  const g = illuminant[1] * reflectance[1];
  const b = illuminant[2] * reflectance[2];
  const total = r + g + b;
  return [r / total, g / total, b / total];
}

const TUNGSTEN = blackbodyRgb(BULB_KELVIN);
const SKY = blackbodyRgb(SKY_KELVIN);

// Everything indoors is lit by the bulb and by nothing else, so every indoor
// chroma is the filament's, bent by what the surface reflects. Neutral plaster
// comes out the colour of the bulb, which is the whole point of white balance.
const ROOM = reflect(TUNGSTEN, [1, 0.94, 0.84]);
const WOOD = reflect(TUNGSTEN, [1, 0.78, 0.55]);
const GLASS = reflect(TUNGSTEN, [0.24, 1, 0.5]);
const LEAF = reflect(TUNGSTEN, [0.34, 1, 0.4]);

function fillRect(
  buffer: Float32Array,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  value: Rgb,
): void {
  const left = Math.max(0, Math.round(x0));
  const right = Math.min(WIDTH, Math.round(x1));
  const top = Math.max(0, Math.round(y0));
  const bottom = Math.min(HEIGHT, Math.round(y1));
  for (let y = top; y < bottom; y++) {
    for (let x = left; x < right; x++) {
      const i = (y * WIDTH + x) * CHANNELS;
      buffer[i] = value[0];
      buffer[i + 1] = value[1];
      buffer[i + 2] = value[2];
    }
  }
}

/** Depth is one number per cell, so it gets its own filler. */
function fillDepthRect(
  depth: Float32Array,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  value: number,
): void {
  const left = Math.max(0, Math.round(x0));
  const right = Math.min(WIDTH, Math.round(x1));
  const top = Math.max(0, Math.round(y0));
  const bottom = Math.min(HEIGHT, Math.round(y1));
  for (let y = top; y < bottom; y++) {
    depth.fill(value, y * WIDTH + left, y * WIDTH + right);
  }
}

function ellipseSpans(cx: number, cy: number, rx: number, ry: number): [number, number, number][] {
  const spans: [number, number, number][] = [];
  const top = Math.max(0, Math.floor(cy - ry));
  const bottom = Math.min(HEIGHT, Math.ceil(cy + ry) + 1);
  for (let y = top; y < bottom; y++) {
    const dy = (y - cy) / ry;
    if (Math.abs(dy) > 1) continue;
    const half = rx * Math.sqrt(1 - dy * dy);
    spans.push([y, Math.max(0, Math.round(cx - half)), Math.min(WIDTH, Math.round(cx + half))]);
  }
  return spans;
}

function fillEllipse(
  buffer: Float32Array,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  value: Rgb,
): void {
  for (const [y, left, right] of ellipseSpans(cx, cy, rx, ry)) {
    for (let x = left; x < right; x++) {
      const i = (y * WIDTH + x) * CHANNELS;
      buffer[i] = value[0];
      buffer[i + 1] = value[1];
      buffer[i + 2] = value[2];
    }
  }
}

function fillDepthEllipse(
  depth: Float32Array,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  value: number,
): void {
  for (const [y, left, right] of ellipseSpans(cx, cy, rx, ry)) {
    depth.fill(value, y * WIDTH + left, y * WIDTH + right);
  }
}

/** A window pane, brighter at the top, with a couple of distant lit windows. */
function paintSky(base: Float32Array, x0: number, y0: number, x1: number, y1: number): void {
  for (let y = y0; y < y1; y++) {
    const t = (y - y0) / (y1 - y0);
    fillRect(base, x0, y, x1, y + 1, tint(0.86 - 0.44 * t, SKY));
  }
  // Lit windows in the building opposite --- other people's tungsten, warm
  // against the cold sky, and a good test of whether the aperture is holding
  // the far plane in focus.
  for (const [wx, wy] of [
    [128, 58],
    [134, 58],
    [128, 66],
    [176, 50],
    [182, 62],
    [188, 50],
  ] as const) {
    fillRect(base, wx, wy, wx + 3, wy + 4, tint(1.35, TUNGSTEN));
  }
}

export function createScene(): Scene {
  const base = new Float32Array(CELLS * CHANNELS);
  const depth = new Float32Array(CELLS);

  // The back wall.
  fillRect(base, 0, 0, WIDTH, HEIGHT, tint(0.085, ROOM));
  depth.fill(0.15);

  // The window, and everything behind it, one unit past the focal plane.
  fillDepthRect(depth, 112, 8, 210, 88, 1);
  fillRect(base, 112, 8, 210, 88, tint(0.045, WOOD)); // frame
  paintSky(base, 117, 13, 205, 83);
  fillRect(base, 158, 13, 161, 83, tint(0.045, WOOD)); // vertical muntin
  fillRect(base, 117, 46, 205, 49, tint(0.045, WOOD)); // horizontal muntin

  // The sill, and the darker wall below it. Focal plane from here down.
  fillRect(base, 0, 96, WIDTH, 107, tint(0.24, WOOD));
  fillDepthRect(depth, 0, 96, WIDTH, HEIGHT, 0);
  fillRect(base, 0, 107, WIDTH, HEIGHT, tint(0.05, ROOM));

  // A green glass bottle standing on the sill.
  fillDepthRect(depth, 26, 22, 62, 97, 0);
  fillRect(base, 30, 46, 58, 96, tint(0.105, GLASS));
  fillRect(base, 39, 26, 49, 46, tint(0.105, GLASS));
  fillRect(base, 38, 22, 50, 27, tint(0.3, WOOD)); // cap
  fillRect(base, 33, 48, 36, 94, tint(0.42, TUNGSTEN)); // the bulb, reflected

  // A shallow bowl beside it.
  fillEllipse(base, 96, 93, 21, 9, tint(0.28, ROOM));
  fillEllipse(base, 96, 89, 21, 5, tint(0.44, ROOM));
  fillDepthEllipse(depth, 96, 91, 21, 11, 0);

  // A sprig leaning in from the near corner, well in front of the focal plane.
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const x = 4 + 52 * t;
    const y = HEIGHT - 4 - 46 * t * t;
    fillEllipse(base, x, y, 1.6, 1.6, tint(0.46, LEAF));
    fillDepthEllipse(depth, x, y, 3.2, 3.2, -0.55);
    if (i % 8 === 0) {
      fillEllipse(base, x + 5, y - 4, 5, 2.6, tint(0.5, LEAF));
      fillDepthEllipse(depth, x + 5, y - 4, 5, 2.6, -0.55);
    }
  }

  return { base, depth, subject: SUBJECT };
}

/** Where the cord is at time `t`, in radians away from straight down. */
export function subjectAngle(subject: Subject, t: number): number {
  return subject.amplitude * Math.sin((2 * Math.PI * t) / subject.periodSeconds);
}

export function bulbCentre(subject: Subject, t: number): { x: number; y: number } {
  const angle = subjectAngle(subject, t);
  return {
    x: subject.anchorX + subject.cordLength * Math.sin(angle),
    y: subject.anchorY + subject.cordLength * Math.cos(angle),
  };
}

/** Radiance x area for the bulb and for the cord, kept apart so the sampler
 *  can choose between them in proportion. */
export function subjectWeights(
  subject: Subject,
  lightLevel: number,
): { bulb: number; cord: number; total: number } {
  const bulb = Math.PI * subject.bulbRadius ** 2 * subject.bulbRadiance;
  const cord =
    subject.cordLength * 2 * subject.cordHalfWidth * subject.cordRadiance * lightLevel;
  return { bulb, cord, total: bulb + cord };
}

/**
 * The static scene under a given ambient level and a given brush mask, written
 * into `out` as interleaved RGB. This is the distribution photons are drawn
 * from, so it is rebuilt whenever either input changes. Returns the total,
 * summed over cells and channels --- which is the same number the monochrome
 * version returned, because a cell's three bands add up to its light.
 */
export function combineRadiance(
  scene: Scene,
  lightLevel: number,
  paint: Float32Array,
  out: Float64Array,
): number {
  let total = 0;
  for (let i = 0; i < CELLS * CHANNELS; i++) {
    const value = scene.base[i] * lightLevel * paint[i];
    out[i] = value;
    total += value;
  }
  return total;
}

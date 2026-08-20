// The thing being photographed: a windowsill at dusk, with a bare bulb swinging
// above it. Everything here is *authored* radiance --- how much light leaves
// each point towards the lens --- not a rendering. The simulation's only job is
// to sample it one photon at a time.

/** Sensor resolution, in cells. Every buffer below is this size. */
export const WIDTH = 220;
export const HEIGHT = 140;
export const CELLS = WIDTH * HEIGHT;

/** The plane the lens is focused on. The sill and its objects sit here. */
export const FOCUS_DEPTH = 0;

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
};

export interface Scene {
  /** Radiance of the static scene under the reference lamplit illumination. */
  readonly base: Float32Array;
  /** Distance from the focal plane. Negative is nearer the camera. */
  readonly depth: Float32Array;
  readonly subject: Subject;
}

function fillRect(
  buffer: Float32Array,
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
    buffer.fill(value, y * WIDTH + left, y * WIDTH + right);
  }
}

function fillEllipse(
  buffer: Float32Array,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  value: number,
): void {
  const top = Math.max(0, Math.floor(cy - ry));
  const bottom = Math.min(HEIGHT, Math.ceil(cy + ry) + 1);
  for (let y = top; y < bottom; y++) {
    const dy = (y - cy) / ry;
    if (Math.abs(dy) > 1) continue;
    const half = rx * Math.sqrt(1 - dy * dy);
    const left = Math.max(0, Math.round(cx - half));
    const right = Math.min(WIDTH, Math.round(cx + half));
    buffer.fill(value, y * WIDTH + left, y * WIDTH + right);
  }
}

/** A window pane, brighter at the top, with a couple of distant lit windows. */
function paintSky(radiance: Float32Array, x0: number, y0: number, x1: number, y1: number): void {
  for (let y = y0; y < y1; y++) {
    const t = (y - y0) / (y1 - y0);
    const value = 0.86 - 0.44 * t;
    radiance.fill(value, y * WIDTH + x0, y * WIDTH + x1);
  }
  // Lit windows in the building opposite. Small, bright, and a good test of
  // whether the aperture is holding the far plane in focus.
  for (const [wx, wy] of [
    [128, 58],
    [134, 58],
    [128, 66],
    [176, 50],
    [182, 62],
    [188, 50],
  ] as const) {
    fillRect(radiance, wx, wy, wx + 3, wy + 4, 1.35);
  }
}

export function createScene(): Scene {
  const base = new Float32Array(CELLS);
  const depth = new Float32Array(CELLS);

  // The back wall.
  base.fill(0.085);
  depth.fill(0.15);

  // The window, and everything behind it, one unit past the focal plane.
  fillRect(depth, 112, 8, 210, 88, 1);
  fillRect(base, 112, 8, 210, 88, 0.045); // frame
  paintSky(base, 117, 13, 205, 83);
  fillRect(base, 158, 13, 161, 83, 0.045); // vertical muntin
  fillRect(base, 117, 46, 205, 49, 0.045); // horizontal muntin

  // The sill, and the darker wall below it. Focal plane from here down.
  fillRect(base, 0, 96, WIDTH, 107, 0.24);
  fillRect(depth, 0, 96, WIDTH, HEIGHT, 0);
  fillRect(base, 0, 107, WIDTH, HEIGHT, 0.05);

  // A bottle standing on the sill.
  fillRect(depth, 26, 22, 62, 97, 0);
  fillRect(base, 30, 46, 58, 96, 0.105);
  fillRect(base, 39, 26, 49, 46, 0.105);
  fillRect(base, 38, 22, 50, 27, 0.3); // cap
  fillRect(base, 33, 48, 36, 94, 0.42); // rim highlight down one side

  // A shallow bowl beside it.
  fillEllipse(base, 96, 93, 21, 9, 0.28);
  fillEllipse(base, 96, 89, 21, 5, 0.44);
  fillEllipse(depth, 96, 91, 21, 11, 0);

  // A sprig leaning in from the near corner, well in front of the focal plane.
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const x = 4 + 52 * t;
    const y = HEIGHT - 4 - 46 * t * t;
    fillEllipse(base, x, y, 1.6, 1.6, 0.46);
    fillEllipse(depth, x, y, 3.2, 3.2, -0.55);
    if (i % 8 === 0) {
      fillEllipse(base, x + 5, y - 4, 5, 2.6, 0.5);
      fillEllipse(depth, x + 5, y - 4, 5, 2.6, -0.55);
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
 * The static scene under a given ambient level and a given light-brush mask,
 * written into `out`. This is the distribution photons are drawn from, so it
 * is rebuilt whenever either input changes.
 */
export function combineRadiance(
  scene: Scene,
  lightLevel: number,
  paint: Float32Array,
  out: Float64Array,
): number {
  let total = 0;
  for (let i = 0; i < CELLS; i++) {
    const value = scene.base[i] * lightLevel * paint[i];
    out[i] = value;
    total += value;
  }
  return total;
}

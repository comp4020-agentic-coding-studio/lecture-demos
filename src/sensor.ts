// The sensor. It counts photons; it does nothing else. Brightness, grain and
// blur are all consequences of how many arrive, where they land, and when.
import type { AliasTable } from "./alias.ts";
import {
  apertureFactor,
  circleOfConfusionRadius,
  isoGain,
  PHOTONS_PER_UNIT_RADIANCE,
  shutterFactor,
  toneMap,
  type Settings,
} from "./optics.ts";
import type { Rng } from "./rng.ts";
import {
  CELLS,
  FOCUS_DEPTH,
  HEIGHT,
  subjectAngle,
  subjectWeights,
  WIDTH,
  type Scene,
} from "./scene.ts";

/**
 * How many photons the whole frame collects over one complete exposure. The
 * shutter closes when this many have been emitted, so the simulation's clock
 * and the photon budget are the same thing.
 */
/**
 * How many photons one cell can hold before it saturates. Sets where the
 * highlights clip: at ISO 100 a cell goes pure white at 700 counts, so there
 * are about one and a half stops of headroom above white before it stops
 * recording anything at all.
 */
export const FULL_WELL = 2200;

export function photonsForExposure(
  sceneWeight: number,
  settings: Settings,
): number {
  return (
    sceneWeight *
    PHOTONS_PER_UNIT_RADIANCE *
    apertureFactor(settings.fNumber) *
    shutterFactor(settings.shutterSeconds)
  );
}

export interface AccumulateParams {
  /** Photon counts per cell. Mutated in place. */
  counts: Uint32Array;
  scene: Scene;
  /** Alias table over the static scene's radiance. */
  table: AliasTable;
  /** Summed static radiance --- `table.total`, passed separately for clarity. */
  staticWeight: number;
  lightLevel: number;
  settings: Settings;
  /** Scene-clock time, in seconds, of the first photon in this batch. */
  timeFrom: number;
  /** How much scene time this batch of photons spans. */
  timeSpan: number;
  /** How many photons to emit on this call. */
  budget: number;
  rng: Rng;
}

/**
 * Emit `budget` photons and record where they land. Each one independently:
 * picks an arrival time inside the open shutter, picks a point on the scene in
 * proportion to that point's radiance, spreads by the lens's circle of
 * confusion for its depth, and lands in one cell.
 *
 * Returns how many of them hit the sensor. The rest were scattered off the
 * edge of the frame by defocus, or were carried off it by the moving subject.
 */
export function accumulate(p: AccumulateParams): number {
  const { counts, scene, table, settings, rng, lightLevel } = p;
  const { depth, subject } = scene;
  const { prob, alias, n } = table;

  const weights = subjectWeights(subject, lightLevel);
  const totalWeight = p.staticWeight + weights.total;
  if (totalWeight <= 0) return 0;
  const subjectShare = weights.total / totalWeight;
  const bulbShare = weights.total > 0 ? weights.bulb / weights.total : 0;

  const { fNumber } = settings;
  const twoPi = Math.PI * 2;
  let landed = 0;

  for (let k = 0; k < p.budget; k++) {
    let x: number;
    let y: number;
    let cocRadius = 0;

    if (rng() < subjectShare) {
      // The bulb, wherever it happens to be at this photon's arrival time.
      // Motion blur is not an effect applied afterwards; it is this line.
      const t = p.timeFrom + rng() * p.timeSpan;
      const angle = subjectAngle(subject, t);
      const sin = Math.sin(angle);
      const cos = Math.cos(angle);

      let localAlong: number;
      let localAcross: number;
      if (rng() < bulbShare) {
        const r = subject.bulbRadius * Math.sqrt(rng());
        const theta = twoPi * rng();
        localAlong = subject.cordLength + r * Math.sin(theta);
        localAcross = r * Math.cos(theta);
      } else {
        localAlong = subject.cordLength * rng();
        localAcross = (rng() * 2 - 1) * subject.cordHalfWidth;
      }
      x = subject.anchorX + localAlong * sin + localAcross * cos;
      y = subject.anchorY + localAlong * cos - localAcross * sin;
      // The bulb hangs on the focal plane, so it is never defocused --- only
      // ever smeared. Keeping the two blurs on separate objects is deliberate.
    } else {
      // Alias sampling, inlined: this runs millions of times per exposure.
      const bucket = (rng() * n) | 0;
      const cell = rng() < prob[bucket] ? bucket : alias[bucket];
      x = (cell % WIDTH) + rng();
      y = ((cell / WIDTH) | 0) + rng();
      cocRadius = circleOfConfusionRadius(fNumber, depth[cell], FOCUS_DEPTH);
    }

    if (cocRadius > 0) {
      const r = cocRadius * Math.sqrt(rng());
      const theta = twoPi * rng();
      x += r * Math.cos(theta);
      y += r * Math.sin(theta);
    }

    const px = x | 0;
    const py = y | 0;
    if (px >= 0 && px < WIDTH && py >= 0 && py < HEIGHT && x >= 0 && y >= 0) {
      const cell = py * WIDTH + px;
      // A cell holds only so many electrons. Past that the photon is real, is
      // absorbed, and is simply not recorded --- which is what a blown
      // highlight is.
      if (counts[cell] < FULL_WELL) {
        counts[cell]++;
        landed++;
      }
    }
  }

  return landed;
}

/**
 * A 1024-step lookup from linear brightness to display pixel. The slight cool
 * cast in the shadows and warmth in the highlights is a look applied at the
 * display, like a print, and is no part of the sensor model.
 */
export function buildToneLut(): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(1024 * 3);
  for (let i = 0; i < 1024; i++) {
    const v = toneMap(i / 1023);
    lut[i * 3] = 255 * (v + 0.045 * v * v);
    lut[i * 3 + 1] = 255 * (v + 0.012 * v * v);
    lut[i * 3 + 2] = 255 * (v + 0.1 * v * (1 - v));
  }
  return lut;
}

/** Amplify the counts by the ISO gain and write them into `image`. */
export function renderCounts(
  counts: Uint32Array,
  iso: number,
  lut: Uint8ClampedArray,
  image: ImageData,
): void {
  const gain = isoGain(iso) / PHOTONS_PER_UNIT_RADIANCE;
  const data = image.data;
  for (let i = 0; i < CELLS; i++) {
    const linear = counts[i] * gain;
    const step = linear >= 1 ? 1023 : (linear * 1023) | 0;
    const o = step * 3;
    const p = i * 4;
    data[p] = lut[o];
    data[p + 1] = lut[o + 1];
    data[p + 2] = lut[o + 2];
    data[p + 3] = 255;
  }
}

/**
 * The scene as a noiseless, perfectly metered sensor would record it: no
 * photon counting, no defocus, no smear. The honest comparison for the frame
 * the simulation is building next to it.
 */
export function renderIdeal(
  radiance: Float64Array,
  scene: Scene,
  lightLevel: number,
  time: number,
  exposureFactor: number,
  lut: Uint8ClampedArray,
  image: ImageData,
): void {
  const data = image.data;
  for (let i = 0; i < CELLS; i++) {
    const linear = radiance[i] * exposureFactor;
    const step = linear >= 1 ? 1023 : (linear * 1023) | 0;
    const o = step * 3;
    const p = i * 4;
    data[p] = lut[o];
    data[p + 1] = lut[o + 1];
    data[p + 2] = lut[o + 2];
    data[p + 3] = 255;
  }

  // Stamp the bulb and its cord at a single instant.
  const { subject } = scene;
  const angle = subjectAngle(subject, time);
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  const stamp = (x: number, y: number, value: number): void => {
    const px = Math.round(x);
    const py = Math.round(y);
    if (px < 0 || px >= WIDTH || py < 0 || py >= HEIGHT) return;
    const linear = value * exposureFactor;
    const step = linear >= 1 ? 1023 : (linear * 1023) | 0;
    const o = step * 3;
    const p = (py * WIDTH + px) * 4;
    data[p] = lut[o];
    data[p + 1] = lut[o + 1];
    data[p + 2] = lut[o + 2];
  };

  for (let s = 0; s <= subject.cordLength; s++) {
    stamp(subject.anchorX + s * sin, subject.anchorY + s * cos, subject.cordRadiance * lightLevel);
  }
  const cx = subject.anchorX + subject.cordLength * sin;
  const cy = subject.anchorY + subject.cordLength * cos;
  const r = Math.ceil(subject.bulbRadius);
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy <= subject.bulbRadius ** 2) {
        stamp(cx + dx, cy + dy, subject.bulbRadiance);
      }
    }
  }
}

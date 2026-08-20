// The sensor. It counts photons; it does nothing else. Brightness, grain, blur
// and colour are all consequences of how many arrive, where they land, when,
// and which filter they have to get through first.
import type { AliasTable } from "./alias.ts";
import { bayerChannel, CHANNELS, demosaic, type Rgb } from "./colour.ts";
import { CELLS, HEIGHT, WIDTH } from "./grid.ts";
import {
  apertureFactor,
  CFA_GAIN,
  circleOfConfusionRadius,
  isoGain,
  PHOTONS_PER_UNIT_RADIANCE,
  shutterFactor,
  toneMap,
  type Settings,
} from "./optics.ts";
import type { Rng } from "./rng.ts";
import { FOCUS_DEPTH, subjectAngle, subjectWeights, type Scene } from "./scene.ts";

/**
 * How many photons one cell can hold before it saturates. Sets where the
 * highlights clip: about three stops above white with the filters on. A
 * monochrome cell has the same well but three times the light going into it,
 * so it clips a stop and a half sooner --- which is true of the real thing.
 */
export const FULL_WELL = 4200;

/** Is the colour filter array in place, or has it been lifted off? */
export type SensorMode = "colour" | "mono";

/**
 * How many photons the whole frame collects over one complete exposure. The
 * shutter closes when this many have been emitted, so the simulation's clock
 * and the photon budget are the same thing. Independent of sensor mode: the
 * light arrives either way, and the filters decide what is recorded.
 */
export function photonsForExposure(sceneWeight: number, settings: Settings): number {
  return (
    sceneWeight *
    PHOTONS_PER_UNIT_RADIANCE *
    apertureFactor(settings.fNumber) *
    shutterFactor(settings.shutterSeconds)
  );
}

export interface AccumulateParams {
  /** Photon counts per cell --- one number, for whichever band the cell sees. */
  counts: Uint32Array;
  scene: Scene;
  /** Alias table over the static scene's radiance, one entry per cell per band. */
  table: AliasTable;
  /** Summed static radiance --- `table.total`, passed separately for clarity. */
  staticWeight: number;
  lightLevel: number;
  settings: Settings;
  mode: SensorMode;
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
 * picks an arrival time inside the open shutter, picks a point on the scene and
 * a colour band in proportion to that point's radiance in that band, spreads by
 * the lens's circle of confusion for its depth, and arrives at one cell --- and
 * is then recorded only if that cell's filter passes its colour.
 *
 * Returns how many were recorded. The rest were absorbed by a filter, scattered
 * off the edge of the frame, or arrived at a cell that was already full.
 */
export function accumulate(p: AccumulateParams): number {
  const { counts, scene, table, settings, rng, lightLevel, mode } = p;
  const { depth, subject } = scene;
  const { prob, alias, n } = table;

  const weights = subjectWeights(subject, lightLevel);
  const totalWeight = p.staticWeight + weights.total;
  if (totalWeight <= 0) return 0;
  const subjectShare = weights.total / totalWeight;
  const bulbShare = weights.total > 0 ? weights.bulb / weights.total : 0;
  const filtered = mode === "colour";
  const chroma = subject.chroma;

  const { fNumber } = settings;
  const twoPi = Math.PI * 2;
  let landed = 0;

  for (let k = 0; k < p.budget; k++) {
    let x: number;
    let y: number;
    let band: number;
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

      // The filament's own colour decides which band this photon is in.
      const pick = rng();
      band = pick < chroma[0] ? 0 : pick < chroma[0] + chroma[1] ? 1 : 2;
      // The bulb hangs on the focal plane, so it is never defocused --- only
      // ever smeared. Keeping the two blurs on separate objects is deliberate.
    } else {
      // Alias sampling, inlined: this runs millions of times per exposure. One
      // draw picks the cell and the colour band together.
      const bucket = (rng() * n) | 0;
      const entry = rng() < prob[bucket] ? bucket : alias[bucket];
      const cell = (entry / CHANNELS) | 0;
      band = entry - cell * CHANNELS;
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
      // The colour filter array. Two photons in three are simply absorbed ---
      // which is the entire price of colour, and it is paid in light.
      if (filtered && bayerChannel(px, py) !== band) continue;
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

/** A 1024-step lookup from linear brightness to an 8-bit display value. */
export function buildToneLut(): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(1024);
  for (let i = 0; i < 1024; i++) lut[i] = 255 * toneMap(i / 1023);
  return lut;
}

function encode(lut: Uint8ClampedArray, linear: number): number {
  return lut[linear >= 1 ? 1023 : linear <= 0 ? 0 : (linear * 1023) | 0];
}

/** Filters lifted off: every cell measured the whole spectrum, so the image is
 *  a single channel painted into all three. */
export function renderMono(
  counts: Uint32Array,
  iso: number,
  lut: Uint8ClampedArray,
  image: ImageData,
): void {
  const gain = isoGain(iso) / PHOTONS_PER_UNIT_RADIANCE;
  const data = image.data;
  for (let i = 0; i < CELLS; i++) {
    const value = encode(lut, counts[i] * gain);
    const p = i * 4;
    data[p] = value;
    data[p + 1] = value;
    data[p + 2] = value;
    data[p + 3] = 255;
  }
}

/**
 * Filters in place: fill in the two channels each cell never measured, then
 * apply the gains. CFA_GAIN puts back the light the filters took, ISO is the
 * photographer's, and white balance is the three-channel one that makes a
 * neutral surface neutral. All three are gain, and none of them adds a photon.
 */
export function renderColour(
  counts: Uint32Array,
  planes: Float32Array,
  iso: number,
  whiteBalance: Rgb,
  lut: Uint8ClampedArray,
  image: ImageData,
): void {
  demosaic(counts, planes);
  const base = (isoGain(iso) * CFA_GAIN) / PHOTONS_PER_UNIT_RADIANCE;
  const gr = base * whiteBalance[0];
  const gg = base * whiteBalance[1];
  const gb = base * whiteBalance[2];
  const data = image.data;
  for (let i = 0; i < CELLS; i++) {
    const s = i * CHANNELS;
    const p = i * 4;
    data[p] = encode(lut, planes[s] * gr);
    data[p + 1] = encode(lut, planes[s + 1] * gg);
    data[p + 2] = encode(lut, planes[s + 2] * gb);
    data[p + 3] = 255;
  }
}

/**
 * The scene as a noiseless, perfectly metered sensor with no mosaic over it
 * would record it: no photon counting, no defocus, no smear. The honest
 * comparison for the frame the simulation is building next to it.
 */
export function renderIdeal(
  radiance: Float64Array,
  scene: Scene,
  lightLevel: number,
  time: number,
  exposureFactor: number,
  mode: SensorMode,
  whiteBalance: Rgb,
  lut: Uint8ClampedArray,
  image: ImageData,
): void {
  const data = image.data;
  const colour = mode === "colour";
  // The ideal view measures all three bands at every cell, so it needs no CFA
  // gain --- but it is white balanced to match, or the comparison would lie.
  const gr = exposureFactor * CHANNELS * (colour ? whiteBalance[0] : 1);
  const gg = exposureFactor * CHANNELS * (colour ? whiteBalance[1] : 1);
  const gb = exposureFactor * CHANNELS * (colour ? whiteBalance[2] : 1);

  for (let i = 0; i < CELLS; i++) {
    const s = i * CHANNELS;
    const p = i * 4;
    if (colour) {
      data[p] = encode(lut, radiance[s] * gr);
      data[p + 1] = encode(lut, radiance[s + 1] * gg);
      data[p + 2] = encode(lut, radiance[s + 2] * gb);
    } else {
      const value = encode(lut, (radiance[s] + radiance[s + 1] + radiance[s + 2]) * exposureFactor);
      data[p] = value;
      data[p + 1] = value;
      data[p + 2] = value;
    }
    data[p + 3] = 255;
  }

  // Stamp the bulb and its cord at a single instant.
  const { subject } = scene;
  const angle = subjectAngle(subject, time);
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  const stamp = (sx: number, sy: number, total: number, tone: Rgb): void => {
    const px = Math.round(sx);
    const py = Math.round(sy);
    if (px < 0 || px >= WIDTH || py < 0 || py >= HEIGHT) return;
    const p = (py * WIDTH + px) * 4;
    if (colour) {
      data[p] = encode(lut, total * tone[0] * gr);
      data[p + 1] = encode(lut, total * tone[1] * gg);
      data[p + 2] = encode(lut, total * tone[2] * gb);
    } else {
      const value = encode(lut, total * exposureFactor);
      data[p] = value;
      data[p + 1] = value;
      data[p + 2] = value;
    }
  };

  for (let s = 0; s <= subject.cordLength; s++) {
    stamp(
      subject.anchorX + s * sin,
      subject.anchorY + s * cos,
      subject.cordRadiance * lightLevel,
      subject.chroma,
    );
  }
  const cx = subject.anchorX + subject.cordLength * sin;
  const cy = subject.anchorY + subject.cordLength * cos;
  const r = Math.ceil(subject.bulbRadius);
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy <= subject.bulbRadius ** 2) {
        stamp(cx + dx, cy + dy, subject.bulbRadiance, subject.chroma);
      }
    }
  }
}

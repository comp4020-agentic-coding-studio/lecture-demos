// Colour, the way a camera actually gets it: not three measurements per pixel,
// but one measurement per pixel behind a coloured filter, and a guess for the
// other two. Everything expensive about colour photography follows from that.
import { HEIGHT, WIDTH } from "./grid.ts";

/** Red, green, blue. Every radiance buffer is three floats per cell, in this order. */
export const CHANNELS = 3;
export type Rgb = readonly [number, number, number];

/**
 * Which filter sits over this cell, in the usual RGGB mosaic:
 *
 *     R G R G
 *     G B G B
 *
 * Half the cells are green, because that is roughly where our eyes keep their
 * acuity. It is also why green is the least noisy channel in the result.
 */
export function bayerChannel(x: number, y: number): number {
  return (y & 1) === 0 ? (x & 1) : (x & 1) + 1;
}

/** hc/k, in metre-kelvin: the constant in Planck's exponential. */
const PLANCK_C2 = 1.438776877e-2;

/** Band centres the simulation samples the spectrum at, in nanometres. */
export const BAND_NANOMETRES: Rgb = [610, 550, 465];

function planck(nanometres: number, kelvin: number): number {
  const l = nanometres * 1e-9;
  return 1 / (l ** 5 * (Math.exp(PLANCK_C2 / (l * kelvin)) - 1));
}

/**
 * What a black body at this temperature looks like to the three filters,
 * normalised to sum to one so it can be used as a chroma. Planck's law is
 * exact; sampling it at three wavelengths instead of integrating it against
 * real filter responses is the simplification.
 */
export function blackbodyRgb(kelvin: number): Rgb {
  const r = planck(BAND_NANOMETRES[0], kelvin);
  const g = planck(BAND_NANOMETRES[1], kelvin);
  const b = planck(BAND_NANOMETRES[2], kelvin);
  const total = r + g + b;
  return [r / total, g / total, b / total];
}

/**
 * The per-channel multipliers that render a neutral surface lit by a black body
 * at `kelvin` as neutral. Note what this is: gain, applied at readout, exactly
 * like ISO. Correcting a tungsten frame multiplies the blue channel by about
 * two and a half — along with everything wrong with it.
 */
export function whiteBalanceGains(kelvin: number): Rgb {
  const [r, g, b] = blackbodyRgb(kelvin);
  const neutral = 1 / CHANNELS;
  return [neutral / r, neutral / g, neutral / b];
}

/** Mirror an out-of-range coordinate back inside, preserving its parity ---
 *  clamping would fold onto a cell under a different filter. */
function mirror(v: number, limit: number): number {
  if (v < 0) return -v;
  if (v >= limit) return 2 * limit - 2 - v;
  return v;
}

function at(counts: Uint32Array, x: number, y: number): number {
  return counts[mirror(y, HEIGHT) * WIDTH + mirror(x, WIDTH)];
}

/**
 * Fill in the two channels each cell did not measure, by averaging the
 * neighbours that did. Bilinear: the simplest thing that works, and its
 * failures --- softened fine detail, false colour on hard edges, and chroma
 * blotches wherever the counts are low --- are the ones real demosaicing
 * algorithms are built to avoid.
 *
 * Writes interleaved RGB into `planes`, which must be CELLS * 3 long.
 */
export function demosaic(counts: Uint32Array, planes: Float32Array): void {
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const i = (y * WIDTH + x) * CHANNELS;
      const own = counts[y * WIDTH + x];
      const channel = bayerChannel(x, y);

      if (channel === 1) {
        // A green cell. Its red and blue neighbours lie along opposite axes,
        // and which is which depends on the parity of the row.
        const horizontal = (at(counts, x - 1, y) + at(counts, x + 1, y)) / 2;
        const vertical = (at(counts, x, y - 1) + at(counts, x, y + 1)) / 2;
        const evenRow = (y & 1) === 0;
        planes[i] = evenRow ? horizontal : vertical;
        planes[i + 1] = own;
        planes[i + 2] = evenRow ? vertical : horizontal;
        continue;
      }

      // A red or a blue cell: green from the four sides, the opposite
      // channel from the four corners.
      const green =
        (at(counts, x - 1, y) +
          at(counts, x + 1, y) +
          at(counts, x, y - 1) +
          at(counts, x, y + 1)) /
        4;
      const diagonal =
        (at(counts, x - 1, y - 1) +
          at(counts, x + 1, y - 1) +
          at(counts, x - 1, y + 1) +
          at(counts, x + 1, y + 1)) /
        4;
      planes[i] = channel === 0 ? own : diagonal;
      planes[i + 1] = green;
      planes[i + 2] = channel === 0 ? diagonal : own;
    }
  }
}

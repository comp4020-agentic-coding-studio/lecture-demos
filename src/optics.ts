// The exposure maths, kept apart from anything that draws. Every number the
// page reports comes from here, so the claims on the page and the behaviour of
// the simulation cannot drift apart.

/** The settings a photographer actually turns. */
export interface Settings {
  /** Sensitivity, as an ISO speed rating. Gain at readout; see `isoGain`. */
  iso: number;
  /** Aperture as an f-number: the focal length divided by the hole's diameter. */
  fNumber: number;
  /** How long the shutter stays open, in seconds. */
  shutterSeconds: number;
}

/** The settings everything else is measured against: ISO 100, f/4, 1/60 s. */
export const REFERENCE: Settings = { iso: 100, fNumber: 4, shutterSeconds: 1 / 60 };

/** The reflectance a light meter aims to render as a mid grey. */
export const MIDDLE_GREY = 0.18;

/**
 * Photons counted by one sensor cell, per unit of scene radiance, at the
 * reference aperture and shutter. Sets the whole simulation's photon budget:
 * a mid grey lands on 0.18 x 700 = 126 photons when correctly exposed, which
 * is grainy enough to see and clean enough to read as a photograph.
 */
export const PHOTONS_PER_UNIT_RADIANCE = 700;

/** Tunes how fast defocus grows. Chosen so f/16 is sharp and f/1.4 is not. */
export const DEFOCUS_SCALE = 13;

/** Widest and narrowest stops offered, in the order the slider steps through. */
export const F_NUMBERS = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16] as const;
export const ISO_SPEEDS = [100, 200, 400, 800, 1600, 3200, 6400, 12800] as const;
export const SHUTTER_SPEEDS = [
  1 / 1000,
  1 / 500,
  1 / 250,
  1 / 125,
  1 / 60,
  1 / 30,
  1 / 15,
  1 / 8,
  1 / 4,
  1 / 2,
  1,
] as const;

/**
 * How much more light this aperture admits than the reference one. The hole's
 * area goes as the square of its diameter, and the diameter goes as 1/N, so
 * one stop down the f-number series halves the light.
 */
export function apertureFactor(fNumber: number): number {
  return (REFERENCE.fNumber / fNumber) ** 2;
}

/** How much longer this shutter stays open than the reference one. */
export function shutterFactor(shutterSeconds: number): number {
  return shutterSeconds / REFERENCE.shutterSeconds;
}

/**
 * The multiplier applied to the counted signal at readout. This is the whole
 * of what ISO does: it is not in `expectedPhotons` and not in `relativeGrain`,
 * because amplifying a measurement cannot improve it.
 */
export function isoGain(iso: number): number {
  return iso / REFERENCE.iso;
}

/**
 * Photons a cell of this radiance collects over the whole exposure. Note the
 * absent parameter: no ISO. The sensor counts what arrives.
 */
export function expectedPhotons(
  radiance: number,
  fNumber: number,
  shutterSeconds: number,
): number {
  return (
    radiance *
    PHOTONS_PER_UNIT_RADIANCE *
    apertureFactor(fNumber) *
    shutterFactor(shutterSeconds)
  );
}

/**
 * Grain, as the ratio of the noise to the signal it sits on. Photon arrivals
 * are Poisson, so the standard deviation of a count of N is the square root of
 * N, and the relative error is one over that. Fewer photons, more grain --- and
 * again, no ISO parameter.
 */
export function relativeGrain(
  radiance: number,
  fNumber: number,
  shutterSeconds: number,
): number {
  const photons = expectedPhotons(radiance, fNumber, shutterSeconds);
  return photons > 0 ? 1 / Math.sqrt(photons) : 1;
}

/**
 * How far the exposure sits from the one that would render the scene's average
 * radiance as a mid grey, in stops. Negative is dark, positive is blown out.
 */
export function exposureStops(meanRadiance: number, settings: Settings): number {
  if (meanRadiance <= 0) return -Infinity;
  const rendered =
    meanRadiance *
    apertureFactor(settings.fNumber) *
    shutterFactor(settings.shutterSeconds) *
    isoGain(settings.iso);
  return Math.log2(rendered / MIDDLE_GREY);
}

export type ExposureVerdict =
  | "very dark"
  | "dark"
  | "balanced"
  | "bright"
  | "blown out";

export function exposureVerdict(stops: number): ExposureVerdict {
  if (stops < -2) return "very dark";
  if (stops < -0.4) return "dark";
  if (stops <= 0.4) return "balanced";
  if (stops <= 2) return "bright";
  return "blown out";
}

/**
 * The radius, in sensor cells, of the disc a single scene point spreads over.
 * A point on the focal plane lands on one cell; everything else spreads by an
 * amount proportional to the aperture's diameter and to its distance from that
 * plane. This is the only reason a wide aperture has shallow depth of field.
 */
export function circleOfConfusionRadius(
  fNumber: number,
  depth: number,
  focusDepth: number,
): number {
  return (DEFOCUS_SCALE * Math.abs(depth - focusDepth)) / fNumber;
}

/** Raw counts, amplified and converted to a displayable 0..1 brightness. */
export function renderLinear(photonCount: number, iso: number): number {
  return (isoGain(iso) * photonCount) / PHOTONS_PER_UNIT_RADIANCE;
}

/** The display transfer function. Nothing to do with the sensor model. */
export function toneMap(linear: number): number {
  if (linear <= 0) return 0;
  if (linear >= 1) return 1;
  return linear ** (1 / 2.2);
}

/** "1/60 s", "1/1000 s", "1 s" --- the way a camera writes it. */
export function formatShutter(seconds: number): string {
  if (seconds >= 1) return `${seconds} s`;
  return `1/${Math.round(1 / seconds)} s`;
}

/** "f/2.8" --- one decimal place only where the series needs it. */
export function formatAperture(fNumber: number): string {
  return `f/${Number.isInteger(fNumber) ? fNumber : fNumber.toFixed(1)}`;
}

/** "1.2M", "43k", "900" --- photon counts get large. */
export function formatCount(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(n < 1e7 ? 2 : 1)}M`;
  if (n >= 1e4) return `${Math.round(n / 1e3)}k`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return `${Math.round(n)}`;
}

/** Stops relative to the reference setting, signed, for the trade-off panel. */
export function stopsFromReference(factor: number): number {
  return Math.log2(factor);
}

export function formatStops(stops: number): string {
  const rounded = Math.abs(stops) < 0.05 ? 0 : stops;
  const sign = rounded > 0 ? "+" : rounded < 0 ? "−" : "";
  return `${sign}${Math.abs(rounded).toFixed(1)} stops`;
}

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { buildAlias } from "../src/alias.ts";
import {
  bayerChannel,
  blackbodyRgb,
  CHANNELS,
  demosaic,
  whiteBalanceGains,
} from "../src/colour.ts";
import {
  apertureFactor,
  CFA_GAIN,
  cfaGrainPenalty,
  circleOfConfusionRadius,
  expectedPhotons,
  exposureStops,
  exposureVerdict,
  formatShutter,
  isoGain,
  MIDDLE_GREY,
  REFERENCE,
  relativeGrain,
  renderLinear,
  shutterFactor,
} from "../src/optics.ts";
import { mulberry32 } from "../src/rng.ts";
import { CELLS, HEIGHT, WIDTH, type Scene, type Subject } from "../src/scene.ts";
import {
  accumulate,
  FULL_WELL,
  photonsForExposure,
  type SensorMode,
} from "../src/sensor.ts";

// This page claims that a photograph is nothing but a tally of photon arrivals,
// and that each of the three dials buys light in a different currency. These
// tests hold the simulation to those claims: if the code stops behaving the way
// the copy says it does, one of them goes red.

const flatSubject: Subject = {
  anchorX: 0,
  anchorY: 0,
  cordLength: 1,
  cordHalfWidth: 0,
  cordRadiance: 0,
  bulbRadius: 0,
  bulbRadiance: 0,
  amplitude: 0,
  periodSeconds: 1,
  chroma: [1 / 3, 1 / 3, 1 / 3],
};

/**
 * A featureless, flat-lit, everything-in-focus, perfectly neutral scene, for
 * statistics. `radiance` is the cell's total; it is split evenly across the
 * three bands, exactly as the real scene's triples sum to their total.
 */
function flatScene(radiance: number): { scene: Scene; weights: Float64Array; total: number } {
  const base = new Float32Array(CELLS * CHANNELS).fill(radiance / CHANNELS);
  const depth = new Float32Array(CELLS);
  const weights = new Float64Array(CELLS * CHANNELS).fill(radiance / CHANNELS);
  return { scene: { base, depth, subject: flatSubject }, weights, total: radiance * CELLS };
}

/** All the light concentrated into `lit` cells, so a well fills quickly. */
function spotScene(lit: number, radiance: number): { scene: Scene; weights: Float64Array; total: number } {
  const base = new Float32Array(CELLS * CHANNELS);
  const depth = new Float32Array(CELLS);
  const weights = new Float64Array(CELLS * CHANNELS);
  base.fill(radiance / CHANNELS, 0, lit * CHANNELS);
  weights.fill(radiance / CHANNELS, 0, lit * CHANNELS);
  return { scene: { base, depth, subject: flatSubject }, weights, total: radiance * lit };
}

function exposeScene(
  source: { scene: Scene; weights: Float64Array; total: number },
  budget: number,
  seed: number,
  mode: SensorMode = "mono",
): Uint32Array {
  const { scene, weights, total } = source;
  const counts = new Uint32Array(CELLS);
  accumulate({
    counts,
    scene,
    table: buildAlias(weights),
    staticWeight: total,
    lightLevel: 1,
    settings: REFERENCE,
    mode,
    timeFrom: 0,
    timeSpan: REFERENCE.shutterSeconds,
    budget,
    rng: mulberry32(seed),
  });
  return counts;
}

function expose(budget: number, seed: number, radiance = 0.2): Uint32Array {
  return exposeScene(flatScene(radiance), budget, seed);
}

function total(counts: Uint32Array): number {
  let sum = 0;
  for (const c of counts) sum += c;
  return sum;
}

describe("ISO is gain, not light", () => {
  it("is applied at readout and nowhere else", () => {
    // Doubling the ISO doubles the rendered brightness of an unchanged tally.
    expect(renderLinear(100, 200)).toBeCloseTo(2 * renderLinear(100, 100), 12);
    expect(isoGain(REFERENCE.iso)).toBe(1);
  });

  it("is absent from the functions that decide how much light arrives", () => {
    // The page says "no extra photons, no less grain". These two functions are
    // where that claim would break first, so they must not be able to see ISO.
    expect(
      expectedPhotons.length,
      "expectedPhotons must take (radiance, fNumber, shutterSeconds) and nothing else",
    ).toBe(3);
    expect(
      relativeGrain.length,
      "relativeGrain must take (radiance, fNumber, shutterSeconds) and nothing else",
    ).toBe(3);
  });

  it("is absent from the emission loop itself, and so is white balance", () => {
    // A source-level guard, because a plausible "improvement" is to reach for
    // the ISO already sitting on the settings object and scale the noise by it.
    // White balance is the same kind of gain and gets the same treatment.
    const source = readFileSync(resolve("src/sensor.ts"), "utf8");
    const start = source.indexOf("export function accumulate");
    expect(start, "accumulate() not found in src/sensor.ts").toBeGreaterThan(-1);
    const after = source.indexOf("\nexport ", start + 1);
    const body = source.slice(start, after > start ? after : undefined);
    expect(
      /\biso\w*/i.test(body),
      "accumulate() mentions ISO. Photon arrivals cannot depend on the gain applied to them afterwards.",
    ).toBe(false);
    expect(
      /balance/i.test(body),
      "accumulate() mentions white balance. That is gain at readout, not something the sensor can know.",
    ).toBe(false);
  });
});

describe("each dial buys light at its own price", () => {
  it("opens one stop of aperture for twice the photons", () => {
    const wide = expectedPhotons(0.2, 2.8, 1 / 60);
    const narrow = expectedPhotons(0.2, 4, 1 / 60);
    expect(wide / narrow).toBeCloseTo(2, 1);
    expect(apertureFactor(REFERENCE.fNumber)).toBe(1);
  });

  it("holds the shutter open twice as long for twice the photons", () => {
    expect(expectedPhotons(0.2, 4, 1 / 30) / expectedPhotons(0.2, 4, 1 / 60)).toBeCloseTo(2, 12);
    expect(shutterFactor(REFERENCE.shutterSeconds)).toBe(1);
  });

  it("charges for a wide aperture in depth of field", () => {
    // Nothing on the focal plane is ever defocused, whatever the aperture.
    expect(circleOfConfusionRadius(1.4, 0, 0)).toBe(0);
    // And the blur is proportional to the hole's diameter, which goes as 1/N.
    expect(circleOfConfusionRadius(2, 1, 0)).toBeCloseTo(2 * circleOfConfusionRadius(4, 1, 0), 12);
  });
});

describe("grain is photon counting, not a filter", () => {
  it("is one over the square root of the count", () => {
    const photons = expectedPhotons(0.2, 4, 1 / 60);
    expect(relativeGrain(0.2, 4, 1 / 60)).toBeCloseTo(1 / Math.sqrt(photons), 12);
  });

  it("worsens by root two for every stop of light thrown away", () => {
    const open = relativeGrain(0.2, 2.8, 1 / 60);
    const stopped = relativeGrain(0.2, 4, 1 / 60);
    expect(stopped / open).toBeCloseTo(Math.SQRT2, 1);
  });

  it("shows up in the simulated counts as Poisson scatter", () => {
    // The mean and the variance of a Poisson count are the same number. If a
    // future change ever smooths, dithers or pre-averages the accumulation,
    // this ratio is what moves.
    const mean = 24;
    const counts = expose(CELLS * mean, 12345);
    let sum = 0;
    for (const c of counts) sum += c;
    const observedMean = sum / CELLS;
    let variance = 0;
    for (const c of counts) variance += (c - observedMean) ** 2;
    variance /= CELLS - 1;

    expect(observedMean).toBeCloseTo(mean, 0);
    expect(variance / observedMean).toBeGreaterThan(0.9);
    expect(variance / observedMean).toBeLessThan(1.1);
  });

  it("is reproducible for a given seed, so the page's frames are not luck", () => {
    expect(Array.from(expose(50_000, 7))).toEqual(Array.from(expose(50_000, 7)));
    expect(Array.from(expose(50_000, 7))).not.toEqual(Array.from(expose(50_000, 8)));
  });
});

describe("the sensor's limits", () => {
  it("stops counting at the full well, which is what a blown highlight is", () => {
    const lit = 120;
    const counts = exposeScene(spotScene(lit, 0.4), lit * FULL_WELL * 4, 99);
    let over = 0;
    let full = 0;
    for (const c of counts) {
      if (c > FULL_WELL) over++;
      if (c === FULL_WELL) full++;
    }
    expect(over, "a cell recorded more electrons than it can hold").toBe(0);
    expect(full, "with four times the well thrown at it, every lit cell should clip").toBe(lit);
  });

  it("lands every photon somewhere on the sensor when nothing is defocused", () => {
    const { scene, weights, total } = flatScene(0.2);
    const counts = new Uint32Array(CELLS);
    const landed = accumulate({
      counts,
      scene,
      table: buildAlias(weights),
      staticWeight: total,
      lightLevel: 1,
      settings: REFERENCE,
      mode: "mono",
      timeFrom: 0,
      timeSpan: REFERENCE.shutterSeconds,
      budget: 20_000,
      rng: mulberry32(3),
    });
    expect(landed).toBe(20_000);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(20_000);
  });

  it("sizes an exposure from the scene, the aperture and the shutter", () => {
    const settings = { ...REFERENCE, shutterSeconds: 1 / 30 };
    expect(photonsForExposure(1000, settings)).toBeCloseTo(
      2 * photonsForExposure(1000, REFERENCE),
      6,
    );
  });
});

describe("the meter", () => {
  it("calls a mid grey at the reference settings balanced", () => {
    expect(exposureStops(MIDDLE_GREY, REFERENCE)).toBeCloseTo(0, 12);
    expect(exposureVerdict(0)).toBe("balanced");
  });

  it("moves one stop per stop, whichever dial supplied it", () => {
    expect(exposureStops(MIDDLE_GREY, { ...REFERENCE, iso: 200 })).toBeCloseTo(1, 12);
    expect(exposureStops(MIDDLE_GREY, { ...REFERENCE, shutterSeconds: 1 / 30 })).toBeCloseTo(1, 12);
    expect(exposureStops(MIDDLE_GREY / 8, REFERENCE)).toBeCloseTo(-3, 12);
  });

  it("names the extremes the way the readout does", () => {
    expect(exposureVerdict(-4)).toBe("very dark");
    expect(exposureVerdict(4)).toBe("blown out");
    expect(formatShutter(1 / 60)).toBe("1/60 s");
    expect(formatShutter(1)).toBe("1 s");
  });
});

describe("the sampler", () => {
  it("draws cells in proportion to their radiance", () => {
    const weights = Float64Array.from([1, 3, 0, 6]);
    const table = buildAlias(weights);
    const rng = mulberry32(2024);
    const tally = [0, 0, 0, 0];
    const draws = 200_000;
    for (let i = 0; i < draws; i++) {
      const bucket = (rng() * table.n) | 0;
      tally[rng() < table.prob[bucket] ? bucket : table.alias[bucket]]++;
    }
    expect(tally[0] / draws).toBeCloseTo(0.1, 2);
    expect(tally[1] / draws).toBeCloseTo(0.3, 2);
    expect(tally[2]).toBe(0);
    expect(tally[3] / draws).toBeCloseTo(0.6, 2);
  });
});

describe("colour costs light", () => {
  it("lays a red, green, blue, green mosaic over the cells", () => {
    expect([bayerChannel(0, 0), bayerChannel(1, 0)]).toEqual([0, 1]);
    expect([bayerChannel(0, 1), bayerChannel(1, 1)]).toEqual([1, 2]);

    // Half the sites are green, a quarter red, a quarter blue.
    const sites = [0, 0, 0];
    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) sites[bayerChannel(x, y)]++;
    }
    expect(sites).toEqual([CELLS / 4, CELLS / 2, CELLS / 4]);
  });

  it("throws away two photons in three, and records the same ones twice running", () => {
    const scene = flatScene(0.2);
    const mono = exposeScene(scene, 300_000, 4242, "mono");
    const colour = exposeScene(scene, 300_000, 4242, "colour");

    // The filter check costs no randomness, so the two runs simulate exactly
    // the same photons: colour records a subset of what mono recorded.
    let exceeded = 0;
    for (let i = 0; i < CELLS; i++) if (colour[i] > mono[i]) exceeded++;
    expect(exceeded, "a filtered cell recorded a photon the unfiltered one missed").toBe(0);
    expect(total(mono)).toBe(300_000);
    expect(total(colour) / total(mono)).toBeCloseTo(1 / CFA_GAIN, 2);
  });

  it("charges root three in grain for it", () => {
    expect(cfaGrainPenalty(true)).toBeCloseTo(Math.sqrt(3), 12);
    expect(cfaGrainPenalty(false)).toBe(1);

    // Thinning a Poisson process leaves a Poisson process, so the counts are
    // still shot-noise limited --- just from a third as many arrivals, which
    // is where the root three comes from.
    const mean = 16;
    const counts = exposeScene(flatScene(0.2), CELLS * mean * CFA_GAIN, 77, "colour");
    const observed = total(counts) / CELLS;
    let variance = 0;
    for (const c of counts) variance += (c - observed) ** 2;
    variance /= CELLS - 1;

    expect(observed).toBeCloseTo(mean, 0);
    expect(variance / observed).toBeGreaterThan(0.9);
    expect(variance / observed).toBeLessThan(1.1);
  });
});

describe("colour temperature", () => {
  it("gets bluer as it gets hotter, and always sums to one", () => {
    let previous = -Infinity;
    for (const kelvin of [2000, 2700, 4000, 5500, 6500, 9000, 12000]) {
      const [r, g, b] = blackbodyRgb(kelvin);
      expect(r + g + b).toBeCloseTo(1, 12);
      const blueness = b / r;
      expect(blueness, `${kelvin} K should be bluer than the step below it`).toBeGreaterThan(
        previous,
      );
      previous = blueness;
    }
  });

  it("is warm at tungsten and cool at blue hour", () => {
    const [tr, , tb] = blackbodyRgb(2700);
    expect(tr).toBeGreaterThan(tb);
    const [dr, , db] = blackbodyRgb(12000);
    expect(db).toBeGreaterThan(dr);
  });

  it("white balances to whichever light you point it at", () => {
    // The gains for temperature T must render a surface lit by T neutral ---
    // that is the whole contract, and it is what makes the slider a choice
    // between the bulb and the window rather than a tint.
    for (const kelvin of [2700, 5500, 12000]) {
      const illuminant = blackbodyRgb(kelvin);
      const gains = whiteBalanceGains(kelvin);
      for (let c = 0; c < CHANNELS; c++) {
        expect(illuminant[c] * gains[c]).toBeCloseTo(1 / CHANNELS, 12);
      }
    }
  });

  it("pays for a tungsten correction in blue gain", () => {
    // The page claims about two and a half. It is gain, so it multiplies the
    // blue channel's noise by the same amount.
    const gains = whiteBalanceGains(2700);
    expect(gains[2]).toBeGreaterThan(2);
    expect(gains[2]).toBeLessThan(3);
    expect(gains[0]).toBeLessThan(1);
  });
});

describe("demosaicing", () => {
  it("keeps the channel each cell actually measured", () => {
    const counts = new Uint32Array(CELLS);
    for (let i = 0; i < CELLS; i++) counts[i] = 100 + (i % 7);
    const planes = new Float32Array(CELLS * CHANNELS);
    demosaic(counts, planes);
    for (let y = 0; y < HEIGHT; y += 17) {
      for (let x = 0; x < WIDTH; x += 13) {
        const i = y * WIDTH + x;
        expect(planes[i * CHANNELS + bayerChannel(x, y)]).toBe(counts[i]);
      }
    }
  });

  it("turns a flat field into a flat field, with no mosaic left showing", () => {
    // If the edge handling clamped instead of mirroring it would fold onto a
    // cell under the wrong filter, and the border would come out striped.
    const counts = new Uint32Array(CELLS).fill(250);
    const planes = new Float32Array(CELLS * CHANNELS);
    demosaic(counts, planes);
    let low = Infinity;
    let high = -Infinity;
    for (const value of planes) {
      if (value < low) low = value;
      if (value > high) high = value;
    }
    expect([low, high], "the border is striped: edge handling broke Bayer parity").toEqual([
      250, 250,
    ]);
  });
});

describe("the built page", () => {
  const doc = new JSDOM(readFileSync(resolve("dist/index.html"), "utf8")).window.document;

  it("ships the sensor at the resolution the copy quotes", () => {
    const canvas = doc.querySelector<HTMLCanvasElement>("canvas#sensor");
    expect(canvas, "the simulation is the artefact; without the canvas there is no page").toBeTruthy();
    expect(canvas?.getAttribute("width")).toBe(String(WIDTH));
    expect(canvas?.getAttribute("height")).toBe(String(HEIGHT));
    expect(doc.body.textContent).toContain(`${WIDTH} × ${HEIGHT}`);
  });

  it("gives the reader all three dials, and a way to run and reset", () => {
    for (const id of ["iso", "aperture", "shutter", "speed", "white-balance"]) {
      const input = doc.querySelector<HTMLInputElement>(`input#${id}`);
      expect(input, `#${id} must be a slider the reader can move`).toBeTruthy();
      expect(input?.getAttribute("type")).toBe("range");
      expect(
        doc.querySelector(`label[for="${id}"]`),
        `#${id} needs a label, not just a caption near it`,
      ).toBeTruthy();
    }
    expect(doc.querySelector("button#run")).toBeTruthy();
    expect(doc.querySelector("button#reset")).toBeTruthy();
  });

  it("lets the reader take the colour filters off and see what they cost", () => {
    expect(doc.querySelector("button#mode-colour")).toBeTruthy();
    expect(
      doc.querySelector("button#mode-mono"),
      "the mono comparison is how the page shows the price of colour instead of asserting it",
    ).toBeTruthy();
  });

  it("discloses its method and admits what it leaves out", () => {
    expect(doc.querySelector("#under-the-hood")).toBeTruthy();
    const limits = doc.querySelector("#limits");
    expect(limits, "a simulation that hides its simplifications is teaching the wrong thing").toBeTruthy();
    expect(limits?.textContent).toMatch(/read noise/i);
    expect(limits?.textContent, "the colour model is a cartoon and must say so").toMatch(
      /demosaic/i,
    );
  });

  it("cites its sources with resolvable links", () => {
    const links = [...(doc.querySelectorAll("#sources a") ?? [])];
    expect(links.length).toBeGreaterThanOrEqual(3);
    for (const link of links) {
      expect(link.getAttribute("href")).toMatch(/^https:\/\//);
    }
  });
});

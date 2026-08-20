// Wiring: the DOM, the animation loop, and the light brush. All of the physics
// lives in optics.ts, scene.ts and sensor.ts; nothing here decides what a
// photograph should look like.
import { createAliasTable, fillAlias } from "./alias.ts";
import {
  exposureStops,
  exposureVerdict,
  formatAperture,
  formatCount,
  formatShutter,
  formatStops,
  F_NUMBERS,
  ISO_SPEEDS,
  isoGain,
  MIDDLE_GREY,
  relativeGrain,
  SHUTTER_SPEEDS,
  circleOfConfusionRadius,
  apertureFactor,
  shutterFactor,
  type Settings,
} from "./optics.ts";
import { mulberry32 } from "./rng.ts";
import {
  bulbCentre,
  CELLS,
  combineRadiance,
  createScene,
  HEIGHT,
  PRESETS,
  subjectWeights,
  WIDTH,
  type Preset,
} from "./scene.ts";
import {
  accumulate,
  buildToneLut,
  FULL_WELL,
  photonsForExposure,
  renderCounts,
  renderIdeal,
} from "./sensor.ts";

function el<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`missing element #${id}`);
  return found as T;
}

function context(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  return ctx;
}

/** Photons per second of wall clock, at either end of the speed slider. */
const SLOWEST = 500;
const FASTEST = 40_000_000;
/** Never spend more than this in one animation frame, whatever the slider says. */
const PER_FRAME_CEILING = 400_000;
/** Once this little of the scene can still record anything, the frame is done. */
const SATURATION_FLOOR = 0.005;
/** How long a finished frame is held on screen before the next exposure. */
const READOUT_SECONDS = 0.75;
/** How far from the focal plane the window sits, for the trade-off readout. */
const WINDOW_DEPTH = 1;

type Phase = "idle" | "exposing" | "readout";
type Tool = "light" | "shade";

export function start(): void {
  const scene = createScene();
  const lut = buildToneLut();
  const rng = mulberry32(0x5eed);

  // --- buffers -------------------------------------------------------------
  const paint = new Float32Array(CELLS).fill(1);
  const radiance = new Float64Array(CELLS);
  const emissionWeights = new Float64Array(CELLS);
  const counts = new Uint32Array(CELLS);
  const table = createAliasTable(CELLS);

  const sensorCanvas = el<HTMLCanvasElement>("sensor");
  const referenceCanvas = el<HTMLCanvasElement>("reference");
  const sensorCtx = context(sensorCanvas);
  const referenceCtx = context(referenceCanvas);
  const sensorImage = sensorCtx.createImageData(WIDTH, HEIGHT);
  const referenceImage = referenceCtx.createImageData(WIDTH, HEIGHT);

  // --- state ---------------------------------------------------------------
  let preset: Preset = PRESETS[1];
  const settings: Settings = { iso: 100, fNumber: 4, shutterSeconds: 1 / 60 };
  let speed = 6_000_000;
  let tool: Tool = "shade";
  let strokes = 0;

  let phase: Phase = "idle";
  let running = false;
  let sceneClock = 0;
  let shutterOpenedAt = 0;
  let emitted = 0;
  let target = 0;
  let readoutLeft = 0;
  let closedEarly = false;

  let staticWeight = 0;
  let sceneWeight = 0;
  let meanRadiance = 0;
  let saturatedCount = 0;
  let tableSaturation = -1;

  // --- derived scene -------------------------------------------------------
  function rebuildScene(): void {
    staticWeight = combineRadiance(scene, preset.lightLevel, paint, radiance);
    sceneWeight = staticWeight + subjectWeights(scene.subject, preset.lightLevel).total;
    meanRadiance = sceneWeight / CELLS;
    tableSaturation = -1; // force the emission table to be rebuilt
  }

  function rebuildEmissionTable(): void {
    if (saturatedCount === 0) {
      fillAlias(table, radiance);
    } else {
      for (let i = 0; i < CELLS; i++) {
        emissionWeights[i] = counts[i] < FULL_WELL ? radiance[i] : 0;
      }
      fillAlias(table, emissionWeights);
    }
    tableSaturation = saturatedCount;
  }

  function countSaturated(): number {
    let n = 0;
    for (let i = 0; i < CELLS; i++) if (counts[i] >= FULL_WELL) n++;
    return n;
  }

  // --- the exposure cycle --------------------------------------------------
  function openShutter(): void {
    counts.fill(0);
    emitted = 0;
    saturatedCount = 0;
    closedEarly = false;
    shutterOpenedAt = sceneClock;
    target = photonsForExposure(sceneWeight, settings);
    rebuildEmissionTable();
    phase = "exposing";
  }

  function step(dt: number): void {
    if (phase === "idle") {
      openShutter();
      return;
    }
    if (phase === "readout") {
      sceneClock += dt;
      readoutLeft -= dt;
      if (readoutLeft <= 0) openShutter();
      return;
    }

    if (tableSaturation !== saturatedCount) rebuildEmissionTable();

    const subjectTotal = subjectWeights(scene.subject, preset.lightLevel).total;
    const live = table.total + subjectTotal;
    const useful = sceneWeight > 0 ? live / sceneWeight : 0;

    const nominal = Math.min(speed * dt, PER_FRAME_CEILING, target - emitted);
    const from = shutterOpenedAt + (emitted / target) * settings.shutterSeconds;
    const span = (nominal / target) * settings.shutterSeconds;

    const budget = Math.max(0, Math.round(nominal * useful));
    if (budget > 0) {
      accumulate({
        counts,
        scene,
        table,
        staticWeight: table.total,
        lightLevel: preset.lightLevel,
        settings,
        timeFrom: from,
        timeSpan: span,
        budget,
        rng,
      });
      saturatedCount = countSaturated();
    }

    emitted += nominal;
    sceneClock = shutterOpenedAt + (emitted / target) * settings.shutterSeconds;

    // The shutter closes when its time is up --- or, if every cell that could
    // still record something already has, when there is nothing left to count.
    if (emitted >= target || useful < SATURATION_FLOOR) {
      closedEarly = emitted < target;
      phase = "readout";
      readoutLeft = READOUT_SECONDS;
    }
  }

  // --- readouts ------------------------------------------------------------
  const verdictOut = el("verdict");
  const statusOut = el("status");
  const tallyOut = el("tally");
  const meterFill = el("meter-fill");
  const meterLabel = el("meter-label");
  const costIso = el("cost-iso");
  const costAperture = el("cost-aperture");
  const costShutter = el("cost-shutter");
  const prompt = el("prompt");
  const strokesOut = el("strokes");

  /** Path length the bulb covers while the shutter is open, in sensor cells. */
  function bulbTravel(): number {
    const steps = 24;
    let length = 0;
    let previous = bulbCentre(scene.subject, shutterOpenedAt);
    for (let i = 1; i <= steps; i++) {
      const t = shutterOpenedAt + (i / steps) * settings.shutterSeconds;
      const next = bulbCentre(scene.subject, t);
      length += Math.hypot(next.x - previous.x, next.y - previous.y);
      previous = next;
    }
    return length;
  }

  let lastVerdict = "";
  function updateReadouts(): void {
    const stops = exposureStops(meanRadiance, settings);
    const verdict = exposureVerdict(stops);
    const grain = relativeGrain(meanRadiance, settings.fNumber, settings.shutterSeconds);

    verdictOut.textContent =
      verdict === "balanced" ? "balanced" : `${formatStops(stops)} — ${verdict}`;
    verdictOut.dataset.verdict = verdict;

    if (phase === "idle") {
      statusOut.textContent = "press Run to open the shutter";
    } else if (phase === "readout") {
      statusOut.textContent = closedEarly
        ? "sensor full — the shutter closed with nothing left to record"
        : `read out — grain at the metered tone ${(grain * 100).toFixed(1)}%`;
    } else {
      const through = target > 0 ? Math.min(1, emitted / target) : 1;
      statusOut.textContent = `exposing — ${(through * 100).toFixed(0)}% of the way through ${formatShutter(settings.shutterSeconds)}`;
    }

    tallyOut.textContent = `photons: ${formatCount(Math.min(emitted, target))} of ${formatCount(target)} · grain when the shutter closes: ${(grain * 100).toFixed(1)}%`;

    const clamped = Math.max(-6, Math.min(6, Number.isFinite(stops) ? stops : -6));
    const half = (Math.abs(clamped) / 12) * 100;
    meterFill.style.left = `${clamped < 0 ? 50 - half : 50}%`;
    meterFill.style.width = `${half}%`;
    meterLabel.textContent = `${formatStops(stops)} from a mid-grey rendering`;

    costIso.textContent = `×${isoGain(settings.iso).toFixed(0)} gain applied after the counting. No extra photons, no less grain.`;
    const dof = circleOfConfusionRadius(settings.fNumber, WINDOW_DEPTH, 0);
    costAperture.textContent = `${formatStops(Math.log2(apertureFactor(settings.fNumber)))} of light. The window spreads over ${dof.toFixed(1)} cells.`;
    costShutter.textContent = `${formatStops(Math.log2(shutterFactor(settings.shutterSeconds)))} of light. The bulb travels ${bulbTravel().toFixed(1)} cells while it is open.`;

    if (verdict !== lastVerdict) {
      lastVerdict = verdict;
      sensorCanvas.setAttribute(
        "aria-label",
        `A simulated sensor, ${formatStops(stops)} from a mid-grey rendering: ${verdict}. Grain at the metered tone, ${(grain * 100).toFixed(0)} per cent.`,
      );
    }
  }

  // --- drawing -------------------------------------------------------------
  function draw(): void {
    renderCounts(counts, settings.iso, lut, sensorImage);
    sensorCtx.putImageData(sensorImage, 0, 0);

    const exposureFactor = meanRadiance > 0 ? MIDDLE_GREY / meanRadiance : 0;
    renderIdeal(radiance, scene, preset.lightLevel, sceneClock, exposureFactor, lut, referenceImage);
    referenceCtx.putImageData(referenceImage, 0, 0);
  }

  // --- the loop ------------------------------------------------------------
  let previousFrame = 0;
  function frame(now: number): void {
    const dt = previousFrame === 0 ? 0 : Math.min(0.05, (now - previousFrame) / 1000);
    previousFrame = now;
    if (running) step(dt);
    draw();
    updateReadouts();
    requestAnimationFrame(frame);
  }

  // --- controls ------------------------------------------------------------
  const runButton = el<HTMLButtonElement>("run");

  function setRunning(next: boolean): void {
    running = next;
    runButton.textContent = next ? "Pause" : "Run";
    runButton.setAttribute("aria-pressed", String(next));
    prompt.hidden = next || phase !== "idle";
  }

  runButton.addEventListener("click", () => setRunning(!running));

  el("reset").addEventListener("click", () => {
    counts.fill(0);
    emitted = 0;
    target = 0;
    saturatedCount = 0;
    phase = "idle";
    setRunning(false);
  });

  el("clear-light").addEventListener("click", () => {
    paint.fill(1);
    strokes = 0;
    strokesOut.textContent = "nothing painted";
    rebuildScene();
  });

  // Light presets, built from the data so the labels cannot drift.
  const presetsHost = el("presets");
  for (const option of PRESETS) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = option.label;
    button.title = option.note;
    button.setAttribute("aria-pressed", String(option === preset));
    button.addEventListener("click", () => {
      preset = option;
      for (const sibling of presetsHost.children) {
        sibling.setAttribute("aria-pressed", String(sibling === button));
      }
      rebuildScene();
      if (phase === "exposing") openShutter();
    });
    presetsHost.append(button);
  }

  const toolButtons = [el<HTMLButtonElement>("tool-light"), el<HTMLButtonElement>("tool-shade")];
  for (const button of toolButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.tool === tool));
    button.addEventListener("click", () => {
      tool = button.dataset.tool as Tool;
      for (const sibling of toolButtons) {
        sibling.setAttribute("aria-pressed", String(sibling === button));
      }
    });
  }

  function bindStepped<T extends number>(
    id: string,
    valueId: string,
    values: readonly T[],
    format: (value: T) => string,
    apply: (value: T) => void,
  ): void {
    const input = el<HTMLInputElement>(id);
    const output = el(valueId);
    input.max = String(values.length - 1);
    const update = (): void => {
      const value = values[Number(input.value)];
      output.textContent = format(value);
      apply(value);
    };
    input.addEventListener("input", update);
    update();
  }

  bindStepped("iso", "iso-value", ISO_SPEEDS, (v) => String(v), (v) => {
    settings.iso = v;
  });
  bindStepped("aperture", "aperture-value", F_NUMBERS, formatAperture, (v) => {
    settings.fNumber = v;
    if (phase === "exposing") openShutter();
  });
  bindStepped("shutter", "shutter-value", SHUTTER_SPEEDS, formatShutter, (v) => {
    settings.shutterSeconds = v;
    if (phase === "exposing") openShutter();
  });

  const speedInput = el<HTMLInputElement>("speed");
  const speedOut = el("speed-value");
  const updateSpeed = (): void => {
    const t = Number(speedInput.value) / 100;
    speed = SLOWEST * (FASTEST / SLOWEST) ** t;
    speedOut.textContent = formatCount(speed);
  };
  speedInput.addEventListener("input", updateSpeed);
  updateSpeed();

  // --- the light brush -----------------------------------------------------
  const BRUSH_RADIUS = 12;

  function dab(cx: number, cy: number): void {
    const x0 = Math.max(0, Math.floor(cx - BRUSH_RADIUS));
    const x1 = Math.min(WIDTH, Math.ceil(cx + BRUSH_RADIUS));
    const y0 = Math.max(0, Math.floor(cy - BRUSH_RADIUS));
    const y1 = Math.min(HEIGHT, Math.ceil(cy + BRUSH_RADIUS));
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const d = Math.hypot(x - cx, y - cy) / BRUSH_RADIUS;
        if (d >= 1) continue;
        const falloff = (1 - d) ** 2;
        const i = y * WIDTH + x;
        const factor = tool === "light" ? 1 + 0.4 * falloff : 1 / (1 + 0.5 * falloff);
        paint[i] = Math.max(0.02, Math.min(30, paint[i] * factor));
      }
    }
  }

  let painting = false;
  let lastPoint: { x: number; y: number } | null = null;

  function toCell(event: PointerEvent): { x: number; y: number } {
    const rect = sensorCanvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
    };
  }

  sensorCanvas.addEventListener("pointerdown", (event) => {
    painting = true;
    strokes += 1;
    strokesOut.textContent = `${strokes} ${strokes === 1 ? "stroke" : "strokes"} painted`;
    // Capture so a drag that leaves the canvas keeps painting. Not every
    // pointer can be captured, and it is not worth failing the stroke over.
    try {
      sensorCanvas.setPointerCapture(event.pointerId);
    } catch {
      /* no capture available; the stroke still works inside the canvas */
    }
    lastPoint = toCell(event);
    dab(lastPoint.x, lastPoint.y);
    rebuildScene();
    event.preventDefault();
  });

  sensorCanvas.addEventListener("pointermove", (event) => {
    if (!painting) return;
    const point = toCell(event);
    // Interpolate, so a fast drag leaves a stroke rather than a dotted line.
    if (lastPoint) {
      const distance = Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y);
      const steps = Math.max(1, Math.ceil(distance / 4));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        dab(lastPoint.x + (point.x - lastPoint.x) * t, lastPoint.y + (point.y - lastPoint.y) * t);
      }
    }
    lastPoint = point;
    rebuildScene();
  });

  const stopPainting = (): void => {
    painting = false;
    lastPoint = null;
  };
  sensorCanvas.addEventListener("pointerup", stopPainting);
  sensorCanvas.addEventListener("pointercancel", stopPainting);

  // --- start ---------------------------------------------------------------
  rebuildScene();
  draw();
  updateReadouts();
  requestAnimationFrame(frame);

  // Don't burn a core on a simulation nobody is looking at, and don't start one
  // for a reader who has asked the platform for less motion.
  const wantsMotion = !matchMedia("(prefers-reduced-motion: reduce)").matches;
  let hasAutoStarted = false;
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          if (!hasAutoStarted && wantsMotion) {
            hasAutoStarted = true;
            setRunning(true);
          }
        } else if (running) {
          setRunning(false);
        }
      }
    },
    { rootMargin: "80px" },
  );
  observer.observe(el("try-it"));
}

/**
 * The four frames above the fold. Same scene, same sensor; each is amplified to
 * the same average brightness, so the only thing that varies along the row is
 * how many photons were counted.
 */
export function renderStrip(budgets: readonly number[]): void {
  const scene = createScene();
  const lut = buildToneLut();
  const paint = new Float32Array(CELLS).fill(1);
  const radiance = new Float64Array(CELLS);
  const counts = new Uint32Array(CELLS);
  const settings: Settings = { iso: 100, fNumber: 4, shutterSeconds: 1 / 60 };
  const preset = PRESETS[1];

  const staticWeight = combineRadiance(scene, preset.lightLevel, paint, radiance);
  const sceneWeight = staticWeight + subjectWeights(scene.subject, preset.lightLevel).total;
  const table = fillAlias(createAliasTable(CELLS), radiance);
  const full = photonsForExposure(sceneWeight, settings);

  budgets.forEach((budget, index) => {
    const canvas = document.getElementById(`strip-${index}`) as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = context(canvas);
    const image = ctx.createImageData(WIDTH, HEIGHT);
    counts.fill(0);
    accumulate({
      counts,
      scene,
      table,
      staticWeight,
      lightLevel: preset.lightLevel,
      settings,
      timeFrom: 0.6,
      timeSpan: settings.shutterSeconds,
      budget,
      rng: mulberry32(0x1000 + index),
    });
    // Push the ISO by exactly the shortfall, so all four match in brightness.
    renderCounts(counts, (settings.iso * full) / budget, lut, image);
    ctx.putImageData(image, 0, 0);
  });
}

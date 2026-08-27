// Bamboo chimes: seven tubes tuned to a five-tone (pentatonic) scale, each one
// a small physical model rather than a sample — so no two strikes, and no two
// players, sound quite the same.

const NOTE_FREQS = [220.0, 246.94, 293.66, 329.63, 392.0, 440.0, 523.25];

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let dryGain: GainNode | null = null;
let wetGain: GainNode | null = null;
let reverb: ConvolverNode | null = null;
let windSource: AudioBufferSourceNode | null = null;
let windFilter: BiquadFilterNode | null = null;
let windGain: GainNode | null = null;
let waterSource: AudioBufferSourceNode | null = null;
let waterFilter: BiquadFilterNode | null = null;
let waterGain: GainNode | null = null;
let muffleFilter: BiquadFilterNode | null = null;

// Whether the whole page is currently in the underground room a pipe leads
// to. Read by updateWind (ambience is quieter down there) and by the mario
// hint's aria-live announcement; written only by setUnderground.
let underground = false;

function createReverbImpulse(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** decay;
    }
  }
  return impulse;
}

function ensureAudio(): AudioContext {
  if (audioCtx) {
    if (audioCtx.state === "suspended") void audioCtx.resume();
    return audioCtx;
  }

  const ctx = new AudioContext();
  audioCtx = ctx;

  masterGain = ctx.createGain();
  masterGain.gain.value = 0.85;

  // Sits after everything else so going underground can muffle the whole
  // mix, chimes and ambience alike, the way a cave mutes what's above it.
  muffleFilter = ctx.createBiquadFilter();
  muffleFilter.type = "lowpass";
  muffleFilter.frequency.value = 18000;
  masterGain.connect(muffleFilter);
  muffleFilter.connect(ctx.destination);

  dryGain = ctx.createGain();
  dryGain.gain.value = 0.75;
  dryGain.connect(masterGain);

  wetGain = ctx.createGain();
  wetGain.gain.value = 0.4;
  reverb = ctx.createConvolver();
  reverb.buffer = createReverbImpulse(ctx, 2.4, 2.5);
  reverb.connect(wetGain);
  wetGain.connect(masterGain);

  startWind(ctx);
  startWaterFlow(ctx);

  return ctx;
}

function startWind(ctx: AudioContext): void {
  const noiseLength = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, noiseLength, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < noiseLength; i++) data[i] = Math.random() * 2 - 1;

  windSource = ctx.createBufferSource();
  windSource.buffer = buffer;
  windSource.loop = true;

  windFilter = ctx.createBiquadFilter();
  windFilter.type = "bandpass";
  windFilter.frequency.value = 500;
  windFilter.Q.value = 0.6;

  windGain = ctx.createGain();
  windGain.gain.value = 0;

  windSource.connect(windFilter);
  windFilter.connect(windGain);
  windGain.connect(masterGain!);
  windSource.start();
}

// A constant stream-like bed under the grove: the same white-noise source
// the wind layer uses, but lowpassed into a burble instead of a hiss and
// slowly wobbled by an LFO on the cutoff so it never sits still. Unlike
// wind, it isn't pointer-driven --- it just runs, like a stream the grove
// happens to sit beside.
function startWaterFlow(ctx: AudioContext): void {
  const noiseLength = ctx.sampleRate * 4;
  const buffer = ctx.createBuffer(1, noiseLength, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < noiseLength; i++) data[i] = Math.random() * 2 - 1;

  waterSource = ctx.createBufferSource();
  waterSource.buffer = buffer;
  waterSource.loop = true;

  waterFilter = ctx.createBiquadFilter();
  waterFilter.type = "lowpass";
  waterFilter.frequency.value = 900;
  waterFilter.Q.value = 0.8;

  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.13;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 350;
  lfo.connect(lfoGain);
  lfoGain.connect(waterFilter.frequency);
  lfo.start();

  waterGain = ctx.createGain();
  waterGain.gain.value = 0.05;

  waterSource.connect(waterFilter);
  waterFilter.connect(waterGain);
  waterGain.connect(masterGain!);
  waterSource.start();
}

function updateWind(speed: number, verticalFraction: number): void {
  if (!windGain || !windFilter || !audioCtx) return;
  const now = audioCtx.currentTime;
  // There's no moving air underground, so a pointer drag there barely
  // stirs anything rather than cutting the layer off outright.
  const targetGain = Math.min(0.14, speed * 0.0006) * (underground ? 0.1 : 1);
  windGain.gain.setTargetAtTime(targetGain, now, 0.12);
  const targetFreq = 250 + (1 - verticalFraction) * 1100;
  windFilter.frequency.setTargetAtTime(targetFreq, now, 0.2);
}

// Ducks the pipe down into the cave below (or lifts it back out): mutes the
// wind/water bed, muffles the whole mix, and leans the reverb wetter for a
// cave's slap-back instead of the grove's open air. Called the instant a
// down-press is recognised, so the audio and the visual crossfade together.
function setUnderground(on: boolean): void {
  underground = on;
  if (!audioCtx || !muffleFilter || !waterGain || !wetGain) return;
  const now = audioCtx.currentTime;
  muffleFilter.frequency.setTargetAtTime(on ? 850 : 18000, now, 0.18);
  waterGain.gain.setTargetAtTime(on ? 0.015 : 0.05, now, 0.3);
  wetGain.gain.setTargetAtTime(on ? 0.65 : 0.4, now, 0.3);
}

// The pipe's own sound: a short pitch sweep standing in for the classic
// Mario warp --- descending on the way down, ascending on the way back up.
function playWarp(descending: boolean): void {
  const ctx = ensureAudio();
  const now = ctx.currentTime;
  const duration = 0.32;

  const sweep = ctx.createOscillator();
  sweep.type = "square";
  sweep.frequency.setValueAtTime(descending ? 720 : 140, now);
  sweep.frequency.exponentialRampToValueAtTime(descending ? 140 : 720, now + duration);

  const sweepFilter = ctx.createBiquadFilter();
  sweepFilter.type = "lowpass";
  sweepFilter.frequency.value = 2200;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, now);
  env.gain.linearRampToValueAtTime(0.22, now + 0.02);
  env.gain.exponentialRampToValueAtTime(0.0005, now + duration);

  sweep.connect(sweepFilter);
  sweepFilter.connect(env);
  env.connect(masterGain!);

  sweep.start(now);
  sweep.stop(now + duration + 0.05);
}

function strike(noteIndex: number, pan: number, intensity = 1): void {
  const ctx = ensureAudio();
  const freq = NOTE_FREQS[noteIndex];
  const now = ctx.currentTime;

  // Every strike is detuned, panned and timed slightly differently, so the
  // same tube never rings twice identically.
  const detune = (Math.random() - 0.5) * 14;
  const decay = 1.4 + Math.random() * 0.7;
  const attack = 0.004 + Math.random() * 0.006;

  const fundamental = ctx.createOscillator();
  fundamental.type = "sine";
  fundamental.frequency.value = freq;
  fundamental.detune.value = detune;

  const overtone = ctx.createOscillator();
  overtone.type = "sine";
  overtone.frequency.value = freq * 2.756;
  overtone.detune.value = detune;

  const strikeNoise = ctx.createBufferSource();
  const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseData.length; i++) {
    noiseData[i] = (Math.random() * 2 - 1) * (1 - i / noiseData.length);
  }
  strikeNoise.buffer = noiseBuffer;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "highpass";
  noiseFilter.frequency.value = 2000;

  const fundamentalEnv = ctx.createGain();
  fundamentalEnv.gain.setValueAtTime(0, now);
  fundamentalEnv.gain.linearRampToValueAtTime(0.5 * intensity, now + attack);
  fundamentalEnv.gain.exponentialRampToValueAtTime(0.0005, now + decay);

  const overtoneEnv = ctx.createGain();
  overtoneEnv.gain.setValueAtTime(0, now);
  overtoneEnv.gain.linearRampToValueAtTime(0.14 * intensity, now + attack);
  overtoneEnv.gain.exponentialRampToValueAtTime(0.0005, now + decay * 0.55);

  const noiseEnv = ctx.createGain();
  noiseEnv.gain.setValueAtTime(0.2 * intensity, now);
  noiseEnv.gain.exponentialRampToValueAtTime(0.0005, now + 0.06);

  const panner = ctx.createStereoPanner();
  panner.pan.value = Math.max(-1, Math.min(1, pan));

  fundamental.connect(fundamentalEnv);
  overtone.connect(overtoneEnv);
  strikeNoise.connect(noiseFilter);
  noiseFilter.connect(noiseEnv);

  fundamentalEnv.connect(panner);
  overtoneEnv.connect(panner);
  noiseEnv.connect(panner);
  panner.connect(dryGain!);
  panner.connect(reverb!);

  fundamental.start(now);
  overtone.start(now);
  strikeNoise.start(now);
  fundamental.stop(now + decay + 0.1);
  overtone.stop(now + decay + 0.1);
}

function setupChimes(): void {
  const grove = document.querySelector<HTMLElement>("#grove");
  if (!grove) return;
  const chimes = Array.from(grove.querySelectorAll<HTMLButtonElement>(".chime"));
  const struckRecently = new Set<HTMLButtonElement>();
  // Keyed per chime, not a shared counter: each re-strike's cleanup timeout
  // checks this before clearing "struck", so a fast roll on one tube (well
  // outside the 90ms debounce, well inside the 1.6s animation) doesn't let an
  // earlier strike's stale timer cut the later strike's swing short.
  const strikeToken = new Map<HTMLButtonElement, number>();

  // Nudges a tube sideways and back --- a single knock, not a swing that
  // keeps rocking. `direction` is +1 (toward the next-higher tube) or -1
  // (toward the next-lower one); `scale` shrinks the nudge for a tube that
  // was knocked into rather than struck directly.
  function knock(chime: HTMLButtonElement, direction: number, scale: number): void {
    chime.classList.remove("knock");
    void chime.offsetWidth;
    chime.style.setProperty("--knock-x", `${direction * 7 * scale}px`);
    chime.classList.add("knock");
  }

  function playChime(chime: HTMLButtonElement): void {
    const noteIndex = Number(chime.dataset.note ?? "0");
    const rect = chime.getBoundingClientRect();
    const groveRect = grove!.getBoundingClientRect();
    const center = rect.left + rect.width / 2 - groveRect.left;
    const pan = (center / groveRect.width) * 2 - 1;

    strike(noteIndex, pan);

    if (struckRecently.has(chime)) {
      chime.classList.remove("struck");
      // Force a reflow so the glow restarts on rapid re-strikes.
      void chime.offsetWidth;
    }
    chime.classList.add("struck");
    struckRecently.add(chime);
    const token = (strikeToken.get(chime) ?? 0) + 1;
    strikeToken.set(chime, token);
    setTimeout(() => {
      if (strikeToken.get(chime) !== token) return;
      chime.classList.remove("struck");
      struckRecently.delete(chime);
    }, 1600);

    // A struck tube leans toward whichever neighbour it swings into and taps
    // it --- edge tubes only have one side to lean toward; the rest pick a
    // side at random each strike. The neighbour rings back lightly, on a
    // short delay standing in for the knock's travel time.
    const direction = noteIndex === 0 ? 1 : noteIndex === chimes.length - 1 ? -1 : Math.random() < 0.5 ? -1 : 1;
    const neighbor = chimes[noteIndex + direction];
    knock(chime, direction, 1);
    if (neighbor) {
      setTimeout(() => {
        const neighborNote = Number(neighbor.dataset.note ?? "0");
        const neighborRect = neighbor.getBoundingClientRect();
        const neighborCenter = neighborRect.left + neighborRect.width / 2 - groveRect.left;
        const neighborPan = (neighborCenter / groveRect.width) * 2 - 1;
        strike(neighborNote, neighborPan, 0.3);
        knock(neighbor, direction, 0.4);
        // This bypasses maybeStrike (it's a light tap, not a full strike),
        // but it must still mark the debounce clock --- otherwise the knock's
        // own translateX can nudge the neighbour's hit box under a resting
        // pointer, firing a "fresh" pointerenter that reads as a genuine
        // strike with no debounce history, which knocks its own neighbour in
        // turn and cascades indefinitely down the row.
        lastStruck.set(neighbor, performance.now());
      }, 70);
    }
  }

  const activePointers = new Set<number>();
  const lastStruck = new Map<HTMLButtonElement, number>();
  // Set by hovering a pipe, read and cleared by setupMario's tick(): hover
  // no longer strikes directly, it dispatches Mario to go strike it himself.
  let marioTarget: HTMLButtonElement | null = null;

  function maybeStrike(target: EventTarget | null): void {
    if (!(target instanceof HTMLButtonElement) || !target.classList.contains("chime")) return;
    const last = lastStruck.get(target) ?? 0;
    const nowMs = performance.now();
    if (nowMs - last < 90) return;
    lastStruck.set(target, nowMs);
    playChime(target);
  }

  // Touch pointers get implicit capture on pointerdown: the browser pins
  // event.target to whichever tube the finger first touched, so a dragging
  // finger's later pointermoves keep reporting that same original tube even
  // as it slides over its neighbours. elementFromPoint reads the real
  // element under the pointer's current coordinates regardless of capture,
  // which is what drag-strum needs; mouse pointers aren't captured, so this
  // is a no-op improvement for them.
  function chimeAt(event: PointerEvent): Element | null {
    return document.elementFromPoint(event.clientX, event.clientY);
  }

  // Tracked per pointerId, not one shared boolean: a stray second contact
  // (a resting palm, a two-finger player) firing its own pointerup must not
  // end a different finger's still-active drag-strum.
  grove.addEventListener("pointerdown", (event) => {
    activePointers.add(event.pointerId);
    maybeStrike(chimeAt(event));
  });
  grove.addEventListener("pointerup", (event) => {
    activePointers.delete(event.pointerId);
  });
  grove.addEventListener("pointerleave", (event) => {
    activePointers.delete(event.pointerId);
  });
  // A touch can be interrupted by the system (a notification swipe, an
  // incoming call, palm rejection) without ever firing "pointerup" --- without
  // this, the next bare pointermove over an untouched tube reads as a drag
  // still in progress and phantom-strikes it.
  grove.addEventListener("pointercancel", (event) => {
    activePointers.delete(event.pointerId);
  });
  grove.addEventListener("pointermove", (event) => {
    if (activePointers.has(event.pointerId)) maybeStrike(chimeAt(event));
  });

  // Keyboard activation (Enter/Space) dispatches "click" with no preceding
  // "pointerdown", so this still needs its own listener --- but it must go
  // through the same debounced path as pointerdown, or a mouse/touch tap
  // (which fires both pointerdown and click) double-strikes the chime.
  for (const chime of chimes) {
    chime.addEventListener("click", () => maybeStrike(chime));
    // Hover-to-play, routed through Mario: a mouse or pen crossing into a
    // tube sends him walking over to jump on it, rather than striking it
    // directly --- landing is what plays the sound (see setupMario). Touch
    // has no hover state --- pointerenter fires there right alongside
    // pointerdown, so it's excluded to keep this a genuine hover gesture
    // rather than a redundant tap. The very first sound on a page still
    // needs a real click or keypress: the autoplay policy won't let a hover
    // unlock the AudioContext on its own.
    chime.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "touch") return;
      marioTarget = chime;
    });
    chime.addEventListener("animationend", (event) => {
      if (event.animationName === "knock") chime.classList.remove("knock");
    });
  }

  // A gentle continuous layer, like moving air in the grove: its loudness and
  // colour follow how fast and how high the pointer moves over the tubes.
  // Each call schedules a setTargetAtTime on windGain/windFilter, and the Web
  // Audio spec never prunes past automation events from a param's timeline ---
  // calling this on every raw pointermove (which can fire at 60-120Hz) would
  // grow that timeline unbounded over a long drag. windGain/windFilter's own
  // smoothing time constants (0.12s/0.2s) are already far coarser than a
  // pointermove's cadence, so throttling the call itself loses nothing audible.
  let lastX = 0;
  let lastY = 0;
  let lastT = 0;
  let lastWindUpdate = 0;
  grove.addEventListener("pointermove", (event) => {
    const rect = grove.getBoundingClientRect();
    const now = performance.now();
    if (lastT > 0) {
      const dt = Math.max(1, now - lastT);
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      const speed = Math.sqrt(dx * dx + dy * dy) / (dt / 1000);
      const verticalFraction = (event.clientY - rect.top) / rect.height;
      if (audioCtx && now - lastWindUpdate >= 40) {
        updateWind(speed, verticalFraction);
        lastWindUpdate = now;
      }
    }
    lastX = event.clientX;
    lastY = event.clientY;
    lastT = now;
  });
  grove.addEventListener("pointerleave", () => {
    lastT = 0;
    if (audioCtx) updateWind(0, 0.5);
  });

  setupMario();

  // A tiny side-scroller physics loop. The one subtlety: a pipe only counts
  // as ground under Mario's feet if he was already at or above its height
  // before this frame --- otherwise walking past a tall pipe's base (y near
  // 0, pipe height in the hundreds of px) would read as "already landed on
  // it" the instant he steps into its column, since 0 is "beneath" nearly
  // every pipe. Requiring the crossing to be genuine is what makes a strike
  // mean "he jumped up and landed on it," not "he walked near it."
  function setupMario(): void {
    const marioEl = document.querySelector<HTMLElement>("#mario");
    if (!marioEl) return;
    const modeStatus = document.querySelector<HTMLElement>("#mode-status");

    const width = 26;
    const gravity = 0.5;
    const manualJumpVelocity = 24; // tall enough to clear any pipe on this page
    const walkSpeed = 3;
    // Matches playWarp's own sweep duration --- 0 for reduced motion, so the
    // room still swaps but Mario doesn't visibly duck to get there.
    const warpMs = reducedMotion ? 0 : 320;

    let x = 12;
    let y = 0;
    let vy = 0;
    let restingOn: HTMLButtonElement | null = null;
    let downWasHeld = false;
    let warpUntil = 0;
    const keys = new Set<string>();

    window.addEventListener("keydown", (event) => {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(event.key)) event.preventDefault();
      keys.add(event.key);
    });
    window.addEventListener("keyup", (event) => keys.delete(event.key));

    // Only a pipe Mario was already at or above the top of (or is already
    // resting on) qualifies as a landing surface; otherwise the ground (0)
    // is the floor, even directly in front of a much taller pipe.
    function supportAt(
      px: number,
      prevY: number,
      currentRestingOn: HTMLButtonElement | null,
    ): { height: number; chime: HTMLButtonElement | null } {
      const groveRect = grove!.getBoundingClientRect();
      let best = { height: 0, chime: null as HTMLButtonElement | null };
      for (const chime of chimes) {
        const r = chime.getBoundingClientRect();
        const left = r.left - groveRect.left;
        const right = r.right - groveRect.left;
        if (px < left || px > right) continue;
        const qualifies = chime === currentRestingOn || prevY >= r.height - 0.5;
        if (qualifies && r.height > best.height) {
          best = { height: r.height, chime };
        }
      }
      return best;
    }

    function tick(): void {
      const groveRect = grove!.getBoundingClientRect();
      const groveWidth = groveRect.width;
      const manualInput = keys.has("ArrowLeft") || keys.has("ArrowRight") || keys.has("ArrowUp") || keys.has(" ");
      // The player's own keys always win --- touching one drops whatever a
      // hover asked Mario to go do.
      if (manualInput) marioTarget = null;

      const grounded = vy === 0;
      const warping = performance.now() < warpUntil;

      // Down on a pipe he's standing on toggles the room, in either
      // direction --- edge-triggered on the keydown, not held, so a long
      // press doesn't flip back and forth every frame it's down.
      const downHeld = keys.has("ArrowDown");
      if (downHeld && !downWasHeld && grounded && restingOn && !warping) {
        marioTarget = null;
        const entering = !underground;
        warpUntil = performance.now() + warpMs;
        setUnderground(entering);
        playWarp(entering);
        document.body.classList.toggle("underground", entering);
        if (modeStatus) modeStatus.textContent = entering ? "Underground." : "Back on the surface.";
      }
      downWasHeld = downHeld;

      if (!warping) {
        if (keys.has("ArrowLeft")) x -= walkSpeed;
        if (keys.has("ArrowRight")) x += walkSpeed;

        if ((keys.has("ArrowUp") || keys.has(" ")) && grounded) {
          vy = manualJumpVelocity;
          restingOn = null;
        }
      }

      // Hover dispatch: walk under the hovered pipe, then leap exactly high
      // enough to land on it once lined up. A pipe swapped mid-walk (the
      // mouse moved to a different one) just redirects Mario --- there's no
      // queue, only ever one live target.
      if (!warping && !manualInput && marioTarget && grounded && restingOn !== marioTarget) {
        const targetRect = marioTarget.getBoundingClientRect();
        const targetCenter = targetRect.left + targetRect.width / 2 - groveRect.left;
        const desiredX = Math.max(0, Math.min(groveWidth - width, targetCenter - width / 2));
        const dx = desiredX - x;
        if (Math.abs(dx) > 1.5) {
          x += Math.sign(dx) * Math.min(walkSpeed, Math.abs(dx));
        } else {
          // v such that a projectile under this gravity peaks at targetRect's
          // height, plus a margin so discrete stepping actually crosses it.
          vy = Math.sqrt(2 * gravity * Math.max(1, targetRect.height)) * 1.1;
          restingOn = null;
        }
      }

      x = Math.max(0, Math.min(groveWidth - width, x));

      const prevY = y;
      vy -= gravity;
      y += vy;

      const support = supportAt(x + width / 2, prevY, restingOn);
      if (prevY >= support.height && y <= support.height && vy < 0) {
        // Landing while falling onto a pipe (not the bare ground) is the
        // "jump on top of it" trigger --- re-landing on the same pipe
        // without leaving it again doesn't re-strike.
        if (support.chime && support.chime !== restingOn) {
          maybeStrike(support.chime);
        }
        y = support.height;
        vy = 0;
        restingOn = support.chime;
      }

      // Ducks him down into the pipe and back out over the warp window ---
      // a single dip in scale, not the real Mario's screen-wipe, but the
      // same idea of vanishing into the pipe rather than just teleporting.
      if (warping) {
        const progress = 1 - (warpUntil - performance.now()) / warpMs;
        const squash = 1 - 0.85 * Math.sin(progress * Math.PI);
        marioEl!.style.transform = `translate(${x}px, ${-y}px) scaleY(${squash})`;
      } else {
        marioEl!.style.transform = `translate(${x}px, ${-y}px)`;
      }
      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }
}

setupChimes();

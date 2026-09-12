/**
 * waveGen — the Curves editor's FUNCTION TOOL, as pure maths.
 *
 * A wave here is a FILTER, not a layer (owner, 2026-09-12: "the wave is a filter that is
 * applied and then baked. its only live while the parameters are being chosen. GX is not a
 * parametric editor"). Nothing in this module is stored in a document: the UI holds a
 * `WaveParams` while the tool is armed, samples it against the track being edited, and on
 * commit the samples are fit to keyframes and spliced in (`CurveFitting.spliceSpan`). What
 * lands is indistinguishable from hand-drawn keys.
 *
 * NOTHING HERE IS A NEW INVENTION, deliberately:
 *   • the five shapes ARE `LfoShape` (types/animation.ts) and their evaluation is
 *     `ModulationEngine`'s (grep `rawWave` there) — so a Sine in this tool and a Sine LFO
 *     trace the same curve, and the head's glyphs can be drawn by `waveValue` itself
 *     rather than by hand-authored icon paths that could drift from it;
 *   • bias/skew ARE the graph editor's Bias (grep `biasPow` and `BIAS_OCTAVE` in
 *     components/graph/GraphSelectionBBox.tsx): the same 2D power law, the same 150 px per
 *     power-of-two, the same `↔ / ↕` readout. One word, one meaning, one muscle memory.
 *
 * Noise is NOT `ImprovedNoise` (which ModulationEngine and WaveformPreview use). Those are
 * time-domain LFOs free to be irreproducible across mounts; a gradient is a document, so
 * this noise is a value-noise over a deterministic integer hash — same seed, same grain,
 * on any machine and after any reload. The seeded-PRNG ethos the rest of the palette
 * already follows (grep `mulberry32` in rampGeometry).
 *
 * @invariant A wave NEVER changes a sample outside its span, in any of the three modes and
 *   for any shape — proven by: `npm run test:palette-wavegen` section [3] ("<mode>/<shape>:
 *   outside the span, byte-identical", asserted as an exact 0 difference). This is what makes
 *   the tool safe to fire at a finished curve. Falsified 2026-09-12 by deleting the
 *   `t < a || t > b` bound in {@link waveEnvelope}: 16 assertions went red.
 *
 * @invariant Amplitude and offset are FRACTIONS of the channel's range, so one drag moves L,
 *   chroma and hue by the same proportion of their own (1, 0.4 and 2π) — proven by: the same
 *   harness, section [5] ("chroma and hue match L exactly"). Falsified by dropping the
 *   `* range` in {@link applyWaveSample}: chroma and hue read 0.5000 and 0.0318 against L's
 *   0.2000. Without it a slider that looks right on lightness is a 15× swing on hue.
 *
 * @see plans/ge-v2-unified-shell-plan.md §10, entry 2026-09-12 (the handle language)
 */

/** The five shapes, in head order. Same set and spelling as `LfoShape`. */
export const WAVE_SHAPES = ['Sine', 'Triangle', 'Sawtooth', 'Pulse', 'Noise'] as const;
export type WaveShape = (typeof WAVE_SHAPES)[number];

/** How the wave combines with the curve already on the track. */
export const WAVE_MODES = ['add', 'replace', 'multiply'] as const;
export type WaveMode = (typeof WAVE_MODES)[number];

/**
 * Px of drag per power-of-two of bias. The literal 150 is `BIAS_OCTAVE` in
 * GraphSelectionBBox — duplicated as a number rather than imported because that module is
 * a React component tree and this one is pure maths that a .mts harness runs headless.
 * If one moves, move both.
 */
export const BIAS_OCTAVE = 150;

export interface WaveParams {
  shape: WaveShape;
  /** Wavelength as a fraction of the FULL t axis (not of the span) — so the caliper's
   *  drawn width is a direct read of this number, and narrowing the span does not silently
   *  change the period. */
  wavelength: number;
  /** Peak deviation as a FRACTION OF THE CHANNEL'S RANGE, never in channel units: L spans
   *  1.0, chroma 0.4 and hue 2π, so an absolute amplitude would feel 15× different across
   *  the three. The caller multiplies by the active channel's span. */
  amplitude: number;
  /** Cycles of offset, 0..1 (wraps). */
  phase: number;
  /** The wave's centre, as a fraction of the channel's range. 0.5 = the channel's middle. */
  offset: number;
  mode: WaveMode;
  /** [start, end] on t∈[0,1]. Outside it the track is untouched. */
  span: [number, number];
  /** Fade-in / fade-out shoulders, each a fraction of the SPAN's length (0..0.5). */
  feather: [number, number];
  /** Bias: power-law warp of the position WITHIN each cycle — leans a sine toward a saw.
   *  1 = no warp. */
  bias: number;
  /** Skew: the same power law on the wave's VALUE — sharpens crests, flattens troughs.
   *  1 = no warp. */
  skew: number;
  /** Noise draw. Any integer; the dice bumps it. */
  seed: number;
}

export const DEFAULT_WAVE: WaveParams = {
  shape: 'Sine',
  wavelength: 0.17,
  amplitude: 0.17,
  phase: 0,
  offset: 0.5,
  mode: 'add',
  span: [0, 1],
  feather: [0.1, 0.1],
  bias: 1,
  skew: 1,
  seed: 3,
};

/**
 * The power-law redistribution, verbatim from `biasPow` in GraphSelectionBBox: `u**g`,
 * with the endpoints pinned so a bias can never move t off [0,1] (a wave whose period
 * leaked past its own cycle would tear at every cycle boundary).
 */
export const biasPow = (u: number, g: number): number => (u <= 0 ? 0 : u >= 1 ? 1 : Math.pow(u, g));

/** Deterministic [-1,1] hash of an integer lattice point. Integer-mixed, not Math.random. */
const hash1 = (i: number, seed: number): number => {
  let x = (i | 0) * 374761393 + (seed | 0) * 668265263;
  x = (x ^ (x >>> 13)) * 1274126177;
  x = x ^ (x >>> 16);
  return ((x >>> 0) / 4294967295) * 2 - 1;
};

/** Smoothstep-interpolated value noise over that lattice. `u` is in lattice units. */
const valueNoise = (u: number, seed: number): number => {
  const i = Math.floor(u);
  const f = u - i;
  const s = f * f * (3 - 2 * f);
  return hash1(i, seed) + (hash1(i + 1, seed) - hash1(i, seed)) * s;
};

/**
 * The raw wave in [-1,1] at position `t` on the FULL t axis. Span, feather, amplitude and
 * offset are NOT applied here — this is the shape alone, which is what lets the head's
 * glyph renderer call it with a throwaway params bag and get the icon for free.
 */
export const waveValue = (t: number, p: WaveParams): number => {
  const lam = Math.max(1e-4, p.wavelength);
  let w: number;
  if (p.shape === 'Noise') {
    // Noise has no period, so wavelength reads as GRAIN SCALE: one lattice cell per
    // wavelength, which keeps the caliper meaningful (drag it wider, the grain coarsens).
    w = valueNoise(t / lam + p.phase, p.seed);
  } else {
    // The endpoint rule: a periodic function's value at EXACTLY one full period is
    // ambiguous, and `% 1` resolves it to the period's START. For a ramp that is wrong at
    // the last texel — a Sawtooth used as a monotone rise would drop back to its floor on
    // sample 255, a one-texel spike at the end of the gradient. Resolved to the END here.
    // Sine and Triangle are unaffected (their period start and end are the same value).
    const raw = t / lam + p.phase;
    let ph = raw - Math.floor(raw);
    if (ph === 0 && raw > 0) ph = 1;
    ph = biasPow(ph, p.bias);
    switch (p.shape) {
      case 'Sine': w = Math.sin(ph * Math.PI * 2); break;
      case 'Triangle': w = 1 - Math.abs(ph * 2 - 1) * 2; break;
      case 'Sawtooth': w = ph * 2 - 1; break;
      default: w = ph < 0.5 ? 1 : -1; break; // Pulse
    }
  }
  // Skew is the same power law on the value, mapped through [0,1] so it stays in [-1,1].
  return p.skew === 1 ? w : biasPow((w + 1) / 2, p.skew) * 2 - 1;
};

/**
 * The span envelope at `t`: 0 outside the span, 1 in its middle, smoothstepped across each
 * feather shoulder. Everything the wave does is multiplied by this, which is what makes the
 * edit local and its edges seamless — the curve leaves and rejoins the original with a
 * matching slope rather than a step.
 */
export const waveEnvelope = (t: number, p: WaveParams): number => {
  const [a, b] = p.span;
  if (t < a || t > b) return 0;
  const len = b - a;
  if (len <= 0) return 0;
  const fa = Math.max(0, p.feather[0]) * len;
  const fb = Math.max(0, p.feather[1]) * len;
  let e = 1;
  if (fa > 0 && t < a + fa) {
    const u = (t - a) / fa;
    e = Math.min(e, u * u * (3 - 2 * u));
  }
  if (fb > 0 && t > b - fb) {
    const u = (b - t) / fb;
    e = Math.min(e, u * u * (3 - 2 * u));
  }
  return e;
};

/**
 * Apply the wave to one sample. `base` is the track's current value there; `range` is the
 * channel's full span in its own units (1 for OkLCh L, 0.4 for chroma, 2π for hue), which
 * is what turns the fractional amplitude/offset into channel units.
 *
 * The three modes all resolve to "a target value", then blend base → target by the
 * envelope. Doing the envelope as a BLEND rather than as a multiplier on the wave is what
 * makes replace and multiply feather correctly: scaling the wave to zero would leave
 * replace snapping to the offset line at the span edge instead of returning to the curve.
 */
export const applyWaveSample = (base: number, t: number, p: WaveParams, range: number): number => {
  const e = waveEnvelope(t, p);
  if (e <= 0) return base;
  const w = waveValue(t, p) * p.amplitude * range;
  const dc = (p.offset - 0.5) * range;
  let target: number;
  if (p.mode === 'add') target = base + w + dc;
  else if (p.mode === 'replace') target = p.offset * range + w;
  else target = base * (1 + w / Math.max(1e-6, range)) + dc;
  return base + (target - base) * e;
};

/**
 * The frame window a commit will actually touch: the span in frames, clamped and rounded.
 * Returns null when the span is too narrow to fit anything (a splice needs at least a
 * couple of frames or Douglas-Peucker has nothing to place).
 */
export const waveSpanFrames = (p: WaveParams, maxFrame: number): { lo: number; hi: number } | null => {
  const lo = Math.max(0, Math.round(p.span[0] * maxFrame));
  const hi = Math.min(maxFrame, Math.round(p.span[1] * maxFrame));
  return hi - lo < 2 ? null : { lo, hi };
};

/**
 * Sample the filtered curve across [lo, hi] at one value per integer frame — the exact
 * input `fitSamplesToKeys` wants. `sampleBase(frame)` reads the track as it stands, so the
 * wave composes with whatever is already there (including a previous wave).
 */
export const sampleWaveSpan = (
  p: WaveParams,
  lo: number,
  hi: number,
  maxFrame: number,
  range: number,
  sampleBase: (frame: number) => number,
): number[] => {
  const out = new Array<number>(hi - lo + 1);
  for (let f = lo; f <= hi; f++) out[f - lo] = applyWaveSample(sampleBase(f), f / maxFrame, p, range);
  return out;
};

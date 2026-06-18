/**
 * generatorPipeline — the pure Generator core. Decomposes two source gradients
 * (slots A/B) to OKLCh channels, applies per-slot modifiers, mixes them per
 * channel, optionally swaps in user-edited channel curves, applies the global
 * modifier chain, and recombines to a 256-step sRGB ramp. The ramp is then fed
 * to stopFit (the "feed it" seam) to produce a GMT GradientConfig.
 *
 * Ported VERBATIM from the prototype's buildResult (palette-lab
 * generator_template.html) — the pipeline ORDER is load-bearing and documented
 * in memory project_softology_palette_param:
 *
 *   decompose A,B → per-slot modify → mix per channel → (BASE snapshot) →
 *   curve override → reverse → [per sample: repeats+phase → mirror → posterize →
 *   contrast(L) · chroma×(C) · hue-rotate(h) → noise → gamut] → recombine.
 *
 * Two deliberate deviations from the prototype for the port:
 *   • core/ stays DOM- and THREE-free (a portable library), so this is a pure
 *     function over explicit params instead of reading DOM <input> values.
 *   • Noise is DETERMINISTIC (a seeded PRNG, no Math.random) so the same seed
 *     reproduces the same grain — matching the deterministic ethos of the
 *     img2grad port and letting "reseed" be an explicit integer bump.
 */

import { rgbToOklab, oklabToRgb, oklabToRgbSafe, type RGB } from './oklab';
import { mulberry32 } from './rampGeometry';
import { getEasing, type EasingName } from './easings';
import { clamp01 } from '../../utils/stopOps';

/** OKLCh channels of a 256-step gradient: L∈[0,1], C (chroma) ≥0, h in radians. */
export interface Channels {
  L: number[];
  C: number[];
  h: number[];
}

/** Per-slot (A or B) source modifiers, applied at decompose time (before mixing). */
export interface SlotModifiers {
  /** Hue rotation in degrees. */
  hueRotate: number;
  /** Chroma multiplier (vividness). */
  chroma: number;
  /** Contrast around mid-L (0.5). */
  contrast: number;
  /** Reverse the source ramp. */
  reverse: boolean;
  /** Tile this source N times across t (per-slot, before mixing). */
  repeats: number;
  /** Phase offset on t, 0..1. */
  phase: number;
  /** Mirror (ping-pong) this source's t axis. */
  mirror: boolean;
}

export const DEFAULT_SLOT_MODS: SlotModifiers = {
  hueRotate: 0,
  chroma: 1,
  contrast: 1,
  reverse: false,
  repeats: 1,
  phase: 0,
  mirror: false,
};

/** Global generator parameters (the post-mix modifier chain). */
export interface GeneratorParams {
  /** Per-channel A↔B mix, 0 = all A, 1 = all B. */
  mixL: number;
  mixC: number;
  mixH: number;
  /** Reverse the mixed result. */
  reverse: boolean;
  /** Posterize bands; 0 or 1 = off. */
  bands: number;
  /** Repeat the gradient N times across t. */
  repeats: number;
  /** Phase offset on t, 0..1. */
  phase: number;
  /** Mirror (ping-pong) the t axis. */
  mirror: boolean;
  /** Hue rotation in degrees. */
  hueRotate: number;
  /** Chroma multiplier. */
  chroma: number;
  /** Contrast around mid-L. */
  contrast: number;
  /** Noise amount, 0..1. */
  noise: number;
  /** Noise resample frequency (smaller = coarser grain). */
  noiseFreq: number;
  /** Noise targets. */
  noiseL: boolean;
  noiseC: boolean;
  noiseH: boolean;
}

export const DEFAULT_GENERATOR_PARAMS: GeneratorParams = {
  mixL: 0,
  mixC: 0,
  mixH: 0,
  reverse: false,
  bands: 0,
  repeats: 1,
  phase: 0,
  mirror: false,
  hueRotate: 0,
  chroma: 1,
  contrast: 1,
  noise: 0,
  noiseFreq: 32,
  noiseL: true,
  noiseC: false,
  noiseH: false,
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Circular-mean hue blend (verbatim from the prototype). */
const blendHue = (ha: number, hb: number, m: number): number => {
  if (m <= 0) return ha;
  if (m >= 1) return hb;
  const x = (1 - m) * Math.cos(ha) + m * Math.cos(hb);
  const y = (1 - m) * Math.sin(ha) + m * Math.sin(hb);
  return Math.atan2(y, x);
};

/** Decompose a 256-step sRGB ramp to OKLCh channels. */
export const decomposeRamp = (ramp: RGB[]): Channels => {
  const L: number[] = [];
  const C: number[] = [];
  const h: number[] = [];
  for (let i = 0; i < 256; i++) {
    const o = rgbToOklab(ramp[i]);
    L.push(o.L);
    C.push(Math.hypot(o.a, o.b));
    h.push(Math.atan2(o.b, o.a));
  }
  return { L, C, h };
};

/** Apply per-slot modifiers (reverse → t-remap repeats/phase/mirror → contrast/chroma/hue). */
export const applySlotMods = (ch: Channels, m: SlotModifiers): Channels => {
  let L = ch.L.slice();
  let C = ch.C.slice();
  let h = ch.h.slice();
  if (m.reverse) {
    L.reverse();
    C.reverse();
    h.reverse();
  }
  // Per-slot t-axis remap (repeats + phase + mirror), before mixing. Same maths
  // as the global chain; only wraps when actually tiling so reps=1/phase=0 is exact.
  const reps = Math.max(1, m.repeats ?? 1);
  const pha = m.phase ?? 0;
  const mir = m.mirror ?? false;
  if (reps !== 1 || pha !== 0 || mir) {
    const rL = new Array<number>(256);
    const rC = new Array<number>(256);
    const rh = new Array<number>(256);
    for (let i = 0; i < 256; i++) {
      let t = (i / 255) * reps + pha;
      t = t - Math.floor(t);
      if (mir) t = 1 - Math.abs(2 * t - 1);
      const si = Math.round(clamp01(t) * 255);
      rL[i] = L[si];
      rC[i] = C[si];
      rh[i] = h[si];
    }
    L = rL;
    C = rC;
    h = rh;
  }
  const hr = (m.hueRotate * Math.PI) / 180;
  for (let i = 0; i < 256; i++) {
    L[i] = 0.5 + (L[i] - 0.5) * m.contrast;
    C[i] *= m.chroma;
    h[i] += hr;
  }
  return { L, C, h };
};

/**
 * Pre-smooth a channel with a centred box average before curve-fitting — the
 * authoring "smooth" dial (the prototype pre-smoothed the channel before its
 * Schneider fit so a clean gradient collapsed to a few editable anchors and grain
 * didn't spawn spurious keyframes). width is the full window (odd-ish); 1 = no-op.
 */
export const smoothChannel = (vals: number[], width: number): number[] => {
  const w = Math.max(1, Math.floor(width));
  if (w <= 1) return vals.slice();
  const h = w >> 1;
  const n = vals.length;
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    let c = 0;
    for (let k = -h; k <= h; k++) {
      const j = i + k;
      if (j < 0 || j >= n) continue;
      s += vals[j];
      c++;
    }
    out[i] = s / c;
  }
  return out;
};

/** Unwrap a periodic hue array into a continuous one (for curve fitting/editing). */
export const unwrapHue = (a: number[]): number[] => {
  const o = [a[0]];
  let prev = a[0];
  for (let i = 1; i < a.length; i++) {
    let d = a[i] - prev;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    o.push(o[i - 1] + d);
    prev = a[i];
  }
  return o;
};

/** Deterministic [-1,1] noise array of length 256, seeded via the shared mulberry32. */
const seededNoise = (seed: number): number[] => {
  const rng = mulberry32((seed | 0) || 1);
  const out: number[] = new Array(256);
  for (let i = 0; i < 256; i++) out[i] = rng() * 2 - 1;
  return out;
};

/** Resample a 256-length array as if it had `f` samples stretched to 256. */
const resamp = (base: number[], f: number): number[] => {
  const o = new Array<number>(256);
  for (let i = 0; i < 256; i++) {
    const t = (i / 255) * (f - 1);
    const a = Math.floor(t);
    const b = Math.min(f - 1, a + 1);
    o[i] = base[a] * (1 - (t - a)) + base[b] * (t - a);
  }
  return o;
};

export interface BuildResult {
  /** The generated 256-step sRGB ramp (float channels, pre-rounding). */
  ramp: RGB[];
  /** The post-mix, pre-curve channels — the source for "Fit curves from source". */
  base: Channels;
  /**
   * The post-global-chain OKLCh channels per OUTPUT texel, BEFORE the lightness
   * clamp / chroma floor / sRGB gamut conversion. This is the un-clipped transform:
   * baking the curve from `final` (not the clipped RGB ramp) keeps the curve faithful
   * even at extreme values (L past [0,1], out-of-gamut chroma, extrapolated mixes).
   */
  final: Channels;
}

/**
 * Build the generated ramp. `curves`, when provided, REPLACES a post-mix channel
 * with the user's edited curve samples (256 values) — exactly the prototype's
 * "if curve-edit on, L=sampleCurve('L')" behaviour. Channels left undefined fall
 * through to the mixed values. `base` is returned so the host can fit curves from
 * the current mix.
 */
export const buildGradientRamp = (
  srcA: Channels,
  srcB: Channels,
  modsA: SlotModifiers,
  modsB: SlotModifiers,
  params: GeneratorParams,
  curves: Partial<Channels> | null,
  noiseSeed: number,
): BuildResult => {
  const da = applySlotMods(srcA, modsA);
  const db = applySlotMods(srcB, modsB);

  // Mix per channel.
  let L: number[] = [];
  let C: number[] = [];
  let H: number[] = [];
  for (let i = 0; i < 256; i++) {
    L.push(lerp(da.L[i], db.L[i], params.mixL));
    C.push(lerp(da.C[i], db.C[i], params.mixC));
    H.push(blendHue(da.h[i], db.h[i], params.mixH));
  }
  const base: Channels = { L: L.slice(), C: C.slice(), h: H.slice() };

  // Curve override (the channel-curve editor output).
  if (curves) {
    if (curves.L) L = curves.L.slice();
    if (curves.C) C = curves.C.slice();
    if (curves.h) H = curves.h.slice();
  }

  if (params.reverse) {
    L.reverse();
    C.reverse();
    H.reverse();
  }

  const bands = params.bands;
  const reps = Math.max(1, params.repeats);
  const pha = params.phase;
  const mir = params.mirror;
  const hueR = (params.hueRotate * Math.PI) / 180;
  const chr = params.chroma;
  const con = params.contrast;
  const nz = params.noise;
  const nf = Math.max(2, Math.round(params.noiseFreq));

  const RL = nz > 0 ? resamp(seededNoise(noiseSeed), nf) : null;
  const RC = nz > 0 ? resamp(seededNoise(noiseSeed ^ 0x9e3779b9), nf) : null;
  const RH = nz > 0 ? resamp(seededNoise(noiseSeed ^ 0x85ebca6b), nf) : null;

  const tiling = reps !== 1 || pha !== 0 || mir;
  const ramp: RGB[] = new Array(256);
  // Un-clipped post-global channels per output texel (for faithful curve baking).
  const fL = new Array<number>(256);
  const fC = new Array<number>(256);
  const fH = new Array<number>(256);
  for (let i = 0; i < 256; i++) {
    let t = (i / 255) * reps + pha; // repeats + phase
    // Wrap into [0,1) only when tiling/phasing/mirroring. The prototype always
    // applied `t - floor(t)`, which maps the final texel (t === 1.0) to 0 — so an
    // UN-tiled gradient's last colour wrongly equalled its first. We keep the
    // wrap for genuine tiling (seamless repeat) but leave the natural endpoint
    // intact otherwise, so identity (reps=1, phase=0, no mirror) is exact.
    if (tiling) t = t - Math.floor(t);
    if (mir) t = 1 - Math.abs(2 * t - 1); // mirror (ping-pong)
    if (bands > 1) t = (Math.min(bands - 1, Math.floor(t * bands)) + 0.5) / bands; // posterize
    const si = Math.round(clamp01(t) * 255);

    let l = 0.5 + (L[si] - 0.5) * con;
    let c = C[si] * chr;
    let h = H[si] + hueR;
    if (nz > 0) {
      if (params.noiseL && RL) l += RL[i] * nz * 0.25;
      if (params.noiseC && RC) c += RC[i] * nz * 0.06;
      if (params.noiseH && RH) h += RH[i] * nz * 0.6;
    }
    // Capture the raw transform BEFORE clipping, so a bake stays faithful at extremes.
    fL[i] = l;
    fC[i] = c;
    fH[i] = h;
    l = clamp01(l);
    if (c < 0) c = 0;
    ramp[i] = oklabToRgb({ L: l, a: c * Math.cos(h), b: c * Math.sin(h) });
  }

  return { ramp, base, final: { L: fL, C: fC, h: fH } };
};

// --- ColorBox mode (parallel builder) --------------------------------------------
// A second, independent generator mode. Where buildGradientRamp MIXES two source
// gradients, ColorBox SWEEPS each OKLCh channel directly from a start to an end
// value, each channel driven by its own easing curve — Lyft's ColorBox idea, but
// in OKLCh (perceptual) instead of HSV. It is a SEPARATE function, not a branch
// inside buildGradientRamp, so the (load-bearing) mix pipeline order is untouched.
// Returns the SAME BuildResult shape (ramp + base + final channels) so stopFit,
// the texture bake, the editor ghost and S3's coherence work are all unchanged.

/** One channel's sweep: a start→end value driven by a named easing curve. */
export interface ChannelSweep {
  start: number;
  end: number;
  easing: EasingName;
}

/**
 * ColorBox parameters. Per-channel OKLCh sweeps:
 *   • L — lightness, [0,1].
 *   • C — chroma (OKLab radius), ≥0 (sRGB-gamut chroma tops out ~0.37).
 *   • h — hue in DEGREES (start/end). The sweep takes the SHORTEST angular path.
 */
export interface ColorBoxParams {
  L: ChannelSweep;
  C: ChannelSweep;
  h: ChannelSweep;
}

export const DEFAULT_COLORBOX_PARAMS: ColorBoxParams = {
  L: { start: 0.2, end: 0.92, easing: 'linear' },
  C: { start: 0.12, end: 0.18, easing: 'linear' },
  h: { start: 30, end: 290, easing: 'linear' },
};

const DEG2RAD = Math.PI / 180;

/** Shortest signed angular delta start→end, in degrees, result in (-180, 180]. */
const shortestHueDeltaDeg = (start: number, end: number): number =>
  (((end - start) % 360) + 540) % 360 - 180;

/**
 * Build a 256-step ramp by sweeping each OKLCh channel independently start→end
 * under its easing curve, recomposing OKLCh→Lab and gamut-mapping with
 * oklabToRgbSafe (reduces chroma at constant L,h on overflow — preserves hue, so
 * a high-chroma sweep doesn't hue-shift on clamp). Hue follows the SHORTEST path.
 *
 * The returned channels (base/final) carry h in RADIANS — matching the Channels
 * convention from decomposeRamp — so the curve editor / ghost read them uniformly.
 */
export const buildColorBoxRamp = (params: ColorBoxParams): BuildResult => {
  const easeL = getEasing(params.L.easing);
  const easeC = getEasing(params.C.easing);
  const easeH = getEasing(params.h.easing);
  const dh = shortestHueDeltaDeg(params.h.start, params.h.end);

  const L = new Array<number>(256);
  const C = new Array<number>(256);
  const H = new Array<number>(256); // radians, to match Channels
  const ramp: RGB[] = new Array(256);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    const l = lerp(params.L.start, params.L.end, easeL(t));
    let c = lerp(params.C.start, params.C.end, easeC(t));
    if (c < 0) c = 0;
    const hRad = (params.h.start + dh * easeH(t)) * DEG2RAD;
    L[i] = l;
    C[i] = c;
    H[i] = hRad;
    ramp[i] = oklabToRgbSafe({ L: clamp01(l), a: c * Math.cos(hRad), b: c * Math.sin(hRad) });
  }
  // base (curve-fit source) and final (un-clipped transform) are identical here:
  // there is no mix, curve-override or global modify chain in ColorBox mode.
  return { ramp, base: { L: L.slice(), C: C.slice(), h: H.slice() }, final: { L, C, h: H } };
};

/**
 * rampGeometry — pure, deterministic ramp-geometry mappings for the W11 fullscreen
 * configuration gallery (S6).
 *
 * A gradient's 256-step ramp reads very differently as a directional sweep, a ring, an
 * angular sweep, or an arched band — and that is where the gradient is actually used
 * (radial maps, fractal colouring, …). These mappings let the fullscreen overlay *show*
 * those geometries over the SAME ramp. They are DISPLAY-ONLY: nothing here mutates gradient
 * data — a mapping samples the existing ramp through a geometry and produces pixels.
 *
 * Contract (mirrors the rest of `palette/core/`):
 *  • Pure + DOM-free + dependency-light (no canvas, no React) so `core/` stays a
 *    portable library — the actual canvas paint lives in the overlay component, which
 *    only calls `renderGeometry` and `ctx.putImageData`.
 *  • Deterministic. Every mapping is a pure function of `(geom, params, w, h)`, and the
 *    flat-optional params are ADDITIVE — an omitted field reproduces its `GEOM_DEFAULT`
 *    byte-for-byte (pinned by `debug/test-palette-rampgeometry.mts`).
 *
 * Each geometry is `(ramp, params, width, height) → RGBA` via `renderGeometry`, built
 * on a pure `sampleGeometry` that yields a per-pixel ramp-position + coverage field
 * (testable without a ramp or a canvas).
 *
 * @invariant Host-agnostic + DOM-free — do not import React/THREE/canvas here.
 * @see palette/core/gmtGradient.ts (renderStopsToRamp — produces the RGB[256] input)
 */

import type { RGB } from './oklab';

/** The geometries the gallery cycles. Room left for Diamond / Mirror / Bands.
 *  `linear` is a rotatable, eased gradient (it absorbed the old `scurve` mode — its
 *  `linearBias` IS an s-curve). `fractal` is special: it is GPU-rendered by
 *  `engine/fractal`'s FractalColorRenderer (a live Mandelbrot coloured by the ramp), NOT
 *  one of the pure 2D `sampleGeometry` fields — the overlay mounts a WebGL canvas for it
 *  and bypasses `renderGeometry`. It lives in this union/list only so the selector offers
 *  it; `sampleGeometry`/`renderGeometry` treat it as a no-op flat field. */
export type GeometryId = 'linear' | 'radial' | 'conic' | 'arched' | 'fractal';

/** Ordered selector list (id + human label). */
export const GEOMETRIES: ReadonlyArray<{ id: GeometryId; label: string }> = [
  { id: 'linear', label: 'Linear' },
  { id: 'radial', label: 'Radial' },
  { id: 'conic', label: 'Conic' },
  { id: 'arched', label: 'Arched' },
  { id: 'fractal', label: 'Fractal' },
];

/** Whether a geometry is the GPU-rendered live fractal (its own WebGL canvas +
 *  live phase/repeats/mapping controls), not a pure 2D `sampleGeometry` field. */
export const isFractal = (geom: string): boolean => geom === 'fractal';

/**
 * GeometryParams — the FLAT-OPTIONAL parameter object every fullscreen mode threads
 * through (the fullscreen-v2 GATE shape). ONE object, all fields optional: a mode reads
 * only the fields it cares about and an absent field falls back to {@link GEOM_DEFAULTS}.
 *
 * Why flat-optional (not a tagged union): the pure mappers below switch on `GeometryId`,
 * not on a param discriminant, so a flat bag keeps `sampleGeometry` a single signature and
 * lets a NEW mode (splitscreen / spline / liquify / parallax — built in parallel) add its
 * own fields here without changing the function shape or disturbing the others. Defaults are
 * pinned in {@link GEOM_DEFAULTS} so omitting a field reproduces the legacy constant exactly
 * (the determinism harness pins this — see `debug/test-palette-rampgeometry.mts`).
 *
 * @invariant Adding a field is additive: it MUST default such that existing modes render
 *   byte-identically when the field is absent.
 */
export interface GeometryParams {
  // ── linear (rotatable, eased — absorbed the old scurve mode) ────────────
  /** [linear] gradient direction in radians (0 = horizontal `nx`, the legacy linear). */
  linearAngle?: number;
  /** [linear] s-curve bias (0 = straight ramp; ±drives an ease-in-out / inverse S via {@link bias}). */
  linearBias?: number;
  // ── continuous-geometry shape controls (the formerly hard-coded constants) ──
  /** [radial] centre offset in isotropic units (0,0 = frame centre). */
  radialCx?: number;
  radialCy?: number;
  /** [radial] outer-radius scale (1 = corner reaches ramp end; <1 tightens, >1 overshoots). */
  radialScale?: number;
  /** [radial] falloff bias (0 = linear falloff; ± eases it via {@link bias}). */
  radialBias?: number;
  /** [conic] sweep rotation in radians (0 = the legacy orientation). */
  conicAngle?: number;
  /** [conic] centre offset in isotropic units (0,0 = frame centre). */
  conicCx?: number;
  conicCy?: number;
  /** [conic] mirrored-sweep width 0..0.5 — fraction of the circle the `1→0` return arc occupies.
   *  0 = collapsed (plain `0→1` wrap, byte-identical legacy); 0.5 = a symmetric mirror. >0
   *  reflects the sweep so there's no hard seam. */
  conicMirror?: number;
  /** [conic] bias of the rising (`0→1`) and falling (`1→0`) mirror halves (0 = linear). */
  conicBiasA?: number;
  conicBiasB?: number;
  /** [arched] band geometry — centre-Y / radius / half-width / ± sweep span (isotropic units). */
  archCy?: number;
  archR?: number;
  archHalfWidth?: number;
  archSpan?: number;
  /** [arched] spine curvature (0 = circular arc; ± bends the band flatter/tighter, independent of radius). */
  archCurve?: number;
  // ── spline (path) mode — the gradient flows along an editable Catmull-Rom path ──
  // Scalar shape controls only; the control-point LIST is mode-private (a variable-length
  // array can't be a flat scalar key) and lives in the spline mode's own store. These two
  // are the FS1-forward contract: the spline mode seeds its live band/softness from these
  // defaults. @see gradient-explorer/fullscreen/modes/splineMode.tsx
  /** [spline] diffusion SPREAD 0..1 — how broadly each colour bleeds off the path. 0 = tight/crisp
   *  (colours hug the path), 1 = soft wash (colours blend across the whole field). */
  splineSpread?: number;
  /** [spline] DEPTH shading −1..1 — perpendicular dimensionality. 0 = flat full-bleed fill;
   *  >0 darkens with distance (vignette); <0 lifts near the path (glow). */
  splineDepth?: number;
}

/** Default value for every optional {@link GeometryParams} field. Omitting a field in a
 *  params object resolves to the matching entry here — and these are the EXACT legacy
 *  constants, so a default-valued params renders byte-identically to the pre-gate code. */
export const GEOM_DEFAULTS = {
  linearAngle: 0,
  linearBias: 0,
  radialCx: 0,
  radialCy: 0,
  radialScale: 1,
  radialBias: 0,
  conicAngle: 0,
  conicCx: 0,
  conicCy: 0,
  conicMirror: 0,
  conicBiasA: 0,
  conicBiasB: 0,
  // Arched band: a circular arc whose centre sits below the frame so the band sweeps
  // across the top. Tuned in isotropic units (uy = −1 at the top edge).
  archCy: 1.35,
  archR: 2.3,
  archHalfWidth: 0.3,
  archSpan: 1.15, // ± angle (radians) the band sweeps through
  archCurve: 0,
  // Spline path: a gentle diffusion spread, flat depth (full-bleed fill) by default.
  splineSpread: 0.15,
  splineDepth: 0,
} as const;

/**
 * A pure per-pixel field: for each pixel `i`, `pos[i]` is the ramp position in
 * [0,1] and `cov[i]` its coverage in [0,1] (1 = paint `ramp[pos]`, 0 = background,
 * fractional = anti-aliased blend toward the background). Geometry math only — no
 * colours — so it is testable without a ramp.
 */
export interface GeometrySample {
  width: number;
  height: number;
  pos: Float32Array;
  cov: Float32Array;
}

/** Default background painted where coverage < 1 (arched gaps, point-field void). */
export const DEFAULT_BACKGROUND: RGB = { r: 9, g: 9, b: 12 };

// ── seeded PRNG ────────────────────────────────────────────────────────────────

/**
 * mulberry32 — tiny fast deterministic PRNG. Identical seed → identical stream.
 * The canonical seeded generator across the palette tools (same as the determinism
 * contract elsewhere). Returns a thunk yielding floats in [0,1).
 */
export const mulberry32 = (seed: number): (() => number) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// ── geometry math ───────────────────────────────────────────────────────────────

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
/** Wrap into [0,1) — used when a rotation can push an angle param past the ±π seam. */
const wrap01 = (v: number): number => v - Math.floor(v);

/** Bias steepness scale: maps a bias param in ~[-2,2] to a usable gain-exponent range. */
const BIAS_K = 1.6;
/**
 * Signed S-curve ease (Inigo Quilez "gain"). `b === 0` is EXACTLY the identity (early
 * return, byte-identical to a straight ramp); `b > 0` is an S-curve (ease-in-out / contrast);
 * `b < 0` is the inverse S. Monotone and stays in [0,1]. ONE bias used by linear / radial /
 * both conic mirror halves. Exported so the on-screen handle layer draws the curve it drives.
 */
export const bias = (t: number, b: number): number => {
  if (b === 0) return t;
  const k = Math.exp(b * BIAS_K);
  const u = clamp01(t);
  return u < 0.5 ? 0.5 * Math.pow(2 * u, k) : 1 - 0.5 * Math.pow(2 * (1 - u), k);
};

/** The arched band's target radius at sweep angle `ang` from straight-up. `archCurve === 0`
 *  is a plain circle (radius `archR`); ± bends the spine flatter/tighter. Exported as the
 *  SINGLE source of the curvature law so the on-screen handle's guide arcs trace the exact
 *  band `sampleGeometry` renders (they'd silently drift if each kept its own copy). */
export const archRadiusAt = (archR: number, archCurve: number, ang: number): number =>
  archR * (1 + archCurve * ang * ang);

/**
 * Sample a geometry into a pure per-pixel position + coverage field. No colours, no
 * canvas — deterministic given `(geom, params, width, height)`.
 */
export const sampleGeometry = (
  geom: GeometryId,
  params: GeometryParams,
  width: number,
  height: number,
): GeometrySample => {
  const n = width * height;
  const pos = new Float32Array(n);
  const cov = new Float32Array(n); // 0 by default
  const sample: GeometrySample = { width, height, pos, cov };

  // ── continuous geometries: every pixel is covered (cov = 1) unless a band masks it.
  // Shape geometries (radial/conic/arched) work in CENTRED, ISOTROPIC units — pixel
  // offsets divided by half the SHORTER side — so a circle stays a circle on a wide
  // canvas instead of stretching into an ellipse. Linear projects onto its angle axis in
  // normalised box space (nx/ny).
  const cxp = (width - 1) / 2;
  const cyp = (height - 1) / 2;
  const half = Math.max(1e-6, Math.min(cxp, cyp));
  const radialNorm = 1 / Math.max(1e-6, Math.hypot(cxp, cyp) / half); // corner → 1
  // Per-mode shape params — flat-optional, each falling back to its legacy constant so a
  // default-valued params renders byte-identically to the pre-gate code.
  const linearBias = params.linearBias ?? GEOM_DEFAULTS.linearBias;
  const radialCx = params.radialCx ?? GEOM_DEFAULTS.radialCx;
  const radialCy = params.radialCy ?? GEOM_DEFAULTS.radialCy;
  const radialScale = Math.max(1e-3, params.radialScale ?? GEOM_DEFAULTS.radialScale);
  const radialBias = params.radialBias ?? GEOM_DEFAULTS.radialBias;
  const conicAngle = params.conicAngle ?? GEOM_DEFAULTS.conicAngle;
  const conicCx = params.conicCx ?? GEOM_DEFAULTS.conicCx;
  const conicCy = params.conicCy ?? GEOM_DEFAULTS.conicCy;
  const conicMirror = params.conicMirror ?? GEOM_DEFAULTS.conicMirror;
  const conicBiasA = params.conicBiasA ?? GEOM_DEFAULTS.conicBiasA;
  const conicBiasB = params.conicBiasB ?? GEOM_DEFAULTS.conicBiasB;
  const archCy = params.archCy ?? GEOM_DEFAULTS.archCy;
  const archR = params.archR ?? GEOM_DEFAULTS.archR;
  const archHalfWidth = params.archHalfWidth ?? GEOM_DEFAULTS.archHalfWidth;
  const archSpan = params.archSpan ?? GEOM_DEFAULTS.archSpan;
  const archCurve = params.archCurve ?? GEOM_DEFAULTS.archCurve;

  // Linear projection axis in ISOTROPIC units so the angle is screen-true (a 45° gradient
  // looks 45° on any aspect). The projection is remapped from its corner range to [0,1]. At
  // angle 0 this reduces EXACTLY to nx (byte-identical legacy linear), independent of aspect.
  const linearAngle = params.linearAngle ?? GEOM_DEFAULTS.linearAngle;
  const lc = Math.cos(linearAngle);
  const ls = Math.sin(linearAngle);
  const ax = cxp / half; // half-extent of ux at the frame edge
  const ay = cyp / half; // half-extent of uy at the frame edge
  const lProjAbs = Math.abs(lc) * ax + Math.abs(ls) * ay; // projection at the far corner
  const lSpan = Math.max(1e-6, 2 * lProjAbs);
  // Conic at all-default centre + angle + mirror keeps the EXACT legacy expression (no
  // wrap01) so a default-valued params is byte-identical to the pre-gate field.
  const conicLegacy = conicCx === 0 && conicCy === 0 && conicAngle === 0 && conicMirror === 0;
  const conicSplit = 1 - conicMirror; // rising-arc fraction when mirrored

  for (let y = 0; y < height; y++) {
    const uy = (y - cyp) / half;
    for (let x = 0; x < width; x++) {
      const ux = (x - cxp) / half;
      const i = y * width + x;
      let p = 0;
      let c = 1;
      switch (geom) {
        case 'linear':
          p = bias((ux * lc + uy * ls + lProjAbs) / lSpan, linearBias);
          break;
        case 'radial':
          p = bias(
            clamp01((Math.hypot(ux - radialCx, uy - radialCy) * radialNorm) / radialScale),
            radialBias,
          );
          break;
        case 'conic': {
          const ang = Math.atan2(uy - conicCy, ux - conicCx); // -π..π, true angle
          if (conicLegacy) {
            p = bias((ang + Math.PI) / (2 * Math.PI), conicBiasA);
          } else {
            const phi = wrap01((ang + conicAngle + Math.PI) / (2 * Math.PI)); // [0,1)
            if (conicMirror <= 0) p = bias(phi, conicBiasA);
            else if (phi < conicSplit) p = bias(phi / conicSplit, conicBiasA); // rising 0→1
            else p = bias(1 - (phi - conicSplit) / conicMirror, conicBiasB); // falling 1→0
          }
          break;
        }
        case 'arched': {
          const d = Math.hypot(ux, uy - archCy);
          // Common case (curve=0 → circular band): the band test needs no angle, so the cheap
          // `atan2` for the POSITION only runs for in-band pixels (most of the frame is void).
          let ang: number;
          let band: number;
          if (archCurve === 0) {
            band = archHalfWidth - Math.abs(d - archR);
            if (band <= 0) {
              c = 0; // outside the band → background (p stays 0)
              break;
            }
            ang = Math.atan2(ux, archCy - uy);
          } else {
            // Curved spine: the target radius depends on the sweep angle, so compute it first.
            ang = Math.atan2(ux, archCy - uy); // 0 at top, ± toward sides
            band = archHalfWidth - Math.abs(d - archRadiusAt(archR, archCurve, ang));
            if (band <= 0) {
              c = 0;
              break;
            }
          }
          p = clamp01((ang + archSpan) / (2 * archSpan));
          // Soft edge over the outer ~25% of the half-width for an anti-aliased band.
          c = clamp01(band / (archHalfWidth * 0.25));
          break;
        }
      }
      pos[i] = p;
      cov[i] = c;
    }
  }
  return sample;
};

/**
 * Render a geometry to an RGBA buffer by looking the per-pixel field up in `ramp`
 * (an RGB[256] from `renderStopsToRamp`). Pure: `(ramp, geom, params, w, h) → RGBA`;
 * the overlay component just `ctx.putImageData`s the result. Coverage < 1 blends
 * toward `background` (anti-aliased arch edges / dot disks; the point-field void).
 */
export const renderGeometry = (
  ramp: RGB[],
  geom: GeometryId,
  params: GeometryParams,
  width: number,
  height: number,
  background: RGB = DEFAULT_BACKGROUND,
): Uint8ClampedArray => {
  const { pos, cov } = sampleGeometry(geom, params, width, height);
  const out = new Uint8ClampedArray(width * height * 4);
  const last = ramp.length - 1;
  const bg = background;
  for (let i = 0; i < pos.length; i++) {
    const c = cov[i];
    const o = i * 4;
    if (c <= 0) {
      out[o] = bg.r;
      out[o + 1] = bg.g;
      out[o + 2] = bg.b;
      out[o + 3] = 255;
      continue;
    }
    const idx = Math.round(clamp01(pos[i]) * last);
    const col = ramp[idx] ?? bg;
    if (c >= 1) {
      out[o] = col.r;
      out[o + 1] = col.g;
      out[o + 2] = col.b;
    } else {
      out[o] = bg.r + (col.r - bg.r) * c;
      out[o + 1] = bg.g + (col.g - bg.g) * c;
      out[o + 2] = bg.b + (col.b - bg.b) * c;
    }
    out[o + 3] = 255;
  }
  return out;
};

/**
 * Render a pre-computed position+coverage field to RGBA, LINEAR-sampling the ramp at the FLOAT
 * position (smooth — no 256-step quantisation) and, when `dither`, applying **serpentine
 * Floyd–Steinberg error diffusion** before the 8-bit write.
 *
 * Error diffusion feeds each pixel's quantisation error forward, so the LOCAL average tracks the
 * input exactly — a smooth gradient reproduces with essentially zero column-average deviation
 * (WIGGLE→0), the smoothest still-image result and far better than per-pixel noise dither, which
 * leaves residual banding OR adds visible grain. It also self-limits on flats: a constant region
 * only toggles between its two bracketing levels (≤1 LSB), so islands don't get noisy. Sequential
 * (CPU-only — can't run in a parallel fragment shader), which is why the GPU modes (fractal) use
 * the blue-noise tail instead; the 2D geometry modes are CPU-computed, so they use this.
 *
 * Pure + deterministic given `(sample, ramp, dither)`.
 *
 * @see debug/test-dither.mts (the harness that picked error diffusion: WIGGLE 0.04 vs 0.24 noise)
 */
export const renderFieldDithered = (
  sample: GeometrySample,
  ramp: RGB[],
  dither: boolean,
  background: RGB = DEFAULT_BACKGROUND,
): Uint8ClampedArray => {
  const { width, height, pos, cov } = sample;
  const last = ramp.length - 1;
  const bg = [background.r, background.g, background.b];
  const out = new Uint8ClampedArray(width * height * 4);
  // Carried error: `cur` for the current row (incl. the horizontal neighbour), `nxt` for the
  // row below. Padded by 1 px each side so the edge taps never go out of bounds. RGB interleaved.
  const cur = new Float32Array((width + 2) * 3);
  const nxt = new Float32Array((width + 2) * 3);
  // LINEAR ramp lookup blended toward bg by coverage, per channel.
  const target = (p: number, c: number, ch: number): number => {
    const cc = c < 0 ? 0 : c > 1 ? 1 : c;
    const t = (p < 0 ? 0 : p > 1 ? 1 : p) * last;
    const i0 = Math.floor(t), f = t - i0;
    const a = ramp[i0] ?? background, b = ramp[i0 < last ? i0 + 1 : last] ?? background;
    const ca = ch === 0 ? a.r : ch === 1 ? a.g : a.b;
    const cb = ch === 0 ? b.r : ch === 1 ? b.g : b.b;
    return bg[ch] + (ca + (cb - ca) * f - bg[ch]) * cc;
  };
  for (let y = 0; y < height; y++) {
    nxt.fill(0);
    const ltr = (y & 1) === 0; // serpentine: alternate scan direction to break diffusion "worms"
    const fwd = ltr ? 1 : -1;
    for (let ii = 0; ii < width; ii++) {
      const x = ltr ? ii : width - 1 - ii;
      const i = y * width + x;
      const o = i * 4;
      for (let ch = 0; ch < 3; ch++) {
        const v = target(pos[i], cov[i], ch) + (dither ? cur[(x + 1) * 3 + ch] : 0);
        const q = v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
        out[o + ch] = q;
        if (dither) {
          const e = v - q;
          cur[(x + 1 + fwd) * 3 + ch] += (e * 7) / 16;
          nxt[(x + 1 - fwd) * 3 + ch] += (e * 3) / 16;
          nxt[(x + 1) * 3 + ch] += (e * 5) / 16;
          nxt[(x + 1 + fwd) * 3 + ch] += (e * 1) / 16;
        }
      }
      out[o + 3] = 255;
    }
    cur.set(nxt);
  }
  return out;
};

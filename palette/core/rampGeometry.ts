/**
 * rampGeometry — pure, deterministic ramp-geometry mappings for the W11 fullscreen
 * configuration gallery (S6).
 *
 * A gradient's 256-step ramp reads very differently as a ring, an angular sweep, an
 * arched band, an eased S-curve, or a stochastic dot field — and that is where the
 * gradient is actually used (radial maps, fractal colouring, …). These mappings let
 * the fullscreen overlay *show* those geometries over the SAME ramp. They are
 * DISPLAY-ONLY: nothing here mutates gradient data — a mapping samples the existing
 * ramp through a geometry and produces pixels.
 *
 * Contract (mirrors the rest of `palette/core/`):
 *  • Pure + DOM-free + dependency-light (no canvas, no React) so `core/` stays a
 *    portable library — the actual canvas paint lives in the overlay component, which
 *    only calls `renderGeometry` and `ctx.putImageData`.
 *  • Deterministic. The stochastic `random` field is driven by a SEEDED `mulberry32`
 *    PRNG (per the determinism contract — `debug/test-palette-rampgeometry.mts`
 *    pins it), so the same `(seed, amount)` always renders the same point field.
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
 *  `fractal` is special: it is GPU-rendered by `engine/fractal`'s
 *  FractalColorRenderer (a live Mandelbrot coloured by the ramp), NOT one of the
 *  pure 2D `sampleGeometry` fields — the overlay mounts a WebGL canvas for it and
 *  bypasses `renderGeometry`. It lives in this union/list only so the selector
 *  offers it; `sampleGeometry`/`renderGeometry` treat it as a no-op flat field. */
export type GeometryId = 'linear' | 'radial' | 'conic' | 'arched' | 'scurve' | 'random' | 'fractal';

/** Ordered selector list (id + human label). */
export const GEOMETRIES: ReadonlyArray<{ id: GeometryId; label: string }> = [
  { id: 'linear', label: 'Linear' },
  { id: 'radial', label: 'Radial' },
  { id: 'conic', label: 'Conic' },
  { id: 'arched', label: 'Arched' },
  { id: 'scurve', label: 'S-curve' },
  { id: 'random', label: 'Randomized' },
  { id: 'fractal', label: 'Fractal' },
];

/** Whether a geometry consumes the seed/amount controls (only `random` does). Accepts a
 *  string since the active-mode id is now a registry key (a superset of `GeometryId`). */
export const isStochastic = (geom: string): boolean => geom === 'random';

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
  // ── stochastic field (`random`) ────────────────────────────────────────
  /** Randomization strength 0..1 (point density + colour jitter). Only `random` reads it. */
  amount?: number;
  /** PRNG seed — a re-roll mints a new seed; a fixed seed reproduces the field exactly. */
  seed?: number;
  // ── continuous-geometry shape controls (the formerly hard-coded constants) ──
  /** [radial] centre offset in isotropic units (0,0 = frame centre). */
  radialCx?: number;
  radialCy?: number;
  /** [conic] sweep rotation in radians (0 = the legacy orientation). */
  conicAngle?: number;
  /** [arched] band geometry — centre-Y / radius / half-width / ± sweep span (isotropic units). */
  archCy?: number;
  archR?: number;
  archHalfWidth?: number;
  archSpan?: number;
  /** [scurve] eased-shape strength (0 = the legacy Perlin smootherstep; ±drives toe/shoulder bias). */
  scurveShape?: number;
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
  amount: 0.5,
  seed: 1,
  radialCx: 0,
  radialCy: 0,
  conicAngle: 0,
  // Arched band: a circular arc whose centre sits below the frame so the band sweeps
  // across the top. Tuned in isotropic units (uy = −1 at the top edge).
  archCy: 1.35,
  archR: 2.3,
  archHalfWidth: 0.3,
  archSpan: 1.15, // ± angle (radians) the band sweeps through
  scurveShape: 0,
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
/** smootherstep — Ken Perlin's C2 ease (the S in "S-curve"). */
const smootherstep = (t: number): number => {
  const x = clamp01(t);
  return x * x * x * (x * (x * 6 - 15) + 10);
};
/** Shaped S-curve ease. `shape === 0` is EXACTLY {@link smootherstep} (the legacy
 *  default, byte-identical); shape ≠ 0 biases the toe/shoulder via a symmetric gamma so
 *  the curve stays in [0,1] and monotone. Positive = lazier start / harder finish. */
const easeShaped = (t: number, shape: number): number => {
  const s = smootherstep(t);
  if (shape === 0) return s;
  // gamma in (0,∞): >1 pushes the curve down (slower start), <1 lifts it (faster start).
  const gamma = Math.exp(-shape);
  return Math.pow(s, gamma);
};

/** Stochastic field render-resolution cap (long edge) — keeps the splat loop bounded. */
export const RANDOM_MAX_DIM = 1024;

/**
 * Build the stochastic dot field. Points are generated in a stable order from
 * `seed` alone (so raising `amount` only ever ADDS dots on top of the same field),
 * then `amount` scales how many are kept and how much colour-jitter each carries.
 * Each dot splats a soft 1px-radius disk so the field reads as anti-aliased.
 */
const fillRandom = (s: GeometrySample, amount: number, seed: number): void => {
  const { width: w, height: h, pos, cov } = s;
  const a = clamp01(amount);
  const rng = mulberry32(seed);
  // Density 1%..7% of the area; the void stays background.
  const count = Math.floor(w * h * (0.01 + a * 0.06));
  const jitter = a * 0.25; // colour position jitter, in ramp-units
  const splat = (px: number, py: number, t: number): void => {
    for (let dy = -1; dy <= 1; dy++) {
      const y = py + dy;
      if (y < 0 || y >= h) continue;
      for (let dx = -1; dx <= 1; dx++) {
        const x = px + dx;
        if (x < 0 || x >= w) continue;
        // Soft disk: full at centre, ~0.4 on the 4-neighbours, ~0.15 on diagonals.
        const c = dx === 0 && dy === 0 ? 1 : dx === 0 || dy === 0 ? 0.4 : 0.15;
        const i = y * w + x;
        if (c > cov[i]) {
          cov[i] = c;
          pos[i] = t;
        }
      }
    }
  };
  for (let n = 0; n < count; n++) {
    const fx = rng();
    const fy = rng();
    const fj = rng();
    // Colour follows the horizontal position, jittered by `amount`.
    const t = clamp01(fx + (fj - 0.5) * 2 * jitter);
    // fx,fy ∈ [0,1) → floor(·*w) ∈ [0, w-1], so the right/bottom edges can host a dot.
    splat(Math.floor(fx * w), Math.floor(fy * h), t);
  }
};

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

  if (geom === 'random') {
    fillRandom(sample, params.amount ?? GEOM_DEFAULTS.amount, params.seed ?? GEOM_DEFAULTS.seed);
    return sample;
  }

  // ── continuous geometries: every pixel is covered (cov = 1) unless a band masks it.
  // Shape geometries (radial/conic/arched) work in CENTRED, ISOTROPIC units — pixel
  // offsets divided by half the SHORTER side — so a circle stays a circle on a wide
  // canvas instead of stretching into an ellipse. Linear/S-curve stay on nx (they're
  // horizontal, aspect-independent).
  const cxp = (width - 1) / 2;
  const cyp = (height - 1) / 2;
  const half = Math.max(1e-6, Math.min(cxp, cyp));
  const radialNorm = 1 / Math.max(1e-6, Math.hypot(cxp, cyp) / half); // corner → 1
  // Per-mode shape params — flat-optional, each falling back to its legacy constant so a
  // default-valued params renders byte-identically to the pre-gate code.
  const radialCx = params.radialCx ?? GEOM_DEFAULTS.radialCx;
  const radialCy = params.radialCy ?? GEOM_DEFAULTS.radialCy;
  const conicAngle = params.conicAngle ?? GEOM_DEFAULTS.conicAngle;
  const archCy = params.archCy ?? GEOM_DEFAULTS.archCy;
  const archR = params.archR ?? GEOM_DEFAULTS.archR;
  const archHalfWidth = params.archHalfWidth ?? GEOM_DEFAULTS.archHalfWidth;
  const archSpan = params.archSpan ?? GEOM_DEFAULTS.archSpan;
  const scurveShape = params.scurveShape ?? GEOM_DEFAULTS.scurveShape;

  for (let y = 0; y < height; y++) {
    const ny = height > 1 ? y / (height - 1) : 0;
    const uy = (y - cyp) / half;
    for (let x = 0; x < width; x++) {
      const nx = width > 1 ? x / (width - 1) : 0;
      const ux = (x - cxp) / half;
      const i = y * width + x;
      let p = 0;
      let c = 1;
      switch (geom) {
        case 'linear':
          p = nx;
          break;
        case 'radial':
          p = clamp01(Math.hypot(ux - radialCx, uy - radialCy) * radialNorm);
          break;
        case 'conic': {
          const ang = Math.atan2(uy, ux); // -π..π, true angle (aspect-correct)
          // Default (conicAngle === 0) keeps the EXACT legacy expression; a rotation
          // wraps into [0,1) so the ±π seam doesn't clip.
          p = conicAngle === 0
            ? (ang + Math.PI) / (2 * Math.PI)
            : wrap01((ang + conicAngle + Math.PI) / (2 * Math.PI));
          break;
        }
        case 'scurve':
          p = easeShaped(nx, scurveShape);
          break;
        case 'arched': {
          const d = Math.hypot(ux, uy - archCy);
          const band = archHalfWidth - Math.abs(d - archR);
          if (band <= 0) {
            c = 0; // outside the band → background
            p = 0;
          } else {
            // Position runs along the arc by angle from straight-up.
            const ang = Math.atan2(ux, archCy - uy); // 0 at top, ± toward sides
            p = clamp01((ang + archSpan) / (2 * archSpan));
            // Soft edge over the outer ~25% of the half-width for an anti-aliased band.
            c = clamp01(band / (archHalfWidth * 0.25));
          }
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

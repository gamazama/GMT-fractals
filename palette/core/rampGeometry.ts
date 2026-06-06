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

/** The geometries the gallery cycles. Room left for Diamond / Mirror / Bands. */
export type GeometryId = 'linear' | 'radial' | 'conic' | 'arched' | 'scurve' | 'random';

/** Ordered selector list (id + human label). */
export const GEOMETRIES: ReadonlyArray<{ id: GeometryId; label: string }> = [
  { id: 'linear', label: 'Linear' },
  { id: 'radial', label: 'Radial' },
  { id: 'conic', label: 'Conic' },
  { id: 'arched', label: 'Arched' },
  { id: 'scurve', label: 'S-curve' },
  { id: 'random', label: 'Randomized' },
];

/** Whether a geometry consumes the seed/amount controls (only `random` does). */
export const isStochastic = (geom: GeometryId): boolean => geom === 'random';

export interface GeometryParams {
  /** Randomization strength 0..1 (point density + colour jitter). Only `random` reads it. */
  amount: number;
  /** PRNG seed — a re-roll mints a new seed; a fixed seed reproduces the field exactly. */
  seed: number;
}

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
/** smootherstep — Ken Perlin's C2 ease (the S in "S-curve"). */
const smootherstep = (t: number): number => {
  const x = clamp01(t);
  return x * x * x * (x * (x * 6 - 15) + 10);
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
    fillRandom(sample, params.amount, params.seed);
    return sample;
  }

  // ── continuous geometries: every pixel is covered (cov = 1) unless a band masks it.
  const cx = 0.5;
  const cy = 0.5;
  const cornerR = Math.SQRT1_2; // centre→corner distance for a 1×1 unit square
  // Arched band geometry (a circular arc sweeping across the top of the frame).
  const archCx = 0.5;
  const archCy = 1.25; // centre well below the frame → a shallow arc up top
  const archR = 1.0;
  const archHalfWidth = 0.16;
  const archSpan = 0.9; // ± angle (radians) the band sweeps through

  for (let y = 0; y < height; y++) {
    const ny = height > 1 ? y / (height - 1) : 0;
    for (let x = 0; x < width; x++) {
      const nx = width > 1 ? x / (width - 1) : 0;
      const i = y * width + x;
      let p = 0;
      let c = 1;
      switch (geom) {
        case 'linear':
          p = nx;
          break;
        case 'radial':
          p = clamp01(Math.hypot(nx - cx, ny - cy) / cornerR);
          break;
        case 'conic': {
          const ang = Math.atan2(ny - cy, nx - cx); // -π..π
          p = (ang + Math.PI) / (2 * Math.PI);
          break;
        }
        case 'scurve':
          p = smootherstep(nx);
          break;
        case 'arched': {
          const d = Math.hypot(nx - archCx, ny - archCy);
          const band = archHalfWidth - Math.abs(d - archR);
          if (band <= 0) {
            c = 0; // outside the band → background
            p = 0;
          } else {
            // Position runs along the arc by angle from straight-up.
            const ang = Math.atan2(nx - archCx, archCy - ny); // 0 at top, ± toward sides
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

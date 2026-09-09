/**
 * rampGeometry — pure, deterministic ramp-geometry mappings for the W11 fullscreen
 * configuration gallery (S6).
 *
 * A gradient's 256-step ramp reads very differently as a directional sweep, a ring, an
 * or an angular sweep — and that is where the gradient is actually used
 * (radial maps, fractal colouring, …). These mappings let the fullscreen overlay *show*
 * those geometries over the SAME ramp. They are DISPLAY-ONLY: nothing here mutates gradient
 * data — a mapping samples the existing ramp through a geometry and produces pixels.
 *
 * Contract for THIS module — NOT for `palette/core/` as a whole:
 *  • Pure + DOM-free + dependency-light (no canvas, no React) — the actual canvas paint
 *    lives in the overlay component, which only calls `renderGeometry` and
 *    `ctx.putImageData`.
 *
 *    `palette/core/` is NOT uniformly DOM-free and never has been, so do not read this
 *    header as a directory-wide guarantee. `rampCanvas.ts` declares itself "DOM-only";
 *    `favientsExport.ts`, `img2grad/decode.ts` and `favientDnd.ts` call
 *    `document.createElement`; `storage.ts` is a localStorage wrapper; `catalogLoader.ts`
 *    calls `fetch`. Grep the directory for `document.createElement` before assuming a
 *    core module runs under node or in a worker.
 *  • Deterministic. Every mapping is a pure function of `(geom, params, w, h)`, and the
 *    flat-optional params are ADDITIVE — an omitted field reproduces its `GEOM_DEFAULT`
 *    byte-for-byte (pinned by `debug/test-palette-rampgeometry.mts`).
 *
 * Each geometry is `(ramp, params, width, height) → RGBA` via `renderGeometry`, built
 * on a pure `sampleGeometry` that yields a per-pixel ramp-position + coverage field
 * (testable without a ramp or a canvas).
 *
 * @invariant DOM-free — no `document` / `window` reference at module scope or on any path
 *   `renderGeometry` / `sampleGeometry` reach — proven by:
 *   `npx tsx debug/test-palette-rampgeometry.mts`, which runs on bare node where
 *   `typeof document === 'undefined'`; a module-scope `document.createElement('canvas')`
 *   here makes it exit 1 with a ReferenceError before the first assertion (falsified
 *   2026-07-29).
 * @assumption Host-agnostic — no `react` / `three` import. NOTHING enforces this half:
 *   adding `import * as React from 'react'` to this file leaves the harness fully green,
 *   exit 0 (verified 2026-07-29), because those packages resolve under node exactly as
 *   they do in the browser. It was an `@invariant` until the run that could not prove it.
 * @see palette/core/gmtGradient.ts (renderStopsToRamp — produces the RGB[256] input)
 */

import type { RGB } from './oklab';
import { clamp01 } from '../../utils/stopOps';

/** The geometries the gallery cycles. Room left for Diamond / Mirror / Bands.
 *  `linear` is a rotatable, eased gradient (it absorbed the old `scurve` mode — its
 *  `linearBias` IS an s-curve). `fractal` is special: it is GPU-rendered by
 *  `engine/fractal`'s FractalColorRenderer (a live Mandelbrot coloured by the ramp), NOT
 *  one of the pure 2D `sampleGeometry` fields — the overlay mounts a WebGL canvas for it
 *  and bypasses `renderGeometry`. It lives in this union/list only so the selector offers
 *  it; `sampleGeometry`/`renderGeometry` treat it as a no-op flat field. */
export type GeometryId = 'linear' | 'radial' | 'conic' | 'fractal';

/** Ordered selector list (id + human label). */
export const GEOMETRIES: ReadonlyArray<{ id: GeometryId; label: string }> = [
  { id: 'linear', label: 'Linear' },
  { id: 'radial', label: 'Radial' },
  { id: 'conic', label: 'Conic' },
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
 * @invariant For every field listed in the harness, an omitted value renders
 *   byte-identically to passing its {@link GEOM_DEFAULTS} entry — proven by:
 *   `npx tsx debug/test-palette-rampgeometry.mts` section [5](a)
 *   ("<geom>: omitted fields == explicit GEOM_DEFAULTS (additive)"). Giving `radialScale`
 *   a fallback other than `GEOM_DEFAULTS.radialScale` turns that assertion red, exit 1
 *   (falsified 2026-07-29).
 *
 *   LIMIT — READ THIS BEFORE ADDING A FIELD. That check walks a HAND-MAINTAINED `cases`
 *   list inside the harness, so it pins only the fields already named there. A NEW field
 *   whose `sampleGeometry` fallback disagrees with its `GEOM_DEFAULTS` entry — exactly the
 *   violation this contract exists to catch — leaves the harness fully green, exit 0
 *   (verified 2026-07-29 by adding one). Adding a field here is therefore NOT covered
 *   until you also add it to the harness's `cases` list. `splineSpread` / `splineDepth`
 *   are outside the gate today, benignly: `sampleGeometry` never reads them.
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
  /** [radial] SINE modulation of the outer radius around the circle — the ring becomes a
   *  flower. `radialSineAmp` 0 = a plain circle (byte-identical legacy); 0.5 = the radius
   *  swings ±50 %. `radialSineFreq` is the lobe COUNT (integer values close seamlessly at
   *  the ±π wrap; a fractional count leaves a visible seam, which is why the handle steps). */
  radialSineAmp?: number;
  radialSineFreq?: number;
  /** [conic] sweep rotation in radians (0 = the legacy orientation). */
  conicAngle?: number;
  /** [conic] centre offset in isotropic units (0,0 = frame centre). */
  conicCx?: number;
  conicCy?: number;
  /** [conic] mirrored-sweep width 0..0.5 — fraction of the circle the `1→0` return arc occupies.
   *  0 = collapsed (plain `0→1` wrap, byte-identical legacy); 0.5 = a symmetric mirror. >0
   *  reflects the sweep so there's no hard seam. */
  conicMirror?: number;
  /** [conic] bias of the rising (`0→1`) and falling (`1→0`) mirror halves (0 = linear).
   *  With the mirror collapsed only `conicBiasA` is read — it eases the whole sweep. */
  conicBiasA?: number;
  conicBiasB?: number;
  /** [conic] TWIST in turns — the sweep's angle advances with the radius, so the straight
   *  spokes wind into a LOG SPIRAL. 0 = plain conic (byte-identical legacy). The law is the
   *  house's own (`engine/fractal/shaders/gradientSample.ts`, "Angle: iteration log-spiral"):
   *  `phi += twist · log(1 + r)`, r in isotropic units — constant winding per radius decade,
   *  so the spiral looks the same everywhere rather than unwinding at the centre. */
  conicTwist?: number;
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
  /** [spline] EXTEND 0..1 — how far the ramp carries on past the two ENDS of the path, along
   *  the terminal tangents, as a multiple of the path's own length. 0 = the legacy behaviour:
   *  everything beyond an endpoint clamps to that end's colour, so a straight path leaves a
   *  flat band at each side. Turned up, the ends keep going and the whole ramp is redistributed
   *  over the extended line — which is what makes a STRAIGHT path read as a plain linear ramp
   *  across the frame rather than a stripe with two flat margins. */
  splineExtend?: number;
  // ── gradient map mode — recolour the Extract image through the ramp ──
  // Like the two spline keys above, these live in the bag but OUTSIDE the gate:
  // `sampleGeometry` never reads them, so the determinism harness's hand-maintained `cases`
  // list is unaffected. @see gradient-explorer/fullscreen/modes/gradientMapMode.tsx
  /** [gradientMap] blend 0..1 between the original image (0) and the fully mapped image (1). */
  mapStrength?: number;
  /** [gradientMap] flip the luminance lookup (0 = off, 1 = on) — dark pixels take the ramp's
   *  END colour. Boolean-as-scalar because the params bag is numeric. */
  mapInvert?: number;
  /** [gradientMap] WHICH channel of the image drives the lookup — a {@link MapChannel} index,
   *  0 = luma (the classic gradient map). Enum-as-scalar because the params bag is numeric.
   *  @see palette/core/gradientMapChannels.ts */
  mapChannel?: number;
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
  // Sine amplitude 0 = a plain circular falloff, so the frequency below is inert at rest and
  // the default render is byte-identical to the pre-sine field. 5 is the count the flower
  // opens with the first time the amplitude handle is pulled.
  radialSineAmp: 0,
  radialSineFreq: 5,
  conicAngle: 0,
  conicCx: 0,
  conicCy: 0,
  conicMirror: 0,
  conicBiasA: 0,
  conicBiasB: 0,
  conicTwist: 0,
  // Spline path: a gentle diffusion spread, flat depth (full-bleed fill) by default.
  splineSpread: 0.15,
  splineDepth: 0,
  // Off by default: extending changes what an existing spline looks like, and the mode's
  // saved-state contract is that an omitted key reproduces the old picture exactly.
  splineExtend: 0,
  // Gradient map: fully mapped, not inverted, driven by luma — the duotone look the mode
  // exists for. Channel 0 IS luma (see MAP_CHANNELS), so the default is the classic map.
  mapStrength: 1,
  mapInvert: 0,
  mapChannel: 0,
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

/** Default background painted where coverage < 1. No shipped geometry leaves a gap since
 *  Arched was retired (2026-09-08), but the coverage channel and this blend stay part of the
 *  field contract — a future masked geometry would use them. */
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

/**
 * The conic sweep's TWIST offset, in turns, at isotropic radius `r` — `twist · log(1 + r)`,
 * the house log-spiral law. Exported as the SINGLE source of the winding so the on-screen
 * spiral guide traces the exact bands `sampleGeometry` renders (they would silently drift if
 * the handle layer kept its own copy — the same reason {@link bias} is exported).
 */
export const conicTwistTurns = (twist: number, r: number): number =>
  twist === 0 ? 0 : twist * Math.log(1 + r);

/**
 * The radial mode's modulated OUTER reach at angle `ang` — `scale · (1 + amp·sin(freq·ang))`.
 * Exported for the same reason as {@link conicTwistTurns}: the handle layer draws this curve
 * as its ring guide, so one law serves both the pixels and the signifier.
 */
export const radialSineReach = (scale: number, amp: number, freq: number, ang: number): number =>
  amp === 0 ? scale : scale * (1 + amp * Math.sin(freq * ang));

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
  // Shape geometries (radial/conic) work in CENTRED, ISOTROPIC units — pixel
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
  const radialSineAmp = params.radialSineAmp ?? GEOM_DEFAULTS.radialSineAmp;
  const radialSineFreq = params.radialSineFreq ?? GEOM_DEFAULTS.radialSineFreq;
  // At amplitude 0 the modulation is the identity, so the per-pixel `atan2` is skipped
  // entirely and the field stays byte-identical to the pre-sine circle.
  const radialWavy = radialSineAmp !== 0;
  const conicAngle = params.conicAngle ?? GEOM_DEFAULTS.conicAngle;
  const conicCx = params.conicCx ?? GEOM_DEFAULTS.conicCx;
  const conicCy = params.conicCy ?? GEOM_DEFAULTS.conicCy;
  const conicMirror = params.conicMirror ?? GEOM_DEFAULTS.conicMirror;
  const conicBiasA = params.conicBiasA ?? GEOM_DEFAULTS.conicBiasA;
  const conicBiasB = params.conicBiasB ?? GEOM_DEFAULTS.conicBiasB;
  const conicTwist = params.conicTwist ?? GEOM_DEFAULTS.conicTwist;

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
  // Conic at all-default centre + angle + mirror + twist keeps the EXACT legacy expression
  // (no wrap01) so a default-valued params is byte-identical to the pre-gate field.
  const conicLegacy =
    conicCx === 0 && conicCy === 0 && conicAngle === 0 && conicMirror === 0 && conicTwist === 0;
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
        case 'radial': {
          const rx = ux - radialCx;
          const ry = uy - radialCy;
          // The sine swells and pinches the OUTER radius around the circle, so the falloff
          // rings become petals. Multiplying the reach (not the distance) keeps the centre
          // exactly at position 0 whatever the amplitude — a flower, never an off-centre blob.
          const reach = radialWavy
            ? radialSineReach(radialScale, radialSineAmp, radialSineFreq, Math.atan2(ry, rx))
            : radialScale;
          p = bias(clamp01((Math.sqrt(rx * rx + ry * ry) * radialNorm) / Math.max(1e-3, reach)), radialBias);
          break;
        }
        case 'conic': {
          const cdx = ux - conicCx;
          const cdy = uy - conicCy;
          const ang = Math.atan2(cdy, cdx); // -π..π, true angle
          if (conicLegacy) {
            p = bias((ang + Math.PI) / (2 * Math.PI), conicBiasA);
          } else {
            // Twist advances the sweep with the radius → a log spiral (see conicTwist). The
            // term is in TURNS, which is what phi counts, so it simply adds before the wrap.
            const spin = conicTwistTurns(conicTwist, Math.sqrt(cdx * cdx + cdy * cdy));
            const phi = wrap01((ang + conicAngle + Math.PI) / (2 * Math.PI) + spin); // [0,1)
            if (conicMirror <= 0) p = bias(phi, conicBiasA);
            else if (phi < conicSplit) p = bias(phi / conicSplit, conicBiasA); // rising 0→1
            else p = bias(1 - (phi - conicSplit) / conicMirror, conicBiasB); // falling 1→0
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
 * toward `background` where a geometry masks a pixel out.
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
  const bgR = background.r, bgG = background.g, bgB = background.b;
  const out = new Uint8ClampedArray(width * height * 4);
  // Carried error: `cur` for the current row (incl. the horizontal neighbour), `nxt` for the
  // row below. Padded by 1 px each side so the edge taps never go out of bounds. RGB interleaved.
  const cur = new Float32Array((width + 2) * 3);
  const nxt = new Float32Array((width + 2) * 3);
  // The ramp FLATTENED into one Float64Array (r,g,b interleaved). `ramp` is an array of RGB
  // OBJECTS, and reading `.r/.g/.b` off two of them per channel per pixel — 22 M property loads
  // at 2560×1440 — was most of this function's cost. A typed array is one indexed read.
  // The `?? background` fallback the old per-channel lookup did is applied ONCE here, so a
  // short or holey ramp still behaves identically without paying for the check 11 M times.
  // An empty ramp has no colours to blend toward, so every covered pixel IS the background —
  // stated up front because the flattened LUT below has no entry to fall back to (the old
  // per-lookup `?? background` absorbed this case implicitly).
  if (last < 0) {
    for (let o = 0; o < out.length; o += 4) {
      out[o] = bgR;
      out[o + 1] = bgG;
      out[o + 2] = bgB;
      out[o + 3] = 255;
    }
    return out;
  }
  const lut = new Float64Array((last + 1) * 3);
  for (let i = 0; i <= last; i++) {
    const c = ramp[i] ?? background;
    lut[i * 3] = c.r;
    lut[i * 3 + 1] = c.g;
    lut[i * 3 + 2] = c.b;
  }
  for (let y = 0; y < height; y++) {
    nxt.fill(0);
    const ltr = (y & 1) === 0; // serpentine: alternate scan direction to break diffusion "worms"
    const fwd = ltr ? 1 : -1;
    for (let ii = 0; ii < width; ii++) {
      const x = ltr ? ii : width - 1 - ii;
      const i = y * width + x;
      const o = i * 4;
      // Position → ramp index and coverage are properties of the PIXEL, not of the channel.
      // They used to be recomputed inside `target()` for each of r, g and b — three clamps,
      // three multiplies and three floors per pixel where one of each will do.
      const p = pos[i];
      const c = cov[i];
      const cc = c < 0 ? 0 : c > 1 ? 1 : c;
      const t = (p < 0 ? 0 : p > 1 ? 1 : p) * last;
      const i0 = t | 0; // t >= 0 here, so a truncation IS the floor (and is cheaper)
      const f = t - i0;
      const a = i0 * 3;
      const b = (i0 < last ? i0 + 1 : last) * 3;
      const e0 = (x + 1) * 3;
      const e1 = (x + 1 + fwd) * 3;
      const e2 = (x + 1 - fwd) * 3;
      for (let ch = 0; ch < 3; ch++) {
        const ca = lut[a + ch];
        const bgc = ch === 0 ? bgR : ch === 1 ? bgG : bgB;
        const v = bgc + (ca + (lut[b + ch] - ca) * f - bgc) * cc + (dither ? cur[e0 + ch] : 0);
        const q = v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
        out[o + ch] = q;
        if (dither) {
          const e = v - q;
          cur[e1 + ch] += (e * 7) / 16;
          nxt[e2 + ch] += (e * 3) / 16;
          nxt[e0 + ch] += (e * 5) / 16;
          nxt[e1 + ch] += (e * 1) / 16;
        }
      }
      out[o + 3] = 255;
    }
    cur.set(nxt);
  }
  return out;
};

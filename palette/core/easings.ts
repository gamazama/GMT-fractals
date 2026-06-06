/**
 * easings — a small, pure, deterministic library of named easing curves.
 *
 * Each curve is a `(t: number) => number` mapping the unit interval to itself.
 * They are the standard Penner/easings.net set: in/out/inOut variants across
 * Quad/Cubic/Quart/Quint/Sine/Expo/Circ/Back, plus `linear`. 25 curves total.
 *
 * Contract (unit-tested in debug/test-palette-easings.mts):
 *   • EVERY curve passes through the endpoints exactly (to float precision):
 *     f(0) ≈ 0, f(1) ≈ 1 — transcendental curves (Sine) land within ~1e-16.
 *   • The polynomial / trig families (everything except the Back family) are
 *     monotonic non-decreasing on [0,1]. The Back family deliberately overshoots
 *     (anticipation / follow-through) so it is NOT monotonic — see MONOTONIC_EASINGS.
 *
 * Built for ColorBox-style per-channel sweeps (see generatorPipeline.buildColorBoxRamp):
 * pure scalar curves, no DOM/THREE, no state. Kept separate from
 * engine/math/Easing.ts (which is engine-internal tween helpers) so palette/core
 * stays a portable, dependency-free library.
 */

/** Ordered list of every easing name. The ORDER is load-bearing: it backs the
 *  DDFS dropdown option indices in paletteGenerator.ts and the index↔name mapping
 *  in generatorStore. Append new curves at the END to keep saved scenes stable. */
export const EASING_NAMES = [
  'linear',
  'inQuad', 'outQuad', 'inOutQuad',
  'inCubic', 'outCubic', 'inOutCubic',
  'inQuart', 'outQuart', 'inOutQuart',
  'inQuint', 'outQuint', 'inOutQuint',
  'inSine', 'outSine', 'inOutSine',
  'inExpo', 'outExpo', 'inOutExpo',
  'inCirc', 'outCirc', 'inOutCirc',
  'inBack', 'outBack', 'inOutBack',
] as const;

export type EasingName = (typeof EASING_NAMES)[number];

/** The Back family overshoots by construction; every other curve is monotonic. */
export const MONOTONIC_EASINGS: ReadonlySet<EasingName> = new Set(
  EASING_NAMES.filter((n) => !n.includes('Back')),
);

export type EasingFn = (t: number) => number;

// --- Back family constants (easings.net) -----------------------------------------
const C1 = 1.70158;
const C2 = C1 * 1.525;
const C3 = C1 + 1;

const pow = Math.pow;

export const EASINGS: Record<EasingName, EasingFn> = {
  linear: (t) => t,

  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - pow(-2 * t + 2, 2) / 2),

  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - pow(-2 * t + 2, 3) / 2),

  inQuart: (t) => t * t * t * t,
  outQuart: (t) => 1 - pow(1 - t, 4),
  inOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - pow(-2 * t + 2, 4) / 2),

  inQuint: (t) => t * t * t * t * t,
  outQuint: (t) => 1 - pow(1 - t, 5),
  inOutQuint: (t) => (t < 0.5 ? 16 * t * t * t * t * t : 1 - pow(-2 * t + 2, 5) / 2),

  inSine: (t) => 1 - Math.cos((t * Math.PI) / 2),
  outSine: (t) => Math.sin((t * Math.PI) / 2),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,

  inExpo: (t) => (t === 0 ? 0 : pow(2, 10 * t - 10)),
  outExpo: (t) => (t === 1 ? 1 : 1 - pow(2, -10 * t)),
  inOutExpo: (t) =>
    t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? pow(2, 20 * t - 10) / 2 : (2 - pow(2, -20 * t + 10)) / 2,

  inCirc: (t) => 1 - Math.sqrt(1 - t * t),
  outCirc: (t) => Math.sqrt(1 - pow(t - 1, 2)),
  inOutCirc: (t) =>
    t < 0.5
      ? (1 - Math.sqrt(1 - pow(2 * t, 2))) / 2
      : (Math.sqrt(1 - pow(-2 * t + 2, 2)) + 1) / 2,

  inBack: (t) => C3 * t * t * t - C1 * t * t,
  outBack: (t) => 1 + C3 * pow(t - 1, 3) + C1 * pow(t - 1, 2),
  inOutBack: (t) =>
    t < 0.5
      ? (pow(2 * t, 2) * ((C2 + 1) * 2 * t - C2)) / 2
      : (pow(2 * t - 2, 2) * ((C2 + 1) * (2 * t - 2) + C2) + 2) / 2,
};

/** Look up an easing curve by name. Falls back to `linear` for unknown names
 *  (defensive against a stale saved-scene index that points past the list). */
export const getEasing = (name: EasingName): EasingFn => EASINGS[name] ?? EASINGS.linear;

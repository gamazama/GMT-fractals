/**
 * fractalStore — the Fractal mode's transient UI state: the live, animatable colormap-mapping
 * knobs the user drives while the fractal renders (phase / repeats / mapping / animate / deepZoom /
 * iterMul). The gradient itself stays FROZEN (the open-time 256-ramp snapshot colours the fractal);
 * these are the cheap ramp-mapping modifiers on top of it. View centre/zoom live in the renderer
 * (gesture-driven, no React render needed), not here.
 *
 * Like `liquifyStore`, it's a module-level `useSyncExternalStore` holder — shell-scoped,
 * session-only, never persisted. Mode-local (lifted out of `fullscreenStore`, which now holds only
 * cross-mode UI state) so Fractal is a fully self-contained `ownCanvas` module: its `Controls` panel
 * reads/writes ONLY this store, and the mode's `mount()` subscribes to it to push the live knobs to
 * the renderer.
 *
 * @see modes/fractalMode.tsx (the mode that consumes it)
 * @see engine/fractal/FractalColorRenderer.ts (the renderer the knobs drive)
 */

import { useSyncExternalStore } from 'react';

export interface FractalState {
  /** Colormap phase offset along the mapped axis, 0..1 wraps (kernel uGradientPhase). */
  phase: number;
  /** Colormap tiling count across the mapped axis (kernel uGradientRepeat). */
  repeats: number;
  /** What fractal quantity drives the colormap lookup (kernel uColorMapping, 0..13). */
  mapping: number;
  /** Auto-cycle the phase each frame (palette-cycling "see it animate"). */
  animate: boolean;
  /** Deep-zoom (perturbation + LA + AT) path — lets zoom dive far past the f32 quantization
   *  floor. Always on (strictly better than the f32 path; the UI toggle was removed). @see ADR-0066 */
  deepZoom: boolean;
  /** Per-pixel iteration multiplier (1 = auto). Raise to resolve deeper detail. */
  iterMul: number;
}

const INITIAL: FractalState = {
  phase: 0,
  repeats: 1,
  mapping: 0,
  animate: false,
  deepZoom: true,
  iterMul: 1,
};

let state: FractalState = INITIAL;
const listeners = new Set<() => void>();
const emit = (next: Partial<FractalState>): void => {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
};

const subscribe = (l: () => void): (() => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const getSnapshot = (): FractalState => state;

export const getFractalState = (): FractalState => state;
export const subscribeFractal = (l: () => void): (() => void) => subscribe(l);
export const useFractalState = (): FractalState => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

/** Set the live fractal colormap phase (0..1 wraps). */
export const setFractalPhase = (phase: number): void => {
  const p = ((phase % 1) + 1) % 1; // wrap into [0,1)
  if (p !== state.phase) emit({ phase: p });
};

/** Sensible starting "Repeats" per colour-mapping mode — the modes compress or stretch the mapped
 *  t-range very differently, so a value good for one is wrong for another. Switching mode re-seeds
 *  this so you start near a usable tiling instead of carrying the previous mode's (often wildly off)
 *  value. Tune from there with the (log) Repeats slider; modes not listed fall back to 1. */
const DEFAULT_REPEATS_BY_MODE: Record<number, number> = {
  0: 1,    // Iterations
  4: 4,    // Bands
  1: 1,    // Angle
  2: 1,    // Magnitude
  12: 1,   // Potential
  9: 4,    // Stripe
  10: 1,   // Distance
};

/** Set the live fractal colormap tiling (clamped 0.0001..1024, fractional). The useful value varies
 *  widely by mapping mode — some compress the t-range (want large repeats to tile), others stretch
 *  it across the whole screen (want repeats << 1). The slider's soft track is 0.1..16; typing breaks
 *  past it. */
export const setFractalRepeats = (repeats: number): void => {
  if (!Number.isFinite(repeats)) return;
  const r = repeats < 0.0001 ? 0.0001 : repeats > 1024 ? 1024 : repeats;
  if (r !== state.repeats) emit({ repeats: r });
};

/** Set the live fractal colormap mapping mode (kernel colorMapping index). Also re-seeds Repeats to
 *  a sane default for the new mode. */
export const setFractalMapping = (mapping: number): void => {
  const m = mapping | 0;
  if (m === state.mapping) return;
  emit({ mapping: m, repeats: DEFAULT_REPEATS_BY_MODE[m] ?? 1 });
};

/** Toggle phase auto-cycling (palette-cycling animation). */
export const setFractalAnimate = (on: boolean): void => { if (on !== state.animate) emit({ animate: on }); };

/** Toggle the deep-zoom (perturbation) path. */
export const setFractalDeepZoom = (on: boolean): void => { if (on !== state.deepZoom) emit({ deepZoom: on }); };

/** Set the per-pixel iteration multiplier (clamped 0.25..32). */
export const setFractalIterMul = (mul: number): void => {
  if (!Number.isFinite(mul)) return;
  const m = mul < 0.25 ? 0.25 : mul > 32 ? 32 : mul;
  if (m !== state.iterMul) emit({ iterMul: m });
};

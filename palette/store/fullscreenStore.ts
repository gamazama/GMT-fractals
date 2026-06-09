/**
 * fullscreenStore — the W11 fullscreen gradient-config gallery's transient UI state.
 *
 * Shell-scoped + session-only — like `pickerSearch` and the rest of the W4 well /
 * preview state. NOT DDFS, NOT persisted, NOT undoable: the selected geometry, the
 * re-roll seed, and the randomization amount are pure VIEW choices over a gradient,
 * never part of the document. The previewed `config` is a snapshot handed in at open
 * time (from a hero toolbar button or a dropped gradient payload) — the overlay is
 * display-only and never writes it back.
 *
 * Held as a module-level `useSyncExternalStore` holder (not a DDFS slice) for the same
 * reason as `pickerSearch`: two unrelated surfaces drive it (an open affordance on a
 * result hero AND the engine drop-well), and it must survive nothing — a page load
 * resets it to closed. The snapshot OBJECT is replaced only on change so React's
 * `useSyncExternalStore` sees a stable reference between mutations (no render loop).
 *
 * @see palette/core/rampGeometry.ts (the pure mappings this drives)
 */

import { useSyncExternalStore } from 'react';
import type { GradientConfig } from '../../types';
import { mulberry32 } from '../core/rampGeometry';

export interface FullscreenState {
  open: boolean;
  /** The gradient being previewed (snapshot; null while closed). */
  config: GradientConfig | null;
  /** A label for the source hero, shown in the overlay chrome / export name. */
  name: string;
  /** Active fullscreen-mode id (a registry key — `gradient-explorer/fullscreen/modeRegistry`).
   *  A string (not the `GeometryId` union) so parallel mode streams add ids without a store
   *  edit. */
  geom: string;
  /** Re-roll seed for the stochastic geometry (a roll mints a new one). */
  seed: number;
  /** Randomization strength 0..1. */
  amount: number;
  /** Split layout: app on top, fullscreen preview docked on the bottom (the user's
   *  splitscreen). The preview live-follows the last-modified hero while split is on. */
  split: boolean;
  /** Fraction of viewport height given to the TOP (app) region in split layout; the preview
   *  fills the remaining bottom `(1 − splitY)`. */
  splitY: number;
  /** Apply the blue-noise dither render-tail (banding fix). On by default; a toggle lets the
   *  user A/B the banding. */
  dither: boolean;
  // ── Live fractal-mode knobs (geom === 'fractal') ─────────────────────────
  // The gradient itself stays FROZEN (the snapshot's 256-ramp colours the
  // fractal); these are the cheap, live, animatable ramp-mapping modifiers the
  // user drives while the fractal renders. View center/zoom live in the
  // renderer (gesture-driven, no React render needed), not here.
  /** Colormap phase offset along the mapped axis, 0..1 wraps (kernel uGradientPhase). */
  fractalPhase: number;
  /** Colormap tiling count across the mapped axis (kernel uGradientRepeat). */
  fractalRepeats: number;
  /** What fractal quantity drives the colormap lookup (kernel uColorMapping, 0..13). */
  fractalMapping: number;
  /** Auto-cycle the phase each frame (palette-cycling "see it animate"). */
  fractalAnimate: boolean;
  /** Deep-zoom (perturbation + LA + AT) path — lets zoom dive far past the f32
   *  quantization floor. Off by default (shallow f32 covers the common range). */
  fractalDeepZoom: boolean;
  /** Per-pixel iteration multiplier (1 = auto). Raise to resolve deeper detail. */
  fractalIterMul: number;
}

const CLOSED: FullscreenState = {
  open: false,
  config: null,
  name: 'Gradient',
  geom: 'linear',
  seed: 1,
  amount: 0.5,
  split: false,
  splitY: 0.55,
  dither: true,
  fractalPhase: 0,
  fractalRepeats: 1,
  fractalMapping: 0,
  fractalAnimate: false,
  // Deep zoom is the default fractal path — perturbation + LA + nucleus
  // reference is strictly better than the f32 path (no zoom floor, no
  // quantization), so it's always on and the UI toggle was removed. @see ADR-0066
  fractalDeepZoom: true,
  fractalIterMul: 1,
};

let state: FullscreenState = CLOSED;
const listeners = new Set<() => void>();

const emit = (next: FullscreenState): void => {
  state = next;
  listeners.forEach((l) => l());
};

const subscribe = (l: () => void): (() => void) => {
  listeners.add(l);
  return () => { listeners.delete(l); };
};
const getSnapshot = (): FullscreenState => state;

/** Open the fullscreen gallery on a gradient snapshot (preserves the last geometry). */
export const openFullscreen = (config: GradientConfig, name = 'Gradient'): void => {
  emit({ ...state, open: true, config, name });
};

/** Close the gallery (Esc / backdrop / button). Drops the previewed config. */
export const closeFullscreen = (): void => {
  if (!state.open) return;
  emit({ ...state, open: false, config: null });
};

export const setFullscreenGeom = (geom: string): void => {
  if (geom === state.geom) return;
  emit({ ...state, geom });
};

/** Toggle the split layout (app on top, preview docked bottom). */
export const setFullscreenSplit = (on: boolean): void => {
  if (on === state.split) return;
  emit({ ...state, split: on });
};

/** Set the split divider — fraction of viewport height for the TOP (app) region.
 *  Clamped so neither pane collapses (0.2 ≤ splitY ≤ 0.85). */
export const setFullscreenSplitY = (frac: number): void => {
  if (!Number.isFinite(frac)) return;
  const y = frac < 0.2 ? 0.2 : frac > 0.85 ? 0.85 : frac;
  if (y === state.splitY) return;
  emit({ ...state, splitY: y });
};

/** Toggle the blue-noise dither render-tail (A/B the banding fix). */
export const setFullscreenDither = (on: boolean): void => {
  if (on === state.dither) return;
  emit({ ...state, dither: on });
};

/** Re-roll the stochastic field with a fresh seed (kept in [1, 2^31)). */
export const rerollFullscreen = (): void => {
  // Advance to the next seed via the SAME shared PRNG the field uses (not Math.random)
  // — one determinism story, and the field for any given seed stays reproducible.
  const next = Math.floor(mulberry32(state.seed)() * 0x7fffffff) || 1;
  emit({ ...state, seed: next });
};

export const setFullscreenAmount = (amount: number): void => {
  const a = amount < 0 ? 0 : amount > 1 ? 1 : amount;
  if (a === state.amount) return;
  emit({ ...state, amount: a });
};

/** Set the live fractal colormap phase (0..1 wraps). */
export const setFractalPhase = (phase: number): void => {
  const p = ((phase % 1) + 1) % 1; // wrap into [0,1)
  if (p === state.fractalPhase) return;
  emit({ ...state, fractalPhase: p });
};

/** Set the live fractal colormap tiling (clamped 0.0001..1024, fractional). The
 *  useful value varies widely by mapping mode — some modes compress the t-range
 *  (want large repeats to tile), others stretch it across the whole screen (want
 *  repeats << 1). The slider's soft track is 0.1..16; typing breaks past it. */
export const setFractalRepeats = (repeats: number): void => {
  if (!Number.isFinite(repeats)) return;
  const r = repeats < 0.0001 ? 0.0001 : repeats > 1024 ? 1024 : repeats;
  if (r === state.fractalRepeats) return;
  emit({ ...state, fractalRepeats: r });
};

/** Sensible starting "Repeats" per colour-mapping mode — the modes compress or
 *  stretch the mapped t-range very differently, so a value good for one is wrong
 *  for another. Switching mode re-seeds this so you start near a usable tiling
 *  instead of carrying the previous mode's (often wildly off) value. Tune from
 *  there with the (log) Repeats slider; modes not listed fall back to 1. */
const DEFAULT_REPEATS_BY_MODE: Record<number, number> = {
  0: 1,    // Iterations
  4: 4,    // Bands
  1: 1,    // Angle
  2: 1,    // Magnitude
  12: 1,   // Potential
  9: 4,    // Stripe
  10: 1,   // Distance
};

/** Set the live fractal colormap mapping mode (kernel colorMapping index). Also
 *  re-seeds Repeats to a sane default for the new mode. */
export const setFractalMapping = (mapping: number): void => {
  const m = mapping | 0;
  if (m === state.fractalMapping) return;
  const repeats = DEFAULT_REPEATS_BY_MODE[m] ?? 1;
  emit({ ...state, fractalMapping: m, fractalRepeats: repeats });
};

/** Toggle phase auto-cycling (palette-cycling animation). */
export const setFractalAnimate = (on: boolean): void => {
  if (on === state.fractalAnimate) return;
  emit({ ...state, fractalAnimate: on });
};

/** Toggle the deep-zoom (perturbation) path. */
export const setFractalDeepZoom = (on: boolean): void => {
  if (on === state.fractalDeepZoom) return;
  emit({ ...state, fractalDeepZoom: on });
};

/** Set the per-pixel iteration multiplier (clamped 0.25..32). */
export const setFractalIterMul = (mul: number): void => {
  if (!Number.isFinite(mul)) return;
  const m = mul < 0.25 ? 0.25 : mul > 32 ? 32 : mul;
  if (m === state.fractalIterMul) return;
  emit({ ...state, fractalIterMul: m });
};

/** Subscribe a component to the whole fullscreen view state. */
export const useFullscreenState = (): FullscreenState =>
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

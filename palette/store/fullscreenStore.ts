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
  // The live fractal-mode knobs (phase / repeats / mapping / animate / deepZoom / iterMul) live in
  // the mode-local `modes/fractal/fractalStore`, not here — `fullscreenStore` holds only cross-mode
  // view state.
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

/** Replace the previewed snapshot in place (no open/geom/split change). Used when leaving split
 *  to PROMOTE the live gradient you were viewing into the fullscreen snapshot, so switching
 *  split→fullscreen keeps that gradient instead of snapping back to the open-time one. */
export const setFullscreenConfig = (config: GradientConfig, name: string = state.name): void => {
  emit({ ...state, config, name });
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

/** Subscribe a component to the whole fullscreen view state. */
export const useFullscreenState = (): FullscreenState =>
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

/** Non-hook read of the current state — for imperative consumers (an `ownCanvas` mode's RAF loop /
 *  store-subscription that pushes live knobs to its renderer without a React render). */
export const getFullscreenState = (): FullscreenState => state;

/** Non-hook subscription — an `ownCanvas` mode's `mount()` subscribes to push the live knobs it
 *  reads (e.g. the fractal's phase/repeats/mapping) to its renderer. Returns an unsubscribe fn. */
export const subscribeFullscreen = (l: () => void): (() => void) => subscribe(l);

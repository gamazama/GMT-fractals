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
import { mulberry32, type GeometryParams } from '../core/rampGeometry';

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
  /** The flat-optional geometry shape params driven by the ON-SCREEN handles (radial centre,
   *  conic angle, arch radius/width/position/span, s-curve shape). ADDITIVE over the gate:
   *  an UNSET key resolves to its `GEOM_DEFAULTS` entry inside the pure mappers, so `{}`
   *  renders byte-identically to the pre-handles overlay (the determinism pin). `amount` /
   *  `seed` stay as the dedicated fields above (the random mode's minimal controls). */
  geomParams: GeometryParams;
  /** On-screen geometry handles master toggle (the toolbar force-hide). The layer also
   *  auto-fades on idle independently of this. */
  handles: boolean;
  /** True while a handle drag is in flight — the overlay renders at a reduced cap during
   *  interaction (cheap, responsive) and snaps back to full resolution on release. */
  interacting: boolean;
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
  geomParams: {},
  handles: true,
  interacting: false,
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

/** The geometry shape params a handle may write. `amount`/`seed` are excluded
 *  STRUCTURALLY: the overlay's ctx spread gives the dedicated `fs.amount`/`fs.seed` fields
 *  precedence, so a geomParams write to them would be a silent no-op. */
export type HandleParamKey = Exclude<keyof GeometryParams, 'amount' | 'seed'>;

/** Set geometry shape params in ONE emit (an on-screen handle drag writes here; the overlay
 *  threads `geomParams` into the render ctx, so the pure mappers see it from the OUTSIDE).
 *  Batched so a 2-axis drag (radial centre) is a single state transition — no torn
 *  cx-moved/cy-stale frame for synchronous subscribers, one listener sweep per move. */
export const setFullscreenGeomParams = (patch: Partial<Record<HandleParamKey, number>>): void => {
  let next: GeometryParams | null = null;
  for (const [k, v] of Object.entries(patch) as [HandleParamKey, number][]) {
    if (!Number.isFinite(v) || state.geomParams[k] === v) continue;
    next = next ?? { ...state.geomParams };
    next[k] = v;
  }
  if (next) emit({ ...state, geomParams: next });
};

/** Single-param convenience over {@link setFullscreenGeomParams}. */
export const setFullscreenGeomParam = (key: HandleParamKey, value: number): void => {
  setFullscreenGeomParams({ [key]: value });
};

/** Clear geometry shape params back to their `GEOM_DEFAULTS` (an unset key IS the default).
 *  With `keys`, clears only those (a handle's double-click reset); without, clears all. */
export const resetFullscreenGeomParams = (keys?: readonly HandleParamKey[]): void => {
  const ks = keys ?? (Object.keys(state.geomParams) as HandleParamKey[]);
  if (!ks.some((k) => k in state.geomParams)) return;
  const next = { ...state.geomParams };
  for (const k of ks) delete next[k];
  emit({ ...state, geomParams: next });
};

/** Master show/hide for the on-screen geometry handles (the toolbar toggle). */
export const setFullscreenHandles = (on: boolean): void => {
  if (on === state.handles) return;
  emit({ ...state, handles: on });
};

/** Flag a handle drag in flight (the overlay drops to a reduced render cap while true). */
export const setFullscreenInteracting = (on: boolean): void => {
  if (on === state.interacting) return;
  emit({ ...state, interacting: on });
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

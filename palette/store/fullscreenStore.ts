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
import { mulberry32, type GeometryId } from '../core/rampGeometry';

export interface FullscreenState {
  open: boolean;
  /** The gradient being previewed (snapshot; null while closed). */
  config: GradientConfig | null;
  /** A label for the source hero, shown in the overlay chrome / export name. */
  name: string;
  geom: GeometryId;
  /** Re-roll seed for the stochastic geometry (a roll mints a new one). */
  seed: number;
  /** Randomization strength 0..1. */
  amount: number;
}

const CLOSED: FullscreenState = {
  open: false,
  config: null,
  name: 'Gradient',
  geom: 'linear',
  seed: 1,
  amount: 0.5,
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

export const setFullscreenGeom = (geom: GeometryId): void => {
  if (geom === state.geom) return;
  emit({ ...state, geom });
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

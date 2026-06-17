/**
 * parallaxStore — the Parallax mode's transient UI state (parallax depth amount, stir-brush
 * size, colour mapping, particle density, scatter seed).
 *
 * Like `liquifyStore`, it's a module-level `useSyncExternalStore` holder — shell-scoped,
 * session-only, never persisted. Mode-local (not folded into `fullscreenStore`) so Parallax stays
 * a fully self-contained `ownCanvas` module: its `Controls` panel reads/writes ONLY this store,
 * and the mode's `mount()` subscribes to it to drive the field + renderer.
 *
 * @see modes/parallaxMode.tsx (the mode that consumes it)
 */

import { useSyncExternalStore } from 'react';

/** Colour mapping: 'flow' = LUT coord follows x (the gradient strip, in depth), 'bloom' =
 *  radial (first stop blooms at the centre), 'depth' = far→near, 'mix' = random scatter. */
export type ParallaxColorBy = 'flow' | 'bloom' | 'depth' | 'mix';
export type ParallaxDensity = 'low' | 'med' | 'high';

/** Particle count per density tier (CPU sim + one instanced draw — all tiers are 60fps-cheap;
 *  the tiers trade sparse-and-airy against dense-and-nebular, not performance). */
export const PARALLAX_N: Record<ParallaxDensity, number> = { low: 2500, med: 6000, high: 12000 };

export interface ParallaxState {
  /** Parallax amount 0..1 — how far the camera peeks as the pointer moves (0 = flat). */
  depth: number;
  /** Stir-brush radius as a fraction of the short canvas side. */
  stir: number;
  /** Colour mapping (see {@link ParallaxColorBy}) — spatial 'flow' is the default: it makes
   *  the field READ as the user's gradient at a glance, not random confetti. */
  colorBy: ParallaxColorBy;
  /** Particle density tier. */
  density: ParallaxDensity;
  /** Scatter seed — bump (🎲 Shuffle) re-scatters the field into a fresh composition. */
  seed: number;
}

const INITIAL: ParallaxState = {
  depth: 0.6,
  stir: 0.16,
  colorBy: 'flow',
  density: 'med',
  seed: 1,
};

let state: ParallaxState = INITIAL;
const listeners = new Set<() => void>();
const emit = (next: Partial<ParallaxState>): void => {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
};

const subscribe = (l: () => void): (() => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const getSnapshot = (): ParallaxState => state;

export const getParallaxState = (): ParallaxState => state;
export const subscribeParallax = (l: () => void): (() => void) => subscribe(l);
export const useParallaxState = (): ParallaxState => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

export const setParallaxDepth = (depth: number): void => {
  const d = depth < 0 ? 0 : depth > 1 ? 1 : depth;
  if (d !== state.depth) emit({ depth: d });
};
export const setParallaxStir = (stir: number): void => {
  const s = stir < 0.05 ? 0.05 : stir > 0.4 ? 0.4 : stir;
  if (s !== state.stir) emit({ stir: s });
};
export const setParallaxColorBy = (colorBy: ParallaxColorBy): void => { if (colorBy !== state.colorBy) emit({ colorBy }); };
export const setParallaxDensity = (density: ParallaxDensity): void => { if (density !== state.density) emit({ density }); };
export const shuffleParallax = (): void => emit({ seed: state.seed + 1 });

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
import { createObservableState } from '../../../../store/createObservableState';

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

const store = createObservableState<ParallaxState>(INITIAL);

export const getParallaxState = store.get;
export const subscribeParallax = store.subscribe;
export const useParallaxState = (): ParallaxState => useSyncExternalStore(store.subscribe, store.get, store.get);

export const setParallaxDepth = (depth: number): void => {
  const d = depth < 0 ? 0 : depth > 1 ? 1 : depth;
  if (d !== store.get().depth) store.set({ depth: d });
};
export const setParallaxStir = (stir: number): void => {
  const s = stir < 0.05 ? 0.05 : stir > 0.4 ? 0.4 : stir;
  if (s !== store.get().stir) store.set({ stir: s });
};
export const setParallaxColorBy = (colorBy: ParallaxColorBy): void => { if (colorBy !== store.get().colorBy) store.set({ colorBy }); };
export const setParallaxDensity = (density: ParallaxDensity): void => { if (density !== store.get().density) store.set({ density }); };
export const shuffleParallax = (): void => store.set({ seed: store.get().seed + 1 });

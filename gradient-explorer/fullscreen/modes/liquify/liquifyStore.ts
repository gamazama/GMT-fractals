/**
 * liquifyStore — the Liquify mode's transient UI state (active brush, brush size/strength, the
 * optional-physics toggle + its sliders, mesh density).
 *
 * Like `fullscreenStore`, it's a module-level `useSyncExternalStore` holder — shell-scoped,
 * session-only, never persisted. Mode-local (not folded into `fullscreenStore`) so Liquify stays a
 * fully self-contained `ownCanvas` module: its `Controls` panel reads/writes ONLY this store, and
 * the mode's `mount()` subscribes to it to drive the soft body. Physics is **OFF by default** (the
 * art-direction contract — the user's sculpt is authoritative; physics is opt-in).
 *
 * @see modes/liquifyMode.tsx (the mode that consumes it)
 */

import { useSyncExternalStore } from 'react';
import { createObservableState } from '../../../../store/createObservableState';
import type { BrushType } from './LiquifyMesh';

export type LiquifyDensity = 'low' | 'med' | 'high';

/** Verts-per-side for each density tier (perf mitigation — CPU solve scales with vert count). */
export const DENSITY_N: Record<LiquifyDensity, number> = { low: 64, med: 96, high: 128 };

export interface LiquifyState {
  brush: BrushType;
  /** Brush radius as a fraction of the square mesh side. */
  radius: number;
  /** Brush strength 0..1. */
  strength: number;
  /** Optional physics — OFF by default (the sculpt is authoritative). */
  physics: boolean;
  /** XPBD compliance ↔ stiffness: 0 floppy/slow-return, 1 rigid (snaps to the sculpt). */
  stiffness: number;
  /** Velocity damping 0 lively .. 1 heavily damped. */
  damping: number;
  /** Continuous Taubin relaxation of the warp layer (0 = off) — gentle global de-noising. */
  smooth: number;
  /** Mesh density tier (a remount/rebuild on change). */
  density: LiquifyDensity;
  /** Smooth render subdivision (Catmull-Rom) — decouples render resolution from the sim grid so
   *  heavy warps don't facet into "poly soup". On by default; off = the raw flat grid (for A/B). */
  subdiv: boolean;
}

const INITIAL: LiquifyState = {
  brush: 'grab',
  radius: 0.14,
  strength: 0.6,
  physics: false,
  stiffness: 0.6,
  damping: 0.5,
  smooth: 0,
  density: 'med',
  subdiv: true,
};

const store = createObservableState<LiquifyState>(INITIAL);

export const getLiquifyState = store.get;
export const subscribeLiquify = store.subscribe;
export const useLiquifyState = (): LiquifyState => useSyncExternalStore(store.subscribe, store.get, store.get);

export const setLiquifyBrush = (brush: BrushType): void => { if (brush !== store.get().brush) store.set({ brush }); };
export const setLiquifyRadius = (radius: number): void => {
  const r = radius < 0.02 ? 0.02 : radius > 0.5 ? 0.5 : radius;
  if (r !== store.get().radius) store.set({ radius: r });
};
export const setLiquifyStrength = (strength: number): void => {
  const s = strength < 0 ? 0 : strength > 1 ? 1 : strength;
  if (s !== store.get().strength) store.set({ strength: s });
};
export const setLiquifyPhysics = (physics: boolean): void => { if (physics !== store.get().physics) store.set({ physics }); };
export const setLiquifyStiffness = (stiffness: number): void => {
  const s = stiffness < 0 ? 0 : stiffness > 1 ? 1 : stiffness;
  if (s !== store.get().stiffness) store.set({ stiffness: s });
};
export const setLiquifyDamping = (damping: number): void => {
  const d = damping < 0 ? 0 : damping > 1 ? 1 : damping;
  if (d !== store.get().damping) store.set({ damping: d });
};
export const setLiquifySmooth = (smooth: number): void => {
  const s = smooth < 0 ? 0 : smooth > 1 ? 1 : smooth;
  if (s !== store.get().smooth) store.set({ smooth: s });
};
export const setLiquifyDensity = (density: LiquifyDensity): void => { if (density !== store.get().density) store.set({ density }); };
export const setLiquifySubdiv = (subdiv: boolean): void => { if (subdiv !== store.get().subdiv) store.set({ subdiv }); };

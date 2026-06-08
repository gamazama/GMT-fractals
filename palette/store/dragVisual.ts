/**
 * dragVisual — the SOURCE rect of the gradient currently being dragged, captured at dragstart
 * so the cursor-following avatar (GradientDropLayer's DragAvatar) can MORPH out of the grabbed
 * swatch / hero rather than popping in at the cursor. Transient (module-level, no React / no
 * persist), like pickerSearch: set on dragstart, read by the avatar on mount, cleared on
 * drag-end.
 *
 * @see gradient-explorer/GradientDropLayer.tsx (the avatar that consumes this)
 */

import { useSyncExternalStore } from 'react';

export interface DragRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

let origin: DragRect | null = null;

/** Record the grabbed element's rect (call in `onDragStart`). null to clear. */
export const setDragOrigin = (rect: DragRect | null): void => {
  origin = rect;
};

export const getDragOrigin = (): DragRect | null => origin;

// --- Landing — the reverse of the take-off morph: when a gradient is APPLIED to a target,
// a fading copy flies from where it was (the avatar / cursor) INTO the destination rect.
// Reactive (a standalone layer renders it), unlike the imperative origin above.

export interface Landing {
  from: DragRect;
  to: DragRect;
  ramp: Uint8Array;
  /** Bumped per landing so the renderer remounts the animation from t=0. */
  id: number;
}

let landing: Landing | null = null;
let landingSeq = 0;
const listeners = new Set<() => void>();
const subscribe = (l: () => void): (() => void) => {
  listeners.add(l);
  return () => { listeners.delete(l); };
};

/** Start a landing animation (a gradient settling into the target it was applied to). */
export const triggerLanding = (from: DragRect, to: DragRect, ramp: Uint8Array): void => {
  landing = { from, to, ramp, id: ++landingSeq };
  listeners.forEach((l) => l());
};

/** Clear a landing once its animation finishes (id-guarded so a newer one isn't dropped). */
export const clearLanding = (id: number): void => {
  if (landing && landing.id === id) {
    landing = null;
    listeners.forEach((l) => l());
  }
};

export const useLanding = (): Landing | null =>
  useSyncExternalStore(subscribe, () => landing, () => landing);

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
  cancel = null; // an in-hand session ends EITHER by landing or cancelling — never both
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

// --- Cancel — the un-landing: when an in-hand pick is abandoned with NO destination
// (empty-wall click / Esc / click-away / drop-on-nothing), the floating avatar wipes itself
// off in place rather than just popping out — alpha masked away left→right while the ramp
// shrinks on X. Mirrors Landing (separate reactive one-shot, same listeners).

export interface Cancel {
  /** Where the floating avatar was at the moment the pick was abandoned. */
  at: DragRect;
  ramp: Uint8Array;
  /** Bumped per cancel so the renderer remounts the animation from t=0. */
  id: number;
}

let cancel: Cancel | null = null;
let cancelSeq = 0;

/** Start a cancel wipe (an in-hand pick let go without a landing). */
export const triggerCancel = (at: DragRect, ramp: Uint8Array): void => {
  cancel = { at, ramp, id: ++cancelSeq };
  landing = null; // same exclusivity as triggerLanding — only one one-shot at a time
  listeners.forEach((l) => l());
};

/** Clear a cancel once its animation finishes (id-guarded so a newer one isn't dropped). */
export const clearCancel = (id: number): void => {
  if (cancel && cancel.id === id) {
    cancel = null;
    listeners.forEach((l) => l());
  }
};

export const useCancel = (): Cancel | null =>
  useSyncExternalStore(subscribe, () => cancel, () => cancel);

// --- Landed signal — "the in-hand pick was CONSUMED by a destination, so do NOT play the
// cancel wipe on teardown." Set by every place that accepts the pick: the dock targets
// (GradientDropLayer.handleSent) AND the Favients panel's OWN drop (insert / reorder /
// group), whose drop `stopPropagation`s and so never reaches the dock's apply path. A plain
// module flag (not reactive) — the teardown reads-and-clears it. NOT part of Cancel/Landing
// because it only gates them.

let landed = false;

/** Note that a destination consumed the in-hand pick (a dock apply or a Favients drop). */
export const markPickLanded = (): void => {
  landed = true;
};

/** Read-and-clear whether the in-hand pick was consumed (so the teardown can skip the wipe). */
export const consumePickLanded = (): boolean => {
  const v = landed;
  landed = false;
  return v;
};

/** Discard any stale landed signal at the start of a fresh in-hand session (≠ the teardown
 *  read above — same effect, but the intent is "reset", not "decide"). */
export const clearPickLanded = (): void => {
  landed = false;
};

// --- Native (custom-avatar) drag in flight — a SYNCHRONOUS signal set the instant a drag
// starts (in beginCustomAvatarDrag, the one chokepoint every custom-avatar drag calls),
// independent of the dragenter/dragleave DEPTH counting useDragInFlight relies on. That depth
// counting is FRAGILE while a drop surface mounts/unmounts children mid-drag — the Favients
// shelf inserts placeholders and the dragged swatch unmounts, so enter/leave can imbalance and
// momentarily reset inFlight, which flips the Favients passthrough off and lets the drop be
// intercepted as a flat-add. dragstart→dragend is exactly one-each, so this never desyncs.
// Consumed by the avatar (GradientDropLayer) AND the dropbox/passthrough layer
// (DropTargetLayer) so both engage the moment a drag starts and stay engaged for its whole
// life.
//
// Clearing: `drop` / `dragend` fire ONLY at a real drag-end, so they clear immediately. But
// neither is guaranteed — a Favients drop `stopPropagation`s (so the window `drop` is skipped)
// and the source swatch is unmounted mid-reorder (so Chrome may never fire `dragend`). The
// backstop for that is `mousemove`: it is suppressed while a drag is genuinely moving, so the
// first one we see means the drag ended. The catch is FIREFOX — on a FAST drag it interleaves
// stray `mousemove`s BETWEEN `dragover`s (Chrome fully suppresses them), which naively read as
// "ended" and cancel the drag the instant it starts. The robust distinguisher: during a live
// drag `dragover` streams continuously, so a `mousemove` only means "ended" when NO `dragover`
// has fired in the last grace window. `beginNativeDrag` seeds the timestamp so the dragstart→
// first-dragover gap is covered too. (Sibling of hooks/useDragEndSafetyNet — same mousemove-
// means-ended heuristic, but module-level and dragover-grace-gated; keep the two in sync.)

const DRAG_LIVE_GRACE_MS = 200;
let nativeDrag = false;
let lastDragOver = 0;

const onNativeDragOver = (): void => {
  lastDragOver = performance.now();
};

const onNativeDragMaybeEnd = (): void => {
  // A leaked mousemove during a live drag always sits within a grace window of a dragover;
  // only once dragover has stopped (the drag really ended) does this clear.
  if (performance.now() - lastDragOver > DRAG_LIVE_GRACE_MS) clearNativeDrag();
};

const clearNativeDrag = (): void => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('drop', clearNativeDrag, false);
    window.removeEventListener('dragend', clearNativeDrag, true);
    window.removeEventListener('dragover', onNativeDragOver, true);
    window.removeEventListener('mousemove', onNativeDragMaybeEnd, true);
  }
  if (nativeDrag) {
    nativeDrag = false;
    listeners.forEach((l) => l());
  }
};

/** Mark that a custom-avatar drag just started — call synchronously in onDragStart (it is
 *  invoked from beginCustomAvatarDrag so every source is covered). Idempotent; wires its own
 *  reliable end-listeners so callers never have to pair it with an explicit end. */
export const beginNativeDrag = (): void => {
  if (nativeDrag) return;
  if (typeof window !== 'undefined') {
    lastDragOver = performance.now(); // seed: covers the dragstart→first-dragover gap
    // drop in BUBBLE (so a target/panel's own onDrop runs first); dragend/dragover in CAPTURE.
    window.addEventListener('drop', clearNativeDrag, false);
    window.addEventListener('dragend', clearNativeDrag, true);
    window.addEventListener('dragover', onNativeDragOver, true);
    window.addEventListener('mousemove', onNativeDragMaybeEnd, true);
  }
  nativeDrag = true;
  listeners.forEach((l) => l());
};

export const useNativeDragging = (): boolean =>
  useSyncExternalStore(subscribe, () => nativeDrag, () => nativeDrag);

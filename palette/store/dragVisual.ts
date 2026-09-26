/**
 * dragVisual — the transient state a gradient drag's cursor avatar reads: WHAT is in flight
 * (the payload) and WHETHER a custom-avatar drag is live (the in-flight flag). Module-level,
 * no React state and no persistence, like pickerSearch: set at dragstart, cleared at drag-end.
 *
 * SEAMS. Written by `palette/core/favientDnd.ts` — `setFavientDrag` fills the payload on every
 * gradient drag in the suite, `beginCustomAvatarDrag` raises the flag — and by
 * `palette/core/pointerGradientDrag.ts`, the mouse-driven drag. Read through `useDragPayload`
 * and `useNativeDragging` by `palette/components/GradientDragAvatar.tsx` (the chip at the
 * cursor) and `gradient-explorer/v2/SetRail.tsx` (whose trash shows only while an existing
 * favourite is in flight).
 *
 * PITFALLS. The flag clears ITSELF — on drop, on dragend, or on a mousemove with no dragover
 * inside `DRAG_LIVE_GRACE_MS` — so a caller never pairs `beginNativeDrag` with an end, and
 * clearing it clears the payload too, which is what takes the avatar away. Read the note above
 * `DRAG_LIVE_GRACE_MS` before touching that heuristic: Firefox leaks mousemoves into a fast drag.
 *
 * The first Explorer shell's source-rect morph and its landing / cancel animations also lived
 * here. Their readers went with that shell on 2026-09-16 and their state on 2026-09-26;
 * `setDragOrigin` and `markPickLanded` at the bottom are no-ops kept only for the calls still in
 * `palette/components/FavientsPanel.tsx`.
 *
 * @see palette/components/GradientDragAvatar.tsx (the small standalone avatar GE v2 mounts)
 */

import { useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();
const subscribe = (l: () => void): (() => void) => {
  listeners.add(l);
  return () => { listeners.delete(l); };
};

// --- WHAT is being dragged. Set by `setFavientDrag`, the one call every gradient drag in the
// suite makes, so an avatar can paint the ramp without asking the DataTransfer (whose DATA is
// unreadable during dragover — only its types are exposed while a drag is in flight) and
// without piggy-backing on the hero SELECTION, which would turn a drag into a pick.
//
// Added 2026-09-09, because GE v2 mounts no `GradientDropLayer`: `beginCustomAvatarDrag`
// suppresses the native drag image on the promise that an avatar replaces it, and in v2
// nothing did — so every gradient drag in that shell was invisible while in flight, which
// reads as "dragging does not work" (owner, testing the live shell).

export interface DragPayloadPeek {
  config: unknown;
  name?: string;
  /** Set only when an EXISTING favourite is in flight — what makes it removable. */
  favId?: string;
  /** How many gradients are in flight (a multi-drag); absent or 1 for the usual case. */
  count?: number;
}

let dragPayload: DragPayloadPeek | null = null;

/** What is in flight (call from `setFavientDrag`). null to clear. */
export const setDragPayload = (p: DragPayloadPeek | null): void => {
  dragPayload = p;
  listeners.forEach((l) => l());
};

/** Subscribe to what is being dragged (null between drags). */
export const useDragPayload = (): DragPayloadPeek | null =>
  useSyncExternalStore(subscribe, () => dragPayload, () => dragPayload);

// --- Native (custom-avatar) drag in flight — a SYNCHRONOUS signal set the instant a drag
// starts (in beginCustomAvatarDrag, the one chokepoint every custom-avatar drag calls),
// independent of dragenter/dragleave DEPTH counting (what the first Explorer shell's
// useDragInFlight did). That depth counting is FRAGILE while a drop surface mounts/unmounts
// children mid-drag — the Favients shelf inserts placeholders and the dragged swatch unmounts,
// so enter/leave can imbalance and momentarily read as "no drag". dragstart→dragend is exactly
// one-each, so this never desyncs. Consumed by the avatar (GradientDragAvatar) and the set rail
// (SetRail), so both engage the moment a drag starts and stay engaged for its whole life.
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
    dragPayload = null; // nothing is in flight any more — the avatar goes with it
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

// --- Retired 2026-09-26. Nothing reads what these used to record (see the header).

/** @deprecated a no-op: it recorded the grabbed element's rect for an avatar morph nothing
 *  draws any more. Delete it with its calls in `palette/components/FavientsPanel.tsx`. */
export const setDragOrigin = (_rect: { left: number; top: number; width: number; height: number } | null): void => {};

/** @deprecated a no-op: nothing reads the "pick landed" signal since the cancel wipe went.
 *  Delete it with its call in `palette/components/FavientsPanel.tsx`. */
export const markPickLanded = (): void => {};

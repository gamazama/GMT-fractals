/**
 * paramUndoBracket — bracket a non-DDFS palette gesture into ONE engine PARAM-undo
 * transaction.
 *
 * The palette's heavy authoring stores live OUTSIDE the engine store (the generator's
 * curve Track[]/slots, the favients shelf), so they ride Ctrl+Z via a registered
 * history provider (registerHistoryProvider): opening a bracket snapshots every
 * provider, closing it diffs + pushes a single entry. The engine-store cast lives
 * here in ONE place so generatorStore (genEdit*) and FavientsPanel (favEdit*) can't
 * drift if beginParamTransaction/endParamTransaction is ever renamed.
 *
 * The lookup is optional-chained: hosts that never install the history slice (none
 * today) get a silent no-op rather than a crash.
 *
 * @see store/slices/historySlice.ts (registerHistoryProvider + begin/endParamTransaction)
 */

import { useEngineStore } from '../../store/engineStore';

const eng = () =>
  useEngineStore.getState() as unknown as { beginParamTransaction?: () => void; endParamTransaction?: () => void };

/** Open an undo bracket (snapshot every history provider + the param slices). */
/**
 * HOW MANY DRAGS ARE OPEN (2026-09-11). Every slider in the suite brackets its drag with
 * `paramEditStart` / `paramEditEnd` for undo, so the pair is also the one honest signal
 * that "a value is being scrubbed right now". `useWorkingDerived` reads it to HOLD the
 * stop fit during a drag: the ramp keeps updating every frame, the knots (a fit over 256
 * texels, the expensive half of a derive) wait for the release (owner, 2026-09-11: "the
 * gradient can update, but we don't need all the stops' knots to update during a drag").
 * A depth, not a boolean, because nested one-shot `paramEdit`s inside a drag must not
 * end it early.
 */
let dragDepth = 0;
const dragListeners = new Set<() => void>();
const notifyDrag = () => dragListeners.forEach((l) => l());
/** True while at least one param bracket is open (a slider drag, typically). */
export const isParamDragging = (): boolean => dragDepth > 0;
export const subscribeParamDragging = (l: () => void): (() => void) => { dragListeners.add(l); return () => { dragListeners.delete(l); }; };

export const paramEditStart = (): void => { dragDepth++; if (dragDepth === 1) notifyDrag(); eng().beginParamTransaction?.(); };
/** Close the bracket — diff against the snapshot, push one entry if anything changed. */
export const paramEditEnd = (): void => { eng().endParamTransaction?.(); dragDepth = Math.max(0, dragDepth - 1); if (dragDepth === 0) notifyDrag(); };
/** Discrete one-shot: bracket a synchronous mutation as a single undo entry. */
export const paramEdit = (fn: () => void): void => {
  paramEditStart();
  fn();
  paramEditEnd();
};

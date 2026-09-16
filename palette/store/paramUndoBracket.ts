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
  useEngineStore.getState() as unknown as {
    beginParamTransaction?: () => void;
    endParamTransaction?: () => void;
    /** Non-null while a param transaction is open (historySlice sets it on begin, clears it on end). */
    interactionSnapshot?: unknown;
  };

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

/**
 * Open an undo bracket (snapshot every history provider + the param slices).
 *
 * A START INSIDE AN OPEN TRANSACTION DOES NOT RE-SNAPSHOT (2026-09-16). The engine holds ONE
 * snapshot, and `beginParamTransaction` overwrites it, so a nested start used to move the
 * "before" of the whole bracket to the moment the inner gesture began. The case that found it:
 * the Curves wave holds one bracket open from ARM to ✓ / ✕ while its preview writes into the
 * track, and closing the face with it armed bakes through `beginEdit` → `paramEdit` — whose
 * start re-snapshotted the PREVIEW, so the one entry's Ctrl+Z landed on the unbaked wave and
 * the pre-arm curves were unreachable. Now the outermost open snapshot is kept.
 *
 * Only the START changed. Every end still ends, so the first end inside a nest pushes the
 * entry (diffed from the outermost start) and closes it, exactly as before; a later outer end
 * finds nothing open and no-ops. That is deliberately not "only the outermost end ends": the
 * test is the engine's own open snapshot, not `dragDepth`, so a start whose end never came
 * (an unmount mid-press) cannot wedge undo shut — the next end still pushes and closes. A
 * gesture that starts with nothing open — every single-level slider, knot, or discrete edit —
 * takes exactly the path it took before.
 *
 * Not covered: engine-level callers (`handleInteractionStart` in the DDFS sliders) still call
 * `beginParamTransaction` directly and still overwrite an open palette bracket.
 *
 * @invariant arm → drags → close the Curves face (it bakes) is ONE undo entry whose Ctrl+Z
 *   gives back the exact pre-arm ramp — proven by: npm run smoke:ge-wave ("[8] arm → drags →
 *   close the face (bakes) → one entry, and one Ctrl+Z restores the pre-arm ramp"). Falsified
 *   2026-09-16 by dropping the `interactionSnapshot` test: [8] red alone.
 */
export const paramEditStart = (): void => {
  dragDepth++;
  if (dragDepth === 1) notifyDrag();
  const e = eng();
  if (e.interactionSnapshot) return; // nested: keep the outermost "before" (see above)
  e.beginParamTransaction?.();
};
/** Close the bracket — diff against the snapshot, push one entry if anything changed. */
export const paramEditEnd = (): void => { eng().endParamTransaction?.(); dragDepth = Math.max(0, dragDepth - 1); if (dragDepth === 0) notifyDrag(); };
/** Discrete one-shot: bracket a synchronous mutation as a single undo entry. */
export const paramEdit = (fn: () => void): void => {
  paramEditStart();
  fn();
  paramEditEnd();
};

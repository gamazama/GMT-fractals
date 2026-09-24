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
 * takes exactly the path it took before. The one exception is inside a `paramGroup` (below): a
 * synchronous group holds inner ends until it returns.
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
/** How many `paramGroup`s are running right now (see below). Only ever > 0 synchronously. */
let groupDepth = 0;
/** Close the bracket — diff against the snapshot, push one entry if anything changed. Inside a
 *  `paramGroup` it only unwinds the depth: the group's own end is the one that pushes. */
export const paramEditEnd = (): void => {
  if (groupDepth === 0) eng().endParamTransaction?.();
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) notifyDrag();
};
/** Discrete one-shot: bracket a synchronous mutation as a single undo entry. */
export const paramEdit = (fn: () => void): void => {
  paramEditStart();
  fn();
  paramEditEnd();
};

/**
 * ONE GESTURE THAT CALLS SEVERAL SELF-BRACKETING ACTIONS, AS ONE UNDO ENTRY (2026-09-24).
 *
 * `paramEdit` nests only at the START (a nested start keeps the outermost snapshot, above); the
 * first END inside a nest still pushes and closes. That is right for a drag, whose end may never
 * come, and wrong for a click that runs three self-bracketing store actions in a row: the Explorer
 * shell's tab switch (bake the face you leave, commit a live source, enter Mix — which is itself
 * three brackets — and fit the curves of the face you open) used to leave up to four entries, and
 * undoing only the last of them put back the interface of a half-finished click (a Mix face over
 * a fixed gradient, a Curves face with no curves). A group holds every inner end until `fn`
 * returns, so the click is one entry and its undo is the whole click.
 *
 * Safe against a wedged stack for the reason the nested-start rule gives: `fn` is SYNCHRONOUS and
 * the group's own end runs in `finally`, so nothing a group opens can outlive it. Engine-level
 * callers (`handleInteractionEnd` in the DDFS sliders) still end the transaction directly — do not
 * start a drag inside a group.
 *
 * Guarded through its caller, the shell's tab switch: `npm run smoke:ge-uiundo` ("[7] entering Mix
 * is one undo step", "[9] Mix → Curves is one step") — falsified 2026-09-24 by running that body
 * without the group: both red (F3 in that smoke's header).
 */
export const paramGroup = (fn: () => void): void => {
  paramEditStart();
  groupDepth++;
  try {
    fn();
  } finally {
    groupDepth--;
    paramEditEnd();
  }
};

/**
 * Is an engine param transaction open RIGHT NOW — would a write to any history provider's state
 * land in its entry? The engine's own snapshot is the test, not `dragDepth`: both routes into a
 * transaction set it (this module's `paramEditStart`, and the DDFS sliders'
 * `handleInteractionStart('param')`, which never touch `dragDepth`), and a nest whose first end
 * already closed the transaction leaves `dragDepth` > 0 with nothing left to capture a write.
 */
export const isParamTransactionOpen = (): boolean => !!eng().interactionSnapshot;

/**
 * RUN A WRITE OUTSIDE UNDO (2026-09-16). `fn` runs now when no param transaction is open;
 * otherwise it waits for the open one to close and runs then — never inside it.
 *
 * For bookkeeping that rides a history provider's store but is not the user's edit: the Explorer's
 * Recent sync (`workingStore.syncRecentOutsideUndo`). Its 400 ms debounce used to fire inside any
 * gesture held longer than that — the Curves wave from arm to ✓ / ✕, a slider or knot held still —
 * and the My Gradients shelf write became part of that gesture's entry: a cancelled wave left an
 * entry whose diff was the shelf alone.
 *
 * How it waits: a subscription on the engine store that fires when `interactionSnapshot` goes
 * null. `endParamTransaction` nulls it in the same `set` that pushes the entry, so the entry is
 * already built; the queue drains in a microtask after that, and re-checks — a transaction opened
 * again in the same task (a fold, then a drag start) keeps it waiting for THAT one to close. A
 * function queued twice while one transaction is open runs once (a Set, by identity).
 *
 * Not for a write a caller must see at once: the ♥ syncs Recent synchronously inside its own
 * bracket, then files with `add()`, which reads the shelf that sync wrote.
 *
 * Guarded through its one caller: `debug/test-palette-working.mts` [12] — the snapshot test (not
 * the drag depth) and the drain's re-check are S2 and S3 in that harness's falsification record.
 */
const afterClose = new Set<() => void>();
let stopWaiting: (() => void) | null = null;
const drainAfterClose = (): void => {
  if (isParamTransactionOpen() || !afterClose.size) return;
  stopWaiting?.();
  stopWaiting = null;
  const fns = [...afterClose];
  afterClose.clear();
  for (const fn of fns) fn();
};
export const outsideParamTransaction = (fn: () => void): void => {
  if (!isParamTransactionOpen()) { fn(); return; }
  afterClose.add(fn);
  if (!stopWaiting) {
    stopWaiting = useEngineStore.subscribe((s) => {
      if (!(s as unknown as { interactionSnapshot?: unknown }).interactionSnapshot) queueMicrotask(drainAfterClose);
    });
  }
};

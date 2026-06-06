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
export const paramEditStart = (): void => eng().beginParamTransaction?.();
/** Close the bracket — diff against the snapshot, push one entry if anything changed. */
export const paramEditEnd = (): void => eng().endParamTransaction?.();
/** Discrete one-shot: bracket a synchronous mutation as a single undo entry. */
export const paramEdit = (fn: () => void): void => {
  paramEditStart();
  fn();
  paramEditEnd();
};

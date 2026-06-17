/**
 * Helpers used by lesson `onStart` / `onEnter` / `onExit` callbacks.
 *
 * `asOneEdit` wraps a multi-mutation block in a param-transaction so the
 * sequence of `setX` calls collapses into a single undo entry — important
 * because a lesson seeding scene state should be undone in one Ctrl+Z,
 * not 4-5 keystrokes that each wind through one feature setter.
 */

import type { EngineActions } from '../../types';

type TransactionalStore = Pick<EngineActions, 'beginParamTransaction' | 'endParamTransaction'>;

/** Run `fn` inside a param transaction so all store mutations within
 *  appear as one undo entry. Use in lesson `onStart` / `onEnter` blocks
 *  that touch multiple feature slices. */
export function asOneEdit<T>(store: TransactionalStore, fn: () => T): T {
    store.beginParamTransaction();
    try { return fn(); }
    finally { store.endParamTransaction(); }
}

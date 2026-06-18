/**
 * createObservableState — the multi-field twin of `createSingleSlot`.
 *
 * Several module-level UI-state holders share the identical shape: a single `state`
 * object, a `Set` of listeners, and an `emit(partial)` that patch-merges and notifies —
 * read back via `useSyncExternalStore`. Each was hand-rolled (`let state` + `Set` +
 * `emit` + `subscribe` + `getSnapshot`), reinventing the same ~10 lines. This factory is
 * that shape, once. Per-field setters (with their own clamping/validation) stay at the
 * call site; they read `get()` and call `set(partial)` — the factory owns only the
 * state/listener plumbing, not the domain semantics.
 *
 * Mirrors `createSingleSlot`'s convention: NO React hook is baked in. `get` is a STABLE
 * reference until the next `set`, so consumers pass `store.subscribe`/`store.get` straight
 * to `useSyncExternalStore` (keep the named `useXState` wrapper at the call site so call
 * sites don't change). Unlike `createSingleSlot`, `set` does NOT dedup — callers already
 * guard per-field before patching, so a patch that reaches `set` is always a real change.
 *
 * @invariant Host-agnostic; holders built on it never import an app. Lives in `store/`
 *   so apps (gradient-explorer, palette, …) import it down-tier.
 * @see store/createSingleSlot.ts (the single-value twin)
 * @see store/createListRegistry.ts (the id-keyed, multi-item twin)
 */

export interface ObservableState<T> {
    /** Patch-merge `patch` into the current state and notify all subscribers. */
    set: (patch: Partial<T>) => void;
    /** The current state. Stable reference until the next `set` — safe as a
     *  `useSyncExternalStore` getSnapshot. */
    get: () => T;
    subscribe: (listener: () => void) => () => void;
}

export const createObservableState = <T extends object>(initial: T): ObservableState<T> => {
    let state: T = initial;
    const listeners = new Set<() => void>();
    return {
        set: (patch) => {
            state = { ...state, ...patch };
            listeners.forEach((l) => l());
        },
        get: () => state,
        subscribe: (listener) => {
            listeners.add(listener);
            return () => { listeners.delete(listener); };
        },
    };
};

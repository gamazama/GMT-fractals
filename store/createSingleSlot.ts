/**
 * createSingleSlot — the single-value twin of `createListRegistry`.
 *
 * Engine-core has a recurring "host fills one slot" seam: a last-writer-wins value
 * (an editor-header node, a favourites bridge, a host-capability flag, a resolver fn)
 * that a host SETS at boot and engine-core code READS — decoupled, so engine-core never
 * imports the host. Each such seam needs the identical three operations: `set(value)`
 * (notify listeners), `get()` (a STABLE reference, safe as a `useSyncExternalStore`
 * getSnapshot), and `subscribe(listener)`. They were hand-rolled per seam
 * (`let _value` + `Set<listeners>` + set/get/subscribe), reinventing the same ~20 lines
 * each time. This factory is that shape, once.
 *
 * `set` skips notifying when the value is `Object.is`-equal to the current one, so a
 * boolean flag re-set to the same value doesn't churn subscribers (function/object slots
 * change identity each set, so they always notify — the prior hand-rolled flag had this
 * dedup, the bridges didn't need it).
 *
 * @invariant Host-agnostic; seams built on it never import an app. The named
 *   `setX`/`getX`/`subscribeX` exports stay (thin wrappers) so call sites don't change.
 * @see store/createListRegistry.ts (the multi-slot, id-keyed twin)
 */

export interface SingleSlot<T> {
    /** Replace the slot's value (last-writer-wins). `null` clears it. Notifies
     *  subscribers unless the value is `Object.is`-equal to the current one. */
    set: (value: T | null) => void;
    /** The current value (or `null`). Stable reference until the next `set` — safe as a
     *  `useSyncExternalStore` getSnapshot. */
    get: () => T | null;
    subscribe: (listener: () => void) => () => void;
}

export const createSingleSlot = <T>(initial: T | null = null): SingleSlot<T> => {
    let value: T | null = initial;
    const listeners = new Set<() => void>();
    return {
        set: (next) => {
            if (Object.is(next, value)) return;
            value = next;
            listeners.forEach((l) => l());
        },
        get: () => value,
        subscribe: (listener) => {
            listeners.add(listener);
            return () => { listeners.delete(listener); };
        },
    };
};

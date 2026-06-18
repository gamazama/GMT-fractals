/**
 * createListRegistry — the shared plumbing behind engine-core's id-keyed,
 * subscribe-able registries (drop wells, send targets, …).
 *
 * Every such registry needs the same four operations — register (idempotent by
 * id), unregister, snapshot-all, subscribe — plus one subtlety that is easy to
 * get wrong: `getAll()` is used as a `useSyncExternalStore` getSnapshot, so it
 * MUST return a STABLE reference between mutations. Allocating a fresh
 * `[...map.values()]` on every call makes React's snapshot-equality check never
 * hold → "getSnapshot should be cached" → infinite re-render. This factory caches
 * the array and rebuilds it only inside a mutation, so consumers get a React-safe
 * snapshot for free.
 *
 * Insertion order is preserved (Map keeps it; re-`set`-ting an existing key
 * updates in place without moving it), so re-registering a well/target to swap
 * its closure does not reorder the list.
 *
 * It is the single id-keyed registry primitive — slot hosts (`@engine/topbar`,
 * `@engine/hud`) and send-targets all ride it. A host that ALSO needs an uninstall /
 * test-reset path uses `clear()`; one that needs single-item lookup can read `getAll()`
 * (no `get(id)` is exposed until a consumer needs it — don't add unused surface).
 *
 * @invariant Host-agnostic; the engine registries that use it never import an app.
 * @see store/sendTargetRegistry.ts, engine/plugins/TopBar.tsx, engine/plugins/Hud.tsx (consumers)
 */

export interface ListRegistry<T extends { id: string }> {
    /** Register (idempotent by id — replaces in place). Returns an unregister thunk. */
    register: (item: T) => () => void;
    unregister: (id: string) => void;
    /** Stable snapshot of all items in registration order — safe as a
     *  `useSyncExternalStore` getSnapshot (same reference until the next mutation). */
    getAll: () => T[];
    /** Remove all items (uninstall / test-reset). Notifies subscribers. */
    clear: () => void;
    subscribe: (listener: () => void) => () => void;
}

export const createListRegistry = <T extends { id: string }>(): ListRegistry<T> => {
    const items = new Map<string, T>();
    const listeners = new Set<() => void>();
    let snapshot: T[] = [];

    const rebuild = () => {
        snapshot = [...items.values()];
        listeners.forEach((l) => l());
    };

    return {
        register: (item) => {
            items.set(item.id, item);
            rebuild();
            return () => {
                if (items.delete(item.id)) rebuild();
            };
        },
        unregister: (id) => {
            if (items.delete(id)) rebuild();
        },
        getAll: () => snapshot,
        clear: () => {
            items.clear();
            rebuild();
        },
        subscribe: (listener) => {
            listeners.add(listener);
            return () => { listeners.delete(listener); };
        },
    };
};

/**
 * safeLocalStorage — the bare localStorage access guard, shared by engine-core
 * (`store/slices/uiSlice.ts` prefs) and palette (`palette/core/storage.ts`). Wraps
 * `getItem`/`setItem`/`removeItem` in the try/catch + availability check every
 * localStorage user needs: SSR (no `window`), private-mode / disabled storage
 * (access throws), and `setItem` quota-exceeded.
 *
 * This is ONLY the low-level guard. The typed accessors (bool/number/JSON
 * coercion) stay at the call site, because the interpretation differs — uiSlice's
 * `'0'`/`'1'` booleans and enum prefs vs palette's JSON blobs. Both layers build
 * on these three functions so the guard itself lives in one place.
 *
 * @invariant Host-agnostic; never imports an app. palette/ builds on it (app→core
 *   is the allowed import direction; the reverse is not).
 * @see palette/core/storage.ts, store/slices/uiSlice.ts (consumers)
 */

const available = (): boolean => {
    try {
        return typeof window !== 'undefined' && !!window.localStorage;
    } catch {
        return false;
    }
};

/** Read a raw string, or `null` if missing / storage unavailable / access throws. */
export const safeLocalGet = (key: string): string | null => {
    try {
        return available() ? window.localStorage.getItem(key) : null;
    } catch {
        return null;
    }
};

/** Write a raw string; silently no-ops if storage is unavailable or quota-exceeded. */
export const safeLocalSet = (key: string, value: string): void => {
    try {
        if (available()) window.localStorage.setItem(key, value);
    } catch {
        /* quota / disabled */
    }
};

/** Remove a key; silently no-ops if storage is unavailable. */
export const safeLocalRemove = (key: string): void => {
    try {
        if (available()) window.localStorage.removeItem(key);
    } catch {
        /* ignore */
    }
};

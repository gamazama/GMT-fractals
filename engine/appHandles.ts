/**
 * @engine/app-handles — typed singleton pattern for app-scoped state that
 * needs to be reachable from BOTH React components AND non-React code
 * (RAF loops, pointer handlers, plugin customUI components).
 *
 * The problem it solves: a DDFS `customUI` component mounts inside
 * AutoFeaturePanel, which lives in a different React subtree from the
 * app's canvas. React context doesn't reach across that gap. Two prior
 * solutions were unsatisfying:
 *
 *   (a) Module-scope `let` variables — untyped, scattered, no discovery.
 *   (b) A single grab-bag `engineHandles` object — typed but a god-object
 *       that silently grows forever.
 *
 * `defineAppHandles<T>(initial)` gives a per-purpose typed container:
 *
 *     import { defineAppHandles } from '@engine/appHandles';
 *
 *     interface BrushHandles {
 *         runtime: BrushRuntime;
 *         cursor: CursorState;
 *         gradientLut: Uint8Array | null;
 *     }
 *
 *     export const brushHandles = defineAppHandles<BrushHandles>('brush', {
 *         runtime: createBrushRuntime(),
 *         cursor: { dragging: false, uv: null, velUv: null },
 *         gradientLut: null,
 *     });
 *
 *     // React:   const gradient = brushHandles.useSnapshot().gradientLut;
 *     // Imperative: brushHandles.ref.current.cursor.dragging = true;
 *
 * Each call to `defineAppHandles` returns an independent singleton. Apps
 * typically create 2–3 of these grouped by purpose (brush, camera, input)
 * rather than one flat container.
 *
 * Smoke-test exposure: in dev, every handle is pushed onto
 * `globalThis.__appHandles[name]` so Playwright probes can inspect
 * without reaching into internal module structure. Prod bundles skip
 * the global so there's no accidental API surface.
 */

import { useSyncExternalStore } from 'react';

export interface AppHandles<T> {
    /** Unique name — used as the key in `globalThis.__appHandles` for
     *  dev / smoke-test access. */
    readonly name: string;
    /** Mutable ref. Write to `ref.current.field = value` from imperative
     *  code; read from `ref.current.field` from anywhere. */
    readonly ref: { current: T };
    /** React hook — returns the current snapshot and re-renders the
     *  component whenever `notify()` is called. Prefer this over
     *  reading `ref.current` from a component (it won't re-render on
     *  writes otherwise). */
    useSnapshot(): T;
    /** Imperative subscribe for non-React listeners. */
    subscribe(fn: () => void): () => void;
    /** Notify all subscribers that the handle's contents changed.
     *  Imperative writes that should trigger a React re-render must call
     *  this; purely-imperative writes (RAF loop updates read every frame
     *  anyway) can skip it for performance. */
    notify(): void;
    /** Reset to the initial value passed at definition time. Useful for
     *  tests and app-level "reset" actions. */
    reset(): void;
}

// Dev-only global registry so smoke tests can enumerate handles by name.
const _globalBucket = (): Record<string, unknown> => {
    const g = globalThis as any;
    if (!g.__appHandles) g.__appHandles = {};
    return g.__appHandles;
};

export function defineAppHandles<T>(name: string, initial: T): AppHandles<T> {
    const initialSnapshot = initial;
    const ref = { current: initial };
    const subscribers = new Set<() => void>();
    let rev = 0;

    const subscribe = (fn: () => void) => {
        subscribers.add(fn);
        return () => { subscribers.delete(fn); };
    };

    const notify = () => { rev++; subscribers.forEach((fn) => fn()); };

    // The snapshot hook returns `ref.current` — but React requires the
    // snapshot identity to be stable across reads when nothing changed.
    // We pair the ref read with `rev` so the value-equality check in
    // useSyncExternalStore re-runs only when `notify()` bumped rev.
    const useSnapshot = (): T => {
        useSyncExternalStore(subscribe, () => rev, () => rev);
        return ref.current;
    };

    const reset = () => {
        ref.current = initialSnapshot;
        notify();
    };

    const handle: AppHandles<T> = {
        name,
        ref,
        useSnapshot,
        subscribe,
        notify,
        reset,
    };

    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
        _globalBucket()[name] = handle;
    }

    return handle;
}

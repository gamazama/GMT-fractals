/**
 * Action bus — replaces the `action` trigger's store-monkeypatch with a
 * named-event broadcast. Apps emit `actionBus.fire('camera.reset')` from
 * the call sites that already perform the action; lessons subscribe via
 * the `action` trigger kind.
 */

const _listeners = new Map<string, Set<() => void>>();

export const actionBus = {
    fire(name: string): void {
        _listeners.get(name)?.forEach((fn) => { try { fn(); } catch (e) { console.error('[actionBus]', e); } });
    },
    on(name: string, fn: () => void): () => void {
        let set = _listeners.get(name);
        if (!set) { set = new Set(); _listeners.set(name, set); }
        set.add(fn);
        return () => { set!.delete(fn); };
    },
};

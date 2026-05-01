/**
 * Anchor registry — replaces `data-tut="..."` attributes scattered across
 * components. Components opt in once via `useTutorAnchor(id)` (returns a
 * ref-callback). The registry stores live HTMLElement references so the
 * overlay + highlight can read element bounds directly — no querySelector.
 *
 * Multiple components can register the same id (e.g. dynamic per-light
 * gizmo labels). `get` returns the first visible entry; `getAll` returns all.
 *
 * Module singleton — no React context — so non-component code (trigger
 * evaluators, debug overlays) can read it.
 */

import { useCallback, useRef } from 'react';
import type React from 'react';

export interface AnchorEntry {
    id: string;
    el: HTMLElement;
}

const _entries = new Map<HTMLElement, AnchorEntry>();
const _byId = new Map<string, Set<HTMLElement>>();
const _subs = new Set<() => void>();
const _notify = () => _subs.forEach((fn) => fn());

export const tutorAnchors = {
    register(id: string, el: HTMLElement): void {
        // If this exact element was previously registered under a different id,
        // remove the old entry first.
        const prev = _entries.get(el);
        if (prev && prev.id !== id) {
            _byId.get(prev.id)?.delete(el);
        }
        _entries.set(el, { id, el });
        let set = _byId.get(id);
        if (!set) { set = new Set(); _byId.set(id, set); }
        // Prune disconnected elements previously registered under this id —
        // covers the inline-ref-callback usage where there's no detach hook.
        for (const stale of set) {
            if (!stale.isConnected) {
                set.delete(stale);
                _entries.delete(stale);
            }
        }
        set.add(el);
        _notify();
    },
    unregister(el: HTMLElement): void {
        const entry = _entries.get(el);
        if (!entry) return;
        _entries.delete(el);
        _byId.get(entry.id)?.delete(el);
        if (_byId.get(entry.id)?.size === 0) _byId.delete(entry.id);
        _notify();
    },
    /** First-found entry for an id, preferring elements with non-zero rect. */
    get(id: string): AnchorEntry | undefined {
        const set = _byId.get(id);
        if (!set) return undefined;
        let fallback: AnchorEntry | undefined;
        for (const el of set) {
            const entry = _entries.get(el);
            if (!entry) continue;
            const r = el.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) return entry;
            fallback = fallback ?? entry;
        }
        return fallback;
    },
    /** All entries for an id (e.g. multiple light gizmos). */
    getAll(id: string): AnchorEntry[] {
        const set = _byId.get(id);
        if (!set) return [];
        return Array.from(set).map((el) => _entries.get(el)!).filter(Boolean);
    },
    list(): AnchorEntry[] {
        return Array.from(_entries.values());
    },
    listIds(): string[] {
        return Array.from(_byId.keys());
    },
    subscribe(fn: () => void): () => void {
        _subs.add(fn);
        return () => { _subs.delete(fn); };
    },
};

/**
 * Hook: returns a stable ref-callback that registers / unregisters the
 * element under the given id. Tracks the previously-attached element in
 * a closure so detach (`el === null`) unregisters precisely — no global
 * "scan disconnected elements" pass needed.
 *
 * Hook order: stable across renders. For loop bodies where the id varies
 * per item, extract the element wrapper into a sub-component (keeps
 * hooks stable across list-length changes).
 */
export function useTutorAnchor(id: string | undefined | null): React.RefCallback<HTMLElement> {
    const lastElRef = useRef<HTMLElement | null>(null);
    return useCallback((el: HTMLElement | null) => {
        if (lastElRef.current && lastElRef.current !== el) {
            tutorAnchors.unregister(lastElRef.current);
        }
        if (id && el) tutorAnchors.register(id, el);
        lastElRef.current = el;
    }, [id]);
}

/** Stateful ref-callback factory for dynamic ids in JSX maps where calling
 *  the `useTutorAnchor` hook would violate hook order. Caller is
 *  responsible for memoizing the result if id stability matters. */
export function tutorAnchorRef(id: string): React.RefCallback<HTMLElement> {
    let lastEl: HTMLElement | null = null;
    return (el: HTMLElement | null) => {
        if (lastEl && lastEl !== el) tutorAnchors.unregister(lastEl);
        if (el) tutorAnchors.register(id, el);
        lastEl = el;
    };
}


/**
 * Document-provider registry — engine-core, host-agnostic.
 *
 * Parallels `registerHistoryProvider` (store/slices/historySlice.ts), but for
 * SCENE PERSISTENCE rather than undo. The engine's `getPreset()`/`loadPreset()`
 * only serialise DDFS feature slices + a handful of registered scene fields.
 * Real authoring state that lives in non-DDFS stores — the palette generator's
 * curves/slots, the image trace, the stops document, the favients shelf — was
 * therefore SILENTLY LOST on Save → reload (the W8 correctness hole).
 *
 * A provider is a `{ serialize, restore }` pair keyed by a stable id. On save,
 * SceneIO collects every provider's `serialize()` into the scene under a
 * `documents: { [id]: snap }` key, ALONGSIDE (never replacing) the DDFS preset.
 * On load, each `documents[id]` is dispatched to its provider's `restore`.
 *
 * @invariant Host-agnostic: this module imports nothing app-specific. Hosts
 *   register INTO it (palette registers a `favients` provider; heavy stores
 *   register their own in their Phase-1 streams). The engine never imports a
 *   host store.
 * @invariant Back-compat: scenes saved before this existed (no `documents`
 *   key) load fine — `restoreDocuments(undefined)` is a no-op, so providers
 *   simply keep their current state.
 * @invariant SECURITY — `restoreDocuments` is a deserialization surface fed by
 *   untrusted shared scene files. It NEVER iterates the untrusted snapshot's
 *   keys; it iterates the (trusted) registered provider ids and pulls each
 *   snapshot via an own-property check. Each `restore`/`serialize` is wrapped
 *   so one malformed/throwing provider can neither crash the load/save nor
 *   poison the others. Per-document shape validation is the provider's job.
 *
 * @see store/slices/historySlice.ts (the parallel undo-provider pattern)
 * @see engine/plugins/SceneIO.tsx (the save/load integration)
 */

import type { JsonValue } from '../types';

export interface DocumentProvider {
    /** Capture this document's current state as a JSON-serialisable snapshot. */
    serialize(): JsonValue;
    /** Restore from a snapshot loaded out of a scene file. MUST validate the
     *  shape and tolerate garbage (untrusted input) — fail safe, never throw. */
    restore(snap: JsonValue): void;
}

const _documentProviders = new Map<string, DocumentProvider>();

/**
 * Register a document provider under a stable id. Idempotent per id (a second
 * registration with the same id replaces the first) — mirrors
 * `registerHistoryProvider`. Call before or after store construction; the
 * registry is consulted lazily at save/load time, not at freeze time.
 */
export const registerDocumentProvider = (id: string, provider: DocumentProvider): void => {
    _documentProviders.set(id, provider);
};

export const unregisterDocumentProvider = (id: string): void => {
    _documentProviders.delete(id);
};

/**
 * Collect every registered provider's snapshot into a plain object keyed by id.
 * Returns `{}` when no providers are registered (apps that register none are
 * unaffected — the caller omits an empty `documents` key to keep files clean).
 * A provider that throws is skipped (logged) rather than failing the whole save.
 */
export const serializeDocuments = (): Record<string, JsonValue> => {
    const out: Record<string, JsonValue> = {};
    for (const [id, p] of _documentProviders) {
        try {
            out[id] = p.serialize();
        } catch (err) {
            console.warn(`[documentRegistry] provider "${id}" serialize() threw — skipping`, err);
        }
    }
    return out;
};

/**
 * Dispatch each `docs[id]` to its registered provider's `restore`. No-op when
 * `docs` is absent / not a plain object (back-compat for pre-`documents`
 * scenes, and fail-safe against garbage).
 *
 * Security: iterates the TRUSTED registered ids, not the untrusted snapshot's
 * keys, and reads each snapshot via `hasOwnProperty` — so a hostile
 * `__proto__` / `constructor` key in the file is never followed (no prototype
 * pollution) and a snapshot for an unregistered id is simply ignored. Each
 * `restore` is wrapped so one bad document can't break the others or the load.
 */
export const restoreDocuments = (docs: unknown): void => {
    if (!docs || typeof docs !== 'object' || Array.isArray(docs)) return;
    const bag = docs as Record<string, unknown>;
    for (const [id, p] of _documentProviders) {
        if (!Object.prototype.hasOwnProperty.call(bag, id)) continue;
        try {
            p.restore(bag[id] as JsonValue);
        } catch (err) {
            console.warn(`[documentRegistry] provider "${id}" restore() threw — skipping`, err);
        }
    }
};

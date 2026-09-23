/**
 * sceneStash — a ONE-SHOT slot in localStorage that carries a GMT scene (as GMF text) across a
 * page change the app cannot avoid, keyed by WHY it was stashed. Pure over `safeLocalStorage`:
 * no store, no engine, so `debug/test-scene-stash.mts` runs it under node. The live capture
 * (flush the camera, serialise the store) is `stashLiveScene.ts`; the restore is app-gmt's
 * `resolveBootPreset` (app-gmt/main.tsx), which is the only reader.
 *
 * Two reasons, each with its own keys and its own lifetime:
 *   • `'oauth'` — Google sign-in is a full-page redirect that tears the SPA down. The scene is
 *     stashed just before the redirect (`engine-gmt/auth/AuthOverlay.tsx`) and restored by the
 *     next boot whatever its URL. 5 minutes: a redirect round trip, and short enough that a
 *     normal reload long after never resurrects a stale scene. The keys, the lifetime and the
 *     restore are what `oauthSceneStash.ts` had before it was generalised into this file
 *     (2026-09-23); the dirty flag is not carried (a restored sign-in scene counts as saved,
 *     as it always did).
 *   • `'gx'` — the My Gradients panel's Explorer button opens the Gradient Explorer in a new tab
 *     and stashes the scene as a safety net (app-gmt/explorerTrip.ts). It is restored ONLY by a
 *     boot carrying `?from=gx`, which the Explorer's "Back to GMT" uses when it could not simply
 *     close itself and land the user in the tab they came from. 24 hours: the trip can be an
 *     afternoon of work, or a tab left open overnight, and because the URL flag gates the
 *     restore a long lifetime cannot bring a scene back on an ordinary reload — the lifetime
 *     only bounds how long an unclaimed copy occupies the shared ~5 MB localStorage budget
 *     (the next trip overwrites it, a restore consumes it). Its dirty flag IS carried: a scene
 *     that had unsaved changes comes back marked unsaved, so the leave-page prompt still
 *     guards it.
 *
 * Writes are all-or-nothing. The previous copy of the same reason is removed FIRST, so nothing
 * of it pairs with the new one — a dirty flag the new copy does not set, or the old scene under
 * a new timestamp — and any failed part removes every key again. The caller reads the boolean
 * and degrades (nothing is kept; the trip still happens).
 *
 * @invariant a stash is read at most once, only within its reason's lifetime, only by its own
 *   reason, the GX trip's only with the `?from=gx` flag (without it nothing is consumed), and a
 *   failed write leaves nothing behind — proven by: `npx tsx debug/test-scene-stash.mts` ("a take
 *   clears the slot: the second take is null", "GX trip restores at 23:59:59 and not at
 *   24:00:01", "sign-in does not read the GX trip's slot", "and NOTHING WAS CONSUMED", "a write
 *   that fails half-way … is rolled back"). Falsified 2026-09-23, eleven breaks, see its header.
 * @see app-gmt/main.tsx (resolveBootPreset — the restore, and the `?from=gx` gate)
 */

import { safeLocalGet, safeLocalSet, safeLocalRemove } from '../../store/safeLocalStorage';

export type SceneStashReason = 'oauth' | 'gx';

interface ReasonSpec {
    /** The GMF text. */
    gmfKey: string;
    /** `String(Date.now())` at the stash. */
    atKey: string;
    /** `'1'` when the scene had unsaved changes. Absent → the reason does not carry it. */
    dirtyKey?: string;
    /** How long after the stash a restore may still take it. */
    ttlMs: number;
}

const MINUTE = 60 * 1000;

export const SCENE_STASH_REASONS: Readonly<Record<SceneStashReason, ReasonSpec>> = {
    // The sign-in keys are byte-identical to the pre-generalisation module's.
    oauth: { gmfKey: 'gmt-oauth-scene-stash', atKey: 'gmt-oauth-scene-stash-ts', ttlMs: 5 * MINUTE },
    gx: { gmfKey: 'gmt-gx-scene-stash', atKey: 'gmt-gx-scene-stash-at', dirtyKey: 'gmt-gx-scene-stash-dirty', ttlMs: 24 * 60 * MINUTE },
};

/** Remove every key of this reason's slot. */
export const clearSceneStash = (reason: SceneStashReason): void => {
    const spec = SCENE_STASH_REASONS[reason];
    safeLocalRemove(spec.gmfKey);
    safeLocalRemove(spec.atKey);
    if (spec.dirtyKey) safeLocalRemove(spec.dirtyKey);
};

/** Stash `gmf` for `reason`, replacing any earlier copy. Returns whether ALL of it landed —
 *  false leaves the slot empty (storage full, blocked, or private mode). */
export const writeSceneStash = (
    reason: SceneStashReason,
    gmf: string,
    opts: { dirty?: boolean; now?: number } = {},
): boolean => {
    const spec = SCENE_STASH_REASONS[reason];
    clearSceneStash(reason);
    const ok =
        safeLocalSet(spec.gmfKey, gmf) &&
        safeLocalSet(spec.atKey, String(opts.now ?? Date.now())) &&
        (!spec.dirtyKey || !opts.dirty || safeLocalSet(spec.dirtyKey, '1'));
    if (!ok) clearSceneStash(reason);
    return ok;
};

export interface TakenSceneStash {
    gmf: string;
    /** The scene had unsaved changes when it was stashed (always false for a reason that does
     *  not carry the flag). */
    dirty: boolean;
}

/** The query flag the Explorer's "Back to GMT" fallback carries (`app-gmt.html?from=gx`,
 *  gradient-explorer/v2/fromGmt.ts — the literal there is checked against this by the test). */
export const GX_RETURN_QUERY = { param: 'from', value: 'gx' } as const;

/**
 * The boot's read of the GX trip stash, gated on the flag:
 *   • `undefined` — no `?from=gx` in `search`: nothing is read and nothing is consumed (a reload
 *     or a crash must never bring a trip's copy back);
 *   • `null` — the flag is there but the stash is missing or expired (the caller says so);
 *   • the stash — taken (and so cleared).
 */
export const takeGxTripStash = (search: string, now: number = Date.now()): TakenSceneStash | null | undefined => {
    let flagged = false;
    try {
        flagged = new URLSearchParams(search).get(GX_RETURN_QUERY.param) === GX_RETURN_QUERY.value;
    } catch {
        flagged = false;
    }
    return flagged ? takeSceneStash('gx', now) : undefined;
};

/** The stash if a fresh one exists, else null. ALWAYS clears the slot, so it restores at most
 *  once — an expired or half-written copy is dropped rather than kept for later. */
export const takeSceneStash = (reason: SceneStashReason, now: number = Date.now()): TakenSceneStash | null => {
    const spec = SCENE_STASH_REASONS[reason];
    try {
        const gmf = safeLocalGet(spec.gmfKey);
        const at = Number(safeLocalGet(spec.atKey) ?? 0);
        const dirty = !!spec.dirtyKey && safeLocalGet(spec.dirtyKey) === '1';
        clearSceneStash(reason);
        if (!gmf || !at || now - at > spec.ttlMs) return null;
        return { gmf, dirty };
    } catch {
        return null;
    }
};

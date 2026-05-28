/**
 * Google OAuth does a full-page redirect, which tears down the SPA and
 * loses the in-progress scene. To preserve work, signInWithGoogle stashes
 * the current scene as GMF just before redirecting; the app boot path
 * consumes it on return (within a short freshness window) and restores it
 * instead of the default boot preset.
 */
import { saveGMFScene } from '../utils/FormulaFormat';
import { useEngineStore } from '../../store/engineStore';

const STASH_KEY = 'gmt-oauth-scene-stash';
const STASH_TS_KEY = 'gmt-oauth-scene-stash-ts';
// Only restore if the redirect round-trip completed within this window, so a
// normal reload long after never resurrects a stale scene.
const FRESHNESS_MS = 5 * 60 * 1000;

export function stashSceneForOAuth(): void {
    try {
        const preset = (useEngineStore.getState() as any).getPreset?.();
        if (!preset) return;
        localStorage.setItem(STASH_KEY, saveGMFScene(preset));
        localStorage.setItem(STASH_TS_KEY, String(Date.now()));
    } catch (err) {
        console.warn('[auth] failed to stash scene before OAuth redirect:', err);
    }
}

/** Returns the stashed GMF if a fresh one exists, else null. Always clears
 *  the stash so it restores at most once per redirect. */
export function consumeStashedScene(): string | null {
    try {
        const gmf = localStorage.getItem(STASH_KEY);
        const ts = Number(localStorage.getItem(STASH_TS_KEY) ?? 0);
        localStorage.removeItem(STASH_KEY);
        localStorage.removeItem(STASH_TS_KEY);
        if (!gmf || !ts || Date.now() - ts > FRESHNESS_MS) return null;
        return gmf;
    } catch {
        return null;
    }
}

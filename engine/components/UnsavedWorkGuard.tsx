/**
 * UnsavedWorkGuard — the work-loss safety net (H4). Mount once at the app
 * root. Three jobs:
 *
 *   1. beforeunload (ALWAYS on) — if the scene has unsaved edits, ask before
 *      the tab closes / reloads. Independent of the autosave setting.
 *
 *   2. autosave (OPT-IN, interval configurable via autosaveStore) — while
 *      enabled AND dirty, stash the serialized scene under AUTOSAVE_KEY.
 *
 *   3. recovery snapshot — on first mount, copy any AUTOSAVE_KEY left by a
 *      previous session into the protected AUTOSAVE_RECOVERY_KEY *before* this
 *      session's autosaves can overwrite the live key, then notify. File ▸
 *      "Restore Last Session" loads from the recovery slot, so the 15s bursts
 *      can never clobber the thing you'd want to recover.
 *
 * Dirtiness excludes camera-only moves (see engineStore.isSceneDirty) and a
 * fresh boot is never dirty, so neither the prompt nor autosave fires until
 * the user actually changes scene content.
 */
import React, { useEffect, useRef } from 'react';
import { useEngineStore } from '../../store/engineStore';
import { useAutosaveSettings } from '../store/autosaveStore';
import { serializeCurrentScene, AUTOSAVE_KEY, AUTOSAVE_RECOVERY_KEY, AUTOSAVE_AT_KEY, AUTOSAVE_RECOVERY_AT_KEY } from '../plugins/SceneIO';
import { showToast } from '../store/toastStore';

export const UnsavedWorkGuard: React.FC = () => {
    const enabled = useAutosaveSettings((s) => s.enabled);
    const intervalSec = useAutosaveSettings((s) => s.intervalSec);
    const snapshotted = useRef(false);

    // (3) Recovery snapshot + notification — runs once, before any autosave tick.
    useEffect(() => {
        if (snapshotted.current) return;
        snapshotted.current = true;
        try {
            const prev = localStorage.getItem(AUTOSAVE_KEY);
            if (prev) {
                localStorage.setItem(AUTOSAVE_RECOVERY_KEY, prev);
                const at = localStorage.getItem(AUTOSAVE_AT_KEY);
                if (at) localStorage.setItem(AUTOSAVE_RECOVERY_AT_KEY, at);
                showToast('Unsaved work from your last session can be recovered — File ▸ Restore Last Session', 'info', 7000);
            }
        } catch { /* storage blocked */ }
    }, []);

    // (1) beforeunload — always on.
    useEffect(() => {
        const onBeforeUnload = (e: BeforeUnloadEvent) => {
            if (!useEngineStore.getState().isSceneDirty()) return;
            e.preventDefault();
            e.returnValue = ''; // required to trigger the prompt in most browsers
        };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, []);

    // (2) autosave — opt-in; re-arms when enabled / interval changes.
    useEffect(() => {
        if (!enabled) return;
        const ms = Math.max(5, intervalSec) * 1000;
        const timer = window.setInterval(() => {
            try {
                if (!useEngineStore.getState().isSceneDirty()) return;
                localStorage.setItem(AUTOSAVE_KEY, serializeCurrentScene());
                localStorage.setItem(AUTOSAVE_AT_KEY, String(Date.now()));
            } catch (err) {
                console.warn('[UnsavedWorkGuard] autosave failed', err);
            }
        }, ms);
        return () => window.clearInterval(timer);
    }, [enabled, intervalSec]);

    return null;
};

/**
 * autosaveStore — opt-in autosave preferences (H4), persisted to
 * localStorage. Standalone (like toastStore) so the guard, the settings
 * menu item, and any future surface all share one source of truth.
 *
 * Autosave is OFF by default — it's a backstop the user chooses to enable.
 * The beforeunload "you have unsaved changes" guard is separate and always
 * on; this only governs the periodic localStorage stash.
 */
import { create } from 'zustand';
import { safeLocalGet, safeLocalSet } from '../../store/safeLocalStorage';

const ENABLED_KEY = 'gmt-autosave-enabled';
const INTERVAL_KEY = 'gmt-autosave-interval-sec';

const DEFAULT_INTERVAL_SEC = 30;
const MIN_INTERVAL_SEC = 5;
const MAX_INTERVAL_SEC = 600;

const readBool = (k: string, fallback: boolean): boolean => {
    try { const v = safeLocalGet(k); return v === null ? fallback : v === '1'; } catch { return fallback; }
};
const readNum = (k: string, fallback: number): number => {
    try { const v = safeLocalGet(k); const n = v === null ? NaN : Number(v); return Number.isFinite(n) ? n : fallback; } catch { return fallback; }
};

interface AutosaveSettings {
    enabled: boolean;
    intervalSec: number;
    setEnabled: (v: boolean) => void;
    setIntervalSec: (v: number) => void;
}

export const useAutosaveSettings = create<AutosaveSettings>((set) => ({
    enabled: readBool(ENABLED_KEY, false),
    intervalSec: Math.min(MAX_INTERVAL_SEC, Math.max(MIN_INTERVAL_SEC, readNum(INTERVAL_KEY, DEFAULT_INTERVAL_SEC))),
    setEnabled: (v) => {
        safeLocalSet(ENABLED_KEY, v ? '1' : '0');
        set({ enabled: v });
    },
    setIntervalSec: (v) => {
        const clamped = Math.min(MAX_INTERVAL_SEC, Math.max(MIN_INTERVAL_SEC, Math.round(v)));
        safeLocalSet(INTERVAL_KEY, String(clamped));
        set({ intervalSec: clamped });
    },
}));

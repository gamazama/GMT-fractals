/**
 * autosaveStore — opt-in autosave preferences (H4), persisted to localStorage, SCOPED PER
 * APP. Standalone (like toastStore) so an app's guard, its Settings rows and any future
 * surface share one source of truth.
 *
 * Autosave is OFF by default everywhere — a backstop the user chooses to enable.
 *
 * ── One store per app, never one for the origin ─────────────────────────────────────
 * Every GMT app is served from the same origin, so they share one localStorage. Until
 * 2026-09-13 there was one pair of keys, and a toggle in one app's Settings silently
 * governed every other app's autosave. Now an app names its OWN key pair and gets its own
 * store: `createAutosaveSettingsStore({ enabled, intervalSec })`.
 *
 *   app-gmt              `useAutosaveSettings` — `gmt-autosave-enabled` /
 *                        `gmt-autosave-interval-sec`, byte-identical to before scoping (no
 *                        migration). Read by <UnsavedWorkGuard/> and SceneIO's File menu row,
 *                        and the DEFAULT for `registerCoreSettings`.
 *   Gradient Explorer v2 `gxAutosaveSettings` (gradient-explorer/v2/session.ts) —
 *                        `gmt.ge.autosave-enabled` / `gmt.ge.autosave-interval-sec`. Handed
 *                        explicitly to `registerCoreSettings({ autosave })` and to the session
 *                        plugin (engine/plugins/Session.ts), which takes a store as a REQUIRED
 *                        option so it can never fall back to app-gmt's.
 *
 * The factory is memoised by the enabled key, so two modules asking for the same scope get
 * the same store (two stores over one key would each cache their own `enabled` and drift).
 * Each page is its own JS realm, so a store in one app's tab cannot see another tab's
 * in-memory state; the keys are the only thing two apps could share, and they no longer do.
 *
 * `registerAutosaveSettings(store, text?)` puts that store's two rows (Files ▸ Autosave) into
 * the Settings registry; `registerCoreSettings` calls it with the store it is given.
 *
 * The beforeunload "you have unsaved changes" guard is separate and always on; this only
 * governs the periodic localStorage stash.
 *
 * @see engine/plugins/Session.ts · docs/adr/0121-the-session-restores-itself.md
 */
import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { safeLocalGet, safeLocalSet } from '../../store/safeLocalStorage';
import { registerSetting } from '../../store/settingsRegistry';

const DEFAULT_INTERVAL_SEC = 30;
const MIN_INTERVAL_SEC = 5;
const MAX_INTERVAL_SEC = 600;

const readBool = (k: string, fallback: boolean): boolean => {
    try { const v = safeLocalGet(k); return v === null ? fallback : v === '1'; } catch { return fallback; }
};
const readNum = (k: string, fallback: number): number => {
    try { const v = safeLocalGet(k); const n = v === null ? NaN : Number(v); return Number.isFinite(n) ? n : fallback; } catch { return fallback; }
};

export interface AutosaveSettings {
    enabled: boolean;
    intervalSec: number;
    setEnabled: (v: boolean) => void;
    setIntervalSec: (v: number) => void;
}

export type AutosaveSettingsStore = UseBoundStore<StoreApi<AutosaveSettings>>;

/** The localStorage keys one app's autosave preferences live under. */
export interface AutosaveSettingsKeys {
    enabled: string;
    intervalSec: string;
}

/** app-gmt's keys — the original pair, unchanged. */
export const GMT_AUTOSAVE_KEYS: AutosaveSettingsKeys = {
    enabled: 'gmt-autosave-enabled',
    intervalSec: 'gmt-autosave-interval-sec',
};

const _stores = new Map<string, AutosaveSettingsStore>();

/** The autosave preferences for one app's key pair. Memoised by `keys.enabled`. */
export const createAutosaveSettingsStore = (keys: AutosaveSettingsKeys): AutosaveSettingsStore => {
    const existing = _stores.get(keys.enabled);
    if (existing) return existing;
    const store = create<AutosaveSettings>((set) => ({
        enabled: readBool(keys.enabled, false),
        intervalSec: Math.min(MAX_INTERVAL_SEC, Math.max(MIN_INTERVAL_SEC, readNum(keys.intervalSec, DEFAULT_INTERVAL_SEC))),
        setEnabled: (v) => {
            safeLocalSet(keys.enabled, v ? '1' : '0');
            set({ enabled: v });
        },
        setIntervalSec: (v) => {
            const clamped = Math.min(MAX_INTERVAL_SEC, Math.max(MIN_INTERVAL_SEC, Math.round(v)));
            safeLocalSet(keys.intervalSec, String(clamped));
            set({ intervalSec: clamped });
        },
    }));
    _stores.set(keys.enabled, store);
    return store;
};

/** app-gmt's autosave preferences (and the default scope of `registerCoreSettings`). */
export const useAutosaveSettings: AutosaveSettingsStore = createAutosaveSettingsStore(GMT_AUTOSAVE_KEYS);

/** What the two Settings rows say. app-gmt's wording is the default. */
export interface AutosaveSettingsText {
    enabledDescription?: string;
    intervalDescription?: string;
}

/**
 * Register Files ▸ Autosave (the on/off row and the interval row) for ONE store. The row ids
 * are fixed (`autosave.enabled` / `autosave.interval`) — one app per page, so one pair of rows.
 */
export const registerAutosaveSettings = (store: AutosaveSettingsStore, text: AutosaveSettingsText = {}): void => {
    registerSetting({
        id: 'autosave.enabled',
        tab: 'Files',
        section: 'Autosave',
        label: 'Autosave to browser',
        description: text.enabledDescription ?? 'Periodically stash the current scene to local storage as a crash backstop.',
        control: { kind: 'boolean' },
        get: () => store.getState().enabled,
        set: (v) => store.getState().setEnabled(!!v),
        subscribe: (cb) => store.subscribe(cb),
        order: 0,
    });

    registerSetting({
        id: 'autosave.interval',
        tab: 'Files',
        section: 'Autosave',
        label: 'Autosave interval',
        description: text.intervalDescription ?? 'How often to stash the scene, in seconds.',
        control: { kind: 'number', min: 5, max: 600, step: 5, unit: 'sec' },
        get: () => store.getState().intervalSec,
        set: (v) => store.getState().setIntervalSec(Number(v)),
        subscribe: (cb) => store.subscribe(cb),
        order: 1,
    });
};

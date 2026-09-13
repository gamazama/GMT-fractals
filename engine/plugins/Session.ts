/**
 * @engine/session — an app's working SESSION kept across a reload, and carried in a file.
 *
 * Three loops over one app-supplied {@link SessionAdapter} (capture / validate / apply) and
 * the versioned envelope in `store/sessionEnvelope.ts`:
 *
 *   1. BOOT RESTORE — `restoreSessionOnBoot`: before the app's first render, read the
 *      autosave slot, validate it, apply it WITHOUT an undo bracket (so a first Ctrl+Z has
 *      nothing to take back). `sessionBootAction` orders the decision: autosave off → keep
 *      nothing; a pre-empting load (a share link) → skip; nothing valid → first-run as today.
 *   2. AUTOSAVE — `installSessionAutosave`: every `intervalSec` while enabled, and on
 *      `pagehide` / tab-hidden (so a reload or a closed tab never waits for the interval),
 *      capture the body and write it when it CHANGED since the last write. A fresh boot that
 *      nobody touches writes nothing. When the write is refused (quota), a `compact` capture
 *      is tried once (an app drops its heaviest part — the Explorer drops its source image).
 *      Switching autosave OFF removes the stored session: off means the app keeps nothing.
 *   3. FILE — `registerSessionFileSettings`: two `action` rows in the Settings panel
 *      (registry: `store/settingsRegistry.ts`), Save downloads the envelope and Load picks a
 *      file, runs the SAME decode + validate as the boot restore, and applies it as
 *      `mode: 'file'` (the adapter makes that one undo entry). Every failure is a toast.
 *
 * The toggle and the interval are the Settings ▸ Files ▸ Autosave rows, read from the
 * APP'S OWN autosave store (`createAutosaveSettingsStore` in engine/store/autosaveStore.ts),
 * passed as the required `settings` option — there is no default, so a Session can never
 * read app-gmt's keys by omission. The same store must be the one the app hands
 * `registerCoreSettings({ autosave })`, or the rows would govern something else. Autosave is
 * off until the user turns it on; with it off a boot restores nothing and writes nothing,
 * while Save / Load to a file keep working.
 *
 * ── How this relates to app-gmt's <UnsavedWorkGuard/> + SceneIO ───────────────────────
 * Same settings, different contract. GMT's scene is heavy and loads through `loadScene`
 * (compile gate, worker config) and `loadPreset` (which wipes undo, rewrites project
 * settings and MERGES the favourites document with a toast — ADR-0112), so GMT stashes a
 * dirty scene and offers a manual File ▸ Restore Last Session. An app whose session is
 * light and whose state lives in its own stores + document providers wants the session
 * back automatically and without the scene loader; that is this module. It deliberately
 * does not touch `getPreset` / `loadPreset`, the dirty flag or the beforeunload prompt.
 *
 * @assumption The adapter's `apply(…, 'boot')` runs before anything has opened an undo
 *   bracket. True for the one caller (gradient-explorer/v2/session.ts, called from main.tsx
 *   before render); nothing enforces it.
 * @assumption `pagehide` fires on reload / close / navigation in every browser the apps
 *   support, and a synchronous localStorage write inside it lands. Measured on Chromium by
 *   `npm run smoke:ge-session` step [3] (it reloads mid-session with a 600 s interval, and went
 *   red when the flush was removed); not measured on Safari or Firefox.
 *
 * @see docs/adr/0121-the-session-restores-itself.md
 * @see store/sessionEnvelope.ts (the pure envelope + boot decision; node-tested)
 * @see palette/store/workingSession.ts (the Gradient Explorer's adapter)
 */

import { safeLocalGet, safeLocalSet, safeLocalRemove } from '../../store/safeLocalStorage';
import { registerSetting } from '../../store/settingsRegistry';
import type { AutosaveSettingsStore } from '../store/autosaveStore';
import { showToast } from '../store/toastStore';
import { downloadBlob } from '../../utils/SceneFormat';
import {
    encodeSession,
    decodeSession,
    sessionBootAction,
    type SessionBootAction,
    type SessionDecodeFailure,
} from '../../store/sessionEnvelope';

export type SessionApplyMode =
    /** Restored from the autosave slot at boot — silently, with no undo entry. */
    | 'boot'
    /** Loaded from a file the user picked — one undoable step. */
    | 'file';

export interface SessionAdapter<T> {
    /** The envelope's format tag, e.g. 'gmt-gx-session'. */
    format: string;
    /** The envelope version this build writes AND the only one it reads. */
    version: number;
    /** The current session body (plain JSON). `compact` = drop what is heaviest; used only
     *  when a full write is refused by storage. */
    capture: (opts: { compact: boolean }) => Record<string, unknown>;
    /** Validate an untrusted body (storage or a file). Never throws; null = refuse. */
    validate: (body: Record<string, unknown>) => T | null;
    /** Apply a validated session. */
    apply: (session: T, mode: SessionApplyMode) => void;
}

export type SessionReadResult<T> =
    | { ok: true; session: T }
    | { ok: false; reason: SessionDecodeFailure | 'invalid'; version?: number };

/** Decode + validate an untrusted payload. Never throws. */
export const readSession = <T>(adapter: SessionAdapter<T>, text: unknown): SessionReadResult<T> => {
    const d = decodeSession(text, adapter.format, adapter.version);
    if (!d.ok) return d;
    let session: T | null = null;
    try {
        session = adapter.validate(d.body);
    } catch {
        session = null;
    }
    return session === null ? { ok: false, reason: 'invalid' } : { ok: true, session };
};

// ── 1. boot restore ──────────────────────────────────────────────────────────────────

/**
 * Restore the stored session, if the decision says so. Call once, after the store and every
 * provider exist and before the first render. Returns what it did.
 */
export const restoreSessionOnBoot = <T>(
    adapter: SessionAdapter<T>,
    opts: { storageKey: string; settings: AutosaveSettingsStore; preempted?: boolean },
): SessionBootAction => {
    const enabled = opts.settings.getState().enabled;
    const preempted = !!opts.preempted;
    const read = enabled && !preempted ? readSession(adapter, safeLocalGet(opts.storageKey)) : null;
    const action = sessionBootAction({ enabled, preempted, hasValidStored: !!read?.ok });
    if (action === 'clear') safeLocalRemove(opts.storageKey);
    if (action === 'restore' && read?.ok) {
        try {
            adapter.apply(read.session, 'boot');
        } catch (err) {
            // A provider that throws mid-apply leaves a partial restore, which is still a
            // working app; a throw out of main.tsx would be a blank page.
            console.warn('[Session] restoring the stored session failed — starting clean', err);
            return 'fresh';
        }
    }
    return action;
};

// ── 2. autosave ──────────────────────────────────────────────────────────────────────

/**
 * Keep the stored session current. Returns an uninstall. The baseline is captured at install,
 * so install AFTER `restoreSessionOnBoot` — otherwise the restore itself reads as a change.
 */
export const installSessionAutosave = <T>(
    adapter: SessionAdapter<T>,
    opts: { storageKey: string; settings: AutosaveSettingsStore },
): (() => void) => {
    const key = opts.storageKey;
    const settings = opts.settings;
    const bodyJson = (compact: boolean): { body: Record<string, unknown>; json: string } | null => {
        try {
            const body = adapter.capture({ compact });
            return { body, json: JSON.stringify(body) };
        } catch (err) {
            console.warn('[Session] capture failed', err);
            return null;
        }
    };
    let last: string | null = bodyJson(false)?.json ?? null;
    let warned = false;

    const write = (): void => {
        if (!settings.getState().enabled) return;
        const full = bodyJson(false);
        if (!full || full.json === last) return;
        let ok = safeLocalSet(key, encodeSession(adapter.format, adapter.version, full.body));
        if (!ok) {
            const compact = bodyJson(true);
            ok = !!compact && safeLocalSet(key, encodeSession(adapter.format, adapter.version, compact.body));
            if (!ok && !warned) {
                warned = true;
                console.warn('[Session] the session could not be written to browser storage (full or blocked)');
            }
        }
        // Remember the FULL body even after a compact write: an unchanged session must not
        // retry a write storage has already refused, every tick.
        if (ok) last = full.json;
    };

    let timer: ReturnType<typeof setInterval> | null = null;
    const arm = (): void => {
        if (timer !== null) clearInterval(timer);
        timer = null;
        const s = settings.getState();
        if (s.enabled) timer = setInterval(write, Math.max(5, s.intervalSec) * 1000);
    };
    let prev = settings.getState();
    const unsubscribe = settings.subscribe((s) => {
        if (s.enabled === prev.enabled && s.intervalSec === prev.intervalSec) return;
        if (!s.enabled && prev.enabled) {
            safeLocalRemove(key);
            last = null; // re-enabling writes the session as it is then, changed or not
        }
        prev = s;
        arm();
    });
    arm();

    const onPageHide = (): void => write();
    const onVisibility = (): void => {
        if (document.visibilityState === 'hidden') write();
    };
    window.addEventListener('pagehide', onPageHide);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
        if (timer !== null) clearInterval(timer);
        unsubscribe();
        window.removeEventListener('pagehide', onPageHide);
        document.removeEventListener('visibilitychange', onVisibility);
    };
};

// ── 3. the file loop ─────────────────────────────────────────────────────────────────

export interface SessionFileSettingsOptions {
    /** Prefix for the two setting ids (`<prefix>.save`, `<prefix>.load`). */
    idPrefix: string;
    /** Settings tab + section. Default 'Files' ▸ 'Session'. */
    tab?: string;
    section?: string;
    /** The download's full file name, asked at click time (it may name the current work). */
    fileName: () => string;
    /** The file picker's `accept`. */
    accept: string;
    /** What the toasts call it. Default 'session'. */
    noun?: string;
    save: { label: string; description?: string; buttonLabel?: string };
    load: { label: string; description?: string; buttonLabel?: string };
}

const capitalise = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** Download the current session as an envelope file. */
export const saveSessionFile = <T>(adapter: SessionAdapter<T>, fileName: string, noun = 'session'): void => {
    try {
        const text = encodeSession(adapter.format, adapter.version, adapter.capture({ compact: false }));
        downloadBlob(new Blob([text], { type: 'application/json' }), fileName);
        showToast(`${capitalise(noun)} saved — ${fileName}`, 'success');
    } catch (err) {
        console.error('[Session] save failed', err);
        showToast(`Could not save the ${noun} — see console`, 'error');
    }
};

/** Why a payload was refused, as a sentence for a toast. */
export const sessionRefusalMessage = (reason: SessionDecodeFailure | 'invalid', noun: string, version: number, found?: number): string =>
    reason === 'version'
        ? `That ${noun} file is format v${found ?? '?'}; this version of the app reads v${version}`
        : reason === 'empty'
            ? `That file is empty`
            : `That file is not a ${noun} this app can open`;

/** Decode, validate and apply a session payload as a FILE load. Toasts the outcome; never throws. */
export const applySessionText = <T>(adapter: SessionAdapter<T>, text: unknown, noun = 'session'): boolean => {
    const r = readSession(adapter, text);
    if (!r.ok) {
        showToast(sessionRefusalMessage(r.reason, noun, adapter.version, r.version), 'error');
        return false;
    }
    try {
        adapter.apply(r.session, 'file');
    } catch (err) {
        console.error('[Session] applying the loaded file failed', err);
        showToast(`Could not load that ${noun} — see console`, 'error');
        return false;
    }
    showToast(`${capitalise(noun)} loaded — undo puts back what you had`, 'success');
    return true;
};

/**
 * One reusable hidden file input. Attached to the document (older WebKit ignores `.click()`
 * on a detached input) and reset after each pick so choosing the same file twice still
 * fires `change`.
 */
let _picker: HTMLInputElement | null = null;
const pickFile = (accept: string, onFile: (file: File) => void): void => {
    if (!_picker) {
        _picker = document.createElement('input');
        _picker.type = 'file';
        _picker.style.display = 'none';
        _picker.setAttribute('aria-hidden', 'true');
        document.body.appendChild(_picker);
    }
    const input = _picker;
    input.accept = accept;
    input.onchange = () => {
        const file = input.files?.[0];
        input.value = '';
        if (file) onFile(file);
    };
    input.click();
};

/** Open the picker and load the chosen file as a session. */
export const loadSessionFile = <T>(adapter: SessionAdapter<T>, accept: string, noun = 'session'): void => {
    pickFile(accept, (file) => {
        file.text().then(
            (text) => { applySessionText(adapter, text, noun); },
            (err) => {
                console.error('[Session] reading the file failed', err);
                showToast(`Could not read that file`, 'error');
            },
        );
    });
};

/**
 * Register Save / Load rows in the Settings panel. Any app with a session adapter can call
 * it; the rows appear under the tab + section given (default Files ▸ Session), after the
 * Autosave rows that govern the stored copy. Returns an unregister.
 */
export const registerSessionFileSettings = <T>(adapter: SessionAdapter<T>, o: SessionFileSettingsOptions): (() => void) => {
    const tab = o.tab ?? 'Files';
    const section = o.section ?? 'Session';
    const noun = o.noun ?? 'session';
    const offSave = registerSetting({
        id: `${o.idPrefix}.save`,
        tab,
        section,
        label: o.save.label,
        description: o.save.description,
        control: { kind: 'action', buttonLabel: o.save.buttonLabel ?? 'Save…' },
        set: () => saveSessionFile(adapter, o.fileName(), noun),
        order: 0,
    });
    const offLoad = registerSetting({
        id: `${o.idPrefix}.load`,
        tab,
        section,
        label: o.load.label,
        description: o.load.description,
        control: { kind: 'action', buttonLabel: o.load.buttonLabel ?? 'Load…' },
        set: () => loadSessionFile(adapter, o.accept, noun),
        order: 1,
    });
    return () => { offSave(); offLoad(); };
};

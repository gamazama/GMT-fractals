/**
 * @engine/shortcuts — scope-based keyboard shortcut registry.
 *
 * Apps and plugins register shortcuts declaratively; the dispatcher
 * resolves keys against the current scope stack with priority + when-
 * predicate filtering. Replaces the central if-ladder approach with a
 * composable registry any app or plugin contributes to.
 *
 * Key syntax (normalized, case-insensitive, order-independent):
 *   'Ctrl+Z'        — Windows/Linux Ctrl
 *   'Cmd+Z'         — Mac Cmd (normalized to 'Meta' internally)
 *   'Mod+Z'         — Ctrl on Win/Linux, Cmd on Mac (platform-native)
 *   'Shift+Ctrl+Z'  — modifier order does not matter
 *   'Escape'        — named keys: Escape, Enter, Tab, Space, ArrowUp, …
 *
 * Text-input guard: by default, shortcuts do NOT fire when the active
 * element is an <input> (non-range), <textarea>, or contenteditable.
 * Individual shortcuts can opt in via `ignoreInputs: false`.
 *
 * Scope: shortcuts with no scope register as 'global'. Apps can push
 * named scopes on enter (e.g. 'timeline-hover') and pop on exit; the
 * dispatcher walks the scope stack newest-first, so nested scopes
 * override ancestors. Priority breaks ties within a scope.
 *
 * @see docs/history/engine/07_Shortcuts.md for the full design.
 * @see docs/adr/0022-shortcuts-scope-stack.md
 */

export interface ShortcutDef {
    /** Unique id within the dispatcher; re-registration with the same id replaces. */
    id: string;
    /** Key combo, see syntax above. */
    key: string;
    /** Scope tag; 'global' if omitted. */
    scope?: string;
    /** Higher = wins ties within a scope. Default 0. */
    priority?: number;
    /** Invoked when the key matches + scope is active + when() passes. */
    handler: (e: KeyboardEvent) => void;
    /** Short free-text for the shortcut-help UI. */
    description?: string;
    /** Free-text category for grouping in help UIs. */
    category?: string;
    /** Runtime guard; shortcut fires only if this returns truthy. */
    when?: () => boolean;
    /** Call preventDefault + stopPropagation after firing. Default true. */
    consume?: boolean;
    /**
     * Fire even when an <input>/<textarea>/contenteditable has focus.
     * Default false.
     *
     * @invariant The name reads as the INVERSE of its semantics —
     *   default `false` MEANS the input guard IS applied.
     *   `ignoreInputs: true` bypasses the guard.
     */
    ignoreInputs?: boolean;
}

// ── Platform detection ─────────────────────────────────────────────────
// Navigator.platform is deprecated but still widely supported; userAgent is
// the fallback. We only use this for 'Mod' resolution.
const isMac = (): boolean => {
    if (typeof navigator === 'undefined') return false;
    const p = (navigator as any).platform ?? '';
    const ua = navigator.userAgent ?? '';
    return /Mac|iPhone|iPad|iPod/i.test(`${p} ${ua}`);
};

// ── Key normalization ──────────────────────────────────────────────────

const MOD_ORDER = ['Ctrl', 'Alt', 'Shift', 'Meta'];

/** Normalize a key string to canonical form (modifier-order-fixed, case-unified). */
const normalizeKey = (key: string): string => {
    const parts = key.split('+').map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) return '';

    const modifiers = new Set<string>();
    let main = '';

    for (const p of parts) {
        const lower = p.toLowerCase();
        if (lower === 'ctrl' || lower === 'control') modifiers.add('Ctrl');
        else if (lower === 'alt' || lower === 'option') modifiers.add('Alt');
        else if (lower === 'shift') modifiers.add('Shift');
        else if (lower === 'meta' || lower === 'cmd' || lower === 'command' || lower === 'win') modifiers.add('Meta');
        else if (lower === 'mod') modifiers.add(isMac() ? 'Meta' : 'Ctrl');
        else {
            // Main key. Normalize: single letters → uppercase; named keys canonical.
            main = p.length === 1 ? p.toUpperCase() : canonicalNamedKey(p);
        }
    }

    const orderedMods = MOD_ORDER.filter((m) => modifiers.has(m));
    return orderedMods.length > 0 ? `${orderedMods.join('+')}+${main}` : main;
};

const canonicalNamedKey = (k: string): string => {
    const lower = k.toLowerCase();
    const map: Record<string, string> = {
        esc: 'Escape', escape: 'Escape',
        enter: 'Enter', return: 'Enter',
        tab: 'Tab',
        space: 'Space', spacebar: 'Space',
        up: 'ArrowUp', arrowup: 'ArrowUp',
        down: 'ArrowDown', arrowdown: 'ArrowDown',
        left: 'ArrowLeft', arrowleft: 'ArrowLeft',
        right: 'ArrowRight', arrowright: 'ArrowRight',
        home: 'Home', end: 'End',
        pageup: 'PageUp', pagedown: 'PageDown',
        backspace: 'Backspace', delete: 'Delete', del: 'Delete',
    };
    if (map[lower]) return map[lower];
    // Function keys F1..F12
    if (/^f([1-9]|1[0-2])$/i.test(k)) return k.toUpperCase();
    // Fallback: leave as-is but uppercase first letter
    return k.charAt(0).toUpperCase() + k.slice(1);
};

/** Derive the normalized key from a KeyboardEvent. */
const keyFromEvent = (e: KeyboardEvent): string => {
    const modifiers: string[] = [];
    if (e.ctrlKey) modifiers.push('Ctrl');
    if (e.altKey) modifiers.push('Alt');
    if (e.shiftKey) modifiers.push('Shift');
    if (e.metaKey) modifiers.push('Meta');

    // Skip the modifier keys themselves as "main" events
    if (e.key === 'Control' || e.key === 'Alt' || e.key === 'Shift' || e.key === 'Meta') return '';

    let main: string;
    if (e.code === 'Space') main = 'Space';
    else if (e.key.length === 1) main = e.key.toUpperCase();
    else main = canonicalNamedKey(e.key);

    return modifiers.length > 0 ? `${modifiers.join('+')}+${main}` : main;
};

// ── Registry ────────────────────────────────────────────────────────────

const _registry = new Map<string, ShortcutDef>();
const _scopeStack: string[] = ['global'];
const _scopeSubscribers = new Set<() => void>();

// ── Modal keyboard capture ───────────────────────────────────────────────
// A focused modal surface (e.g. the formula picker) sets this so plain
// single-key presses (letters / numbers / symbols) pass through to it for
// typing instead of firing app shortcuts. Necessary because the dispatcher
// runs in the CAPTURE phase (ADR-0060), so content-side stopPropagation can't
// intercept it. Ref-counted so overlapping owners compose; modifier combos
// (Ctrl/Cmd/Alt) are unaffected.
let _keyboardCaptureCount = 0;
export const setKeyboardCaptured = (active: boolean): void => {
    _keyboardCaptureCount = Math.max(0, _keyboardCaptureCount + (active ? 1 : -1));
};
export const isKeyboardCaptured = (): boolean => _keyboardCaptureCount > 0;

const _notifyScope = () => _scopeSubscribers.forEach((fn) => fn());

export const shortcuts = {
    register(def: ShortcutDef) {
        _registry.set(def.id, def);
    },
    unregister(id: string) {
        _registry.delete(id);
    },
    pushScope(scope: string) {
        _scopeStack.push(scope);
        _notifyScope();
    },
    popScope(scope: string) {
        // Pop nearest match — don't assume perfect stack order in case an
        // exit effect fires out-of-order under fast scope changes.
        for (let i = _scopeStack.length - 1; i >= 0; i--) {
            if (_scopeStack[i] === scope) {
                _scopeStack.splice(i, 1);
                _notifyScope();
                return;
            }
        }
    },
    list(): ShortcutDef[] {
        return Array.from(_registry.values());
    },
    lookup(key: string): ShortcutDef[] {
        const norm = normalizeKey(key);
        return this.list().filter((s) => normalizeKey(s.key) === norm);
    },
    clear() {
        _registry.clear();
    },
};

// ── Dispatcher ──────────────────────────────────────────────────────────

const DEFAULT_IGNORE_SELECTOR = 'input:not([type=range]),textarea,[contenteditable="true"],[contenteditable=""]';

const isInputFocused = (selector: string): boolean => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return false;
    return el.matches(selector);
};

/**
 * @invariant Tiebreak rule: FIRST-registered wins within the same
 *   scope-score + priority. `matches` comes out of `shortcuts.list()` in
 *   Map insertion order; `Array.prototype.sort` is stable (ES2019), so a
 *   score tie leaves the earlier registration at index 0 — and `matches[0]`
 *   is what gets returned. Later registrations sink to the TAIL, they do
 *   not win the head slot.
 *
 *   Note `_registry.set(def.id, def)` on an existing id keeps the ORIGINAL
 *   insertion position, so re-registering (e.g. `useShortcut` on a dep
 *   change) does not move a shortcut to the back of the queue.
 *
 *   Consequence: to beat an already-registered binding you MUST raise
 *   `priority` (or use a deeper scope) — registering later is not enough.
 *   `app-gmt`'s `gmt.undoCameraMove` (`Ctrl+Shift+Z`, `priority: 10`)
 *   depends on this: `installUndo()` runs first and registers
 *   `redo.global.shift` (`Mod+Shift+Z` → `Ctrl+Shift+Z` on Win/Linux), so
 *   dropping that `priority: 10` silently turns camera-undo into param-redo.
 *   Guarded by `npm run smoke:undo` ("[shortcuts] resolver tiebreak").
 *
 * @see docs/history/engine/06_Undo_Transactions.md (§Hotkey routing — agrees)
 * @see docs/adr/0022-shortcuts-scope-stack.md (states the inverse; stale)
 */
const resolve = (normalized: string): ShortcutDef | null => {
    // Highest-index scope wins; priority breaks ties; first-registered
    // wins within same priority.
    const matches = shortcuts.list().filter((s) => {
        if (normalizeKey(s.key) !== normalized) return false;
        const scope = s.scope ?? 'global';
        return _scopeStack.includes(scope);
    });

    if (matches.length === 0) return null;

    const scoreOf = (def: ShortcutDef): number => {
        const scope = def.scope ?? 'global';
        // Scope index (higher in stack = higher score) × large multiplier
        const scopeIdx = _scopeStack.lastIndexOf(scope);
        return scopeIdx * 10000 + (def.priority ?? 0);
    };

    matches.sort((a, b) => scoreOf(b) - scoreOf(a));
    return matches[0];
};

let _installed = false;
let _listener: ((e: KeyboardEvent) => void) | null = null;
// The root the live listener is attached to. Stashed so uninstall can detach
// from the SAME target install used; nulled on uninstall so the module never
// retains a detached node.
let _root: Window | Document | HTMLElement | null = null;

export interface InstallShortcutsOptions {
    /** Event target. Default: window. */
    domRoot?: Window | Document | HTMLElement;
    /** Capture phase? Default: false (bubble). */
    capture?: boolean;
    /** Selector for elements that suppress shortcuts by default. */
    ignoreSelector?: string;
}

/**
 * @invariant Idempotent via `_installed` guard — the first install wins.
 *   Options passed on a SECOND call are dropped, but no longer silently: a
 *   `console.warn` names the ignored keys, because a second
 *   `installShortcuts({domRoot: customRoot})` after a first bare call leaves
 *   the listener on `window`, and that is a wiring bug worth hearing about.
 *   — proven by: npm run test:shortcuts-teardown ("a second install with
 *   options is ignored and warned about").
 */
export const installShortcuts = (options: InstallShortcutsOptions = {}) => {
    if (_installed) {
        const dropped = Object.keys(options);
        if (dropped.length > 0) {
            console.warn(
                '[Shortcuts] installShortcuts() called again; the first install wins and ' +
                'these options are ignored: ' + dropped.join(', '),
            );
        }
        return;
    }
    _installed = true;

    const root = options.domRoot ?? window;
    _root = root;
    const capture = options.capture ?? false;
    const ignoreSelector = options.ignoreSelector ?? DEFAULT_IGNORE_SELECTOR;

    _listener = (e: KeyboardEvent) => {
        const normalized = keyFromEvent(e);
        if (!normalized) return;

        const match = resolve(normalized);
        if (!match) return;

        // A focused modal surface owns single-key typing — let letters/numbers/
        // symbols through to it instead of firing a single-key shortcut.
        if (isKeyboardCaptured() && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) return;

        if (!match.ignoreInputs && isInputFocused(ignoreSelector)) return;
        if (match.when && !match.when()) return;

        match.handler(e);
        if (match.consume !== false) {
            e.preventDefault();
            e.stopPropagation();
        }
    };

    (root as any).addEventListener('keydown', _listener, capture);

    // Expose on window for smoke tests + dev console — mirrors the
    // __camera / __animEngine / __store / __screenshot pattern.
    if (typeof window !== 'undefined') {
        (window as any).__shortcuts = shortcuts;
    }
};

/**
 * Tear down the keydown listener and reset registry, scope stack, capture
 * count and scope subscribers — the inverse of `installShortcuts`.
 *
 * @invariant Detaches from the root install attached to (not `window`
 *   literally), resets `_keyboardCaptureCount` to 0 and clears
 *   `_scopeSubscribers`, so a re-install starts from nothing. Until
 *   2026-09-02 this removed from `window` regardless of `domRoot` (a
 *   custom-root install was never detached) and left the capture count
 *   stranded, which would have swallowed every single-key shortcut for the
 *   life of the page — both latent, since nothing calls this yet.
 *   — proven by: npm run test:shortcuts-teardown ("uninstall detaches from
 *   the root install used", "capture count is reset by uninstall").
 *   Falsified 2026-09-02 against the previous body: the harness died with
 *   `ReferenceError: window is not defined` on the first uninstall.
 *
 *   `window.__shortcuts` is deliberately NOT deleted: `debug/smoke-undo.mts`
 *   uses its presence as the "installShortcuts ran" probe.
 *
 *   Behaviour note: with two capturing surfaces live at teardown, the reset
 *   un-captures the still-focused one. Exotic, and the right call for a full
 *   teardown.
 */
export const uninstallShortcuts = () => {
    if (_listener && _root) {
        // Both phases rather than a stored flag — strictly more robust.
        (_root as any).removeEventListener('keydown', _listener, false);
        (_root as any).removeEventListener('keydown', _listener, true);
    }
    _listener = null;
    _root = null;
    _keyboardCaptureCount = 0;
    _scopeSubscribers.clear();
    _registry.clear();
    _scopeStack.length = 0;
    _scopeStack.push('global');
    _installed = false;
};

// ── React integration ──────────────────────────────────────────────────

import { useEffect } from 'react';

/** Register a shortcut for the lifetime of a component. */
export const useShortcut = (def: ShortcutDef) => {
    const { id, key, handler, when, scope, priority, description, category, consume, ignoreInputs } = def;
    useEffect(() => {
        shortcuts.register({ id, key, handler, when, scope, priority, description, category, consume, ignoreInputs });
        return () => shortcuts.unregister(id);
    }, [id, key, handler, when, scope, priority, description, category, consume, ignoreInputs]);
};

/** Push a scope onto the stack while `active` is true. */
export const useShortcutScope = (scope: string, active: boolean) => {
    useEffect(() => {
        if (!active) return;
        shortcuts.pushScope(scope);
        return () => shortcuts.popScope(scope);
    }, [scope, active]);
};

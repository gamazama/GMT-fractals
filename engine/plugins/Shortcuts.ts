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
 * See docs/07_Shortcuts.md for the full design.
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
    /** Fire even when an <input>/<textarea>/contenteditable has focus. Default false. */
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

const resolve = (normalized: string): ShortcutDef | null => {
    // Highest-index scope wins; priority breaks ties; most-recently-registered
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

export interface InstallShortcutsOptions {
    /** Event target. Default: window. */
    domRoot?: Window | Document | HTMLElement;
    /** Capture phase? Default: false (bubble). */
    capture?: boolean;
    /** Selector for elements that suppress shortcuts by default. */
    ignoreSelector?: string;
}

export const installShortcuts = (options: InstallShortcutsOptions = {}) => {
    if (_installed) return;
    _installed = true;

    const root = options.domRoot ?? window;
    const capture = options.capture ?? false;
    const ignoreSelector = options.ignoreSelector ?? DEFAULT_IGNORE_SELECTOR;

    _listener = (e: KeyboardEvent) => {
        const normalized = keyFromEvent(e);
        if (!normalized) return;

        const match = resolve(normalized);
        if (!match) return;

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

export const uninstallShortcuts = () => {
    if (_listener) {
        window.removeEventListener('keydown', _listener, false);
        window.removeEventListener('keydown', _listener, true);
        _listener = null;
    }
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

/**
 * @engine/undo — shortcut registration + topbar UI for the unified
 * transaction stack.
 *
 * The stack itself lives in store/slices/historySlice.ts (which owns
 * the scoped transactions, handleInteractionStart/End capture, and the
 * backward-compat shims). This plugin layers:
 *
 *   - Ctrl+Z / Ctrl+Y key bindings via @engine/shortcuts
 *   - Mod+Shift+Z for redo (Mac convention)
 *   - Scoped bindings under a 'timeline-hover' scope so Ctrl+Z on
 *     the timeline undoes the most recent animation edit regardless
 *     of whether a later param edit exists on the global stack
 *   - UndoButton / RedoButton components for @engine/topbar
 *
 * Idempotent install. Apps opt in by calling installUndo().
 */

import React from 'react';
import { useEngineStore } from '../../store/engineStore';
import { shortcuts } from './Shortcuts';
import { topbar } from './TopBar';

// ── UI components ──────────────────────────────────────────────────────

const UndoIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 14 4 9 9 4" />
        <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
    </svg>
);

const RedoIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 14 20 9 15 4" />
        <path d="M4 20v-7a4 4 0 0 1 4-4h12" />
    </svg>
);

export const UndoButton: React.FC = () => {
    const canUndo = useEngineStore((s) => s.canUndo());
    const peek = useEngineStore((s) => s.peekUndo());
    const undo = useEngineStore((s) => s.undo);

    const label = peek ? `Undo: ${peek.label ?? peek.scope}` : 'Nothing to undo';
    return (
        <button
            onClick={() => undo()}
            disabled={!canUndo}
            className={`p-1.5 rounded transition-colors ${canUndo ? 'text-gray-300 hover:text-white hover:bg-white/10' : 'text-gray-700 cursor-not-allowed'}`}
            title={label}
        >
            <UndoIcon />
        </button>
    );
};

export const RedoButton: React.FC = () => {
    const canRedo = useEngineStore((s) => s.canRedo());
    const peek = useEngineStore((s) => s.peekRedo());
    const redo = useEngineStore((s) => s.redo);

    const label = peek ? `Redo: ${peek.label ?? peek.scope}` : 'Nothing to redo';
    return (
        <button
            onClick={() => redo()}
            disabled={!canRedo}
            className={`p-1.5 rounded transition-colors ${canRedo ? 'text-gray-300 hover:text-white hover:bg-white/10' : 'text-gray-700 cursor-not-allowed'}`}
            title={label}
        >
            <RedoIcon />
        </button>
    );
};

// ── Install ─────────────────────────────────────────────────────────────

let _installed = false;

export interface InstallUndoOptions {
    /** Skip topbar button registration (useful for headless / bespoke chrome). */
    hideTopBarButtons?: boolean;
    /** Skip Ctrl+Z / Ctrl+Y keyboard bindings. */
    hideShortcuts?: boolean;
}

export const installUndo = (options: InstallUndoOptions = {}) => {
    if (_installed) return;
    _installed = true;

    if (!options.hideShortcuts) {
        // Global Ctrl+Z / Ctrl+Y. 'Mod' = Ctrl on Win/Linux, Meta on Mac.
        shortcuts.register({
            id: 'undo.global',
            key: 'Mod+Z',
            description: 'Undo',
            category: 'Edit',
            handler: () => { useEngineStore.getState().undo(); },
        });
        shortcuts.register({
            id: 'redo.global',
            key: 'Mod+Y',
            description: 'Redo',
            category: 'Edit',
            handler: () => { useEngineStore.getState().redo(); },
        });
        shortcuts.register({
            id: 'redo.global.shift',
            key: 'Mod+Shift+Z',
            description: 'Redo (Mac)',
            category: 'Edit',
            handler: () => { useEngineStore.getState().redo(); },
        });

        // Timeline-hover scope: Ctrl+Z routes to animation scope. This
        // only fires when the timeline pushes 'timeline-hover' scope;
        // otherwise the global binding above wins by scope-score.
        shortcuts.register({
            id: 'undo.animation',
            key: 'Mod+Z',
            scope: 'timeline-hover',
            priority: 10,
            description: 'Undo animation edit',
            category: 'Animation',
            handler: () => { useEngineStore.getState().undo('animation'); },
        });
        shortcuts.register({
            id: 'redo.animation',
            key: 'Mod+Y',
            scope: 'timeline-hover',
            priority: 10,
            description: 'Redo animation edit',
            category: 'Animation',
            handler: () => { useEngineStore.getState().redo('animation'); },
        });
    }

    if (!options.hideTopBarButtons) {
        topbar.register({ id: 'undo', slot: 'right', order: -20, component: UndoButton });
        topbar.register({ id: 'redo', slot: 'right', order: -19, component: RedoButton });
    }
};

export const uninstallUndo = () => {
    shortcuts.unregister('undo.global');
    shortcuts.unregister('redo.global');
    shortcuts.unregister('redo.global.shift');
    shortcuts.unregister('undo.animation');
    shortcuts.unregister('redo.animation');
    topbar.unregister('undo');
    topbar.unregister('redo');
    _installed = false;
};

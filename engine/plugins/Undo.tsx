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
import { useAnimationStore } from '../../store/animationStore';
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
    const canUndo = useEngineStore((s) => s.canUndo('param'));
    const peek = useEngineStore((s) => s.peekUndo('param'));
    const undo = useEngineStore((s) => s.undo);

    const label = peek ? `Undo: ${peek.label ?? peek.scope}` : 'Nothing to undo';
    return (
        <button
            onClick={() => undo('param')}
            disabled={!canUndo}
            className={`p-1.5 rounded transition-colors ${canUndo ? 'text-gray-300 hover:text-white hover:bg-white/10' : 'text-gray-700 cursor-not-allowed'}`}
            title={label}
        >
            <UndoIcon />
        </button>
    );
};

export const RedoButton: React.FC = () => {
    const canRedo = useEngineStore((s) => s.canRedo('param'));
    const peek = useEngineStore((s) => s.peekRedo('param'));
    const redo = useEngineStore((s) => s.redo);

    const label = peek ? `Redo: ${peek.label ?? peek.scope}` : 'Nothing to redo';
    return (
        <button
            onClick={() => redo('param')}
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
        // Scoped to 'param' so a camera gesture sitting on top of the
        // unified stack doesn't get popped by a parameter-undo keystroke.
        // Camera has its own Ctrl+Shift+Z binding; timeline has its own
        // 'timeline-hover' scope below.
        shortcuts.register({
            id: 'undo.global',
            key: 'Mod+Z',
            description: 'Undo',
            category: 'Edit',
            handler: () => { useEngineStore.getState().undo('param'); },
        });
        shortcuts.register({
            id: 'redo.global',
            key: 'Mod+Y',
            description: 'Redo',
            category: 'Edit',
            handler: () => { useEngineStore.getState().redo('param'); },
        });
        shortcuts.register({
            id: 'redo.global.shift',
            key: 'Mod+Shift+Z',
            description: 'Redo (Mac)',
            category: 'Edit',
            handler: () => { useEngineStore.getState().redo('param'); },
        });

        // Timeline-hover scope: Ctrl+Z / Ctrl+Y route to the animation
        // store's separate undo stack. This only fires when the
        // Timeline component pushes 'timeline-hover' scope (cursor
        // over the timeline); otherwise the global binding above wins
        // by scope-score.
        //
        // Animation history lives in animationStore.undoStack (sequence
        // snapshots), not in the unified historySlice — F2b's planned
        // unification never landed. Direct import of useAnimationStore
        // is fine: the animation store's slice files don't import back
        // into engine-core, so there's no cycle.
        const animUndo = (action: 'undo' | 'redo') => {
            const fn = (useAnimationStore.getState() as any)[action];
            if (typeof fn === 'function') fn();
        };
        shortcuts.register({
            id: 'undo.animation',
            key: 'Mod+Z',
            scope: 'timeline-hover',
            priority: 10,
            description: 'Undo animation edit',
            category: 'Animation',
            handler: () => animUndo('undo'),
        });
        shortcuts.register({
            id: 'redo.animation',
            key: 'Mod+Y',
            scope: 'timeline-hover',
            priority: 10,
            description: 'Redo animation edit',
            category: 'Animation',
            handler: () => animUndo('redo'),
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

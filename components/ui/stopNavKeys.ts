import type React from 'react';

/**
 * Key-event handlers that stop a surface's keystrokes from reaching the
 * window-level fly-navigation listener (useInputController) — without them,
 * Space/WASD typed in a panel's fields drive the camera. Spread onto the
 * surface's root element: `<div {...stopNavKeys()}>`.
 *
 * `allowEscape: true` lets Escape bubble through so registry-driven dismissal
 * still fires from a focused field; omit it for surfaces that handle their own
 * close (e.g. dockable panels) where Escape should be swallowed too.
 */
export function stopNavKeys(opts: { allowEscape?: boolean } = {}): {
    onKeyDown: (e: React.KeyboardEvent) => void;
    onKeyUp: (e: React.KeyboardEvent) => void;
    onKeyPress: (e: React.KeyboardEvent) => void;
} {
    const stop = (e: React.KeyboardEvent) => e.stopPropagation();
    return {
        onKeyDown: opts.allowEscape
            ? (e) => { if (e.key !== 'Escape') e.stopPropagation(); }
            : stop,
        onKeyUp: stop,
        onKeyPress: stop,
    };
}

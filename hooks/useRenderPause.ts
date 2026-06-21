/**
 * Pause the engine render loop while a transient surface (menu, dropdown,
 * picker, context menu) is open, freeing the GPU while the user reads or
 * edits options.
 *
 * Save-and-restore preserves prior pause state — if the user had manually
 * paused before opening, we don't auto-resume on close.
 *
 * Lives in shared hooks/ (not a feature folder) so both the engine/ core
 * and engine-gmt/ feature layers can reuse it without crossing layers.
 *
 * @see dev/plans/formula-picker-design.md → "Performance — primary mechanism"
 */

import { useCallback, useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { useEngineStore } from '../store/engineStore';

// ── Shared ref-counted "UI pause" ────────────────────────────────────────────
// Several transient surfaces (menu, gallery, formula picker, dropdowns, context
// menus, gradient editor) pause the render while open. They used to EACH
// save-and-restore the single `isPaused` boolean independently — so a surface
// opened from inside another captured the OUTER surface's transient `true` and
// restored it on close, leaving rendering stuck paused (e.g. loading a gallery
// item from the menu). Ref-counting fixes the whole class: capture the user's
// real pause state on the FIRST pause, hold paused while any surface is open,
// and restore it only when the LAST one closes.
let _uiPauseCount = 0;
let _savedUserPause = false;

/** Add one transient UI pause. Pairs with {@link popUiPause}. */
export function pushUiPause(): void {
    if (_uiPauseCount === 0) {
        _savedUserPause = useEngineStore.getState().isPaused;
        useEngineStore.getState().setIsPaused(true);
    }
    _uiPauseCount++;
}

/** Remove one transient UI pause; restores the saved state when the last lifts. */
export function popUiPause(): void {
    if (_uiPauseCount === 0) return;
    _uiPauseCount--;
    if (_uiPauseCount === 0 && useEngineStore.getState().isPaused) {
        // Only restore if a UI pause is still in effect — if the user manually
        // un-paused while a surface was open, respect that and stay un-paused.
        useEngineStore.getState().setIsPaused(_savedUserPause);
    }
}

export function useRenderPause(active: boolean = true): void {
    useEffect(() => {
        if (!active) return;
        pushUiPause();
        return () => { popUiPause(); };
    }, [active]);
}

// Keys that pop open a focused native <select>.
const OPEN_SELECT_KEYS = new Set([' ', 'Enter', 'ArrowDown', 'ArrowUp']);

/**
 * Imperative variant for a native `<select>`, which has no JS-observable
 * open/close state. Pause on open-intent (pointer-down / opening keypress),
 * resume on selection (`change`) or focus loss (`blur`).
 *
 * Same save/restore contract as {@link useRenderPause}: a manual pause set
 * before opening is preserved on resume.
 *
 * Spread `selectHandlers` onto the `<select>` and call `resume()` from the
 * change handler so the viewport un-pauses to show the new value — a native
 * select keeps focus on selection, so `onBlur` alone wouldn't resume.
 */
export function useSelectRenderPause() {
    // Re-entry guard: true while this select holds a UI pause (so paired
    // pointerdown/keydown opens don't double-push, and blur/change don't
    // double-pop). The saved pause value lives in the shared ref-count.
    const pushed = useRef(false);

    const pause = useCallback(() => {
        if (pushed.current) return;
        pushed.current = true;
        pushUiPause();
    }, []);

    const resume = useCallback(() => {
        if (!pushed.current) return;
        pushed.current = false;
        popUiPause();
    }, []);

    const onKeyDown = useCallback((e: KeyboardEvent<HTMLSelectElement>) => {
        if (OPEN_SELECT_KEYS.has(e.key)) pause();
        else if (e.key === 'Escape') resume();
    }, [pause, resume]);

    // Release on unmount if a pause is still held (e.g. the select is removed
    // while open) so the ref-count can't leak and leave rendering stuck paused.
    useEffect(() => () => { if (pushed.current) { pushed.current = false; popUiPause(); } }, []);

    return {
        resume,
        selectHandlers: {
            onMouseDown: pause,
            onKeyDown,
            onBlur: resume,
        },
    };
}

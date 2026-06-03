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

export function useRenderPause(active: boolean = true): void {
    useEffect(() => {
        if (!active) return;
        const wasPaused = useEngineStore.getState().isPaused;
        useEngineStore.getState().setIsPaused(true);
        return () => {
            // Only restore if our pause is still in effect — if the user
            // (or another consumer) flipped pause while open, respect their
            // choice rather than overriding it.
            if (useEngineStore.getState().isPaused) {
                useEngineStore.getState().setIsPaused(wasPaused);
            }
        };
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
    // undefined ⇒ not currently paused by us; otherwise holds the pause
    // state to restore. Single source of truth for both the re-entry guard
    // and the saved value.
    const priorPause = useRef<boolean | undefined>(undefined);

    const pause = useCallback(() => {
        if (priorPause.current !== undefined) return;
        priorPause.current = useEngineStore.getState().isPaused;
        useEngineStore.getState().setIsPaused(true);
    }, []);

    const resume = useCallback(() => {
        if (priorPause.current === undefined) return;
        const prior = priorPause.current;
        priorPause.current = undefined;
        if (useEngineStore.getState().isPaused) {
            useEngineStore.getState().setIsPaused(prior);
        }
    }, []);

    const onKeyDown = useCallback((e: KeyboardEvent<HTMLSelectElement>) => {
        if (OPEN_SELECT_KEYS.has(e.key)) pause();
        else if (e.key === 'Escape') resume();
    }, [pause, resume]);

    return {
        resume,
        selectHandlers: {
            onMouseDown: pause,
            onKeyDown,
            onBlur: resume,
        },
    };
}

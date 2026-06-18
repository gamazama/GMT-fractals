import { useCallback, useEffect, useRef, useState } from 'react';

export type ClipboardCopyState = 'idle' | 'copied' | 'failed';

/**
 * useClipboardCopy — copy-to-clipboard with transient feedback state.
 *
 * Returns `{ state, copy, reset }`:
 *  • `state` — 'idle' | 'copied' | 'failed' (drive the button's success/fail styling).
 *  • `copy(text)` — writes `text` to the clipboard, flips state to 'copied'/'failed',
 *    then auto-resets to 'idle' after `resetMs`.
 *  • `reset()` — clear back to 'idle' immediately (e.g. when the underlying item changes).
 *
 * Folds the identical `try/catch → setState('copied'|'failed') → setTimeout(reset)`
 * shape that was duplicated across the gallery Lightbox (copyImageLink / copyShareLink)
 * and other copy buttons. The pending timeout is tracked in a ref so a re-copy or unmount
 * cancels a stale reset.
 *
 * @invariant Engine-core hook (hooks/) — no store, no app/engine-gmt imports.
 */
export function useClipboardCopy(resetMs = 1800) {
    const [state, setState] = useState<ClipboardCopyState>('idle');
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearTimer = () => {
        if (timer.current !== null) {
            clearTimeout(timer.current);
            timer.current = null;
        }
    };

    const reset = useCallback(() => {
        clearTimer();
        setState('idle');
    }, []);

    const copy = useCallback(async (text: string) => {
        clearTimer();
        try {
            await navigator.clipboard.writeText(text);
            setState('copied');
        } catch {
            setState('failed');
        }
        timer.current = setTimeout(() => {
            setState('idle');
            timer.current = null;
        }, resetMs);
    }, [resetMs]);

    // Cancel any pending reset on unmount.
    useEffect(() => clearTimer, []);

    return { state, copy, reset };
}

/**
 * Modifier-key tracking for canvas gestures.
 *
 * B (brush-resize) and C (pick-c) are sticky modifiers — held while the
 * user does a left-drag to enter a different gesture mode. Listeners
 * live on `window` so press / release work regardless of canvas focus.
 *
 * `mods` is a module-level singleton so the pointer handlers can read it
 * without prop / ref plumbing. Reset on window blur so a held key when
 * the tab loses focus doesn't strand a gesture mode.
 *
 * Bails on text-input focus so B / C in name fields / inspector inputs
 * don't silently arm canvas gestures.
 */

import { useEffect } from 'react';
import { PRECISION_SHIFT_MULT, PRECISION_ALT_MULT } from '../constants';

export const mods = { b: false, c: false };

const isTyping = (): boolean => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
};

/** Mounts window-level keydown / keyup / blur listeners that maintain
 *  the `mods` singleton. Cleans up on unmount. */
export const useModifierKeys = (): void => {
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (isTyping()) return;
            if (e.code === 'KeyB') mods.b = true;
            if (e.code === 'KeyC') mods.c = true;
        };
        const onKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'KeyB') mods.b = false;
            if (e.code === 'KeyC') mods.c = false;
        };
        const onBlur = () => { mods.b = false; mods.c = false; };
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('blur', onBlur);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('blur', onBlur);
        };
    }, []);
};

export const precisionMultiplier = (shift: boolean, alt: boolean): number => {
    if (shift) return PRECISION_SHIFT_MULT;
    if (alt) return PRECISION_ALT_MULT;
    return 1.0;
};

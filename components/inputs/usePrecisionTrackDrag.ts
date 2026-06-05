import React from 'react';

/**
 * usePrecisionTrackDrag — the shared "usable bits" of GMT's slider interaction,
 * extracted from ScalarInput so any track-style control can feel identical:
 * click-to-position on pointer-down, then delta-drag with the house precision
 * modifiers (Shift = ×10 coarse, Alt = ×0.1 fine), re-anchoring when a modifier
 * toggles mid-drag so the value never jumps. Both ScalarInput and the colour
 * picker's GradientSlider consume this — one source of truth for the feel.
 *
 * The caller owns the visual track; this only returns the pointer handlers.
 */
export interface PrecisionMapping {
    toDisplay: (v: number) => number;
    fromDisplay: (v: number) => number;
}

/**
 * The GMT precision-drag sensitivity multiplier from a pointer/keyboard-modifier
 * state: Shift = ×10 (coarse), Alt = ×0.1 (fine), combinable. Shared so the
 * sliders and the colour picker's 2D field / hue strip all speak the same modifiers.
 */
export const precisionMultiplier = (e: { shiftKey: boolean; altKey: boolean }): number =>
    (e.shiftKey ? 10 : 1) * (e.altKey ? 0.1 : 1);

export interface PrecisionTrackDragOptions {
    min?: number;
    max?: number;
    step?: number;
    mapping?: PrecisionMapping;
    hardMin?: number;
    hardMax?: number;
    disabled?: boolean;
    onChange: (v: number) => void;
    onDragStart?: () => void;
    onDragEnd?: () => void;
    /** Optional synchronous DOM update (ScalarInput uses it to move the fill/thumb without a render). */
    onImmediate?: (v: number) => void;
}

export function usePrecisionTrackDrag(opts: PrecisionTrackDragOptions) {
    const { min, max, step = 0.01, mapping, hardMin, hardMax, disabled, onChange, onDragStart, onDragEnd, onImmediate } = opts;
    const hasBounds = min !== undefined && max !== undefined && min !== max;

    const drag = React.useRef({ active: false, startX: 0, startValue: 0, lastShift: false, lastAlt: false });

    const quantize = React.useCallback((v: number) => (step ? Math.round(v / step) * step : v), [step]);
    const clampHard = React.useCallback((v: number) => {
        let x = v;
        if (hardMin !== undefined) x = Math.max(hardMin, x);
        if (hardMax !== undefined) x = Math.min(hardMax, x);
        return x;
    }, [hardMin, hardMax]);

    const onPointerDown = React.useCallback((e: React.PointerEvent<HTMLElement>) => {
        if (disabled || !hasBounds || e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);

        const rect = e.currentTarget.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const dMin = mapping ? mapping.toDisplay(min!) : min!;
        const dMax = mapping ? mapping.toDisplay(max!) : max!;
        const clickedDisplay = quantize(dMin + pct * (dMax - dMin));
        const v = clampHard(mapping ? mapping.fromDisplay(clickedDisplay) : clickedDisplay);

        // Begin the interaction BEFORE the first value change so the undo baseline is
        // the pre-click value (a track click jumps the value on pointer-down).
        onDragStart?.();
        onChange(v);
        onImmediate?.(v);

        drag.current = { active: true, startX: e.clientX, startValue: clickedDisplay, lastShift: e.shiftKey, lastAlt: e.altKey };
    }, [disabled, hasBounds, min, max, mapping, quantize, clampHard, onChange, onDragStart, onImmediate]);

    const onPointerMove = React.useCallback((e: React.PointerEvent<HTMLElement>) => {
        const d = drag.current;
        if (!d.active || disabled || !hasBounds) return;
        e.preventDefault();

        const rect = e.currentTarget.getBoundingClientRect();
        const dMin = mapping ? mapping.toDisplay(min!) : min!;
        const dMax = mapping ? mapping.toDisplay(max!) : max!;
        const base = (dMax - dMin) / rect.width;

        // Modifier toggled mid-drag → bake the current value as the new anchor.
        if (d.lastShift !== e.shiftKey || d.lastAlt !== e.altKey) {
            const oldSens = base * precisionMultiplier({ shiftKey: d.lastShift, altKey: d.lastAlt });
            d.startValue = d.startValue + (e.clientX - d.startX) * oldSens;
            d.startX = e.clientX;
            d.lastShift = e.shiftKey;
            d.lastAlt = e.altKey;
        }

        const sens = base * precisionMultiplier(e);
        let nextDisplay = quantize(d.startValue + (e.clientX - d.startX) * sens);
        nextDisplay = Math.max(dMin, Math.min(dMax, nextDisplay));
        const v = clampHard(mapping ? mapping.fromDisplay(nextDisplay) : nextDisplay);
        if (!isNaN(v)) {
            onChange(v);
            onImmediate?.(v);
        }
    }, [disabled, hasBounds, min, max, mapping, quantize, clampHard, onChange, onImmediate]);

    const onPointerUp = React.useCallback((e: React.PointerEvent<HTMLElement>) => {
        if (!drag.current.active) return;
        drag.current.active = false;
        try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* already released */ }
        onDragEnd?.();
    }, [onDragEnd]);

    return { onPointerDown, onPointerMove, onPointerUp, hasBounds };
}

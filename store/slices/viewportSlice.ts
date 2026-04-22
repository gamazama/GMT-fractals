/**
 * viewportSlice — owns viewport dimensions + DPR + mode.
 *
 * Phase 2a — pure refactor. These fields previously lived in
 * uiSlice (resolutionMode, fixedResolution) and rendererSlice
 * (canvasPixelSize, dpr). Consolidating them here is the groundwork
 * for the @engine/viewport plugin (Phase 2b) which will layer
 * adaptive-quality state + interaction state + qualityFraction
 * output on top. See docs/10_Viewport.md.
 *
 * No behaviour changes in 2a — setters preserve their reset-accum
 * emissions for backward compatibility with the fractal rendering
 * pipeline. Phase 4 will clean that coupling up.
 */

import { StateCreator } from 'zustand';
import { FractalStoreState, FractalActions } from '../../types';
import { FractalEvents } from '../../engine/FractalEvents';

// Default DPR — mobile gets 1.0, desktop uses devicePixelRatio capped at 2.
// This isMobile() heuristic belongs in a future @engine/environment plugin
// so mobile detection is a shared concern across plugins (docs/10_Viewport.md
// § Open questions → decided 2026-04-22). For now it's inlined.
const isMobile = () => {
    if (typeof window === 'undefined') return false;
    return (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
        || (window.innerWidth < 768);
};

const defaultDpr = () => {
    if (typeof window === 'undefined') return 1.0;
    if (isMobile()) return 1.0;
    return Math.min(window.devicePixelRatio || 1.0, 2.0);
};

export type ViewportSlice = Pick<FractalStoreState,
    'canvasPixelSize' | 'dpr' | 'resolutionMode' | 'fixedResolution'
> & Pick<FractalActions,
    'setCanvasPixelSize' | 'setDpr' | 'setResolutionMode' | 'setFixedResolution'
>;

export const createViewportSlice: StateCreator<
    FractalStoreState & FractalActions,
    [['zustand/subscribeWithSelector', never]],
    [],
    ViewportSlice
> = (set) => ({
    // Physical px of the post-sidebar canvas area. Authoritative writer
    // is ViewportArea's ResizeObserver on the flex-1 div. Read via
    // getCanvasPhysicalPixelSize() — do not read directly.
    canvasPixelSize: [1920, 1080],

    dpr: defaultDpr(),

    resolutionMode: 'Full',
    fixedResolution: [800, 600],

    setCanvasPixelSize: (w, h) => set({ canvasPixelSize: [w, h] }),

    setDpr: (v) => {
        set({ dpr: v });
        // Preserves the rendererSlice emission — fractal engine's
        // accumulation needs to reset on DPR change.
        FractalEvents.emit('reset_accum', undefined);
    },

    setResolutionMode: (m) => {
        set({ resolutionMode: m });
        FractalEvents.emit('reset_accum', undefined);
    },

    setFixedResolution: (w, h) => {
        set({ fixedResolution: [w, h] });
        FractalEvents.emit('reset_accum', undefined);
    },
});

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
    'canvasPixelSize' | 'dpr' | 'resolutionMode' | 'fixedResolution' |
    'qualityFraction' | 'fps' | 'fpsSmoothed' | 'adaptiveConfig'
> & Pick<FractalActions,
    'setCanvasPixelSize' | 'setDpr' | 'setResolutionMode' | 'setFixedResolution' |
    'reportFps' | 'holdAdaptive' | 'setAdaptiveConfig'
>;

// ── Adaptive loop module-level state ─────────────────────────────────────
// These are transient runtime values (grace timers, last-change timestamp,
// last state-update tick) that don't need to trigger React re-renders, so
// they live outside the store. The store only holds the user-facing
// qualityFraction / fps / fpsSmoothed fields.
let _holdUntilMs = 0;
let _lastQualityChangeMs = 0;
let _lastStateUpdateMs = 0;
const _frameTimestamps: number[] = [];

const DEFAULT_ADAPTIVE = {
    enabled: true,
    targetFps: 30,
    minQuality: 0.35,
    interactionDownsample: 0.6,
    graceMs: 1200,
    changeCooldownMs: 500,
};

export const createViewportSlice: StateCreator<
    FractalStoreState & FractalActions,
    [['zustand/subscribeWithSelector', never]],
    [],
    ViewportSlice
> = (set, get) => ({
    // Physical px of the post-sidebar canvas area. Authoritative writer
    // is ViewportArea's ResizeObserver on the flex-1 div. Read via
    // getCanvasPhysicalPixelSize() — do not read directly.
    canvasPixelSize: [1920, 1080],

    dpr: defaultDpr(),

    resolutionMode: 'Full',
    fixedResolution: [800, 600],

    // Adaptive viewport (phase 2b). qualityFraction is what apps
    // consume to scale their internal render cost. Starts at 1.0; the
    // adaptive loop (reportFps) ramps it down under FPS pressure or
    // while the user is interacting, and recovers to 1 when headroom
    // returns. See engine/plugins/Viewport.ts.
    qualityFraction: 1.0,
    fps: 60,
    fpsSmoothed: 60,
    adaptiveConfig: { ...DEFAULT_ADAPTIVE },

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

    setAdaptiveConfig: (cfg) => set((s) => ({
        adaptiveConfig: { ...s.adaptiveConfig, ...cfg },
    })),

    holdAdaptive: (durationMs) => {
        const now = performance.now();
        const hold = durationMs ?? get().adaptiveConfig.graceMs;
        _holdUntilMs = Math.max(_holdUntilMs, now + hold);
    },

    // reportFps: call each frame with the frame's fps (or pass 0 and the
    // slice computes fps from frame timestamps internally — see frameTick
    // on the plugin for that path). Runs the adaptive loop: drops quality
    // under FPS pressure or while interacting, recovers when headroom
    // returns and the user stops dragging.
    reportFps: (fps) => {
        const now = performance.now();

        // Frame timestamp bookkeeping — used by frameTick() when caller
        // doesn't supply fps. When the caller does supply fps (> 0) we
        // still track timestamps so frameTick and reportFps can coexist.
        _frameTimestamps.push(now);
        while (_frameTimestamps.length > 0 && _frameTimestamps[0] < now - 2000) {
            _frameTimestamps.shift();
        }

        // Compute fps if caller passed 0 (lets a plain frameTick work).
        if (fps <= 0 && _frameTimestamps.length >= 2) {
            const totalMs = _frameTimestamps[_frameTimestamps.length - 1] - _frameTimestamps[0];
            fps = totalMs > 0 ? ((_frameTimestamps.length - 1) / totalMs) * 1000 : 0;
        }
        if (fps <= 0) return;

        // Throttle state writes + adaptive adjustments to once per sample
        // window (~500ms). Between windows the fps signal accumulates
        // without triggering React re-renders.
        const SAMPLE_MS = 500;
        if (now - _lastStateUpdateMs < SAMPLE_MS) return;
        _lastStateUpdateMs = now;

        const state = get();
        const cfg = state.adaptiveConfig;
        const prevSmoothed = state.fpsSmoothed || fps;
        const smoothed = prevSmoothed * 0.5 + fps * 0.5;

        // Compute next qualityFraction.
        let nextQ = state.qualityFraction;
        const suppressed = state.adaptiveSuppressed || !cfg.enabled;

        if (suppressed) {
            nextQ = 1.0;
        } else if (state.isUserInteracting) {
            // Drop immediately to interactionDownsample while interacting.
            if (nextQ > cfg.interactionDownsample) {
                nextQ = cfg.interactionDownsample;
                _lastQualityChangeMs = now;
            }
        } else if (now < _holdUntilMs) {
            // In hold grace period — don't drop quality further.
            // (Still allow recovery back to 1 if FPS is good.)
            if (smoothed > cfg.targetFps * 1.1 && nextQ < 1 && now - _lastQualityChangeMs > cfg.changeCooldownMs) {
                nextQ = Math.min(1, nextQ * 1.15);
                _lastQualityChangeMs = now;
            }
        } else if (now - _lastQualityChangeMs > cfg.changeCooldownMs) {
            if (smoothed < cfg.targetFps * 0.8 && nextQ > cfg.minQuality) {
                nextQ = Math.max(cfg.minQuality, nextQ * 0.85);
                _lastQualityChangeMs = now;
            } else if (smoothed > cfg.targetFps * 1.1 && nextQ < 1) {
                nextQ = Math.min(1, nextQ * 1.15);
                _lastQualityChangeMs = now;
            }
        }

        // Only write state if something relevant changed (fps is every
        // sample; qualityFraction is the one subscribers care about).
        if (nextQ !== state.qualityFraction || Math.abs(smoothed - prevSmoothed) > 0.5) {
            set({
                fps,
                fpsSmoothed: smoothed,
                qualityFraction: nextQ,
            });
        } else {
            set({ fps, fpsSmoothed: smoothed });
        }
    },
});

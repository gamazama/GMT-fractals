/**
 * viewportSlice — viewport state + adaptive-quality loop.
 *
 * State fields: canvasPixelSize, dpr, resolutionMode, fixedResolution,
 * qualityFraction, fps, fpsSmoothed, adaptiveConfig.
 *
 * The adaptive loop in reportFps is a direct port of GMT's production
 * adaptive logic (engine/managers/UniformManager.ts syncFrame, lines
 * ~99-206). Key design:
 *
 *   - Smart mode (targetFps > 0): scale = scale * sqrt(target/actual),
 *     smoothed 0.7/0.3 with the previous scale. Re-evaluates every
 *     500ms with ≥ 3 frames. Scale clamped to [1, 1/minQuality].
 *   - Manual mode (targetFps === 0): scale = 1/interactionDownsample,
 *     fixed.
 *   - Seeding: on activity start, seed scale from still-FPS (tracked
 *     during idle) so the first frame under interaction is already at
 *     a predicted-good resolution instead of starting at 1x.
 *   - 5% delta threshold: qualityFraction only updates when the change
 *     is > 5% of current, to avoid constant resize churn.
 *   - needsAdaptive predicate:
 *       · alwaysActive=true (fluid-toy, live sims): always adaptive
 *       · alwaysActive=false (GMT-style fractal explorer):
 *           adaptive OFF when (mouse on canvas AND idle beyond grace)
 *           adaptive ON when (mouse off canvas OR within activity grace)
 *   - Hold grace (holdAdaptive action): during grace, don't downscale
 *     further — apps call this around accumulation starts.
 *   - Suppression (adaptiveSuppressed): hard force to 1.0 — used by
 *     export flows.
 *
 * Apps consume via qualityFraction = 1 / adaptiveScale. 1.0 = full,
 * lower = coarser. Apps multiply their internal render size by it.
 */

import { StateCreator } from 'zustand';
import { EngineStoreState, EngineActions } from '../../types';
import { FractalEvents } from '../../engine/FractalEvents';
import { isMouseOverCanvas } from '../../engine/worker/ViewportRefs';
import {
    type AdaptiveResolutionState,
    createAdaptiveResolutionState,
    tickAdaptiveResolution,
} from '../../engine/AdaptiveResolution';

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

export type ViewportSlice = Pick<EngineStoreState,
    'canvasPixelSize' | 'dpr' | 'resolutionMode' | 'fixedResolution' |
    'qualityFraction' | 'fps' | 'fpsSmoothed' | 'adaptiveConfig'
> & Pick<EngineActions,
    'setCanvasPixelSize' | 'setDpr' | 'setResolutionMode' | 'setFixedResolution' |
    'reportFps' | 'holdAdaptive' | 'setAdaptiveConfig'
>;

// ── Adaptive loop module-level state (runtime, doesn't trigger rerenders) ──
// Algorithm lives in engine/AdaptiveResolution.ts — shared with the GMT
// worker's UniformManager. This slice owns the state object and the
// FPS-from-timestamps helper; everything else delegates.
const _adaptive: AdaptiveResolutionState = createAdaptiveResolutionState();
let _holdUntilMs = 0;                // don't downscale until this timestamp
let _lastStateUpdateMs = 0;          // throttle for HUD state writes
const _frameTimestamps: number[] = [];

export const markActivity = () => { _adaptive.lastActivityTime = performance.now(); };

const DEFAULT_ADAPTIVE = {
    enabled: true,
    targetFps: 30,
    minQuality: 0.25,              // 1/4 — max scale of 4
    interactionDownsample: 0.5,     // manual-mode fallback (1/2 resolution)
    activityGraceMs: 100,
    alwaysActive: false,
};

export const createViewportSlice: StateCreator<
    EngineStoreState & EngineActions,
    [['zustand/subscribeWithSelector', never]],
    [],
    ViewportSlice
> = (set, get) => ({
    canvasPixelSize: [1920, 1080],
    dpr: defaultDpr(),
    resolutionMode: 'Full',
    fixedResolution: [800, 600],

    qualityFraction: 1.0,
    fps: 60,
    fpsSmoothed: 60,
    adaptiveConfig: { ...DEFAULT_ADAPTIVE },

    setCanvasPixelSize: (w, h) => set({ canvasPixelSize: [w, h] }),
    setDpr: (v) => { set({ dpr: v }); FractalEvents.emit('reset_accum', undefined); },
    setResolutionMode: (m) => { set({ resolutionMode: m }); FractalEvents.emit('reset_accum', undefined); },
    setFixedResolution: (w, h) => { set({ fixedResolution: [w, h] }); FractalEvents.emit('reset_accum', undefined); },

    setAdaptiveConfig: (cfg) => set((s) => ({ adaptiveConfig: { ...s.adaptiveConfig, ...cfg } })),

    holdAdaptive: (durationMs) => {
        const now = performance.now();
        const hold = durationMs ?? get().adaptiveConfig.activityGraceMs * 4;
        _holdUntilMs = Math.max(_holdUntilMs, now + hold);
    },

    /**
     * Call once per frame with the last frame's fps (or 0 to let the slice
     * compute fps from tracked frame timestamps). Delegates the adaptive
     * decision to engine/AdaptiveResolution — same algorithm GMT's worker
     * uses. The slice owns: FPS-from-timestamps, qualityFraction conversion,
     * 5% delta threshold against the current store value, and HUD throttle.
     */
    reportFps: (rawFps) => {
        const now = performance.now();

        // Track frame timestamps so frameTick() callers (rawFps=0) work.
        _frameTimestamps.push(now);
        while (_frameTimestamps.length > 0 && _frameTimestamps[0] < now - 2000) {
            _frameTimestamps.shift();
        }

        let fps = rawFps;
        if (fps <= 0 && _frameTimestamps.length >= 2) {
            const totalMs = _frameTimestamps[_frameTimestamps.length - 1] - _frameTimestamps[0];
            fps = totalMs > 0 ? ((_frameTimestamps.length - 1) / totalMs) * 1000 : 0;
        }
        if (fps <= 0) return;

        const state = get();
        const cfg = state.adaptiveConfig;
        const suppressed = state.adaptiveSuppressed || !cfg.enabled;

        // Feed accumulationCount through so the deep-accum gate works
        // for any app that wires reportAccumulation (fluid-toy reports
        // tsaaSampleIndex from the RAF loop). When sampleCap is set,
        // hold full res once we're halfway through the cap — keeps the
        // earned partial accumulation when the user moves the mouse off
        // the canvas mid-render. sampleCap=0 (Infinite) falls back to
        // the FPS-derived default inside the module.
        const accumCount = state.accumulationCount ?? 0;
        const accumThreshold = state.sampleCap > 0
            ? Math.max(2, Math.floor(state.sampleCap * 0.5))
            : undefined;

        const result = tickAdaptiveResolution(_adaptive, {
            now,
            accumCount,
            isInteracting: state.isUserInteracting,
            mouseOverCanvas: isMouseOverCanvas(),
            dynamicScaling: cfg.enabled,
            adaptiveTarget: cfg.targetFps,
            // Slice's interactionDownsample is a quality fraction (0..1);
            // module's is a downsample divisor (>=1). Convert.
            interactionDownsample: 1 / Math.max(0.01, cfg.interactionDownsample),
            minQuality: cfg.minQuality,
            alwaysActive: cfg.alwaysActive,
            holdUntilMs: _holdUntilMs,
            suppressed,
            accumThreshold,
            gateOnAccumOnly: cfg.engageOnAccumOnly,
        });

        // Convert downsample factor → quality fraction (0..1).
        // 5% delta threshold against current store value to avoid churn.
        const targetQuality = 1 / result.scale;
        const current = state.qualityFraction;
        let nextQ = current;
        if (Math.abs(targetQuality - current) / Math.max(current, 0.01) > 0.05) {
            nextQ = targetQuality;
        }

        // Throttle HUD state writes to sample windows.
        const SAMPLE_MS = 500;
        const sampleDue = now - _lastStateUpdateMs >= SAMPLE_MS;

        if (nextQ !== current) {
            // Quality crossed threshold — write immediately (even mid-window).
            const smoothed = state.fpsSmoothed * 0.5 + fps * 0.5;
            set({ qualityFraction: nextQ, fps, fpsSmoothed: smoothed });
            if (sampleDue) _lastStateUpdateMs = now;
        } else if (sampleDue) {
            const smoothed = state.fpsSmoothed * 0.5 + fps * 0.5;
            set({ fps, fpsSmoothed: smoothed });
            _lastStateUpdateMs = now;
        }
    },
});

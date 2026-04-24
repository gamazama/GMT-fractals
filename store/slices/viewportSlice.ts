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
let _adaptiveScale = 1.0;           // current render-size divisor, 1..4
let _adaptiveFrames = 0;             // frames in the current sample window
let _adaptiveLast = 0;               // window-start timestamp (0 = not started)
let _adaptiveStillFps = 60;          // last measured idle FPS (seeds next activity)
let _adaptiveStillFrames = 0;
let _adaptiveStillLast = 0;
let _lastActivityMs = 0;             // last time user activity happened
let _holdUntilMs = 0;                // don't downscale until this timestamp
let _lastStateUpdateMs = 0;          // throttle for HUD state writes
const _frameTimestamps: number[] = [];

export const markActivity = () => { _lastActivityMs = performance.now(); };

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
     * compute fps from tracked frame timestamps). Runs GMT's adaptive math.
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
        const maxScale = Math.max(1.0, 1 / Math.max(0.01, cfg.minQuality));

        // Track activity: if user is interacting, bump the activity clock.
        if (state.isUserInteracting) _lastActivityMs = now;
        const timeSinceActivity = now - _lastActivityMs;
        const mouseOnCanvas = isMouseOverCanvas();
        const withinHold = now < _holdUntilMs;

        // needsAdaptive:
        //   - suppressed → never adaptive (force full-res)
        //   - alwaysActive (fluid-toy) → always adaptive
        //   - otherwise (GMT-style) → adaptive unless mouse-on-canvas & idle-past-grace
        const needsAdaptive = !suppressed && (
            cfg.alwaysActive
            || state.isUserInteracting
            || !mouseOnCanvas
            || timeSinceActivity < cfg.activityGraceMs
        );

        if (needsAdaptive) {
            if (cfg.targetFps > 0) {
                // Smart mode — track 500ms windows, adjust scale by sqrt(ratio),
                // smoothed 0.7/0.3.
                if (_adaptiveLast === 0) {
                    // Seed from still-FPS so the first active frame is
                    // already at a predicted-good resolution.
                    const seedFps = Math.max(1, _adaptiveStillFps);
                    _adaptiveScale = seedFps < cfg.targetFps
                        ? Math.max(1, Math.min(maxScale, Math.sqrt(cfg.targetFps / seedFps)))
                        : 1;
                    _adaptiveLast = now;
                    _adaptiveFrames = 0;
                }
                _adaptiveFrames++;
                const elapsed = now - _adaptiveLast;
                if (elapsed >= 500 && _adaptiveFrames > 2) {
                    const actualFps = _adaptiveFrames / (elapsed / 1000);
                    const ratio = cfg.targetFps / Math.max(1, actualFps);
                    const idealScale = _adaptiveScale * Math.sqrt(ratio);
                    let nextScale = _adaptiveScale * 0.7 + idealScale * 0.3;
                    nextScale = Math.max(1, Math.min(maxScale, nextScale));
                    // Hold grace: don't allow downscale during grace window.
                    if (withinHold && nextScale > _adaptiveScale) {
                        // skip — preserve quality during hold
                    } else {
                        _adaptiveScale = nextScale;
                    }
                    _adaptiveFrames = 0;
                    _adaptiveLast = now;
                }
            } else {
                // Manual mode — fixed divisor from interactionDownsample.
                _adaptiveScale = Math.max(1, 1 / Math.max(0.01, cfg.interactionDownsample));
            }
            _adaptiveStillFrames = 0;
            _adaptiveStillLast = 0;
        } else {
            // Idle: track still-FPS for seeding next disturbance.
            _adaptiveStillFrames++;
            if (_adaptiveStillLast === 0) _adaptiveStillLast = now;
            const elapsed = now - _adaptiveStillLast;
            if (elapsed >= 500 && _adaptiveStillFrames > 2) {
                _adaptiveStillFps = _adaptiveStillFrames / (elapsed / 1000);
                _adaptiveStillFrames = 0;
                _adaptiveStillLast = now;
            }
            _adaptiveScale = 1;
            _adaptiveFrames = 0;
            _adaptiveLast = 0;
        }

        // Compute qualityFraction. 5% delta threshold to avoid churn.
        const targetQuality = suppressed ? 1.0 : 1 / _adaptiveScale;
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

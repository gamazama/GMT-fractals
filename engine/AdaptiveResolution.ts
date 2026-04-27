/**
 * AdaptiveResolution — generic decision logic for FPS-driven dynamic
 * resolution scaling. Single algorithm shared by:
 *
 *   - GMT worker (engine-gmt/engine/managers/UniformManager.ts) — drives
 *     the worker's render-target size.
 *   - Engine-core viewport plugin (store/slices/viewportSlice.ts) — drives
 *     the main-thread `qualityFraction` for fluid-toy / fractal-toy /
 *     any app whose renderer subscribes to it.
 *
 * Pure module: no DOM, no THREE, no worker assumptions. Inputs in,
 * decision out; the caller owns the actual buffer resize / quality
 * application and any resulting accumulation reset.
 *
 * Algorithm (verbatim port of GMT's UniformManager.syncFrame, with the
 * viewport-slice enhancements layered in as opt-in features):
 *
 *   - Still-FPS measurement during idle frames seeds the next scale
 *     when interaction starts (`scale = sqrt(targetFps / stillFps)`).
 *   - First sample window after seed: 200ms + jump-to-ideal (no EMA).
 *     Gives instant response on interaction start.
 *   - Subsequent windows: 500ms + 0.7/0.3 EMA toward target FPS via
 *     `sqrt(ratio)`. Smooth, no churn.
 *   - Grace period scales inversely with FPS: 1fps → 2s, 30fps+ → 100ms
 *     minimum. Slow scenes get more settle time.
 *   - Mouse-over-canvas + grace expiry → adaptive OFF.
 *   - Mouse-over-UI + shallow accumulation → adaptive STAYS ON
 *     (slider drags need responsive feedback).
 *   - "Deep" full-res accumulation (threshold scales with FPS, 8 to
 *     50 samples) protects quality from being kicked back to adaptive
 *     when the user moves the mouse to UI.
 *   - alwaysActive (live sims): bypass mouseOverCanvas/grace check —
 *     adaptive always on except during suppression / deep accum.
 *   - holdUntilMs: while now < holdUntilMs, don't downscale further.
 *     Apps call this around accumulation starts.
 *   - suppressed: hard-force scale=1, needsAdaptive=false (export flows).
 *
 * Activity tracking watches:
 *   - explicit `isInteracting` (gizmo / camera drag / slider / etc.)
 *   - external accumulation reset (accumCount dropped, ignoring resets
 *     caused by our own resize via `selfResized`)
 *
 * State is mutated in place each tick to avoid per-frame allocations.
 * Caller is responsible for setting `state.selfResized = true` when it
 * resizes the renderer in response to `result.scale` changing.
 */

export interface AdaptiveResolutionState {
    /** Current downsample factor (1.0 = full res, >1 = lower internal res). */
    scale: number;
    activeFrames: number;
    activeLast: number;
    /** True for the first sample window after seed — uses faster window
     *  (200ms) and jumps directly to ideal scale (no EMA). */
    firstWindow: boolean;
    /** FPS measured while NOT interacting — used to seed scale on next disturbance. */
    stillFps: number;
    stillFrames: number;
    stillLast: number;
    /** Timestamp (ms) of last scene disturbance. */
    lastActivityTime: number;
    /** Track external accumulation resets to detect activity. */
    prevAccumCount: number;
    /** Set by caller when it resizes; read here to ignore self-caused accum resets. */
    selfResized: boolean;
    /** Accumulation count at full resolution only — protects deep accumulation. */
    fullResAccum: number;
}

export interface AdaptiveResolutionInput {
    /** performance.now() timestamp (ms). */
    now: number;
    /** Current renderer accumulation count. Pass 0 when accumulation
     *  isn't tracked by the caller (e.g. live sims). */
    accumCount: number;
    /** True during gizmo / camera / slider interaction. */
    isInteracting: boolean;
    /** True when the pointer is over the render canvas. */
    mouseOverCanvas: boolean;
    /** User toggle: master enable for dynamic scaling. */
    dynamicScaling: boolean;
    /** Target FPS for smart adaptive (0 = manual mode using interactionDownsample). */
    adaptiveTarget: number;
    /** Fixed downsample factor used when adaptiveTarget is 0. */
    interactionDownsample: number;
    /** Lower bound on quality fraction (1/maxScale). Default 0.25 = max scale 4. */
    minQuality?: number;
    /** When true, needsAdaptive ignores mouseOverCanvas/grace — always on
     *  except during suppression / deep accum. For live sims (fluid-toy). */
    alwaysActive?: boolean;
    /** While `now < holdUntilMs`, prevent further downscale. Apps call
     *  this around accumulation starts to preserve quality during a hold. */
    holdUntilMs?: number;
    /** When true, force scale=1 and needsAdaptive=false. Used by export. */
    suppressed?: boolean;
    /** Override the deep-accumulation threshold (samples). Once
     *  `fullResAccum >= accumThreshold`, adaptive is suppressed so the
     *  user keeps the partial high-quality result they've already
     *  earned. When omitted, the FPS-derived default applies (8..50).
     *  Apps with a known sampleCap typically pass `Math.floor(sampleCap * 0.5)`
     *  so "halfway accumulated" is the cutoff. */
    accumThreshold?: number;
    /** When true, the only signal that engages adaptive is an
     *  accumulation reset (accumCount dropping). `isInteracting` and
     *  `!mouseOverCanvas` are ignored — neither sets activity nor
     *  triggers needsAdaptive on its own. Use for apps where the
     *  renderer's accumCount IS the truth signal (fluid-toy: dragging
     *  unrelated UI sliders never invalidates the fractal accumulator,
     *  so it shouldn't drop quality either). */
    gateOnAccumOnly?: boolean;
}

export interface AdaptiveResolutionResult {
    /** Downsample factor to apply (1.0 = full res). */
    scale: number;
    /** True when adaptive scaling is currently active (informs callers
     *  that may want to suppress other quality features). */
    needsAdaptive: boolean;
    /** Current grace period (ms) — exposed so callers can time other
     *  effects (e.g. accumulation hold) to the same window. */
    grace: number;
}

export function createAdaptiveResolutionState(): AdaptiveResolutionState {
    return {
        scale: 1.0,
        activeFrames: 0,
        activeLast: 0,
        firstWindow: false,
        stillFps: 60,
        stillFrames: 0,
        stillLast: 0,
        lastActivityTime: 0,
        prevAccumCount: 0,
        selfResized: false,
        fullResAccum: 0,
    };
}

/** FPS-scaled grace period (ms): slow scenes get more time before
 *  restoring full res. 1fps → 2s, 30fps+ → 100ms minimum. */
export function getAdaptiveGrace(stillFps: number): number {
    return Math.max(100, Math.min(3000, 2000 / Math.max(1, stillFps)));
}

export function tickAdaptiveResolution(
    state: AdaptiveResolutionState,
    input: AdaptiveResolutionInput,
): AdaptiveResolutionResult {
    const { now, accumCount, isInteracting, mouseOverCanvas, dynamicScaling } = input;
    const minQuality = input.minQuality ?? 0.25;
    const maxScale = Math.max(1.0, 1 / Math.max(0.01, minQuality));
    const alwaysActive = input.alwaysActive ?? false;
    const holdUntilMs = input.holdUntilMs ?? 0;
    const suppressed = input.suppressed ?? false;
    const gateOnAccumOnly = input.gateOnAccumOnly ?? false;

    // ── Suppression: hard force to full res. ──────────────────────────
    if (suppressed) {
        state.scale = 1.0;
        state.activeFrames = 0;
        state.activeLast = 0;
        state.firstWindow = false;
        state.prevAccumCount = accumCount;
        state.selfResized = false;
        return { scale: 1.0, needsAdaptive: false, grace: getAdaptiveGrace(state.stillFps) };
    }

    // ── Activity tracking ─────────────────────────────────────────────
    // An accumulation drop signals that something invalidated the buffer
    // — camera move, param change, texture swap, etc. Treat as activity
    // EXCEPT when caused by our own resize (selfResized flag).
    // gateOnAccumOnly mode skips the isInteracting branch — UI slider
    // drags that don't actually invalidate the renderer should not
    // count as activity for those apps.
    if (isInteracting && !gateOnAccumOnly) {
        state.lastActivityTime = now;
    } else if (accumCount < state.prevAccumCount && !state.selfResized) {
        state.lastActivityTime = now;
    }
    state.prevAccumCount = accumCount;
    state.selfResized = false;

    const grace = getAdaptiveGrace(state.stillFps);
    const timeSinceActivity = now - state.lastActivityTime;

    // ── Deep-accumulation protection ──────────────────────────────────
    // Only samples rendered at full resolution count toward the threshold.
    // Reduced-res samples don't represent quality worth protecting (they'd
    // flicker if we cycled back to adaptive).
    if (state.scale <= 1.001) {
        state.fullResAccum = accumCount;
    } else {
        state.fullResAccum = 0;
    }

    // Threshold: caller's override (e.g. sampleCap/2) takes priority,
    // otherwise FPS-scaled default — 1fps → 8 samples (8s wait), 60fps
    // → 50 samples (<1s). Once past the threshold, adaptive is
    // suppressed — protects quality results when user moves mouse off
    // the canvas mid-accumulation.
    const accumThreshold = input.accumThreshold !== undefined && input.accumThreshold > 0
        ? input.accumThreshold
        : Math.max(8, Math.min(50, Math.round(state.stillFps)));
    const isDeepAccumulation = state.fullResAccum >= accumThreshold;

    // ── Adaptive decision ─────────────────────────────────────────────
    // Deep accum    → OFF (protects quality results)
    // alwaysActive  → ON (live sims have no idle state)
    // Mouse on UI   → ON (slider drags need responsive feedback)
    // Mouse on canvas + grace expired → OFF (FPS-based settle window)
    // gateOnAccumOnly: drop the isInteracting / mouseOverCanvas
    // clauses. Adaptive engages only while the renderer's accumulator
    // is being actively reset (timeSinceActivity < grace). Unrelated
    // UI activity has no effect.
    const activitySignal = gateOnAccumOnly
        ? timeSinceActivity < grace
        : (isInteracting || !mouseOverCanvas || timeSinceActivity < grace);
    const needsAdaptive = dynamicScaling && !isDeepAccumulation && (alwaysActive || activitySignal);

    if (needsAdaptive) {
        const adaptiveTarget = input.adaptiveTarget ?? 0;
        if (adaptiveTarget > 0) {
            // Smart adaptive: auto-adjust scale to hit target FPS.
            // First window after seed uses 200ms + jump-to-ideal (instant
            // response). Subsequent windows: 500ms + 0.7/0.3 EMA (smooth).
            if (state.activeLast === 0) {
                const seedFps = Math.max(1, state.stillFps);
                if (seedFps < adaptiveTarget) {
                    state.scale = Math.max(1.0, Math.min(maxScale,
                        Math.sqrt(adaptiveTarget / seedFps)
                    ));
                } else {
                    state.scale = 1.0;
                }
                state.activeLast = now;
                state.activeFrames = 0;
                state.firstWindow = true;
            }
            state.activeFrames++;
            const elapsed = now - state.activeLast;
            const windowMs = state.firstWindow ? 200 : 500;
            if (elapsed >= windowMs && state.activeFrames > 2) {
                const fps = state.activeFrames / (elapsed / 1000);
                const ratio = adaptiveTarget / Math.max(1, fps);
                const idealScale = state.scale * Math.sqrt(ratio);
                const blend = state.firstWindow ? 1.0 : 0.3;
                let nextScale = state.scale * (1 - blend) + idealScale * blend;
                nextScale = Math.max(1.0, Math.min(maxScale, nextScale));
                // Hold grace: don't allow further downscale during hold window.
                const withinHold = now < holdUntilMs;
                if (withinHold && nextScale > state.scale) {
                    // skip — preserve quality during hold
                } else {
                    state.scale = nextScale;
                }
                state.activeFrames = 0;
                state.activeLast = now;
                state.firstWindow = false;
            }
        } else {
            // Manual mode: fixed downsample factor
            state.scale = Math.max(1.0, input.interactionDownsample || 2.0);
        }
        // Reset still-FPS tracking while active
        state.stillFrames = 0;
        state.stillLast = 0;
    } else {
        // Scene settled: track still-frame FPS for seeding next disturbance
        state.stillFrames++;
        if (state.stillLast === 0) state.stillLast = now;
        const elapsed = now - state.stillLast;
        if (elapsed >= 500 && state.stillFrames > 2) {
            state.stillFps = state.stillFrames / (elapsed / 1000);
            state.stillFrames = 0;
            state.stillLast = now;
        }
        // Reset adaptive state so next disturbance re-seeds
        state.scale = 1.0;
        state.activeFrames = 0;
        state.activeLast = 0;
        state.firstWindow = false;
    }

    return { scale: state.scale, needsAdaptive, grace };
}

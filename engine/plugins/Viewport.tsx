/**
 * @engine/viewport — minimal viewport plugin (phase 2b).
 *
 * Provides the app-facing surface for:
 *   - viewport size + DPR + fixed/full mode (owned by viewportSlice)
 *   - adaptive quality (reportFps + qualityFraction feedback loop)
 *   - interaction state (piggy-backs on existing isUserInteracting flag)
 *
 * An app's render engine calls `viewport.frameTick()` (or
 * `viewport.reportFps(fps)` if it already knows fps) each frame; the
 * plugin tracks fps/fpsSmoothed, ramps qualityFraction based on
 * targetFps vs fpsSmoothed, and exposes the result through the store.
 * Apps subscribe to qualityFraction and map it to whatever "quality"
 * means in their engine — GMT lowers DPR, toy-fluid lowers sim grid,
 * fractal-toy lowers the internal render scale.
 *
 * See docs/10_Viewport.md for full design + integration patterns.
 */

import { useFractalStore } from '../../store/fractalStore';

export interface ViewportAdaptiveConfig {
    /** Master adaptive toggle. When false, qualityFraction stays at 1. */
    enabled: boolean;
    /** Target FPS the adaptive loop aims for. Typical: 30 for apps with
     *  heavy per-frame work, 60 for lighter ones. */
    targetFps: number;
    /** Floor for qualityFraction; ensures the app never drops below
     *  legibility. Typical: 0.35. */
    minQuality: number;
    /** qualityFraction used while isUserInteracting is true, regardless
     *  of FPS. Gives responsive feel during drag. Typical: 0.6. */
    interactionDownsample: number;
    /** Grace period (ms) after holdAdaptive() during which the loop
     *  won't drop quality further. Use during accumulation starts,
     *  feature compiles, etc. */
    graceMs: number;
    /** Minimum time between quality adjustments — avoids flip-flopping. */
    changeCooldownMs: number;
}

// Track whether installViewport has wired its one-time subscriptions.
// Idempotent so multiple install calls (from different bundles) are safe.
let _installed = false;
let _interactionUnsub: (() => void) | null = null;

/** Install the viewport plugin. Apps call this once at boot. Passing
 *  adaptive-config overrides lets apps retune for their workload.
 *
 *  Also wires a subscription to isUserInteracting so quality drops to
 *  interactionDownsample *immediately* on drag start — not at the next
 *  reportFps sample window (which is throttled to ~500ms). Keeps UI
 *  responsive during scrub gestures. */
export const installViewport = (options?: Partial<ViewportAdaptiveConfig>) => {
    if (options) useFractalStore.getState().setAdaptiveConfig(options);
    if (_installed) return;
    _installed = true;

    _interactionUnsub = useFractalStore.subscribe(
        (s) => s.isUserInteracting,
        (isInteracting) => {
            if (!isInteracting) return; // recovery is handled by reportFps
            const s = useFractalStore.getState();
            if (!s.adaptiveConfig.enabled || s.adaptiveSuppressed) return;
            if (s.qualityFraction > s.adaptiveConfig.interactionDownsample) {
                useFractalStore.setState({
                    qualityFraction: s.adaptiveConfig.interactionDownsample,
                });
            }
        },
    );
};

/** Tear-down for tests / hot-reload. Rarely needed in app code. */
export const uninstallViewport = () => {
    if (_interactionUnsub) _interactionUnsub();
    _interactionUnsub = null;
    _installed = false;
};

/** Imperative API — works outside React. The viewport plugin's
 *  actions all delegate to the store's viewportSlice. */
export const viewport = {
    /** Call once per frame; computes fps internally from a rolling
     *  timestamp buffer, then runs the adaptive loop. The simplest
     *  correct path for any app. */
    frameTick(): void {
        useFractalStore.getState().reportFps(0);
    },

    /** If your render engine already has an fps number, use this
     *  instead of frameTick. */
    reportFps(fps: number): void {
        useFractalStore.getState().reportFps(fps);
    },

    /** Hold the adaptive loop at its current quality for the next
     *  durationMs (defaults to adaptiveConfig.graceMs). Call after
     *  events the user expects full quality for: loading a preset,
     *  starting an accumulation, finishing a compile. */
    holdAdaptive(durationMs?: number): void {
        useFractalStore.getState().holdAdaptive(durationMs);
    },

    /** Hard-suppress adaptive. When true, qualityFraction goes to 1
     *  and stays there. Use during export so frames ship at full
     *  resolution regardless of FPS. */
    suppressAdaptive(v: boolean): void {
        useFractalStore.getState().setAdaptiveSuppressed(v);
    },

    /** Update any subset of the adaptive config at runtime. */
    setConfig(cfg: Partial<ViewportAdaptiveConfig>): void {
        useFractalStore.getState().setAdaptiveConfig(cfg);
    },
};

// ── React hooks — apps subscribe with specific selectors to minimize
//    re-renders. Zustand already handles shallow equality on primitives. ──

/** Subscribe to the quality fraction. Re-renders only when it changes. */
export const useQualityFraction = (): number =>
    useFractalStore((s) => s.qualityFraction);

/** Subscribe to the physical-pixel size + DPR. Re-renders on resize or DPR change. */
export const useViewportSize = () => {
    const canvasPixelSize = useFractalStore((s) => s.canvasPixelSize);
    const dpr = useFractalStore((s) => s.dpr);
    return { canvasPixelSize, dpr };
};

/** Subscribe to the current FPS values (smoothed + instantaneous). */
export const useViewportFps = () => {
    const fps = useFractalStore((s) => s.fps);
    const fpsSmoothed = useFractalStore((s) => s.fpsSmoothed);
    return { fps, fpsSmoothed };
};

/** Subscribe to interaction state. True when user is dragging a
 *  slider/knob/gizmo/etc. via the engine's StoreCallbacksContext. */
export const useViewportInteraction = (): boolean =>
    useFractalStore((s) => s.isUserInteracting);

/** Subscribe to the viewport mode + fixed resolution. */
export const useViewportMode = () => {
    const mode = useFractalStore((s) => s.resolutionMode);
    const fixedResolution = useFractalStore((s) => s.fixedResolution);
    return { mode, fixedResolution };
};

// ── Layout components ──────────────────────────────────────────────
//
// Apps typically wrap their render surface(s) in <ViewportFrame>, which
// owns the ResizeObserver, handles Fixed/Full layout, and mounts
// <ViewportModeControls>. GMT, toy-fluid, fractal-toy, and any future
// app share the same frame; what differs is what each app slots as
// children (worker display, WebGL canvas, brush cursor, etc.).

export { ViewportFrame } from './viewport/ViewportFrame';
export type { ViewportFrameProps } from './viewport/ViewportFrame';
export { ViewportModeControls } from './viewport/ViewportModeControls';
export type { ViewportModeControlsProps } from './viewport/ViewportModeControls';
export { FixedResolutionControls } from './viewport/FixedResolutionControls';

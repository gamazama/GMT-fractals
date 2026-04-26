/**
 * installAccumulationBindings — wire the generic renderControlSlice to a
 * concrete AccumulationController (a renderer's pause/sample-cap surface).
 *
 * What this replaces:
 *   Each app's renderer-binding module used to manually subscribe to
 *   `isPaused` and `sampleCap` on the store and forward them to its own
 *   worker proxy. That's the same three-line pattern in every app —
 *   moved here so any AccumulationController plugs into the slice with
 *   one call.
 *
 * What this does NOT do:
 *   - Drive the reporting direction (`controller.accumulationCount` →
 *     `store.reportAccumulation(n)`). That side is owned by the
 *     renderer's tick driver, since only the renderer knows when frames
 *     advance. See `reportAccumulationToStore` for a one-liner helper.
 *
 *   - Forward `RESET_ACCUM` events. That already flows through the
 *     existing `FRACTAL_EVENTS.RESET_ACCUM` event bus → renderer-side
 *     listener → `controller.resetAccumulation()`. Don't duplicate it.
 *
 * Returns a disposer; call it to detach the subscriptions (HMR, tests).
 */
import type { useEngineStore } from '../engineStore';
import type { AccumulationController } from '../../engine/AccumulationController';

type EngineStore = typeof useEngineStore;

export function installAccumulationBindings(
    store: EngineStore,
    controller: AccumulationController,
): () => void {
    const unsubs: Array<() => void> = [];

    // isPaused → controller. Pushed immediately on every change so the
    // renderer pauses without waiting for a frame.
    unsubs.push(store.subscribe(
        (s) => s.isPaused,
        (isPaused) => { controller.isPaused = isPaused; },
    ));

    // sampleCap → controller. Note: changing the cap mid-render does NOT
    // reset accumulation; if the new cap is below the current count, the
    // controller stops adding samples but keeps the existing buffer.
    unsubs.push(store.subscribe(
        (s) => s.sampleCap,
        (sampleCap) => { controller.setPreviewSampleCap(sampleCap); },
    ));

    return () => unsubs.forEach((u) => u());
}

/**
 * One-shot helper for the renderer's tick driver to push the controller's
 * current accumulation count back into the store. Call this on whatever
 * cadence the renderer prefers (e.g. once per FPS-sample window, ~500ms).
 */
export function reportAccumulationToStore(
    store: EngineStore,
    controller: AccumulationController,
): void {
    store.getState().reportAccumulation(controller.accumulationCount);
}

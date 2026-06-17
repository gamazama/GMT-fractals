/**
 * bindGmtRenderer — GMT-specific side effects for the generic
 * renderControlSlice.
 *
 * renderControlSlice (engine-core) carries all state — aaLevel,
 * msaaSamples, renderMode, renderRegion, bucket config, etc. — with pure
 * setters that just mutate state and emit the generic `reset_accum`
 * signal. This module adds the GMT-specific bridging that the old
 * `legacy-gmt/rendererSlice.ts` setters used to perform inline:
 *
 *   - AA MSAA / aaMode → GMT worker CONFIG message with msaaSamples
 *   - previewMode      → GMT worker CONFIG message with previewMode
 *   - renderMode       → GMT lighting DDFS feature's `renderMode` field
 *                        (0=Direct, 1=PathTracing — the shader reads it)
 *   - renderRegion     → GMT uniform-name events (uRegionMin/uRegionMax)
 *
 * Runs at GMT install time via `installGmtRenderer()`. Idempotent. Returns
 * a disposer (not currently used but safer for HMR / test tear-down).
 */

import * as THREE from 'three';
import { useEngineStore } from '../../store/engineStore';
import { FractalEvents, FRACTAL_EVENTS } from '../../engine/FractalEvents';
import { Uniforms } from '../engine/UniformNames';
import { getProxy } from '../engine/worker/WorkerProxy';
import { installAccumulationBindings } from '../../store/slices/installAccumulationBindings';

export const bindGmtRenderer = (): (() => void) => {
    const unsubs: Array<() => void> = [];

    // AA → MSAA config. Fires on either aaMode or msaaSamples changing.
    // When aaMode is Off, the shader uses MSAA=1; otherwise the stored
    // msaaSamples value. Packed into a single CONFIG so the worker applies
    // it atomically.
    const pushMsaaConfig = () => {
        const s = useEngineStore.getState();
        const effective = s.aaMode === 'Off' ? 1 : s.msaaSamples;
        FractalEvents.emit(FRACTAL_EVENTS.CONFIG, { msaaSamples: effective });
    };
    unsubs.push(useEngineStore.subscribe((s) => s.aaMode,      pushMsaaConfig));
    unsubs.push(useEngineStore.subscribe((s) => s.msaaSamples, pushMsaaConfig));

    // Preview mode toggle → GMT worker CONFIG.
    unsubs.push(useEngineStore.subscribe(
        (s) => s.previewMode,
        (previewMode) => FractalEvents.emit(FRACTAL_EVENTS.CONFIG, { previewMode }),
    ));

    // renderMode → bridges to the GMT lighting DDFS feature's renderMode
    // field (0=Direct, 1=PathTracing). The lighting shader reads this to
    // switch integrators. We use `setLighting` from the auto-generated
    // DDFS setters — it exists only when the GMT lighting feature is
    // registered, which is the case whenever engine-gmt is installed.
    unsubs.push(useEngineStore.subscribe(
        (s) => s.renderMode,
        (renderMode) => {
            const setLighting = (useEngineStore.getState() as any).setLighting;
            if (!setLighting) return;
            const modeValue = renderMode === 'PathTracing' ? 1.0 : 0.0;
            setLighting({ renderMode: modeValue });
        },
    ));

    // renderRegion → GMT uniform-name events. Null region → (0,0)-(1,1)
    // (full frame). GMT's RenderPipeline consumes uRegionMin/uRegionMax.
    unsubs.push(useEngineStore.subscribe(
        (s) => s.renderRegion,
        (r) => {
            const min = r ? new THREE.Vector2(r.minX, r.minY) : new THREE.Vector2(0, 0);
            const max = r ? new THREE.Vector2(r.maxX, r.maxY) : new THREE.Vector2(1, 1);
            FractalEvents.emit(FRACTAL_EVENTS.UNIFORM, { key: Uniforms.RegionMin, value: min });
            FractalEvents.emit(FRACTAL_EVENTS.UNIFORM, { key: Uniforms.RegionMax, value: max });
        },
    ));

    // Generic accumulation control surface (isPaused + sampleCap) →
    // worker proxy (which implements AccumulationController). Replaces
    // per-app store subscriptions; any renderer that satisfies the
    // controller protocol plugs in here.
    unsubs.push(installAccumulationBindings(useEngineStore, getProxy()));

    // BUCKET_STATUS event → store.isBucketRendering + store.isExporting.
    // The bucket panel dims its controls and gates the progress bar on
    // isBucketRendering; the broader UI (camera, panel resize, etc.)
    // gates on isExporting. Stable used the same two-flip bridge —
    // see stable/store/fractalStore.ts:507. Worker-side isExporting
    // stays false so compute() keeps running during the bucket render.
    unsubs.push(FractalEvents.on(FRACTAL_EVENTS.BUCKET_STATUS, (data) => {
        const s = useEngineStore.getState() as {
            setIsBucketRendering?: (v: boolean) => void;
            setIsExporting?: (v: boolean) => void;
        };
        s.setIsBucketRendering?.(data.isRendering);
        s.setIsExporting?.(data.isRendering);
    }));

    return () => { unsubs.forEach((u) => u()); };
};

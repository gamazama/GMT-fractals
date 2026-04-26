/**
 * @engine/render-control — generic render-pipeline state.
 *
 * Everything here is app-agnostic: any renderer can benefit from AA
 * controls, accumulation + convergence, bucket/tile export, region crop,
 * pause/export/preview flags. The setters here ONLY mutate state and emit
 * the canonical `reset_accum` signal where relevant — they don't know
 * about worker protocols, uniform names, or specific feature slices.
 *
 * Renderer plugins bind their own side effects via store subscriptions.
 * See engine-gmt/renderer/bindings.ts for the GMT wiring: when msaaSamples
 * changes, emit the GMT worker's CONFIG message; when renderRegion
 * changes, emit the GMT uniform-name events; when renderMode changes,
 * bridge to GMT's lighting DDFS feature. None of that belongs here.
 *
 * Previously this slice lived in `legacy-gmt/rendererSlice.ts` as the
 * archetype-quarantine for "GMT-specific render state." The actual
 * decomposition showed that the STATE is generic and only the SIDE
 * EFFECTS were GMT-specific — so the fields promote to engine-core and
 * GMT keeps only the binding layer.
 */

import { StateCreator } from 'zustand';
import { EngineStoreState, EngineActions } from '../../types';
import { FractalEvents } from '../../engine/FractalEvents';

export type RenderControlSlice = Pick<EngineStoreState,
    'aaLevel' | 'msaaSamples' | 'aaMode' | 'accumulation' | 'previewMode' | 'renderMode' |
    'isExporting' | 'adaptiveSuppressed' | 'renderRegion' | 'previewRegion' |
    'isBucketRendering' | 'bucketSize' |
    'outputWidth' | 'outputHeight' | 'tileCols' | 'tileRows' | 'matchViewportAspect' |
    'convergenceThreshold' |
    'isPaused' | 'sampleCap' | 'accumulationCount' | 'samplesPerBucket'
> & Pick<EngineActions,
    'setAALevel' | 'setMSAASamples' | 'setAAMode' | 'setAccumulation' | 'setPreviewMode' | 'setRenderMode' |
    'setIsExporting' | 'setAdaptiveSuppressed' | 'setRenderRegion' | 'setPreviewRegion' |
    'setIsBucketRendering' | 'setBucketSize' |
    'setOutputWidth' | 'setOutputHeight' | 'setTileCols' | 'setTileRows' | 'setMatchViewportAspect' |
    'setConvergenceThreshold' |
    'setIsPaused' | 'setSampleCap' | 'reportAccumulation' | 'setSamplesPerBucket'
>;

export const createRenderControlSlice: StateCreator<
    EngineStoreState & EngineActions,
    [['zustand/subscribeWithSelector', never]],
    [],
    RenderControlSlice
> = (set, get) => ({
    // ── Defaults ──────────────────────────────────────────────────────
    aaLevel: 1.0,
    msaaSamples: 1,
    aaMode: 'Always',
    accumulation: true,
    previewMode: false,
    renderMode: 'Direct',

    isPaused: false,
    sampleCap: 256,
    accumulationCount: 0,

    isExporting: false,
    adaptiveSuppressed: false,
    renderRegion: null,
    previewRegion: null,

    // Bucket Rendering Defaults
    isBucketRendering: false,
    bucketSize: 512,
    outputWidth: 1920,
    outputHeight: 1080,
    tileCols: 1,
    tileRows: 1,
    matchViewportAspect: true,
    convergenceThreshold: 0.25,
    samplesPerBucket: 64,

    // ── Setters (pure mutations + canonical reset_accum emits) ────────
    //
    // Anti-aliasing: changing quality resets accumulation. aaLevel also
    // drives `dpr` when aaMode is Always/Auto, because `dpr` is how the
    // viewport plugin scales the actual drawing buffer.
    setAALevel: (v) => {
        set({ aaLevel: v });
        const { aaMode } = get();
        if (aaMode === 'Always' || aaMode === 'Auto') set({ dpr: v });
        FractalEvents.emit('reset_accum', undefined);
    },
    setMSAASamples: (v) => {
        set({ msaaSamples: v });
        FractalEvents.emit('reset_accum', undefined);
    },
    setAAMode: (v) => {
        set({ aaMode: v });
        const { aaLevel } = get();
        set({ dpr: v === 'Off' ? 1.0 : aaLevel });
        FractalEvents.emit('reset_accum', undefined);
    },

    // Accumulation: both toggling on/off and capping samples reset the
    // accumulator.
    setAccumulation: (v) => {
        set({ accumulation: v });
        FractalEvents.emit('reset_accum', undefined);
    },
    setPreviewMode: (v) => set({ previewMode: v }),
    setRenderMode: (v) => set({ renderMode: v }),
    setIsPaused: (v) => set({ isPaused: v }),
    setSampleCap: (v) => set({ sampleCap: v }),
    reportAccumulation: (count) => set({ accumulationCount: count }),

    // Region crop: changing the render region is a quality change —
    // accumulator resets so the new region starts fresh.
    setRenderRegion: (r) => {
        set({ renderRegion: r });
        FractalEvents.emit('reset_accum', undefined);
    },
    setPreviewRegion: (r) => set({ previewRegion: r }),

    // Bucket export — plain setters. Bucket orchestration (actually
    // starting/stopping the tiled render loop) is the renderer plugin's
    // concern; this slice only carries the config.
    setIsBucketRendering: (v) => set({ isBucketRendering: v }),
    setBucketSize: (v) => set({ bucketSize: v }),
    setOutputWidth: (v) => set({ outputWidth: Math.max(64, Math.round(v)) }),
    setOutputHeight: (v) => set({ outputHeight: Math.max(64, Math.round(v)) }),
    setTileCols: (v) => set({ tileCols: Math.max(1, Math.min(32, Math.round(v))) }),
    setTileRows: (v) => set({ tileRows: Math.max(1, Math.min(32, Math.round(v))) }),
    setMatchViewportAspect: (v) => set({ matchViewportAspect: v }),
    setConvergenceThreshold: (v) => set({ convergenceThreshold: v }),
    setSamplesPerBucket: (v) => set({ samplesPerBucket: v }),

    setIsExporting: (v) => set({ isExporting: v }),
    setAdaptiveSuppressed: (v) => set({ adaptiveSuppressed: v }),
});

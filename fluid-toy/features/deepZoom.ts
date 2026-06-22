/**
 * DeepZoomFeature — Mandelbrot/Julia perturbation + LA deep zoom (scaffolding).
 *
 * Phase 1 of the deep-zoom rollout: DDFS slice + panel only. No engine
 * path, no shader fork, no worker. Toggling does nothing visible — the
 * standard f32 iteration kernel keeps running.
 *
 * Subsequent phases (see plans/fluid-toy-deep-zoom.md) wire up:
 *   2 — worker + reference orbit (CPU)
 *   3 — perturbation shader path
 *   4 — HDRFloat (scaled-float deltas)
 *   5 — LA construction
 *   6 — LA runtime (shader)
 *   7 — AT front-loading
 *   8 — Coupling adjustment + zoom-bound lift
 *   9 — Variable power generalisation
 *  10 — Julia mode
 *
 * The feature lives on the Fractal panel rather than its own tab — it's
 * an extension of the existing iteration kernel, not a parallel concern.
 */

import type { FeatureDefinition } from '../../engine/FeatureSystem';
import type { FluidEngine } from '../fluid/FluidEngine';
import type { DeepZoomSlice } from '../storeTypes';

export const DeepZoomFeature: FeatureDefinition = {
    id: 'deepZoom',
    name: 'Deep Zoom',
    category: 'Fractal',

    tabConfig: {
        label: 'Deep Zoom',
    },

    params: {
        enabled: {
            type: 'boolean',
            default: false,
            label: 'Enable deep zoom',
            description: 'Master toggle. Switches the iteration kernel to perturbation + LA, unlocking zoom past 1e-5 (eventually past 1e-300). Off by default — costs nothing when off.',
        },

        // Auto-iterations — the shared iteration policy (engine/fractal/iterationPolicy)
        // the Gradient Explorer's fractal viewer uses. Governs the per-pixel cap for
        // BOTH the shallow f32 kernel (≈200 at the home view → ~2000 deep) and the
        // deep path (the full reference-orbit length). NOT gated on `enabled` — it
        // controls the standard render too. Off = the manual Iter caps (Fractal ▸ Iter
        // shallow, ▸ Iter (deep) below).
        autoIter: {
            type: 'boolean',
            default: true,
            label: 'Auto iterations',
            description: 'Scale iterations with zoom automatically so a dive stays crisp instead of going blobby — same policy as the gradient-editor fractal viewer. Off = use the manual Iter caps.',
        },
        iterMul: {
            type: 'float',
            default: 1, min: 0.25, max: 8, step: 0.25,
            scale: 'log',
            label: 'Iteration ×',
            condition: { param: 'autoIter', bool: true },
            description: 'Multiplier on the auto iteration count — push it up when a difficult area (thin filaments, deep minibrots) still looks under-resolved, down for speed.',
        },

        // useScaledFloat removed: HDR deltas were tried but the
        // per-iter overhead in WebGL2 made the kernel ~30× slower.
        // We now run pure f32 in the inner loop. Practical depth
        // ceiling sits around 1e-15 to 1e-30 depending on iter count
        // — past that the f64 center subtraction quantises (phase 8
        // territory). When a recompile-gated HDR path comes back
        // we'll re-introduce the toggle.

        useLA: {
            type: 'boolean',
            default: true,
            label: 'Use Linear Approximation',
            condition: { param: 'enabled', bool: true },
            description: 'Skip iterations via the LA stage table. 10–100× faster at depth. Off = pure perturbation (slow, but useful for sanity-checking LA output).',
        },

        useAT: {
            type: 'boolean',
            default: true,
            label: 'Use AT front-load',
            condition: { param: 'enabled', bool: true },
            description: 'Fast-forward the front of the orbit via Approximation Terms (a single z²+c loop in plain f32). Free perf when applicable. No effect when LA is off.',
        },

        maxRefIter: {
            type: 'int',
            default: 50_000, min: 5_000, max: 500_000, step: 1_000,
            label: 'Reference orbit length',
            // Manual deep cap — only relevant (and only shown) when deep zoom is
            // on AND Auto iterations is off. With Auto on the build length is
            // scaled to zoom depth automatically.
            condition: { and: [{ param: 'enabled', bool: true }, { param: 'autoIter', bool: false }] },
            description: 'Manual reference-orbit build length (Auto iterations off).',
        },

        deepMaxIter: {
            type: 'int',
            default: 2_000, min: 200, max: 50_000, step: 100,
            label: 'Iterations (cap, deep)',
            condition: { and: [{ param: 'enabled', bool: true }, { param: 'autoIter', bool: false }] },
            description: 'Manual per-pixel iteration cap under deep zoom (Auto iterations off). With Auto on, the cap is the reference-orbit length.',
        },

        showStats: {
            type: 'boolean',
            default: false,
            label: 'Show stats',
            condition: { param: 'enabled', bool: true },
            description: 'Overlay reference-orbit length, LA stage count, table size, and build time. Diagnostic.',
        },

        disableFluid: {
            type: 'boolean',
            default: false,
            label: 'Disable fluid sim (debug)',
            condition: { param: 'enabled', bool: true },
            description: 'Skip every fluid pass (motion, advect, pressure, dye decay) so render time reflects the fractal kernel only. Use to isolate deep-zoom perf from fluid sim cost.',
        },
    },
};

/**
 * Sync — pushes the enable flag + the manual deep iteration cap into FluidEngine.
 * The per-pixel iteration cap itself is decided by FluidEngine.effectiveMaxIter
 * (engine/fractal/iterationPolicy): under deep zoom it uses the reference-orbit
 * length (auto) or `deepMaxIter` (manual, autoIter off). So this no longer needs
 * to fight the julia sync over engine.params.maxIter — it just forwards the
 * deep-mode knobs. Reference-orbit upload is driven by useDeepZoomOrbit.
 */
export const syncDeepZoomToEngine = (
    engine: FluidEngine,
    deepZoom: DeepZoomSlice,
): void => {
    // Iteration policy (autoIter / iterMul) + the manual deep cap apply to the
    // standard render too, so push them regardless of `enabled`.
    engine.setParams({
        deepZoomEnabled: deepZoom.enabled,
        autoIter:        deepZoom.autoIter,
        iterMul:         deepZoom.iterMul,
        deepMaxIter:     deepZoom.deepMaxIter,
    });
    if (deepZoom.enabled) {
        engine.setForceFluidPaused(deepZoom.disableFluid);
    } else {
        engine.deepZoom.clearReferenceOrbit();
        engine.deepZoom.clearLATable();
        engine.deepZoom.setLAEnabled(false);
        engine.deepZoom.clearAT();
        engine.setForceFluidPaused(false);
    }
};

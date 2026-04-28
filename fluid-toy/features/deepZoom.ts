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
import type { DeepZoomSlice, JuliaSlice } from '../storeTypes';

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
            condition: { param: 'enabled', bool: true },
            description: 'Maximum iterations the high-precision reference orbit runs to. Higher = supports deeper zooms but costs CPU at build time and GPU memory at runtime. Auto-suggested per zoom depth in later phases.',
        },

        deepMaxIter: {
            type: 'int',
            default: 2_000, min: 200, max: 50_000, step: 100,
            label: 'Iter (deep)',
            condition: { param: 'enabled', bool: true },
            description: 'Maximum iterations per pixel when deep zoom is on. Overrides the Fractal-tab Iter slider while deep is enabled. Without LA every iteration costs the full HDR step — push gently until phase 6 (LA runtime) lands.',
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
 * Phase 3+4 sync — pushes the enable flag and maxIter override into
 * FluidEngine. When deep zoom is on, `deepMaxIter` overrides
 * `julia.maxIter` (which the Fractal panel slider caps at 512); when
 * off, we restore from the julia slice. Reference-orbit upload is
 * driven by FluidToyApp's effect — this function only forwards
 * scalar params.
 *
 * Takes the julia slice so we can correctly restore maxIter on
 * disable without depending on effect ordering.
 */
export const syncDeepZoomToEngine = (
    engine: FluidEngine,
    deepZoom: DeepZoomSlice,
    julia: JuliaSlice,
): void => {
    if (deepZoom.enabled) {
        engine.setParams({
            deepZoomEnabled: true,
            maxIter: deepZoom.deepMaxIter,
        });
        engine.setForceFluidPaused(deepZoom.disableFluid);
    } else {
        engine.setParams({
            deepZoomEnabled: false,
            maxIter: julia.maxIter,
        });
        engine.clearReferenceOrbit();
        engine.clearLATable();
        engine.setLAEnabled(false);
        engine.clearAT();
        engine.setForceFluidPaused(false);
    }
};

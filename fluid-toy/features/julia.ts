/**
 * JuliaFeature — DDFS bindings for the Fractal tab of the fluid sim.
 *
 * Maps 1:1 to the reference toy-fluid "Fractal" tab: kind chips, the
 * Mandelbrot-preview picker, Julia c, Zoom, Center, Iter, Power. This
 * is the "fractal is the force generator" layer — every fluid frame
 * samples this texture to produce velocity.
 *
 * Colour-related iteration params (escapeR, colorMapping, interiorColor,
 * trap* geometry, stripeFreq, colorIter) live on the PaletteFeature
 * slice — they drive the display pass, not the iteration kernel, so
 * reference toy-fluid groups them under Palette.
 */

import type { FeatureDefinition } from '../../engine/FeatureSystem';
import { defineEnumParam } from '../../engine/defineEnumParam';
import type { LfoTarget } from '../../types/animation';
import type { FluidEngine } from '../fluid/FluidEngine';
import type { JuliaSlice } from '../storeTypes';

// Index-to-string map for the `kind` enum. Default = 1 (Mandelbrot),
// matching FluidEngine.DEFAULT_PARAMS.kind so existing save files round-trip.
const kindParam = defineEnumParam(
    ['julia', 'mandelbrot'] as const,
    'Fractal Kind',
    {
        defaultIndex: 1,
        optionHints: {
            julia:      'Iterate z² + c with fixed c. Pixels are starting z values.',
            mandelbrot: 'Iterate z² + c with z₀=0. Pixels are c values.',
        },
    },
);
export const KIND_MODES = kindParam.values;
export const kindFromIndex = kindParam.fromIndex;

export const JuliaFeature: FeatureDefinition = {
    id: 'julia',
    name: 'Fractal',
    category: 'Fractal',

    tabConfig: {
        label: 'Fractal',
    },

    // Mandelbrot preview with click-to-pick Julia c, mounted directly
    // below the juliaC vec2 slider. Only rendered when the fractal
    // kind is Julia — picking c makes no sense for the Mandelbrot
    // variant (c is the pixel coord there).
    customUI: [
        {
            componentId: 'julia-c-picker',
            parentId: 'juliaC',
            condition: { param: 'kind', eq: 0 },
        },
    ],

    params: {
        kind: kindParam.config,

        juliaC: {
            type: 'vec2',
            default: { x: -0.36303304426511473, y: 0.16845183018751916 },
            min: -2, max: 2, step: 0.001,
            label: 'Julia c',
            description: 'Julia constant. Move me to reshape the entire fractal — and the forces it emits.',
            // Mandelbrot uses pixel coords as c — the slice value is
            // ignored. Hide the slider in mandelbrot mode so users
            // aren't tempted to drag a no-op.
            condition: { param: 'kind', eq: 0 },
        },

        // Camera zoom/center were a separate SceneCamera feature before the
        // Fractal-tab consolidation; the reference places them on the
        // Fractal tab so we consolidate onto julia.*. Scale is log so the
        // fine-detail end of the slider is usable; hardMin enforces the
        // 0.00001 deep-zoom floor.
        zoom: {
            type: 'float',
            default: 1.2904749020480561,
            min: 0.00001, max: 8, step: 0.0001,
            scale: 'log',
            label: 'Zoom',
            description: 'Zoom into the fractal. Scroll wheel + middle-click-drag on the canvas go much deeper (to 0.00001).',
        },
        center: {
            type: 'vec2',
            default: { x: -0.8139175130270945, y: -0.054649908357858296 },
            min: -2, max: 2, step: 0.01,
            label: 'Center',
            description: 'Pan the fractal window.',
        },

        // Sub-f64 precision residual added to `center` for deep-zoom
        // panning. Auto-managed by the gesture handlers via Dekker
        // two-sum so pan increments below ~1e-16 (f64's mantissa
        // floor) don't get rounded away. Combined with `center` at
        // worker request time to give the orbit ~32 decimal digits
        // of precision (zoom ~1e-30 ceiling). Hidden from the UI.
        centerLow: {
            type: 'vec2',
            default: { x: 0, y: 0 },
            min: -1, max: 1, step: 1e-12,
            label: 'Center (low bits)',
            description: 'Internal — sub-f64 pan accumulator.',
            hidden: true,
        },

        maxIter: {
            type: 'int',
            default: 310, min: 16, max: 512, step: 1,
            label: 'Iter',
            description: 'More iterations → sharper escape gradients → finer force detail.',
        },
        power: {
            type: 'float',
            default: 2, min: 2, max: 8, step: 1,
            label: 'Power',
            description: 'z-power in the iteration. 2 = classic z²+c; higher exponents make more lobes.',
        },
    },
};

/**
 * Push the julia slice into FluidEngine. Split into two functions so the
 * per-frame modulation tick (orbit / audio-reactive / etc.) only rewrites
 * juliaC and leaves the gesture-managed view (center / zoom / centerLow)
 * untouched. Pan / zoom / wheel handlers bypass the store and write
 * those view fields directly on engine.params during the gesture; the
 * store catches up only on pointerup. Without this split, every orbit
 * modulation frame would overwrite the gesture's fresh view values with
 * the stale store ones — the fractal would freeze mid-pan and only
 * update at gesture-end.
 */
export const syncJuliaToEngine = (
    engine: FluidEngine,
    julia: JuliaSlice,
    liveMod: Partial<Record<LfoTarget, number>>,
): void => {
    const baseX = julia.juliaC.x;
    const baseY = julia.juliaC.y;
    const cx = liveMod['julia.juliaC_x'] ?? baseX;
    const cy = liveMod['julia.juliaC_y'] ?? baseY;
    engine.setParams({
        kind: kindFromIndex(julia.kind),
        juliaC: [cx, cy],
        maxIter: julia.maxIter,
        power: julia.power,
        center: [julia.center.x, julia.center.y],
        // centerLow: sub-f64 residual paired with `center` for deep-
        // zoom pan precision. Defaults to (0, 0) for first-time use
        // and old saves. The engine packs both into uDeepCenterOffset
        // via DD-subtraction against the orbit's stored hi+lo.
        centerLow: [julia.centerLow?.x ?? 0, julia.centerLow?.y ?? 0],
        zoom: julia.zoom,
    });
};

/**
 * Lightweight juliaC-only sync. Called every frame the modulation tick
 * touches julia.juliaC_x / julia.juliaC_y (i.e. while auto-orbit or any
 * other LFO is driving c). Critically does NOT push center/zoom — those
 * are gesture-owned during pan/zoom and would be clobbered every
 * modulation frame otherwise.
 */
export const syncJuliaCToEngine = (
    engine: FluidEngine,
    julia: JuliaSlice,
    liveMod: Partial<Record<LfoTarget, number>>,
): void => {
    const cx = liveMod['julia.juliaC_x'] ?? julia.juliaC.x;
    const cy = liveMod['julia.juliaC_y'] ?? julia.juliaC.y;
    engine.setParams({ juliaC: [cx, cy] });
};

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

// Index-to-string map for the `kind` enum. Default = 1 (Mandelbrot),
// matching FluidEngine.DEFAULT_PARAMS.kind so existing save files round-trip.
const kindParam = defineEnumParam(
    ['julia', 'mandelbrot'] as const,
    'Fractal Kind',
    { defaultIndex: 1 },
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

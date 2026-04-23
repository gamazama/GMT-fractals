/**
 * JuliaFeature — DDFS bindings for the Julia/Mandelbrot iteration
 * parameters in the fluid sim's fractal pass.
 *
 * Mirrors the kind/juliaC/maxIter/escapeR/power fields of FluidParams
 * in FluidEngine. `kind` chooses between julia-set (c is a constant
 * seed, z iterates from screen coords) and mandelbrot (c iterates from
 * screen coords, z starts at 0) — same iteration loop, different
 * initial conditions. FluidToyApp maps the DDFS numeric index to the
 * FluidEngine's string kind via KIND_MODES.
 *
 * Defaults match FluidEngine.DEFAULT_PARAMS so this commit doesn't
 * change what renders on screen — just surfaces the controls.
 */

import type { FeatureDefinition } from '../../engine/FeatureSystem';

// Index-to-string map for the `kind` enum. AutoFeaturePanel reads the
// options array for the dropdown labels; FluidToyApp uses the parallel
// string map to call FluidEngine.setParams({ kind }).
export const KIND_MODES = ['julia', 'mandelbrot'] as const;

export const JuliaFeature: FeatureDefinition = {
    id: 'julia',
    name: 'Julia',
    category: 'Fractal',

    tabConfig: {
        label: 'Julia',
        componentId: 'auto-feature-panel',
        order: 0,
        dock: 'right',
        defaultActive: true,
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
        kind: {
            type: 'float',  // numeric index — AutoFeaturePanel dropdown when options are set
            default: 1,     // matches FluidEngine.DEFAULT_PARAMS.kind = 'mandelbrot'
            label: 'Fractal Kind',
            options: [
                { label: 'Julia',      value: 0 },
                { label: 'Mandelbrot', value: 1 },
            ],
        },
        juliaC: {
            type: 'vec2',
            default: { x: -0.36303304426511473, y: 0.16845183018751916 },
            min: -2, max: 2, step: 0.001,
            label: 'Julia c',
        },
        maxIter:  { type: 'int',   default: 310, min: 10,  max: 1024, step: 1,    label: 'Iterations' },
        escapeR:  { type: 'float', default: 32,  min: 2,   max: 1024, step: 0.1,  label: 'Escape R', scale: 'log' },
        power:    { type: 'float', default: 2,   min: 2,   max: 8,    step: 0.01, label: 'Power' },
    },

    // No inject() — this feature doesn't contribute shader code.
    // FluidToyApp subscribes to the slice and calls FluidEngine.setParams
    // imperatively because FluidEngine has its own GLSL pipeline, not
    // the generic ShaderBuilder path.
};

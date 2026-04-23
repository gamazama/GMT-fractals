/**
 * JuliaFeature — DDFS bindings for the Julia/Mandelbrot iteration
 * parameters in the fluid sim's fractal pass.
 *
 * Mirrors the juliaC/maxIter/escapeR/power fields of FluidParams in
 * FluidEngine. 3c keeps this minimal — `kind` ('julia' | 'mandelbrot')
 * and the orbit-trap / color-mapping params land in later commits once
 * we pick a pattern for enum-typed DDFS params.
 *
 * Defaults match FluidEngine.DEFAULT_PARAMS so this commit doesn't
 * change what renders on screen — just surfaces the panel.
 */

import type { FeatureDefinition } from '../../engine/FeatureSystem';

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

    params: {
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

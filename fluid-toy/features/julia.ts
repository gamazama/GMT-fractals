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

// 14 colour-mapping modes supported by FluidEngine.colorMappingToIndex.
// Index positions MUST match FluidEngine; the order here is the source
// of truth for the dropdown as well.
const colorMappingParam = defineEnumParam(
    [
        'iterations', 'angle', 'magnitude', 'decomposition', 'bands',
        'orbit-point', 'orbit-circle', 'orbit-cross', 'orbit-line',
        'stripe', 'distance', 'derivative', 'potential', 'trap-iter',
    ] as const,
    'Color Mapping',
    {
        optionLabels: {
            decomposition: 'Decomp',
            'orbit-point':  'Trap · Point',
            'orbit-circle': 'Trap · Circle',
            'orbit-cross':  'Trap · Cross',
            'orbit-line':   'Trap · Line',
            'trap-iter':    'Trap Iteration',
            distance: 'Distance Estimate',
            potential: 'Continuous Potential',
            derivative: 'Derivative (log|dz|)',
        },
    },
);
export const COLOR_MAPPINGS = colorMappingParam.values;
export const colorMappingFromIndex = colorMappingParam.fromIndex;

// Indices of the orbit-trap modes — used by conditional visibility on
// the trap-shape params below. Kept in sync with COLOR_MAPPINGS order.
const ORBIT_POINT = 5, ORBIT_CIRCLE = 6, ORBIT_CROSS = 7, ORBIT_LINE = 8, STRIPE = 9;

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
        kind: kindParam.config,
        juliaC: {
            type: 'vec2',
            default: { x: -0.36303304426511473, y: 0.16845183018751916 },
            min: -2, max: 2, step: 0.001,
            label: 'Julia c',
        },
        maxIter:  { type: 'int',   default: 310, min: 10,  max: 1024, step: 1,    label: 'Iterations' },
        escapeR:  { type: 'float', default: 32,  min: 2,   max: 1024, step: 0.1,  label: 'Escape R', scale: 'log' },
        power:    { type: 'float', default: 2,   min: 2,   max: 8,    step: 0.01, label: 'Power' },

        // Colour mapping — 14-way dropdown. Orbit-trap + stripe variants
        // get their own geometry controls below, conditionally visible.
        colorMapping: colorMappingParam.config,

        // Interior colour for points inside the set. Uses DDFS vec3 so
        // it round-trips through the preset + is keyframeable per-axis.
        interiorColor: {
            type: 'vec3',
            default: { x: 0.02, y: 0.02, z: 0.04 },
            min: 0, max: 1, step: 0.001,
            label: 'Interior Color',
        },

        // Orbit-trap shape controls. Each is conditional on the matching
        // colorMapping value — the panel hides them when they don't apply.
        trapCenter: {
            type: 'vec2',
            default: { x: 0, y: 0 },
            min: -2, max: 2, step: 0.001,
            label: 'Trap Center',
            condition: { or: [
                { param: 'colorMapping', eq: ORBIT_POINT },
                { param: 'colorMapping', eq: ORBIT_CIRCLE },
                { param: 'colorMapping', eq: ORBIT_CROSS },
                { param: 'colorMapping', eq: ORBIT_LINE },
            ] },
        },
        trapRadius: {
            type: 'float', default: 1, min: 0.01, max: 4, step: 0.001,
            label: 'Trap Radius',
            condition: { param: 'colorMapping', eq: ORBIT_CIRCLE },
        },
        trapNormal: {
            type: 'vec2',
            default: { x: 1, y: 0 },
            min: -1, max: 1, step: 0.001,
            label: 'Trap Normal',
            condition: { param: 'colorMapping', eq: ORBIT_LINE },
        },
        trapOffset: {
            type: 'float', default: 0, min: -2, max: 2, step: 0.001,
            label: 'Trap Offset',
            condition: { param: 'colorMapping', eq: ORBIT_LINE },
        },
        stripeFreq: {
            type: 'float', default: 4, min: 0.5, max: 16, step: 0.01,
            label: 'Stripe Freq',
            condition: { param: 'colorMapping', eq: STRIPE },
        },
    },

    // No inject() — this feature doesn't contribute shader code.
    // FluidToyApp subscribes to the slice and calls FluidEngine.setParams
    // imperatively because FluidEngine has its own GLSL pipeline, not
    // the generic ShaderBuilder path.
};

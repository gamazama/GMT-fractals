/**
 * PostFxFeature — display-side post-processing knobs.
 *
 * Everything between the raw composited fluid+fractal+dye buffer and
 * the screen. Tone mapping, exposure, vibrance, bloom, chromatic
 * aberration, refraction, caustics, plus the "style preset" shortcut
 * that stamps a handful of the above into an electric/liquid/plain
 * look in one click.
 *
 * All values already have setParams keys on FluidEngine (see
 * DEFAULT_PARAMS lines 309–320 in FluidEngine.ts). This feature is
 * pure DDFS wiring; no engine or shader changes needed.
 */

import type { FeatureDefinition } from '../../engine/FeatureSystem';
import { defineEnumParam } from '../../engine/defineEnumParam';

// 4 tone-map modes matching FluidEngine.toneMappingToIndex.
const toneMappingParam = defineEnumParam(
    ['none', 'reinhard', 'agx', 'filmic'] as const,
    'Tone Mapping',
    { optionLabels: { agx: 'AgX' } },
);
export const TONE_MAPPINGS = toneMappingParam.values;
export const toneMappingFromIndex = toneMappingParam.fromIndex;

// 3 style presets — "Electric" / "Liquid" buttons in the reference
// hit a preset bundle; here we expose the underlying enum and let the
// user layer tweaks on top. The shader checks uFluidStyle alongside
// the individual knobs, so setting style=electric gets the energy
// look even with all the bloom/aberration sliders at 0.
const fluidStyleParam = defineEnumParam(
    ['plain', 'electric', 'liquid'] as const,
    'Style',
);
export const FLUID_STYLES = fluidStyleParam.values;
export const fluidStyleFromIndex = fluidStyleParam.fromIndex;

export const PostFxFeature: FeatureDefinition = {
    id: 'postFx',
    name: 'Post FX',
    category: 'Look',

    tabConfig: {
        label: 'Post FX',
        componentId: 'auto-feature-panel',
        order: 2,
        dock: 'right',
    },

    params: {
        // Display-stage knobs (always visible)
        fluidStyle:  fluidStyleParam.config,
        toneMapping: toneMappingParam.config,
        exposure:    { type: 'float', default: 1,     min: 0,    max: 8,    step: 0.01,  label: 'Exposure' },
        vibrance:    { type: 'float', default: 1.645, min: 0,    max: 3,    step: 0.001, label: 'Vibrance' },

        // Bloom — used by 'electric' style, controllable standalone.
        bloomAmount:    { type: 'float', default: 0,    min: 0, max: 3, step: 0.01,  label: 'Bloom Amount' },
        bloomThreshold: { type: 'float', default: 0.9,  min: 0, max: 3, step: 0.001, label: 'Bloom Threshold' },

        // Chromatic aberration — velocity-keyed RGB split.
        aberration: { type: 'float', default: 0,   min: 0,    max: 0.05, step: 0.0001, label: 'Aberration' },

        // Refraction — used by 'liquid' style; samples the fractal at
        // a dye-gradient-driven offset.
        refraction:    { type: 'float', default: 0,   min: 0, max: 0.08, step: 0.0001, label: 'Refraction' },
        refractSmooth: { type: 'float', default: 3,   min: 0, max: 8,    step: 0.01,   label: 'Refract Smooth' },

        // Caustics — laplacian of the dye luminance, composited additive.
        caustics: { type: 'float', default: 0, min: 0, max: 2, step: 0.001, label: 'Caustics' },
    },
};

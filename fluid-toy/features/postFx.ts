/**
 * PostFxFeature — the Post-FX tab.
 *
 * Matches the reference toy-fluid "Post-FX" tab exactly: the fluid-style
 * chip row (Plain / Electric / Liquid), bloom + threshold, aberration,
 * refraction + smoothing, caustics, and the Tone-mapping subsection
 * (4 chips + exposure + vibrance). Ranges aligned 1:1 with the
 * reference ScalarInput bounds; defaults match FluidEngine.DEFAULT_PARAMS.
 *
 * The fluid-style preset behaviour (each chip also stamps bloom /
 * aberration / refraction / caustics values) is owned by FluidEngine
 * itself — the shader checks uFluidStyle alongside the individual
 * knobs, so setting style=electric gets the energy look even if each
 * slider reads 0. No preset-stamping lives here; we just expose the
 * chip.
 */

import type { FeatureDefinition } from '../../engine/FeatureSystem';
import { defineEnumParam } from '../../engine/defineEnumParam';

// 4 tone-map modes matching FluidEngine.toneMappingToIndex.
const toneMappingParam = defineEnumParam(
    ['none', 'reinhard', 'agx', 'filmic'] as const,
    'Tone mapping',
    { optionLabels: { agx: 'AgX' } },
);
export const TONE_MAPPINGS = toneMappingParam.values;
export const toneMappingFromIndex = toneMappingParam.fromIndex;

// 3 post-process style presets. Engine uses uFluidStyle to tint the
// look independently of the individual knobs.
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
        label: 'Post-FX',
    },

    params: {
        fluidStyle: {
            ...fluidStyleParam.config,
            description: 'Post-process pack. Pick a style to preset bloom / aberration / refraction, or mix them yourself below.',
        },

        bloomAmount: {
            type: 'float', default: 0, min: 0, max: 3, step: 0.01,
            label: 'Bloom',
            description: 'Bloom strength — wide soft glow on bright pixels. Core of the electric look.',
        },
        bloomThreshold: {
            type: 'float', default: 1, min: 0, max: 3, step: 0.01,
            label: 'Bloom threshold',
            condition: { param: 'bloomAmount', gt: 0 },
            description: 'Luminance threshold: pixels below this don\'t contribute to bloom. Lower = more of the image glows.',
        },

        aberration: {
            type: 'float', default: 0.27, min: 0, max: 3, step: 0.01,
            label: 'Aberration',
            description: 'Chromatic aberration keyed to local velocity — plasma fringing on fast-moving dye regions. Affects dye only; fractal stays sharp.',
        },

        refraction: {
            type: 'float', default: 0.037, min: 0, max: 0.3, step: 0.001,
            label: 'Refraction',
            description: 'Screen-space refraction: dye\'s luminance acts as a height field — the fractal underneath warps like glass.',
        },
        refractSmooth: {
            type: 'float', default: 3, min: 1, max: 12, step: 0.1,
            label: 'Refract smooth',
            condition: { param: 'refraction', gt: 0 },
            description: 'Stencil width (in dye texels) for the refraction gradient. Higher = smoother distortion, less pixel jitter; 1 = raw single-pixel gradient.',
        },
        refractRoughness: {
            type: 'float', default: 0, min: 0, max: 1, step: 0.01,
            label: 'Refract roughness',
            condition: { param: 'refraction', gt: 0 },
            description: 'Frosted-glass scatter for the refracted fractal. 0 = crisp polished glass (single-tap). 1 = ~5px Vogel-disc blur — light scatters into a cone like real rough surfaces. Mask + walls blur in step so glass edges stay consistent.',
        },

        caustics: {
            type: 'float', default: 1, min: 0, max: 25, step: 0.1,
            label: 'Caustics',
            description: 'Laplacian-of-dye highlight — simulates focused-light caustics where the liquid surface bends.',
        },

        // ── Tone-mapping subsection ─────────────────────────────────
        toneMapping: {
            ...toneMappingParam.config,
            description: 'How final colour gets compressed. None = maximally vivid (may clip). AgX = 2023 hue-stable roll-off (best for rich colours). Reinhard desaturates highlights.',
        },
        exposure: {
            type: 'float', default: 1, min: 0.1, max: 5, step: 0.01,
            label: 'Exposure',
            description: 'Multiplier on final colour BEFORE tone mapping. Crank up to make dim gradient stops punch.',
        },
        vibrance: {
            type: 'float', default: 1.645, min: 0, max: 1, step: 0.01,
            label: 'Vibrance',
            description: 'Chroma-aware saturation — boosts dull pixels without posterising already-vivid ones.',
        },
    },
};

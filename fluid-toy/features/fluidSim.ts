/**
 * FluidSimFeature — the "Fluid" tab in the reference.
 *
 * Post-Tab-2 pass: force-law params (forceMode, forceGain, interiorDamp,
 * forceCap, edgeMargin) moved to CouplingFeature because the reference
 * UI groups them on their own tab.
 *
 * What stays here is the fluid's own behaviour: how it carries, swirls,
 * dissipates velocity, and its grid-resolution target. Tab 3 will merge
 * the dye-inject + dye-decay subsection from DyeFeature.
 *
 * simResolution here is the USER'S TARGET ceiling. FluidToyApp multiplies
 * it by qualityFraction (from @engine/viewport's adaptive loop) before
 * pushing to FluidEngine.setParams. So the user sees "1344" as their
 * intent; the adaptive loop scales the actual sim grid.
 */

import type { FeatureDefinition } from '../../engine/FeatureSystem';
import { dyeDecayModeParam } from './palette';

export const FluidSimFeature: FeatureDefinition = {
    id: 'fluidSim',
    name: 'Fluid',
    category: 'Simulation',

    tabConfig: {
        label: 'Fluid',
    },

    params: {
        vorticity: {
            type: 'float', default: 22.1, min: 0, max: 50, step: 0.1,
            label: 'Vorticity',
            description: 'Amplifies existing curl — keeps fractal-induced swirls from smearing away.',
        },
        vorticityScale: {
            type: 'float', default: 1, min: 0.5, max: 8, step: 0.1,
            label: 'Vorticity scale',
            condition: { param: 'vorticity', gt: 0 },
            description: 'Spatial scale of the vorticity confinement (in sim texels). 1 = tight pixel-scale swirls, 4+ = larger organised vortices.',
        },
        dissipation: {
            type: 'float', default: 0.17, min: 0, max: 5, step: 0.01,
            label: 'Velocity dissipation /s',
            description: 'How fast velocity decays. High = fluid forgets the fractal quickly.',
        },

        // Dye inject — how much of the fractal's colour bleeds into the
        // fluid each frame. Lives on this tab (reference) because it's a
        // fluid-side knob even though it feeds the dye texture.
        dyeInject: {
            type: 'float', default: 1.5, min: 0, max: 3, step: 0.01,
            label: 'Dye inject',
            description: 'How much of the fractal\'s color bleeds into the fluid each frame.',
        },

        pressureIters: {
            type: 'int', default: 50, min: 4, max: 60, step: 1,
            label: 'Pressure iters',
            description: 'Jacobi iterations for incompressibility. More = stricter but slower.',
        },

        // ── Dye decay subsection ─────────────────────────────────────
        // How the dye fades between frames. Colour-space mode controls
        // whether dye greys out (linear) or stays hue-stable (perceptual
        // / vivid) while fading.
        dyeDecayMode: {
            ...dyeDecayModeParam.config,
            description: 'How dye fades over time. Colour space controls whether it greys out (linear) or stays hue-stable (perceptual / vivid).',
        },
        dyeDissipation: {
            type: 'float', default: 1.03, min: 0, max: 5, step: 0.01,
            label: 'Dye dissipation /s',
            description: 'How fast dye fades. In linear mode this is a straight RGB multiply; in perceptual / vivid it\'s the OKLab luminance fade (chroma fades on its own schedule below).',
        },
        dyeChromaDecayHz: {
            type: 'float', default: 1.03, min: 0, max: 5, step: 0.01,
            label: 'Chroma decay /s',
            condition: { param: 'dyeDecayMode', neq: 0 },  // 0 = linear
            description: 'Per-second fade on OKLab a/b (chroma). Lower than Dye dissipation → colour stays saturated longer than it stays bright.',
        },
        dyeSaturationBoost: {
            type: 'float', default: 1, min: 0.5, max: 1.1, step: 0.001,
            scale: 'log',
            label: 'Saturation boost',
            condition: { param: 'dyeDecayMode', eq: 2 },  // 2 = vivid
            description: 'Per-frame chroma gain. 1 = neutral, <1 washes out, >1 pushes toward max saturation. Gamut-mapped in OKLab so it pegs at the saturation ceiling rather than hue-shifting to white.',
        },

        // Target sim grid height. FluidToyApp scales by quality fraction.
        simResolution: {
            type: 'int', default: 1344, min: 128, max: 1536, step: 32,
            label: 'Sim resolution',
            description: 'Target fluid grid height in cells. More = finer detail, slower.',
        },

        // Integration timestep. The RAF loop uses a fixed 16.67 ms
        // wall-clock step; this scales the physical dt applied per
        // sim frame. Lower = more stable but slower.
        dt: {
            type: 'float', default: 0.016, min: 0.001, max: 0.05, step: 0.0001,
            label: 'Δt (advanced)',
            description: 'Integration timestep. Lower = more stable.',
        },

        paused: {
            type: 'boolean', default: false,
            label: 'Pause sim',
            description: 'Freeze the fluid state. Splats and param changes still land; they just don\'t integrate forward.',
        },
    },
};

/**
 * FluidSimFeature — DDFS bindings for the fluid simulator's core
 * dynamics knobs (vorticity, pressure, forces, resolution target).
 *
 * simResolution here is the USER'S TARGET ceiling. FluidToyApp multiplies
 * it by qualityFraction (from @engine/viewport's adaptive loop) before
 * pushing to FluidEngine.setParams. So the user sees "2048" as their
 * intent; the adaptive loop decides the rendering actual (scales to
 * simResolution * qualityFraction).
 *
 * forceMode is a dropdown via DDFS options on a float param (the engine's
 * AutoFeaturePanel renders a Dropdown when options are present). Stored
 * as 0-4; FluidToyApp translates to FluidEngine's string tags at the edge.
 */

import type { FeatureDefinition } from '../../engine/FeatureSystem';

// Maps DDFS numeric forceMode to FluidEngine's string tag.
export const FORCE_MODES = ['gradient', 'curl', 'iterate', 'c-track', 'hue'] as const;

export const FluidSimFeature: FeatureDefinition = {
    id: 'fluidSim',
    name: 'Fluid Sim',
    category: 'Simulation',

    tabConfig: {
        label: 'Fluid',
        componentId: 'auto-feature-panel',
        order: 2,
        dock: 'right',
    },

    params: {
        simResolution:  { type: 'int',   default: 1344, min: 256,  max: 4096, step: 64,    label: 'Resolution', description: 'Target sim grid size. Adaptive quality scales from this.' },
        vorticity:      { type: 'float', default: 22.1, min: 0,    max: 100,  step: 0.1,   label: 'Vorticity' },
        vorticityScale: { type: 'float', default: 1,    min: 0.1,  max: 8,    step: 0.01,  label: 'Vorticity Scale' },
        pressureIters:  { type: 'int',   default: 50,   min: 1,    max: 200,  step: 1,     label: 'Pressure Iterations' },
        dissipation:    { type: 'float', default: 0.17, min: 0,    max: 4,    step: 0.001, label: 'Velocity Decay' },

        forceMode: {
            type: 'float',  // numeric index — AutoFeaturePanel dropdown renders when options are present
            default: 0,
            label: 'Force Mode',
            options: [
                { label: 'Gradient', value: 0 },
                { label: 'Curl',     value: 1 },
                { label: 'Iterate',  value: 2 },
                { label: 'C-Track',  value: 3 },
                { label: 'Hue',      value: 4 },
            ],
        },
        forceGain:     { type: 'float',   default: -1200, min: -5000, max: 5000, step: 1,    label: 'Force Gain' },
        interiorDamp:  { type: 'float',   default: 0.59,  min: 0,     max: 1,    step: 0.01, label: 'Interior Damp' },
        paused:        { type: 'boolean', default: false,                                     label: 'Pause Sim' },
    },
};

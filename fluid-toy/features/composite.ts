/**
 * CompositeFeature — how the three layers (Julia fractal, dye, velocity
 * field) mix into the final image.
 *
 * Small feature, but it's the main user control over the "balance" of
 * the piece. juliaMix=1 + dyeMix=0 gives a pure fractal readout with
 * no fluid colour; dyeMix=1 + juliaMix=0 is pure fluid; velocityViz
 * overlays a debug rainbow of the velocity direction, useful for
 * understanding the force-mode behaviour.
 *
 * All values already have setParams keys on FluidEngine
 * (juliaMix at FluidParams line 175, velocityViz at line 177).
 * Pure DDFS wiring — no engine or shader changes.
 */

import type { FeatureDefinition } from '../../engine/FeatureSystem';

export const CompositeFeature: FeatureDefinition = {
    id: 'composite',
    name: 'Composite',
    category: 'Look',

    tabConfig: {
        label: 'Composite',
        componentId: 'auto-feature-panel',
        order: 3,
        dock: 'right',
    },

    params: {
        // 0 hides the fractal beneath the dye; 1 shows it at full
        // brightness. Works with dyeMix to balance the two layers.
        juliaMix:    { type: 'float', default: 0.4,  min: 0, max: 1, step: 0.001, label: 'Julia Mix' },
        // Additive velocity-direction overlay. 0 = off; higher values
        // paint a faint hue-keyed map of the velocity field for debug
        // / visualizing force modes.
        velocityViz: { type: 'float', default: 0.02, min: 0, max: 1, step: 0.001, label: 'Velocity Viz' },
    },
};

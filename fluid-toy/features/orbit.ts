/**
 * OrbitFeature — auto-orbit for Julia c.
 *
 * DDFS feature that declares orbit parameters (enabled, radius, speed,
 * anchor). A TickRegistry handler in fluid-toy reads this slice + the
 * julia slice, and when enabled writes julia.juliaC along a circular
 * path around the anchor each frame.
 *
 * Conceptually this IS modulation — a continuous oscillator driving a
 * param. Not keyframe animation (which would be discrete values at
 * specific times). A future refactor could feed this through the
 * engine's ModulationEngine via LFO animations on `julia.juliaC.x` +
 * `julia.juliaC.y` with a 90° phase offset, but the offset-resolution
 * path for nested vec2 components is worth revisiting when a second
 * app needs it. For now the direct tick is transparent and works.
 */

import type { FeatureDefinition } from '../../engine/FeatureSystem';

export const OrbitFeature: FeatureDefinition = {
    id: 'orbit',
    name: 'Orbit',
    category: 'Simulation',

    dependsOn: ['julia'],   // orbit modulates julia.juliaC around its current base

    tabConfig: {
        label: 'Orbit',
        componentId: 'auto-feature-panel',
        order: 4,
        dock: 'right',
    },

    params: {
        enabled: { type: 'boolean', default: false,                                    label: 'Auto Orbit' },
        radius:  { type: 'float',   default: 0.08, min: 0,     max: 1,    step: 0.001, label: 'Radius' },
        speed:   { type: 'float',   default: 0.25, min: 0,     max: 4,    step: 0.01,  label: 'Speed (Hz)' },
    },
    // No anchor — the Julia c param IS the anchor. Two sine LFOs
    // (0° + 90° phase) on julia.juliaC.x/.y drive circular motion
    // around the current base position. Drag juliaC while orbit is
    // on and the circle moves with it.
};

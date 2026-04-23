/**
 * BrushFeature — geometry + intensity knobs for left-drag splatting.
 *
 * The brush MODE (paint/erase/stamp/smudge) lives on the Dye feature
 * because it's conceptually "how the dye combines" — kept there so the
 * Dye panel is the single place to tune dye behaviour. THIS feature is
 * the brush's physical shape + intensity:
 *
 *   size       gaussian radius in UV space (splat radius)
 *   strength   force-magnitude multiplier
 *   flow       dye-color multiplier
 *   spacing    minimum cursor travel between splats while dragging
 *              (prevents over-splatting when moving slowly)
 *   jitter     random UV perturbation per splat (0..1 of size)
 *
 * FluidPointerLayer reads these from the store at splat time and
 * shapes the splatForce args per-call. No new engine primitives —
 * FluidEngine.splatForce grew an optional `radius` arg for the size
 * knob, everything else composes from the existing shape.
 */

import type { FeatureDefinition } from '../../engine/FeatureSystem';

export const BrushFeature: FeatureDefinition = {
    id: 'brush',
    name: 'Brush',
    category: 'Input',

    tabConfig: {
        label: 'Brush',
        componentId: 'auto-feature-panel',
        order: 4,
        dock: 'right',
    },

    params: {
        // Gaussian radius in UV units. Default 0.002 matches the legacy
        // SPLAT_RADIUS_UV constant so a fresh install looks identical
        // to the pre-brush-feature behaviour.
        size: {
            type: 'float',
            default: 0.002,
            min: 0.0005, max: 0.05, step: 0.0001,
            label: 'Size', scale: 'log',
            description: 'Gaussian radius of each splat in UV space.',
        },
        // Per-splat force magnitude multiplier. The pointer layer still
        // caps absolute strength to avoid numeric blowup; this scales
        // within that cap.
        strength: {
            type: 'float',
            default: 1.0,
            min: 0, max: 4, step: 0.01,
            label: 'Strength',
            description: 'Multiplier on drag-velocity-derived force.',
        },
        // Dye color brightness multiplier. 0 = paint without colour
        // (same as Dye → Smudge mode but works in Paint mode too).
        flow: {
            type: 'float',
            default: 1.0,
            min: 0, max: 4, step: 0.01,
            label: 'Flow',
            description: 'Multiplier on injected dye RGB.',
        },
        // Minimum pixel travel between splats. 0 splats every move event
        // (noisy trails at slow drag); higher spaces them out evenly.
        spacing: {
            type: 'float',
            default: 0,
            min: 0, max: 40, step: 0.5,
            label: 'Spacing (px)',
            description: 'Min cursor travel between splats while dragging.',
        },
        // Random UV offset per splat, as a fraction of splat size. Breaks
        // up the otherwise-perfect gaussian stamp into a more organic
        // trail when painting slowly.
        jitter: {
            type: 'float',
            default: 0,
            min: 0, max: 2, step: 0.01,
            label: 'Jitter',
            description: 'Random UV perturbation per splat (× size).',
        },
    },
};

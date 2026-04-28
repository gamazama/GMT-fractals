/**
 * CompositeFeature — the Composite tab.
 *
 * Chooses WHAT the display pass shows (Mixed / Fractal / Dye / Velocity)
 * and — in Mixed mode — how the three layers balance. The fluid sim
 * runs the same either way; this tab only affects the final composited
 * image.
 *
 * Slice absorbs dyeMix (previously on Palette) so all three mix
 * sliders live together, matching the reference toy-fluid's layout.
 */

import type { FeatureDefinition } from '../../engine/FeatureSystem';
import { defineEnumParam } from '../../engine/defineEnumParam';
import type { FluidEngine } from '../fluid/FluidEngine';
import type { CompositeSlice } from '../storeTypes';

// 4 show modes, index-aligned with FluidEngine.showToIndex.
const showParam = defineEnumParam(
    ['composite', 'julia', 'dye', 'velocity'] as const,
    'Show',
    {
        optionLabels: {
            composite: 'Mixed',
            julia: 'Fractal',
        },
        optionHints: {
            composite: 'Fractal + dye + velocity overlay (the full picture).',
            julia:     'Just the fractal — no fluid layer.',
            dye:       'Just the dye — no fractal underneath.',
            velocity:  'Velocity field as colour. Diagnostic only.',
        },
    },
);
export const SHOW_MODES = showParam.values;
export const showFromIndex = showParam.fromIndex;

const SHOW_COMPOSITE = 0;

export const CompositeFeature: FeatureDefinition = {
    id: 'composite',
    name: 'Composite',
    category: 'Look',

    tabConfig: {
        label: 'Composite',
    },

    params: {
        show: {
            ...showParam.config,
            description: 'What you see. The simulation runs the same either way. Mixed = fractal + dye + optional velocity overlay. Fractal = pure fractal, fluid hidden. Dye = fluid dye only (what the fractal wrote). Velocity = per-pixel velocity as a hue wheel.',
        },

        juliaMix: {
            type: 'float', default: 0.4, min: 0, max: 2, step: 0.01,
            label: 'Julia mix',
            condition: { param: 'show', eq: SHOW_COMPOSITE },
            description: 'How much fractal color shows through in Mixed view.',
        },
        dyeMix: {
            type: 'float', default: 2, min: 0, max: 2, step: 0.01,
            label: 'Dye mix',
            condition: { param: 'show', eq: SHOW_COMPOSITE },
            description: 'How much fluid dye shows through in Mixed view.',
        },
        velocityViz: {
            type: 'float', default: 0.02, min: 0, max: 2, step: 0.01,
            label: 'Velocity viz',
            condition: { param: 'show', eq: SHOW_COMPOSITE },
            description: 'Overlay velocity-hue on top of the composite. Diagnostic.',
        },
    },
};

/** Push the composite-mix slice (show mode + julia / dye / velocity balance). */
export const syncCompositeToEngine = (engine: FluidEngine, composite: CompositeSlice): void => {
    engine.setParams({
        show:        showFromIndex(composite.show),
        juliaMix:    composite.juliaMix,
        dyeMix:      composite.dyeMix,
        velocityViz: composite.velocityViz,
    });
};

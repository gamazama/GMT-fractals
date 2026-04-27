/**
 * CollisionFeature — the Collision tab.
 *
 * Paints solid walls the fluid bounces off, sculpted by a gradient
 * whose B&W profile (black = fluid, white = wall) is mapped through
 * the same iteration-space t-axis the main palette uses. The mask
 * pass in FluidEngine only runs when collisionEnabled is true; the
 * preview flag overlays cyan hatching so users can see the wall shape
 * while tuning the gradient.
 *
 * Port enhancements beyond the reference: collisionRepeat and
 * collisionPhase are independent of the dye-palette repeat/phase, so
 * the wall pattern can tile at its own density and offset. Both are
 * exposed under the gradient editor.
 *
 * Previously these params lived on the DyeFeature/PaletteFeature
 * slice (hidden); this pass relocates them onto a dedicated `collision`
 * slice so the tab is one-feature-one-panel.
 */

import type { FeatureDefinition } from '../../engine/FeatureSystem';
import type { GradientConfig } from '../../types';
import type { FluidEngine } from '../fluid/FluidEngine';
import type { CollisionSlice } from '../storeTypes';
import { generateGradientTextureBuffer } from '../../utils/colorUtils';

const DEFAULT_COLLISION_GRADIENT: GradientConfig = {
    colorSpace: 'srgb',
    blendSpace: 'rgb',
    stops: [
        { id: '0', position: 0, color: '#000000', bias: 0.5, interpolation: 'linear' },
        { id: '1', position: 1, color: '#000000', bias: 0.5, interpolation: 'linear' },
    ],
};

export const CollisionFeature: FeatureDefinition = {
    id: 'collision',
    name: 'Collision',
    category: 'Simulation',

    tabConfig: {
        label: 'Collision',
    },

    params: {
        enabled: {
            type: 'boolean', default: false,
            label: 'Collision walls',
            description: 'Paints solid walls the fluid bounces off, sculpted by the gradient below. Same t-axis mapping as the main palette — edit stops to black = fluid, white = wall.',
        },

        gradient: {
            type: 'gradient',
            default: DEFAULT_COLLISION_GRADIENT,
            label: 'Collision pattern',
            condition: { param: 'enabled', bool: true },
            description: 'B&W gradient defining where walls sit along the iteration-space t-axis.',
        },

        // Port enhancement — independent tile + phase so walls can have
        // their own density/offset without affecting dye colours.
        repeat: {
            type: 'float', default: 1, min: 0.1, max: 8, step: 0.01,
            label: 'Collision repeat',
            condition: { param: 'enabled', bool: true },
            description: 'Tile the collision pattern along t — independent of the dye gradient repeat.',
        },
        phase: {
            type: 'float', default: 0, min: 0, max: 1, step: 0.001,
            label: 'Collision phase',
            condition: { param: 'enabled', bool: true },
            description: 'Phase-shift the collision pattern so walls land where the dye doesn\'t.',
        },

        preview: {
            type: 'boolean', default: false,
            label: 'Preview walls on canvas',
            condition: { param: 'enabled', bool: true },
            description: 'Overlays diagonal cyan hatching on solid cells so you can see the wall shape while tuning the gradient.',
        },
    },
};

/**
 * Push the collision slice into FluidEngine. The mask pass only runs
 * when `enabled`; repeat/phase remap t before the collision LUT lookup
 * so walls tile independently of the dye palette.
 */
export const syncCollisionToEngine = (engine: FluidEngine, collision: CollisionSlice): void => {
    engine.setParams({
        collisionEnabled: collision.enabled,
        collisionPreview: collision.preview,
        collisionRepeat:  collision.repeat,
        collisionPhase:   collision.phase,
    });
    if (collision.gradient) {
        const lut = generateGradientTextureBuffer(collision.gradient);
        engine.setCollisionGradientBuffer(lut);
    }
};

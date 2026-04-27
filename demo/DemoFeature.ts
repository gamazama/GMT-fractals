/**
 * DemoFeature — the engine's verification / hello-world feature.
 *
 * Shows how an add-on registers a DDFS feature with the engine:
 *   - params drive state + AutoFeaturePanel UI automatically
 *   - state is captured by undo/redo, save/load, URL sharing
 *   - a matching overlay component (DemoOverlay) visualises the state
 *
 * This exists in the engine tree as a reference pattern only. It's
 * neither shipped by default nor wired into `features/index.ts` —
 * apps opt into it by calling `registerDemo()` from `demo/setup.ts`.
 */

import type { FeatureDefinition } from '../engine/FeatureSystem';

export interface DemoState {
    color: string;
    position: { x: number; y: number };
    size: number;
    opacity: number;
}

export const DemoFeature: FeatureDefinition = {
    id: 'demo',
    name: 'Demo',
    category: 'Engine',

    // tabConfig declares the panel tab. `componentId` points to the
    // generic AutoFeaturePanel registered in features/ui.tsx.
    tabConfig: {
        label: 'Demo',
    },

    // viewportConfig renders a feature-scoped overlay inside the
    // ViewportArea. 'dom' means an HTML overlay (not an R3F scene node).
    // Component id matches the `componentRegistry.register('overlay-demo', …)`
    // call in `demo/registerFeatures.ts` (docs convention: `overlay-<name>`).
    viewportConfig: {
        componentId: 'overlay-demo',
        type: 'dom',
    },

    params: {
        color: {
            type: 'color',
            default: '#22d3ee',
            label: 'Color',
        },
        position: {
            type: 'vec2',
            default: { x: 0, y: 0 },
            label: 'Position',
            min: -1,
            max: 1,
            step: 0.01,
        },
        size: {
            type: 'float',
            default: 120,
            label: 'Size',
            min: 20,
            max: 400,
            step: 1,
        },
        opacity: {
            type: 'float',
            default: 0.9,
            label: 'Opacity',
            min: 0,
            max: 1,
            step: 0.01,
        },
    },
};

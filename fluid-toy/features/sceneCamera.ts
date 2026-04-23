/**
 * SceneCameraFeature — 2D viewport camera for fluid-toy.
 *
 * Pan (center) + zoom. Feeds FluidEngine's center/zoom params which
 * determine the complex-plane region the fractal iteration samples.
 *
 * Mirrors fractal-toy's orbit camera pattern — same DDFS shape, just
 * 2D (center=vec2, zoom=float) instead of 3D orbit (theta/phi/distance).
 * When the eventual @engine/camera plugin lands (docs/04_Core_Plugins.md),
 * both apps register their camera tracks into it and we delete these
 * bespoke features. For now, app-local DDFS feature.
 *
 * Also registers with cameraKeyRegistry so the shared TimelineToolbar's
 * Key Cam button captures pan/zoom.
 */

import type { FeatureDefinition } from '../../engine/FeatureSystem';

export const SceneCameraFeature: FeatureDefinition = {
    id: 'sceneCamera',
    name: 'View',
    category: 'Scene',

    tabConfig: {
        label: 'View',
        componentId: 'auto-feature-panel',
        order: 3,
        dock: 'right',
    },

    params: {
        center: {
            type: 'vec2',
            default: { x: -0.8139175130270945, y: -0.054649908357858296 },
            min: -4, max: 4, step: 0.001,
            label: 'Center',
        },
        zoom: {
            type: 'float',
            default: 1.2904749020480561,
            min: 0.0001, max: 10,
            step: 0.001,
            scale: 'log',
            label: 'Zoom',
        },
    },
};

/**
 * CameraFeature — DDFS camera for Fractal Toy.
 *
 * Orbit-style: θ (yaw) + φ (pitch) + distance + target. Simpler than the
 * full quaternion pose for 1d's purposes, and maps naturally onto the
 * AutoFeaturePanel's slider-per-param rendering. A future commit can
 * add a 'mode' param + alternative parameterisations (Fly position+quat)
 * without changing the public shape — that's what the engine-level
 * @engine/camera plugin will eventually standardise.
 *
 * inject() declares uniforms only. The actual pinhole-camera ray
 * construction lives in fractal-toy/shaderAssembler.ts; this feature
 * doesn't register GLSL sections because camera math is pipeline-level
 * (not a per-formula concern).
 */

import type { FeatureDefinition } from '../../engine/FeatureSystem';

export const CameraFeature: FeatureDefinition = {
    id: 'camera',
    name: 'Camera',
    category: 'Scene',

    tabConfig: {
        label: 'Camera',
        componentId: 'auto-feature-panel',
        order: 1,
    },

    params: {
        orbitTheta: { type: 'float', default: 0.6,  min: -3.14, max: 3.14, step: 0.01, label: 'Yaw θ' },
        orbitPhi:   { type: 'float', default: 0.2,  min: -1.55, max: 1.55, step: 0.01, label: 'Pitch φ' },
        distance:   { type: 'float', default: 2.5,  min: 0.5,   max: 10.0, step: 0.01, label: 'Distance' },
        fov:        { type: 'float', default: 60,   min: 20,    max: 120,  step: 1,    label: 'FOV °' },
        target:     { type: 'vec3',  default: { x: 0, y: 0, z: 0 }, min: -2, max: 2, step: 0.01, label: 'Target' },
    },

    inject: (builder) => {
        builder.addUniform('uCamOrbitTheta', 'float');
        builder.addUniform('uCamOrbitPhi', 'float');
        builder.addUniform('uCamDistance', 'float');
        builder.addUniform('uCamFov', 'float');
        builder.addUniform('uCamTarget', 'vec3');
    },
};

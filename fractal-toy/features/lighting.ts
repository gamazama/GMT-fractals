/**
 * LightingFeature — directional light + ambient + AO for Fractal Toy.
 *
 * Minimal by design: one directional light, Lambertian diffuse,
 * ambient floor, step-count AO strength. The shader's shading block
 * in fractal-toy/shaderAssembler.ts is the only consumer.
 *
 * GMT's full lighting feature has multiple lights, shadows, specular,
 * environment maps, etc. That complexity lives in a future GMT lighting
 * plugin; for fractal-toy we only need enough to make the Mandelbulb
 * legible and prove the DDFS-feature pattern extends to color params.
 */

import type { FeatureDefinition } from '../../engine/FeatureSystem';

export const LightingFeature: FeatureDefinition = {
    id: 'lighting',
    name: 'Lighting',
    category: 'Scene',

    tabConfig: {
        label: 'Lighting',
    },

    params: {
        direction: { type: 'vec3',  default: { x: 0.5, y: 0.8, z: 0.5 }, min: -1, max: 1, step: 0.01, label: 'Direction' },
        color:     { type: 'color', default: '#ffffff',                                              label: 'Color' },
        intensity: { type: 'float', default: 1.0,  min: 0.0, max: 4.0,  step: 0.01, label: 'Intensity' },
        ambient:   { type: 'float', default: 0.15, min: 0.0, max: 1.0,  step: 0.01, label: 'Ambient' },
        aoAmount:  { type: 'float', default: 0.4,  min: 0.0, max: 1.0,  step: 0.01, label: 'AO Amount' },
        albedoR:   { type: 'float', default: 0.85, min: 0.0, max: 1.0,  step: 0.01, label: 'Albedo R' },
        albedoG:   { type: 'float', default: 0.72, min: 0.0, max: 1.0,  step: 0.01, label: 'Albedo G' },
        albedoB:   { type: 'float', default: 0.55, min: 0.0, max: 1.0,  step: 0.01, label: 'Albedo B' },
    },

    inject: (builder) => {
        builder.addUniform('uLightDir', 'vec3');
        builder.addUniform('uLightColor', 'vec3');
        builder.addUniform('uLightIntensity', 'float');
        builder.addUniform('uAmbient', 'float');
        builder.addUniform('uAoAmount', 'float');
        builder.addUniform('uAlbedo', 'vec3');
    },
};

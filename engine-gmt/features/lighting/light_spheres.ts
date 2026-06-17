
import { FeatureDefinition } from '../../engine/FeatureSystem';
import {
    LIGHT_SPHERE_INTERSECTION_GLSL,
    LIGHT_SPHERE_MISS_GLSL,
    getLightSphereCompositeGLSL
} from '../../shaders/chunks/lighting/shared';

// ---------------------------------------------------------------------------
// LIGHT SPHERES FEATURE (Satellite of LightingFeature)
//
// Owns: compile-time toggle + all GLSL injection for visible emitter spheres.
//
// Depends on LightingFeature for:
//   - Light uniform arrays (uLightPos, uLightColor, uLightIntensity, uLightRadius,
//     uLightSoftness, uLightType, uLightCount) — declared via Lighting's extraUniforms
//   - Per-light radius/softness values — stored in LightParams, managed by UniformManager
//   - Sphere UI controls — embedded in LightControls.tsx (LightSettingsPopup)
//     because radius/softness are per-light properties, not standalone feature params
//
// Must be registered AFTER LightingFeature in features/index.ts.
// ---------------------------------------------------------------------------

export interface LightSpheresState {
    lightSpheres: boolean;
}

export const LightSpheresFeature: FeatureDefinition = {
    id: 'lightSpheres',
    shortId: 'ls',
    name: 'Light Spheres',
    category: 'Rendering',
    dependsOn: ['lighting'],
    engineConfig: {
        toggleParam: 'lightSpheres',
        mode: 'compile',
        label: 'Light Spheres',
        groupFilter: 'engine_settings'
    },
    params: {
        lightSpheres: {
            type: 'boolean', default: true, label: 'Light Spheres', shortId: 'lsp',
            group: 'engine_settings',
            ui: 'checkbox',
            onUpdate: 'compile',
            noReset: true,
            description: 'Compiles visible emitter sphere rendering for point lights with radius > 0.',
            estCompileMs: 150
        },
    },
    inject: (builder, config, variant) => {
        if (variant !== 'Main') return;

        const state = config.lightSpheres as LightSpheresState;
        if (!state || state.lightSpheres === false) return;

        // Compile-time gate — all GLSL below is wrapped in #ifdef LIGHT_SPHERES
        builder.addDefine('LIGHT_SPHERES', '1');

        // Position 10 (PostDE): Ray-sphere intersection function
        builder.addPostDEFunction(LIGHT_SPHERE_INTERSECTION_GLSL);

        // Position 15 (Integrator): Compositing function definition
        builder.addIntegrator(getLightSphereCompositeGLSL());

        // Position 12 (Miss): Sphere rendering when primary ray misses geometry
        builder.addMissLogic(LIGHT_SPHERE_MISS_GLSL);

        // Position 17 (Composite): Call site for primary ray sphere compositing
        builder.addCompositeLogic('compositeLightSpheres(ro, rd, col, d, hit, stochasticSeed);');
    }
};

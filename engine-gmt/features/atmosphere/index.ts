
import { FeatureDefinition } from '../../engine/FeatureSystem';
import * as THREE from 'three';
import { ATMOSPHERE_VOLUME_BODY, ATMOSPHERE_VOLUME_FINALIZE } from './shader';

// ---------------------------------------------------------------------------
// POST-PROCESSING GLSL — injected via addPostProcessLogic()
// Variables in scope: col, d, glow, volumetric, fogScatter
// ---------------------------------------------------------------------------

/** Distance fog + volumetric density fog. Always injected (fog is independent of glow toggle). */
const FOG_POST_PROCESS = `
    // --- FOG (Atmosphere Feature) ---
    float fogFactor = smoothstep(uFogNear, uFogFar, d) * uFogIntensity;
    vec3 fogColor = uFogColorLinear;

    // Volumetric fog absorption
    if (uFogDensity > 0.0001) {
        float volAlpha = clamp(volumetric * uFogIntensity, 0.0, 1.0);
        col = mix(col, fogColor, volAlpha);
    }

    // Distance fog
    if (uEnvBackgroundStrength > 0.001) {
        // Background visible: only fog geometry, preserve env map on miss
        if (d < MISS_DIST - 10.0) {
            col = mix(col, fogColor, fogFactor);
        }
    } else {
        col = mix(col, fogColor, fogFactor);
    }
`;

/** Glow compositing. Always injected — guarded by uGlowIntensity uniform at runtime. */
const GLOW_POST_PROCESS = `
    // --- GLOW (Atmosphere Feature) ---
    if (uGlowIntensity > 0.0001) {
        col += glow * uGlowIntensity;
    }
`;

export interface AtmosphereState {
    fogIntensity: number;
    fogNear: number;
    fogFar: number;
    fogColor: THREE.Color;
    fogDensity: number;
    glowEnabled: boolean; // Compile-Time Switch
    glowQuality: number;
    glowIntensity: number;
    glowSharpness: number;
    glowMode: boolean;
    glowColor: THREE.Color;
}

export const AtmosphereFeature: FeatureDefinition = {
    id: 'atmosphere',
    shortId: 'at',
    name: 'Atmosphere',
    category: 'Rendering',
    engineConfig: {
        toggleParam: 'glowEnabled',
        mode: 'compile',
        label: 'Volumetric Glow',
        groupFilter: 'engine_settings'
    },
    groups: {
        fog: {
            label: 'Fog',
            description: 'Distance-based fog that fades the scene toward a colour.',
            helpId: 'fog.settings',
        },
        glow: {
            label: 'Glow',
            description: 'Soft halo emitted around bright surfaces.',
            helpId: 'mat.glow',
        },
    },
    params: {
        // --- MASTER SWITCH (Compile Time) ---
        glowEnabled: {
            type: 'boolean', default: true, label: 'Enable Glow', shortId: 'ge', group: 'main',
            hidden: true, noReset: true,
            onUpdate: 'compile'
        },

        // --- ENGINE SETTINGS (Compile Time) ---
        glowQuality: {
            type: 'float', default: 0.0, label: 'Glow Algo', shortId: 'gq',
            group: 'engine_settings',
            options: [{ label: 'Accurate (Vector)', value: 0.0 }, { label: 'Fast (Scalar)', value: 1.0 }],
            description: 'Vector accumulates color per-step. Scalar accumulates intensity only (faster).',
            onUpdate: 'compile',
            noReset: true
        },

        // --- FOG (Runtime) ---
        fogIntensity: {
            type: 'float', default: 0.0, label: 'Fog Intensity', shortId: 'fi', uniform: 'uFogIntensity',
            min: 0.0, max: 1.0, step: 0.01, group: 'fog',
            description: 'Master fog amount; fades distant geometry toward the fog colour.',
            helpId: 'fog.settings',
        },
        fogNear: {
            type: 'float', default: 0.0, label: 'Fog Start', shortId: 'fn', uniform: 'uFogNear',
            min: 0, max: 10, step: 0.1, scale: 'square', group: 'fog', parentId: 'fogIntensity', condition: { gt: 0.0 },
            description: 'Distance where fog begins to appear.',
            helpId: 'fog.settings',
        },
        fogFar: {
            type: 'float', default: 5.0, label: 'Fog End', shortId: 'ff', uniform: 'uFogFar',
            min: 0, max: 10, step: 0.1, scale: 'square', group: 'fog', parentId: 'fogIntensity', condition: { gt: 0.0 },
            description: 'Distance where fog reaches full opacity.',
            helpId: 'fog.settings',
        },
        fogColor: {
            type: 'color', default: new THREE.Color(0,0,0), label: 'Fog Color', shortId: 'fc', uniform: 'uFogColor',
            group: 'fog', parentId: 'fogIntensity', condition: { gt: 0.0 },
            description: 'Colour distant geometry fades toward.',
            helpId: 'fog.settings',
        },
        fogDensity: {
            type: 'float', default: 0.01, label: 'Fog Density', shortId: 'fd', uniform: 'uFogDensity',
            min: 0.001, max: 5.0, step: 0.01, scale: 'log', group: 'fog', parentId: 'fogIntensity', condition: { gt: 0.0 },
            description: 'Basic volumetric fog absorption density. For god rays and scatter, enable Volumetric Scattering in Engine.',
            helpId: 'fog.settings',
        },

        // --- GLOW (Runtime) ---
        // Note: These sliders are only visible if the feature is compiled (handled by UI visibility logic)
        glowIntensity: {
            type: 'float', default: 0.0, label: 'Glow Strength', shortId: 'gi', uniform: 'uGlowIntensity',
            min: 0, max: 5, step: 0.01, scale: 'log', group: 'glow',
            condition: { param: 'glowEnabled', bool: true },
            description: 'Brightness of the volumetric glow accumulated along each ray.',
            helpId: 'mat.glow',
        },
        glowSharpness: {
            type: 'float', default: 50.0, label: 'Tightness', shortId: 'gs', uniform: 'uGlowSharpness',
            min: 0.1, max: 1000, step: 0.1, scale: 'log', group: 'glow', parentId: 'glowIntensity', condition: [{ gt: 0.0 }, { param: 'glowEnabled', bool: true }],
            description: 'Low values give a wide haze; high values hug the surface like neon outlines.',
            helpId: 'mat.glow',
        },
        glowMode: {
            type: 'boolean', default: true, label: 'Glow Source', shortId: 'gm', uniform: 'uGlowMode',
            group: 'glow', parentId: 'glowIntensity', condition: [{ gt: 0.0 }, { param: 'glowEnabled', bool: true }],
            options: [{ label: 'Surface', value: false }, { label: 'Color', value: true }],
            description: 'Whether the glow inherits the surface colour or uses a fixed tint.',
            helpId: 'mat.glow',
        },
        glowColor: {
            type: 'color', default: new THREE.Color(1,1,1), label: 'Glow Color', shortId: 'gl', uniform: 'uGlowColor',
            group: 'glow', parentId: 'glowMode', condition: [{ bool: true }, { param: 'glowEnabled', bool: true }],
            description: 'Tint applied to the glow when Glow Source is Color.',
            helpId: 'mat.glow',
        }
    },
    inject: (builder, config, variant) => {
        // OPTIMIZATION: Only inject for Main Render
        if (variant !== 'Main') return;

        // Fog post-processing: always injected (independent of glow toggle)
        builder.addPostProcessLogic(FOG_POST_PROCESS);
        builder.addPostProcessLogic(GLOW_POST_PROCESS);

        const state = config.atmosphere as AtmosphereState;

        // Glow volume tracing: conditionally compiled
        if (state && state.glowEnabled) {
            if (state.glowQuality > 0.5) {
                builder.addDefine('GLOW_FAST', '1');
                // GLOW_FAST needs finalize code (tints accumulated scalar glow using hit color)
                builder.addVolumeTracing(ATMOSPHERE_VOLUME_BODY, ATMOSPHERE_VOLUME_FINALIZE);
            } else {
                // Quality mode: finalize is dead code (#ifdef GLOW_FAST won't fire).
                // Pass empty string so Phase 4.1 miss optimization (skip map() on miss) activates.
                builder.addVolumeTracing(ATMOSPHERE_VOLUME_BODY, '');
            }
        }
        // If glow disabled, no volume tracing. The 'accColor' variables in traceScene default to 0.0.
    }
};

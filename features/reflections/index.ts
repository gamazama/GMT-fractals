
import { FeatureDefinition } from '../../engine/FeatureSystem';
import { getReflectionsGLSL } from './shader';

// Reflection modes (compile-time)
export const REFL_MODE_OFF = 0.0;
export const REFL_MODE_ENV = 1.0;       // Environment map only (Fresnel-weighted)
export const REFL_MODE_SSR = 2.0;       // Screen-space reflections (no DE calls)
export const REFL_MODE_RAYMARCH = 3.0;  // Full raymarched reflections

export interface ReflectionsState {
    enabled: boolean; // Master compile-time switch
    reflectionMode: number; // REFL_MODE_* constants
    bounceShadows: boolean; // Whether reflected surfaces cast shadows
    bounces: number;
    steps: number;
    roughnessThreshold: number;
    mixStrength: number;
}

export const ReflectionsFeature: FeatureDefinition = {
    id: 'reflections',
    shortId: 'rf',
    name: 'Reflections',
    category: 'Rendering',
    engineConfig: {
        toggleParam: 'enabled',
        mode: 'compile',
        label: 'Reflection Tracing',
        groupFilter: 'engine_settings'
    },
    params: {
        // --- REFLECTION MODE (Engine Panel) ---
        reflectionMode: {
            type: 'float', default: REFL_MODE_ENV, label: 'Reflection Method', shortId: 'rm',
            group: 'engine_settings',
            options: [
                { label: 'Off', value: REFL_MODE_OFF, estCompileMs: 0 },
                { label: 'Environment Map', value: REFL_MODE_ENV, estCompileMs: 0 },
                { label: 'Screen-Space (SSR)', value: REFL_MODE_SSR, estCompileMs: 0 },
                { label: 'Raymarched (Quality)', value: REFL_MODE_RAYMARCH, estCompileMs: 7500 }
            ],
            description: 'Reflection technique. Higher quality = longer compile time. Raymarched adds ~9s.',
            onUpdate: 'compile',
            noReset: true
        },

        // --- BOUNCE SHADOWS (Engine Panel, only for Raymarched) ---
        bounceShadows: {
            type: 'boolean', default: false, label: 'Bounce Shadows', shortId: 'bs',
            group: 'engine_settings',
            ui: 'checkbox',
            condition: { param: 'reflectionMode', eq: REFL_MODE_RAYMARCH },
            description: 'Compute shadows on reflected surfaces. Adds ~3-4s compile time.',
            onUpdate: 'compile',
            noReset: true,
            estCompileMs: 4500
        },

        // --- QUALITY PARAMS (Engine Panel, only for Raymarched) ---
        mixStrength: {
            type: 'float', default: 1.0, label: 'Raymarch Mix', shortId: 'mx', uniform: 'uReflStrength',
            min: 0.0, max: 1.0, step: 0.01,
            group: 'engine_settings',
            condition: { param: 'reflectionMode', eq: REFL_MODE_RAYMARCH },
            description: "Blends between Raymarched Reflections (1.0) and Environment Map (0.0)."
        },
        roughnessThreshold: {
            type: 'float', default: 0.62, label: 'Roughness Cutoff', shortId: 'rc', uniform: 'uReflRoughnessCutoff',
            min: 0.0, max: 1.0, step: 0.01,
            group: 'engine_settings',
            condition: { param: 'reflectionMode', eq: REFL_MODE_RAYMARCH },
            description: "Surfaces rougher than this will skip raymarching to save performance."
        },
        bounces: {
            type: 'int', default: 1, label: 'Max Bounces', shortId: 'rb',
            min: 1, max: 3, step: 1, group: 'engine_settings',
            uniform: 'uReflBounces',
            ui: 'numeric',
            description: "Maximum recursion depth. Clamped to 3. Default 1 for performance.",
            noReset: true,
            onUpdate: 'compile',
            condition: { param: 'reflectionMode', eq: REFL_MODE_RAYMARCH }
        },
        steps: {
            type: 'int', default: 64, label: 'Trace Steps', shortId: 'rs',
            min: 16, max: 128, step: 8, group: 'engine_settings',
            uniform: 'uReflSteps',
            ui: 'numeric',
            description: "Precision of the reflection ray.",
            noReset: true,
            condition: { param: 'reflectionMode', eq: REFL_MODE_RAYMARCH }
        },

        // Master Switch (Compile Time) — hidden, controlled by engine toggle
        enabled: {
            type: 'boolean', default: true, label: 'Enable Reflections', shortId: 're', group: 'main',
            hidden: true, noReset: true,
            onUpdate: 'compile'
        }
    },
    inject: (builder, config, variant) => {
        // OPTIMIZATION: Only inject for Main Render
        if (variant !== 'Main') return;

        const state = config.reflections as ReflectionsState;
        if (!state || state.enabled === false) return;

        const mode = state.reflectionMode ?? REFL_MODE_ENV;

        if (mode === REFL_MODE_OFF) {
            // No reflection code at all
            return;
        }

        if (mode === REFL_MODE_ENV) {
            // Environment map only — no extra code needed, shading.ts handles via #else branch
            builder.addDefine('REFLECTIONS_ENV', '1');
            return;
        }

        if (mode === REFL_MODE_SSR) {
            // Screen-space reflections — no DE calls
            builder.addDefine('REFLECTIONS_SSR', '1');
            return;
        }

        if (mode === REFL_MODE_RAYMARCH) {
            // Full raymarched reflections
            builder.addDefine('REFLECTIONS_ENABLED', '1');
            builder.addPostDEFunction(getReflectionsGLSL());

            const bounces = Math.max(1, Math.min(3, state.bounces ?? 1));
            builder.addDefine('MAX_REFL_BOUNCES', bounces.toString());

            // Bounce shadows control
            if (state.bounceShadows) {
                builder.addDefine('REFL_BOUNCE_SHADOWS', '1');
            }
        }
    }
};

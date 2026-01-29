
import { FeatureDefinition } from '../../engine/FeatureSystem';
import { getReflectionsGLSL } from './shader';

export interface ReflectionsState {
    enabled: boolean; // Compile-Time Switch
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
        // --- MOVED TO ENGINE PANEL ---
        mixStrength: {
            type: 'float', default: 1.0, label: 'Raymarch Mix', shortId: 'rm', uniform: 'uReflStrength',
            min: 0.0, max: 1.0, step: 0.01, 
            group: 'engine_settings', 
            condition: { param: 'enabled', bool: true },
            description: "Blends between Raymarched Reflections (1.0) and Environment Map (0.0)."
        },
        roughnessThreshold: {
            type: 'float', default: 0.5, label: 'Roughness Cutoff', shortId: 'rc', uniform: 'uReflRoughnessCutoff',
            min: 0.0, max: 1.0, step: 0.01, 
            group: 'engine_settings',
            condition: { param: 'enabled', bool: true },
            description: "Surfaces rougher than this will skip raymarching to save performance."
        },

        // --- KERNEL (Engine Panel) ---
        bounces: {
            type: 'int', default: 1, label: 'Max Bounces', shortId: 'rb',
            min: 1, max: 3, step: 1, group: 'engine_settings',
            uniform: 'uReflBounces', // Runtime (limit)
            ui: 'numeric',
            description: "Maximum recursion depth. Clamped to 3. Default 1 for performance.",
            noReset: true,
            onUpdate: 'compile' 
        },
        steps: {
            type: 'int', default: 64, label: 'Trace Steps', shortId: 'rs',
            min: 16, max: 128, step: 8, group: 'engine_settings',
            uniform: 'uReflSteps', // Runtime
            ui: 'numeric',
            description: "Precision of the reflection ray.",
            noReset: true
        },
        
        // Master Switch (Compile Time)
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
        
        // CONDITIONAL COMPILATION:
        // Only inject code and defines if enabled.
        if (state?.enabled !== false) {
            builder.addDefine('REFLECTIONS_ENABLED', '1');
            // Inject the helper function 'traceReflectionRay'
            builder.addPostDEFunction(getReflectionsGLSL());
            
            const bounces = Math.max(1, Math.min(3, state.bounces ?? 1));
            builder.addDefine('MAX_REFL_BOUNCES', bounces.toString());
        }
        // If disabled, 'shading.ts' will see REFLECTIONS_ENABLED is undefined and skip the logic block.
    }
};

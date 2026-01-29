
import { FeatureDefinition } from '../../engine/FeatureSystem';
import * as THREE from 'three';
import { ATMOSPHERE_VOLUME_BODY, ATMOSPHERE_VOLUME_FINALIZE } from './shader';

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
            min: 0.0, max: 1.0, step: 0.01, group: 'fog'
        },
        fogNear: {
            type: 'float', default: 0.0, label: 'Fog Start', shortId: 'fn', uniform: 'uFogNear',
            min: 0, max: 10, step: 0.1, scale: 'square', group: 'fog', parentId: 'fogIntensity', condition: { gt: 0.0 }
        },
        fogFar: {
            type: 'float', default: 5.0, label: 'Fog End', shortId: 'ff', uniform: 'uFogFar',
            min: 0, max: 10, step: 0.1, scale: 'square', group: 'fog', parentId: 'fogIntensity', condition: { gt: 0.0 }
        },
        fogColor: {
            type: 'color', default: new THREE.Color(0,0,0), label: 'Fog Color', shortId: 'fc', uniform: 'uFogColor',
            group: 'fog', parentId: 'fogIntensity', condition: { gt: 0.0 }
        },
        fogDensity: {
            type: 'float', default: 0.0, label: 'Volumetric Density', shortId: 'fd', uniform: 'uFogDensity',
            min: 0, max: 2, step: 0.01, group: 'fog', parentId: 'fogIntensity', condition: { gt: 0.0 }
        },
        
        // --- GLOW (Runtime) ---
        // Note: These sliders are only visible if the feature is compiled (handled by UI visibility logic)
        glowIntensity: {
            type: 'float', default: 0.0, label: 'Glow Strength', shortId: 'gi', uniform: 'uGlowIntensity',
            min: 0, max: 5, step: 0.01, scale: 'log', group: 'glow',
            condition: { param: 'glowEnabled', bool: true }
        },
        glowSharpness: {
            type: 'float', default: 50.0, label: 'Tightness', shortId: 'gs', uniform: 'uGlowSharpness',
            min: 1, max: 1000, step: 1, group: 'glow', parentId: 'glowIntensity', condition: [{ gt: 0.0 }, { param: 'glowEnabled', bool: true }]
        },
        glowMode: {
            type: 'boolean', default: true, label: 'Glow Source', shortId: 'gm', uniform: 'uGlowMode',
            group: 'glow', parentId: 'glowIntensity', condition: [{ gt: 0.0 }, { param: 'glowEnabled', bool: true }],
            options: [{ label: 'Surface', value: false }, { label: 'Color', value: true }]
        },
        glowColor: {
            type: 'color', default: new THREE.Color(1,1,1), label: 'Glow Color', shortId: 'gl', uniform: 'uGlowColor',
            group: 'glow', parentId: 'glowMode', condition: [{ bool: true }, { param: 'glowEnabled', bool: true }]
        }
    },
    inject: (builder, config, variant) => {
        // OPTIMIZATION: Only inject volume logic for Main Render
        if (variant !== 'Main') return;

        const state = config.atmosphere as AtmosphereState;
        
        // CONDITIONAL COMPILATION:
        // Only inject volume logic if enabled in Engine Config.
        if (state && state.glowEnabled) {
            if (state.glowQuality > 0.5) {
                builder.addDefine('GLOW_FAST', '1');
            }
            builder.addVolumeLogic(ATMOSPHERE_VOLUME_BODY, ATMOSPHERE_VOLUME_FINALIZE);
        }
        // If disabled, we do nothing. The 'accColor' variables in traceScene will default to 0.0 and be unused.
    }
};


import { FeatureDefinition } from '../engine/FeatureSystem';
import * as THREE from 'three';

export interface StressTestState {
    active: boolean;
    intensity: number;
    frequency: number;
    speed: number;
    color: THREE.Color;
}

export const StressTestFeature: FeatureDefinition = {
    id: 'stressTest',
    shortId: 'st',
    name: 'Stress Test',
    category: 'Post Process',
    
    // 1. UI Configuration: Auto-generate a tab
    tabConfig: {
        label: 'Stress Test',
        componentId: 'panel-stress-test', // Will fallback to AutoFeaturePanel if not found in registry
        order: 99
    },

    // 2. Engine Logic: Master switch
    engineConfig: {
        toggleParam: 'active',
        mode: 'runtime', // Runtime update (fast), no recompile needed
        label: 'Holographic Scanlines'
    },

    // 3. Parameter Schema
    params: {
        active: {
            type: 'boolean',
            default: false,
            label: 'Enable Scanlines',
            shortId: 'on',
            uniform: 'uStressActive',
            group: 'main',
            noReset: true
        },
        intensity: {
            type: 'float',
            default: 0.5,
            label: 'Intensity',
            shortId: 'si',
            uniform: 'uStressIntensity',
            min: 0.0, max: 1.0, step: 0.01,
            group: 'controls',
            condition: { param: 'active', bool: true }
        },
        frequency: {
            type: 'float',
            default: 50.0,
            label: 'Frequency',
            shortId: 'sf',
            uniform: 'uStressFreq',
            min: 10.0, max: 200.0, step: 1.0,
            group: 'controls',
            condition: { param: 'active', bool: true }
        },
        speed: {
            type: 'float',
            default: 2.0,
            label: 'Scroll Speed',
            shortId: 'ss',
            uniform: 'uStressSpeed',
            min: -10.0, max: 10.0, step: 0.1,
            group: 'controls',
            condition: { param: 'active', bool: true }
        },
        color: {
            type: 'color',
            default: new THREE.Color('#00ff00'),
            label: 'Scan Color',
            shortId: 'sc',
            uniform: 'uStressColor',
            group: 'visuals',
            condition: { param: 'active', bool: true }
        }
    },

    // 4. Shader Injection
    // DDFS should automatically inject this into the main fragment shader
    shader: {
        uniforms: `uniform float uTime;`,
        main: `
        if (uStressActive > 0.5) {
            float scanLine = sin(vUv.y * uStressFreq + uTime * uStressSpeed) * 0.5 + 0.5;
            vec3 scanColor = uStressColor * scanLine * uStressIntensity;
            
            // Additive blending
            col += scanColor;
            
            // Slight chromatic aberration logic injected blindly
            if (scanLine > 0.9) {
                col *= 1.2;
            }
        }
        `
    }
};

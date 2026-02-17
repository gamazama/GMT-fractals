
import { FeatureDefinition } from '../../engine/FeatureSystem';
import { SonificationState } from './types';

export const SonificationFeature: FeatureDefinition = {
    id: 'sonification',
    shortId: 'sn',
    name: 'Sonification',
    category: 'Audio',
    tabConfig: {
        label: 'Sonification', // Renamed from Sound
        componentId: 'panel-sonification',
        order: 75,
        condition: { param: 'isEnabled', bool: true }
    },
    menuConfig: {
        label: 'FHBT Sonification',
        toggleParam: 'isEnabled'
    },
    viewportConfig: {
        componentId: 'probe-sonification',
        type: 'scene' // Renders inside R3F canvas
    },
    params: {
        isEnabled: { type: 'boolean', default: false, label: 'Enable Sonification', shortId: 'en', group: 'system', noReset: true, onUpdate: 'compile' },
        active: { type: 'boolean', default: true, label: 'Active', shortId: 'ac', group: 'controls', noReset: true },
        baseFrequency: { 
            type: 'float', default: 220, label: 'Base Freq (Hz)', shortId: 'bf', 
            min: 55, max: 880, step: 1, group: 'controls', noReset: true 
        },
        masterGain: { 
            type: 'float', default: 0.5, label: 'Volume', shortId: 'mg', 
            min: 0, max: 1, step: 0.01, group: 'controls', noReset: true 
        },
        scanArea: {
            type: 'float', default: 0.1, label: 'Focus Area', shortId: 'sa',
            min: 0.01, max: 1.0, step: 0.01, group: 'controls', noReset: true,
            description: "Width of the scan beam. Low = Center Probe, High = Full Screen Avg."
        },
        harmonics: { type: 'boolean', default: true, label: 'Harmonics', shortId: 'hm', group: 'controls', noReset: true, hidden: true },
        lastDimension: { type: 'float', default: 0, label: 'Dimension', group: 'data', hidden: true, noReset: true }
    },
    inject: (builder, config, variant) => {
        const state = config.sonification as SonificationState;
        if (state && state.isEnabled && variant === 'Physics') {
            builder.setPhysicsRayGen(`
                // FHBT Probe Logic: 3-Arm Logarithmic Spiral Sampling
                // Row 0, 1, 2 correspond to 3 different spiral arms.
                
                float armIndex = floor(vUv.y * 3.0);
                float phaseOffset = armIndex * 2.094395; // 2 * PI / 3
                
                float t = vUv.x;
                float rotations = 3.0; 
                
                // Exponential growth: r = (exp(k*t) - 1) / (exp(k) - 1)
                // This concentrates samples near the center and expands rapidly at the edges
                float k = 3.0; 
                float radius = (exp(k * t) - 1.0) / (exp(k) - 1.0);
                
                float theta = (t * rotations * 6.28318) + phaseOffset;

                vec2 spiralOffset = vec2(cos(theta), sin(theta)) * radius;

                // uCamBasisX/Y are scaled by FOV in FHBTProbe.tsx
                vec3 rd = normalize(uCamForward + spiralOffset.x * uCamBasisX + spiralOffset.y * uCamBasisY);
            `);
        }
    }
};

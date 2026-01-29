
import { FeatureDefinition } from '../engine/FeatureSystem';

export interface ColorGradingState {
    active: boolean;
    saturation: number;
    levelsMin: number;
    levelsMax: number;
    levelsGamma: number;
}

export const ColorGradingFeature: FeatureDefinition = {
    id: 'colorGrading',
    shortId: 'cg',
    name: 'Color Grading',
    category: 'Post Process',
    customUI: [
        {
            componentId: 'scene-histogram',
            group: 'grading',
            condition: { param: 'active', bool: true }
        }
    ],
    params: {
        active: {
            type: 'boolean',
            default: false,
            label: 'Color Correction', 
            shortId: 'ac',
            uniform: 'uGradingActive',
            group: 'grading',
            noReset: true
        },
        saturation: {
            type: 'float',
            default: 1.0,
            label: 'Saturation',
            shortId: 'sa',
            uniform: 'uSaturation',
            min: 0.0, max: 2.0, step: 0.01,
            group: 'grading',
            parentId: 'active',
            condition: { bool: true },
            noReset: true
        },
        levelsMin: {
            type: 'float',
            default: 0.0,
            label: 'Black Point',
            shortId: 'ln',
            uniform: 'uLevelsMin',
            min: 0.0, max: 1.0, step: 0.01,
            group: 'grading',
            parentId: 'active',
            condition: { bool: true },
            noReset: true, 
            hidden: true 
        },
        levelsMax: {
            type: 'float',
            default: 1.0,
            label: 'White Point',
            shortId: 'lx',
            uniform: 'uLevelsMax',
            min: 0.0, max: 2.0, step: 0.01,
            group: 'grading',
            parentId: 'active',
            condition: { bool: true },
            noReset: true,
            hidden: true 
        },
        levelsGamma: {
            type: 'float',
            default: 1.0,
            label: 'Gamma',
            shortId: 'lg',
            uniform: 'uLevelsGamma',
            min: 0.1, max: 3.0, step: 0.01,
            group: 'grading',
            parentId: 'active',
            condition: { bool: true },
            noReset: true,
            hidden: true 
        }
    },
    shader: {
        functions: `
            vec3 applyColorGrading(vec3 col) {
                col = max(vec3(0.0), col - uLevelsMin);
                col /= max(0.0001, uLevelsMax - uLevelsMin);
                if (abs(uLevelsGamma - 1.0) > 0.001) {
                    col = pow(max(vec3(0.0), col), vec3(1.0 / uLevelsGamma));
                }
                float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
                col = mix(vec3(luma), col, uSaturation);
                return col;
            }
        `,
        main: `
            if (uGradingActive > 0.5) {
                col = applyColorGrading(col);
            }
        `
    }
};

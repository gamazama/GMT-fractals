
import { FeatureDefinition } from '../engine/FeatureSystem';
import * as THREE from 'three';

export interface TexturingState {
    active: boolean;
    layer1Data: string | null;
    mapU: number;
    mapV: number;
    scaleX: number;
    scaleY: number;
    textureScale: THREE.Vector2;
    offset: THREE.Vector2;
    colorSpace: number; // 0=sRGB, 1=Linear, 2=ACES
}

export const TexturingFeature: FeatureDefinition = {
    id: 'texturing',
    shortId: 'tx',
    name: 'Texture',
    category: 'Coloring',
    params: {
        active: {
            type: 'boolean',
            default: false,
            label: 'Use Texture',
            shortId: 'ac',
            uniform: 'uUseTexture',
            group: 'main',
            hidden: true 
        },
        layer1Data: {
            type: 'image',
            default: null,
            label: 'Select Image',
            shortId: 'id',
            group: 'main',
            uniform: 'uTexture', 
            textureSettings: {
                wrapS: THREE.RepeatWrapping,
                wrapT: THREE.RepeatWrapping,
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter
            },
            // Explicit link to colorSpace param
            linkedParams: {
                colorSpace: 'colorSpace'
            }
        },
        // Hidden Param controlled by Image Input custom UI
        colorSpace: {
            type: 'float',
            default: 0.0,
            label: 'Color Profile',
            shortId: 'cs',
            uniform: 'uTextureColorSpace',
            group: 'main',
            hidden: true
            // Removed noReset: true to ensure accumulation resets on change
        },
        mapU: {
            type: 'float',
            default: 6.0, 
            label: 'U',
            shortId: 'mu',
            uniform: 'uTextureModeU',
            group: 'mapping',
            layout: 'half',
            options: [
                { label: 'Orbit Trap', value: 0.0 },
                { label: 'Iterations', value: 1.0 },
                { label: 'Radial', value: 2.0 },
                { label: 'Z-Depth', value: 3.0 },
                { label: 'Angle', value: 4.0 },
                { label: 'Normal', value: 5.0 },
                { label: 'Decomposition', value: 6.0 },
                { label: 'Raw Iterations', value: 7.0 },
                { label: 'Potential (Log-Log)', value: 8.0 }
            ]
        },
        mapV: {
            type: 'float',
            default: 1.0, 
            label: 'V',
            shortId: 'mv',
            uniform: 'uTextureModeV',
            group: 'mapping',
            layout: 'half',
            options: [
                { label: 'Orbit Trap', value: 0.0 },
                { label: 'Iterations', value: 1.0 },
                { label: 'Radial', value: 2.0 },
                { label: 'Z-Depth', value: 3.0 },
                { label: 'Angle', value: 4.0 },
                { label: 'Normal', value: 5.0 },
                { label: 'Decomposition', value: 6.0 },
                { label: 'Raw Iterations', value: 7.0 },
                { label: 'Potential (Log-Log)', value: 8.0 }
            ]
        },
        scaleX: {
            type: 'float',
            default: 1.0,
            label: 'Scale U',
            shortId: 'su',
            min: 0.1, max: 500.0, step: 0.1,
            scale: 'log',
            group: 'transform',
            layout: 'half'
        },
        scaleY: {
            type: 'float',
            default: 1.0,
            label: 'Scale V',
            shortId: 'sv',
            min: 0.1, max: 500.0, step: 0.1,
            scale: 'log',
            group: 'transform',
            layout: 'half'
        },
        textureScale: {
            type: 'vec2',
            default: new THREE.Vector2(1,1),
            label: 'Texture Scale',
            uniform: 'uTextureScale',
            composeFrom: ['scaleX', 'scaleY'],
            hidden: true
        },
        offset: {
            type: 'vec2',
            default: new THREE.Vector2(0, 0),
            label: 'Texture Offset',
            shortId: 'of',
            uniform: 'uTextureOffset',
            min: -2.0, max: 2.0, step: 0.01,
            group: 'transform'
        }
    },
    shader: {
        // applyTextureProfile moved to math.ts
    }
};

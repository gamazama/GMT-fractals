
import { FeatureDefinition } from '../engine/FeatureSystem';
import * as THREE from 'three';
import { GradientStop, GradientConfig } from '../types/graphics';
import { LIGHTING_ENV } from '../shaders/chunks/lighting/env';

export interface MaterialState {
    diffuse: number;
    reflection: number;
    specular: number;
    roughness: number;
    rim: number;
    rimExponent: number;
    envStrength: number;
    envBackgroundStrength: number; // Renamed UI label to BG Visibility
    envSource: number;
    envMapData: string | null;
    envMapColorSpace: number; // 0=sRGB, 1=Linear, 2=ACES
    useEnvMap: boolean;
    envRotation: number;
    envGradientStops: GradientStop[] | GradientConfig;
    emission: number;
    emissionMode: number;
    emissionColor: THREE.Color;
    ptEmissionMult: number;
}

const MATERIAL_LOGIC = `
    roughness = clamp(uRoughness, 0.02, 1.0);
    vec3 emitSource = albedo; 
    if (abs(uEmissionMode - 1.0) < 0.1) emitSource = col1;
    else if (abs(uEmissionMode - 2.0) < 0.1) emitSource = col2;
    else if (abs(uEmissionMode - 3.0) < 0.1) {
        float n01 = noiseVal * 0.5 + 0.5;
        emitSource = uLayer3Color * n01;
    }
    else if (abs(uEmissionMode - 4.0) < 0.1) emitSource = uEmissionColor; 
    emission = emitSource * uEmission * 1.5;
`;

const MAIN_HEADER = `
    // EnvStrength scaling for Direct Render Mode
    #ifdef RENDER_MODE_PATHTRACING
        #define uEnvStrength uEnvStrengthSlider
    #else
        #define uEnvStrength (uEnvStrengthSlider * 0.33)
    #endif
`;

export const MaterialFeature: FeatureDefinition = {
    id: 'materials',
    shortId: 'm',
    name: 'Material',
    category: 'Rendering',
    tabConfig: {
        label: 'Shader', // Renamed from Shading
        componentId: 'panel-shading',
        order: 40
    },
    params: {
        // --- SURFACE ---
        diffuse: {
            type: 'float',
            default: 1.0,
            label: 'Diffuse (Color)',
            shortId: 'di',
            uniform: 'uDiffuse',
            min: 0.0, max: 2.0, step: 0.01,
            group: 'surface'
        },
        reflection: {
            type: 'float',
            default: 0.0,
            label: 'Metallic',
            shortId: 're',
            uniform: 'uReflection',
            min: 0.0, max: 1.0, step: 0.01,
            group: 'surface'
        },
        specular: {
            type: 'float',
            default: 0.3,
            label: 'Reflectivity',
            shortId: 'sp',
            uniform: 'uSpecular',
            min: 0.0, max: 2.0, step: 0.01,
            group: 'surface'
        },
        roughness: {
            type: 'float',
            default: 0.5,
            label: 'Roughness',
            shortId: 'ro',
            uniform: 'uRoughness',
            min: 0.001, max: 1.0, step: 0.001,
            group: 'surface'
        },
        
        // --- RIM ---
        rim: {
            type: 'float',
            default: 0.0,
            label: 'Rim Light',
            shortId: 'ri',
            uniform: 'uRim',
            min: 0.0, max: 10.0, step: 0.01,
            scale: 'log',
            group: 'surface'
        },
        rimExponent: {
            type: 'float',
            default: 4.0,
            label: 'Rim Sharpness',
            shortId: 'rx',
            uniform: 'uRimExponent',
            min: 1.0, max: 16.0, step: 0.1,
            group: 'surface',
            parentId: 'rim',
            condition: { gt: 0.0 }
        },

        // --- ENVIRONMENT ---
        envStrength: {
            type: 'float',
            default: 0.0,
            label: 'Environment Light',
            shortId: 'es',
            uniform: 'uEnvStrengthSlider', 
            min: 0.0, max: 5.0, step: 0.01,
            group: 'env'
        },
        envBackgroundStrength: {
            type: 'float',
            default: 0.0,
            label: 'BG Visibility',
            shortId: 'eb',
            uniform: 'uEnvBackgroundStrength',
            min: 0.0, max: 2.0, step: 0.01,
            group: 'env',
            condition: { gt: 0.0, param: 'envStrength' }
        },
        envSource: {
            type: 'float', 
            default: 1.0, 
            label: 'Source',
            shortId: 'eo',
            uniform: 'uEnvSource',
            group: 'env',
            // Visible only if light is active (Needed for IBL) or if background is visible?
            // User requested: visible only when environment light > 0
            condition: { gt: 0.0, param: 'envStrength' },
            options: [
                { label: 'Sky Image', value: 0.0 },
                { label: 'Gradient', value: 1.0 }
            ]
        },
        envMapData: {
            type: 'image',
            default: null,
            label: 'Upload Texture',
            shortId: 'et',
            group: 'env',
            parentId: 'envSource',
            condition: { eq: 0.0 },
            uniform: 'uEnvMapTexture',
            textureSettings: {
                mapping: THREE.EquirectangularReflectionMapping,
                minFilter: THREE.LinearMipmapLinearFilter,
                generateMipmaps: true
            },
            linkedParams: {
                colorSpace: 'envMapColorSpace'
            }
        },
        // Linked Color Space Param (Hidden, controlled by Image UI)
        envMapColorSpace: {
            type: 'float',
            default: 0.0,
            label: 'Env Profile',
            shortId: 'ec',
            uniform: 'uEnvMapColorSpace',
            group: 'env',
            hidden: true
            // Removed noReset: true to ensure accumulation resets on change
        },
        useEnvMap: {
            type: 'boolean',
            default: false,
            label: 'Use Env Map',
            shortId: 'eu',
            uniform: 'uUseEnvMap',
            hidden: true,
            group: 'env'
        },
        envRotation: {
            type: 'float',
            default: 0.0,
            label: 'Rotation',
            shortId: 'er',
            uniform: 'uEnvRotation',
            min: 0.0, max: 6.28, step: 0.01,
            group: 'env',
            // Show only if Env Strength > 0 AND Source is Image (0.0)
            condition: [
                { param: 'envStrength', gt: 0.0 },
                { param: 'envSource', eq: 0.0 }
            ]
        },
        envGradientStops: {
            type: 'gradient',
            default: [
                { id: 'sky', position: 0.0, color: '#000000', bias: 0.5, interpolation: 'smooth' }, 
                { id: 'hor', position: 0.5, color: "#223344", bias: 0.5, interpolation: 'smooth' }, 
                { id: 'zen', position: 1.0, color: '#88ccff', bias: 0.5, interpolation: 'smooth' }  
            ],
            label: 'Sky Gradient',
            shortId: 'eg',
            uniform: 'uEnvGradient',
            group: 'env',
            parentId: 'envSource',
            condition: { eq: 1.0 }
        },

        // --- EMISSION ---
        emission: {
            type: 'float',
            default: 0.0,
            label: 'Self-illumination',
            shortId: 'em',
            uniform: 'uEmission',
            min: 0.0000, max: 5.0, step: 0.001,
            scale: 'square',
            group: 'emission'
        },
        emissionMode: {
            type: 'float', 
            default: 0.0, 
            label: 'Emission Source',
            shortId: 'ec',
            uniform: 'uEmissionMode',
            min: 0.0, max: 4.0, step: 1.0,
            group: 'emission',
            parentId: 'emission',
            condition: { gt: 0.0001 },
            options: [
                { label: 'Full Surface', value: 0.0 },
                { label: 'Layer 1', value: 1.0 },
                { label: 'Layer 2', value: 2.0 },
                { label: 'Layer 3', value: 3.0 },
                { label: 'Solid Color', value: 4.0 }
            ]
        },
        emissionColor: {
            type: 'color',
            default: new THREE.Color(1,1,1),
            label: 'Solid Color',
            shortId: 'el',
            uniform: 'uEmissionColor',
            group: 'emission',
            parentId: 'emissionMode',
            condition: { eq: 4.0 }
        },
        ptEmissionMult: {
            type: 'float',
            default: 1.0,
            label: 'Illumination Power',
            shortId: 'ep',
            uniform: 'uPTEmissionMult',
            min: 0.0, max: 10.0, step: 0.1,
            group: 'emission',
            parentId: 'emission',
            condition: [
                { gt: 0.0001 }, 
                { param: '$renderMode', eq: 'PathTracing' } 
            ]
        }
    },
    inject: (builder) => {
        builder.addHeader(MAIN_HEADER);
        builder.addMaterialLogic(MATERIAL_LOGIC);
        
        // Inject Environment Map Logic used by Lighting and Path Tracer
        builder.addFunction(LIGHTING_ENV);
    }
};

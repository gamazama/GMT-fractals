
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
    rimColor: THREE.Color;
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
    emission = emitSource * uEmission;
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
    },
    groups: {
        surface: {
            label: 'Surface',
            description: 'Direct-light shading on the fractal surface.',
            helpId: 'mat.surface',
        },
        env: {
            label: 'Environment',
            description: 'Image-based lighting and sky source for indirect light.',
            helpId: 'mat.env',
        },
        emission: {
            label: 'Self-Illumination',
            description: 'Surface glow that emits its own light independently of scene lighting.',
            helpId: 'mat.emission',
        },
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
            group: 'surface',
            description: 'Strength of the gradient colour applied to lit surfaces.',
            helpId: 'mat.diffuse',
        },
        reflection: {
            type: 'float',
            default: 0.0,
            label: 'Metallic',
            shortId: 're',
            uniform: 'uReflection',
            min: 0.0, max: 1.0, step: 0.01,
            group: 'surface',
            description: 'Tints highlights with the surface colour as the surface gets more metallic.',
            helpId: 'mat.metallic',
        },
        specular: {
            type: 'float',
            default: 0.3,
            label: 'Reflectivity',
            shortId: 'sp',
            uniform: 'uSpecular',
            min: 0.0, max: 2.0, step: 0.01,
            group: 'surface',
            description: 'Brightness of direct-light specular highlights.',
            helpId: 'mat.specular',
        },
        roughness: {
            type: 'float',
            default: 0.5,
            label: 'Roughness',
            shortId: 'ro',
            uniform: 'uRoughness',
            min: 0.001, max: 1.0, step: 0.001,
            group: 'surface',
            description: 'Spreads highlights wider as roughness increases.',
            helpId: 'mat.roughness',
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
            group: 'surface',
            description: 'Adds a glow along edges that face away from the camera.',
            helpId: 'mat.rim',
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
            condition: { gt: 0.0 },
            description: 'Higher values keep the rim glow tight to the silhouette.',
            helpId: 'mat.rim',
        },
        rimColor: {
            type: 'color',
            default: new THREE.Color(0.5, 0.7, 1.0),
            label: 'Rim Color',
            shortId: 'rc',
            uniform: 'uRimColor',
            group: 'surface',
            parentId: 'rim',
            condition: { gt: 0.0 },
            description: 'Tint of the rim glow.',
            helpId: 'mat.rim',
        },

        // --- ENVIRONMENT ---
        envStrength: {
            type: 'float',
            default: 0.0,
            label: 'Environment Light',
            shortId: 'es',
            uniform: 'uEnvStrengthSlider',
            min: 0.0, max: 5.0, step: 0.01,
            group: 'env',
            description: 'Brightness of the sky-based reflection on the surface.',
            helpId: 'mat.env',
        },
        envBackgroundStrength: {
            type: 'float',
            default: 0.0,
            label: 'BG Visibility',
            shortId: 'eb',
            uniform: 'uEnvBackgroundStrength',
            min: 0.0, max: 2.0, step: 0.01,
            group: 'env',
            parentId: 'envStrength',
            condition: { gt: 0.0, param: 'envStrength' },
            description: 'How visible the sky is behind the fractal (0 = black background).',
            helpId: 'mat.env',
        },
        envSource: {
            type: 'float',
            default: 1.0,
            label: 'Source',
            shortId: 'eo',
            uniform: 'uEnvSource',
            group: 'env',
            parentId: 'envStrength',
            condition: { gt: 0.0, param: 'envStrength' },
            options: [
                { label: 'Sky Image', value: 0.0 },
                { label: 'Gradient', value: 1.0 }
            ],
            description: 'Whether the environment uses a panorama image or a procedural gradient.',
            helpId: 'mat.env',
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
            },
            description: 'Equirectangular HDR or LDR image used as the sky.',
            helpId: 'mat.env',
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
            parentId: 'envSource',
            condition: [
                { param: 'envStrength', gt: 0.0 },
                { param: 'envSource', eq: 0.0 }
            ],
            description: 'Spins the sky image around the vertical axis.',
            helpId: 'mat.env',
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
            condition: { eq: 1.0 },
            description: 'Vertical sky gradient: ground colour to zenith.',
            helpId: 'mat.env',
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
            group: 'emission',
            description: 'How brightly the surface glows on its own, independent of lights.',
            helpId: 'mat.emission',
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
            ],
            description: 'Which part of the surface colour drives the glow.',
            helpId: 'mat.emission',
        },
        emissionColor: {
            type: 'color',
            default: new THREE.Color(1,1,1),
            label: 'Solid Color',
            shortId: 'el',
            uniform: 'uEmissionColor',
            group: 'emission',
            parentId: 'emissionMode',
            condition: { eq: 4.0 },
            description: 'Constant glow tint when Emission Source is Solid Color.',
            helpId: 'mat.emission',
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
            ],
            description: 'Path-tracing only: boosts how much light the glow casts onto other surfaces.',
            helpId: 'mat.emission',
        }
    },
    inject: (builder, _config, variant) => {
        if (variant === 'Mesh') return; // Mesh SDF library doesn't use materials or env map
        builder.addHeader(MAIN_HEADER);
        builder.addMaterialLogic(MATERIAL_LOGIC);

        // Inject Environment Map Logic used by Lighting and Path Tracer
        builder.addFunction(LIGHTING_ENV);
    }
};

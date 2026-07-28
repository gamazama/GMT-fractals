
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
    envBackgroundStrength: number; // UI label 'Sky Visibility'
    envSource: number; // 0=Sky Image, 1=Gradient, 2=Solid (ADR-0098)
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
            helpId: 'scene.background',
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
            min: 0.0, max: 5.0, step: 0.01,
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

        // --- ENVIRONMENT (the 'Background & Sky' Scene section) ---
        // ONE sky, three consumers: the backdrop (Sky Visibility), surface
        // lighting (Environment Light), and the fog colour (atmosphere Sky
        // Tint). Definition order = render order: the two consumer sliders
        // first, then the shared sky definition (Source/Upload/Rotation),
        // which is deliberately NOT gated on either consumer — any of the
        // three may need it.
        envBackgroundStrength: {
            // NOT gated on envStrength: the backdrop draw (main.ts bgCol) reads
            // uEnvBackgroundStrength independently of the env LIGHT strength, so
            // this slider works even with the environment light at 0 — hiding it
            // there orphaned a live control (owner report 2026-07-10).
            // Semantics (ADR-0098): a plain BRIGHTNESS dial on the visible sky.
            // 0 = black backdrop — the old "fall back to the flat Background
            // Color" rule is gone; a flat backdrop is the Solid sky source.
            type: 'float',
            default: 0.0,
            label: 'Sky Visibility',
            shortId: 'eb',
            uniform: 'uEnvBackgroundStrength',
            min: 0.0, max: 2.0, step: 0.01,
            group: 'env',
            description: 'Brightness of the sky behind the fractal — independent of the environment light strength. 0 = black backdrop.',
            helpId: 'scene.background',
        },
        envStrength: {
            type: 'float',
            default: 0.0,
            label: 'Environment Light',
            shortId: 'es',
            uniform: 'uEnvStrengthSlider',
            min: 0.0, max: 5.0, step: 0.01,
            group: 'env',
            description: 'How strongly the sky lights the scene (dome light on surfaces and reflections).',
            helpId: 'scene.background',
        },
        envSource: {
            type: 'float',
            default: 1.0,
            label: 'Source',
            shortId: 'eo',
            uniform: 'uEnvSource',
            group: 'env',
            options: [
                { label: 'Solid', value: 2.0 },
                { label: 'Gradient', value: 1.0 },
                { label: 'Sky Image', value: 0.0 }
            ],
            description: 'What the sky is — a solid colour, a procedural gradient, or a panorama image. Shared by the backdrop, the environment light, reflections, and the fog Sky Tint.',
            helpId: 'scene.background',
        },
        envMapData: {
            type: 'image',
            default: null,
            label: 'Upload Texture',
            shortId: 'et',
            group: 'env',
            parentId: 'envSource',
            condition: { eq: 0.0 },
            // Hidden: the 'sky-library' customUI component owns the whole
            // loader row for this param ([Load Image | Skies | profile chip] +
            // the sample/user sky shelf) — the generic image widget would
            // duplicate it. State/serialisation unchanged.
            hidden: true,
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
            helpId: 'scene.background',
        },
        // Linked Color Space Param (Hidden, controlled by Image UI)
        envMapColorSpace: {
            type: 'float',
            default: 0.0,
            label: 'Env Profile',
            // 'ec' until 2026-07-28, when it was found to collide with
            // `emissionMode` below. Param shortIds need only be unique WITHIN a
            // feature, and these two are both in materials, so they aliased onto
            // one dictionary entry and this one lost. `emissionMode` keeps 'ec'
            // because it is the side that was surviving — existing share links
            // therefore decode unchanged and merely gain this value.
            shortId: 'ev',
            uniform: 'uEnvMapColorSpace',
            group: 'env',
            hidden: true
            // Removed noAccumReset: true to ensure accumulation resets on change
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
            condition: { eq: 0.0 },
            description: 'Spins the sky image around the vertical axis.',
            helpId: 'scene.background',
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
            helpId: 'scene.background',
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
    // Sky loader + library — owns the envMapData row (the param is hidden):
    // [Load Image | Skies ▾ | profile chip] with bundled samples + IndexedDB
    // user skies behind the toggle. App-registered ('sky-library',
    // app-gmt/registerFeatures.ts); apps that don't register it (fluid-toy)
    // silently skip the entry — but then have no env upload UI, so register
    // it if the env section is surfaced there.
    customUI: [
        {
            componentId: 'sky-library',
            group: 'env',
            parentId: 'envSource',
            condition: { eq: 0.0 }, // Sky Image source
            placement: 'top',       // loader row ABOVE Rotation (owner)
        },
    ],
    inject: (builder, _config, variant) => {
        if (variant === 'Mesh') return; // Mesh SDF library doesn't use materials or env map
        builder.addHeader(MAIN_HEADER);
        builder.addMaterialLogic(MATERIAL_LOGIC);

        // Inject Environment Map Logic used by Lighting and Path Tracer
        builder.addFunction(LIGHTING_ENV);
    }
};

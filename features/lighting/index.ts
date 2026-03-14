
import { FeatureDefinition } from '../../engine/FeatureSystem';
import { LightParams, generateLightId } from '../../types';
import { MAX_LIGHTS } from '../../data/constants';
import { getShadowsGLSL } from '../../shaders/chunks/lighting/shadows';
import { LIGHTING_PBR_SIMPLE, LIGHTING_PBR_FULL } from '../../shaders/chunks/lighting/pbr';
import { LIGHTING_SHARED, LIGHTING_SHARED_CORE } from '../../shaders/chunks/lighting/shared';
import { getShadingGLSL } from '../../shaders/chunks/lighting/shading';
import { getPathTracerGLSL } from '../../shaders/chunks/pathtracer';

import { QualityState } from '../quality';
import { Uniforms } from '../../engine/UniformNames';
import * as THREE from 'three';

export interface LightingState {
    advancedLighting: boolean;
    ptEnabled: boolean;
    renderMode: number;
    shadowsCompile: boolean;
    shadows: boolean;
    shadowAlgorithm: number;
    shadowSteps: number;
    shadowSoftness: number;
    shadowIntensity: number;
    shadowBias: number;
    ptBounces: number;
    ptGIStrength: number;
    ptStochasticShadows: boolean;
    ptNEEAllLights: boolean;
    ptEnvNEE: boolean;
    ptMaxLuminance: number;
    specularModel: number; // 0=Blinn-Phong (fast), 1=Cook-Torrance GGX (quality)
    lights: LightParams[];
}

export interface LightingActions {
    updateLight: (payload: { index: number, params: Partial<LightParams> }) => void;
    addLight: () => void;
    removeLight: (index: number) => void;
    duplicateLight: (index: number) => void;
}

/** Ensures all lights in the array have a stable `id`. Migrates legacy state that lacks IDs. */
export function ensureLightIds(lights: LightParams[]): LightParams[] {
    let mutated = false;
    const out = lights.map(l => {
        if (l.id) return l;
        mutated = true;
        return { ...l, id: generateLightId() };
    });
    return mutated ? out : lights;
}

export const getLightFromSlice = (slice: LightingState | undefined, i: number): LightParams => {
    if (!slice || !slice.lights || i >= slice.lights.length) {
        return {
            id: '', type: 'Point',
            position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
            color: '#ffffff', intensity: 0, falloff: 0,
            falloffType: 'Quadratic', fixed: false, visible: false, castShadow: true, radius: 0.0
        };
    }
    return slice.lights[i];
};

const DEFAULT_LIGHTS: LightParams[] = [
    { id: generateLightId(), type: 'Point', position: { x: -2.0, y: 1.0, z: 2.0 }, rotation: { x: 0, y: 0, z: 0 }, color: '#ffffff', intensity: 1.5, falloff: 0, falloffType: 'Quadratic', fixed: false, visible: true, castShadow: true, radius: 0.0, softness: 0.0 },
    { id: generateLightId(), type: 'Point', position: { x: 2.0, y: -1.0, z: 1.0 }, rotation: { x: 0, y: 0, z: 0 }, color: '#ff8800', intensity: 0.5, falloff: 0, falloffType: 'Quadratic', fixed: false, visible: false, castShadow: true, radius: 0.0, softness: 0.0 },
    { id: generateLightId(), type: 'Point', position: { x: 0.0, y: -5.0, z: 2.0 }, rotation: { x: 0, y: 0, z: 0 }, color: '#0088ff', intensity: 0.25, falloff: 0, falloffType: 'Quadratic', fixed: true, visible: false, castShadow: true, radius: 0.0, softness: 0.0 }
];

export const LightingFeature: FeatureDefinition = {
    id: 'lighting',
    shortId: 'l',
    name: 'Lighting',
    category: 'Rendering',
    tabConfig: {
        label: 'Light',
        componentId: 'panel-light',
        order: 30,
        condition: { param: '$advancedMode', bool: true }
    },
    viewportConfig: { componentId: 'overlay-lighting', renderOrder: 50, type: 'dom' },
    engineConfig: {
        toggleParam: 'advancedLighting',
        mode: 'compile',
        label: 'Lighting Engine', 
        groupFilter: 'engine_settings'
    },
    extraUniforms: [
        { name: Uniforms.LightCount, type: 'int', default: 0 },
        { name: Uniforms.LightType, type: 'float', arraySize: MAX_LIGHTS, default: new Float32Array(MAX_LIGHTS).fill(0) },
        { name: Uniforms.LightPos, type: 'vec3', arraySize: MAX_LIGHTS, default: new Array(MAX_LIGHTS).fill(new THREE.Vector3()) },
        { name: Uniforms.LightDir, type: 'vec3', arraySize: MAX_LIGHTS, default: new Array(MAX_LIGHTS).fill(new THREE.Vector3(0, -1, 0)) },
        { name: Uniforms.LightColor, type: 'vec3', arraySize: MAX_LIGHTS, default: new Array(MAX_LIGHTS).fill(new THREE.Color(1,1,1)) },
        { name: Uniforms.LightIntensity, type: 'float', arraySize: MAX_LIGHTS, default: new Float32Array(MAX_LIGHTS).fill(0) },
        { name: Uniforms.LightShadows, type: 'float', arraySize: MAX_LIGHTS, default: new Float32Array(MAX_LIGHTS).fill(0) },
        { name: Uniforms.LightFalloff, type: 'float', arraySize: MAX_LIGHTS, default: new Float32Array(MAX_LIGHTS).fill(0) },
        { name: Uniforms.LightFalloffType, type: 'float', arraySize: MAX_LIGHTS, default: new Float32Array(MAX_LIGHTS).fill(0) },
        { name: Uniforms.LightRadius, type: 'float', arraySize: MAX_LIGHTS, default: new Float32Array(MAX_LIGHTS).fill(0) },
        { name: Uniforms.LightSoftness, type: 'float', arraySize: MAX_LIGHTS, default: new Float32Array(MAX_LIGHTS).fill(0) },
    ],
    params: {
        // --- ENGINE MASTER ---
        advancedLighting: {
            type: 'boolean', default: true, label: 'Light Engine', shortId: 'le', group: 'main',
            noReset: true, hidden: true, onUpdate: 'compile',
            description: 'Master switch for lighting logic. Disabling provides stubs only.'
        },

        // --- PATH TRACING GROUP (Engine Panel) ---
        ptEnabled: {
            type: 'boolean', default: true, label: 'Path Tracing Core', shortId: 'pe', 
            group: 'engine_settings',
            ui: 'checkbox',
            description: 'Compiles the Path Tracing module. Disable to reduce shader size.',
            onUpdate: 'compile',
            noReset: true,
            estCompileMs: 1500
        },
        renderMode: {
            type: 'float', default: 0.0, label: 'Active Mode', shortId: 'rm',
            group: 'engine_settings',
            parentId: 'ptEnabled',
            options: [{ label: 'Direct (Fast)', value: 0.0 }, { label: 'Path Tracing (GI)', value: 1.0 }],
            description: 'Switches between fast direct lighting and physically based Global Illumination.',
            onUpdate: 'compile',
            noReset: true
        },
        ptBounces: { 
            type: 'int', default: 3, label: 'Max Bounces', shortId: 'pb', uniform: 'uPTBounces', 
            min: 1, max: 8, step: 1, 
            group: 'engine_settings',
            parentId: 'ptEnabled',
            ui: 'numeric',
            description: 'Recursion depth. Higher = Brighter interiors, Slower render.'
        },
        ptGIStrength: { 
            type: 'float', default: 1.0, label: 'GI Strength', shortId: 'pg', uniform: 'uPTGIStrength', 
            min: 0.0, max: 5.0, step: 0.01, 
            group: 'engine_settings',
            parentId: 'ptEnabled',
            description: 'Artistic boost for bounced light intensity.'
        },

        // --- SPECULAR MODEL (Engine Panel) ---
        specularModel: {
            type: 'float', default: 0.0, label: 'Specular Model', shortId: 'sm',
            group: 'engine_settings',
            options: [
                { label: 'Blinn-Phong (Fast)', value: 0.0, estCompileMs: 0 },
                { label: 'Cook-Torrance (Quality)', value: 1.0, estCompileMs: 400 }
            ],
            description: 'BRDF model for direct lighting. Cook-Torrance is physically accurate but increases shader compile time.',
            onUpdate: 'compile',
            noReset: true
        },

        // --- SHADOWS COMPILER (Engine Panel) ---
        shadowsCompile: {
            type: 'boolean', default: true, label: 'Shadow Engine', shortId: 'sc', group: 'engine_settings',
            ui: 'checkbox',
            noReset: true,
            onUpdate: 'compile',
            description: 'Compiles the shadow raymarching loop. Disable to save ~5s compile time.',
            estCompileMs: 1500 // Base cost of having shadow engine enabled (measured: ~1.5s)
        },
        shadowAlgorithm: {
            type: 'float', default: 1.0, label: 'Shadow Quality', shortId: 'sa',
            group: 'engine_settings',
            parentId: 'shadowsCompile',
            options: [
                { label: 'Hard Only (Fastest)', value: 2.0, estCompileMs: 500 },
                { label: 'Lite Soft (Fast)', value: 1.0, estCompileMs: 1500 },
                { label: 'Robust Soft (Quality)', value: 0.0, estCompileMs: 3000 }
            ],
            description: 'Shadow algorithm. Hard = binary occlusion, Lite = fast penumbra, Robust = accurate penumbra.',
            onUpdate: 'compile',
            noReset: true
        },
        ptStochasticShadows: {
            type: 'boolean', default: false, label: 'Area Lights (Stochastic)', shortId: 'ps', uniform: 'uPTStochasticShadows',
            group: 'engine_settings',
            parentId: 'shadowsCompile',
            ui: 'checkbox',
            description: 'Treats lights as physical spheres. Creates realistic penumbras. Requires Accumulation.'
        },

        // --- PATH TRACING QUALITY (Engine Panel) ---
        ptNEEAllLights: {
            type: 'boolean', default: false, label: 'Sample All Lights', shortId: 'pal',
            group: 'engine_settings', parentId: 'ptEnabled',
            ui: 'checkbox', onUpdate: 'compile', noReset: true,
            description: 'Evaluates every active light per bounce instead of one random light. Reduces shadow noise at the cost of N× more shadow rays.'
        },
        ptEnvNEE: {
            type: 'boolean', default: false, label: 'Environment NEE', shortId: 'pen',
            group: 'engine_settings', parentId: 'ptEnabled',
            ui: 'checkbox', onUpdate: 'compile', noReset: true,
            description: 'Directly samples the environment as a light source each bounce. Large noise reduction for sky-lit scenes at the cost of one extra trace per bounce.'
        },
        ptMaxLuminance: {
            type: 'float', default: 10.0, label: 'Firefly Clamp', shortId: 'pfl', uniform: 'uPTMaxLuminance',
            min: 0.5, max: 200.0, step: 0.5, scale: 'log',
            group: 'engine_settings', parentId: 'ptEnabled',
            description: 'Clamps per-sample luminance to suppress bright firefly spikes. Lower = cleaner but slightly biased. Raise to effectively disable.'
        },
        // --- RUNTIME CONTROL ---
        shadows: {
            type: 'boolean', default: true, label: 'Enable', shortId: 'sh', 
            group: 'main', 
            uniform: 'uShadows', 
            ui: 'checkbox',
            condition: { param: 'shadowsCompile', bool: true }
        },
        shadowIntensity: {
            type: 'float', default: 1.0, label: 'Opacity', shortId: 'si', uniform: 'uShadowIntensity',
            min: 0.0, max: 1.0, step: 0.01, group: 'shadows',
            condition: { bool: true }
        },
        shadowSoftness: {
            type: 'float', default: 16.0, label: 'Softness', shortId: 'ss', uniform: 'uShadowSoftness',
            min: 2.0, max: 2000.0, step: 1.0, group: 'shadows', scale: 'log',
            condition: { bool: true }
        },
        shadowSteps: {
            type: 'int', default: 128, label: 'Steps', shortId: 'st', 
            min: 16, max: 512, step: 16, 
            group: 'shadows', 
            condition: { bool: true },
            uniform: 'uShadowSteps', 
            ui: 'numeric',
            description: 'Quality vs Performance.'
        },
        shadowBias: {
            type: 'float', default: 0.002, label: 'Bias', shortId: 'sb', uniform: 'uShadowBias',
            min: 0.0, max: 1.0, step: 0.000001, group: 'shadows', scale: 'log',
            condition: { bool: true },
            description: 'Prevents surface acne.'
        },
        
        lights: { type: 'complex', default: DEFAULT_LIGHTS, label: 'Light List', shortId: 'll', group: 'data', hidden: true, noReset: true }
    },
    inject: (builder, config, variant) => {
        if (variant !== 'Main') {
             builder.addPostDEFunction(`
             float GetSoftShadow(vec3 ro, vec3 rd, float k, float lightDist, float noise) { return 1.0; }
             float GetHardShadow(vec3 ro, vec3 rd, float lightDist) { return 1.0; }
             vec3 calculateShading(vec3 ro, vec3 rd, float d, vec4 result, float stochasticSeed) { return vec3(0.0); }
             vec3 calculatePathTracedColor(vec3 ro, vec3 rd, float d_init, vec4 result_init, float seed) { return vec3(0.0); }
             `);
             return;
        }
        
        builder.addDefine('MAX_LIGHTS', MAX_LIGHTS.toString());

        const state = config.lighting as LightingState;
        if (state && !state.advancedLighting) {
             builder.addDefine('MAX_LIGHTS', '0');
             builder.addPostDEFunction(`
             float GetSoftShadow(vec3 ro, vec3 rd, float k, float lightDist, float noise) { return 1.0; }
             float GetHardShadow(vec3 ro, vec3 rd, float lightDist) { return 1.0; }
             vec3 calculateShading(vec3 ro, vec3 rd, float d, vec4 result, float stochasticSeed) {
                 vec3 p = ro + rd * d;
                 vec3 p_fractal = p + uCameraPosition + uSceneOffsetLow + uSceneOffsetHigh;
                 float eps = max(d * 0.001, 1e-6);
                 vec2 e = vec2(eps, 0.0);
                 vec3 n = normalize(vec3(
                     DE_Dist(p + e.xyy),
                     DE_Dist(p + e.yxy),
                     DE_Dist(p + e.yyx)
                 ));

                 // Layer 1 gradient color (same as full shader)
                 float val1 = getMappingValue(uColorMode, p_fractal, result, n, uColorScale);
                 float t1Raw = val1 * uColorScale + uColorOffset;
                 float t1 = pow(abs(fract(mod(t1Raw, 1.0))), uGradientBias);
                 vec3 albedo = textureLod0(uGradientTexture, vec2(t1, 0.5)).rgb;

                 // Simple N·L + ambient
                 float NdotL = max(dot(n, normalize(vec3(-0.5, 1.0, 0.8))), 0.0);
                 float rim = pow(1.0 - max(dot(n, -rd), 0.0), 3.0) * 0.08;
                 float light = 0.03 + NdotL * 0.3 + rim;
                 return albedo * light;
             }
             vec3 calculatePathTracedColor(vec3 ro, vec3 rd, float d_init, vec4 result_init, float seed) {
                 return calculateShading(ro, rd, d_init, result_init, seed);
             }
             `);
             return;
        }

        const shadowsCompiled = state?.shadowsCompile !== false;
        // Map UI values to quality levels: 2.0=Hard(3), 1.0=Lite(1), 0.0=Robust(2)
        const alg = state?.shadowAlgorithm ?? 1.0;
        const shadowQuality = alg === 2.0 ? 3 : alg === 1.0 ? 1 : 2;

        builder.addPostDEFunction(getShadowsGLSL(shadowsCompiled, shadowQuality));

        if (!shadowsCompiled && !state?.shadows) {
            builder.addDefine('DISABLE_SHADOWS', '1');
        } else {
            builder.addDefine('SHADOW_QUALITY', '2');
        }

        // Only compile light sphere intersection code when a light actually has radius > 0
        const hasLightSpheres = state?.lights?.some(l => (l.radius ?? 0) > 0 && l.intensity > 0);
        if (hasLightSpheres) {
            builder.addDefine('LIGHT_SPHERES', '1');
        }

        if (state?.ptEnabled !== false) {
            builder.addDefine('PT_ENABLED', '1');
            if (state?.ptNEEAllLights) builder.addDefine('PT_NEE_ALL_LIGHTS', '1');
            if (state?.ptEnvNEE)      builder.addDefine('PT_ENV_NEE', '1');
            // PT_VOLUMETRIC moved to features/volumetric
        }

        const isPathTracing = config.renderMode === 'PathTracing' || state?.renderMode === 1.0;
        const quality = config.quality as QualityState;
        const isLite = quality?.precisionMode === 1.0;

        if (isPathTracing) {
            builder.addIntegrator(LIGHTING_SHARED); // PT needs fresnelSchlick
            builder.setRenderMode('PathTracing');
            builder.addDefine('RENDER_MODE_PATHTRACING', '1');
            builder.addIntegrator(getPathTracerGLSL(isLite, MAX_LIGHTS));
        } else {
            const useCookTorrance = state?.specularModel === 1.0;
            builder.addIntegrator(useCookTorrance ? LIGHTING_SHARED : LIGHTING_SHARED_CORE);
            builder.setRenderMode('Direct');
            builder.addIntegrator(useCookTorrance ? LIGHTING_PBR_FULL : LIGHTING_PBR_SIMPLE);
            builder.addIntegrator(getShadingGLSL());
        }
    },
    actions: {
        updateLight: (state: LightingState, payload: { index: number, params: Partial<LightParams> }) => {
            const { index, params } = payload;
            if (!state.lights || index >= state.lights.length) return {};
            const newLights = [...state.lights];
            newLights[index] = { ...newLights[index], ...params };
            return { lights: newLights };
        },
        addLight: (state: LightingState) => {
            if (state.lights.length >= MAX_LIGHTS) return {};
            const newLight: LightParams = {
                id: generateLightId(),
                type: 'Point',
                position: { x: 0, y: 0, z: 2.0 }, rotation: { x: 0, y: 0, z: 0 },
                color: '#ffffff', intensity: 1.0, falloff: 0, falloffType: 'Quadratic', fixed: false, visible: true, castShadow: true, radius: 0.0
            };
            return { lights: [...state.lights, newLight] };
        },
        removeLight: (state: LightingState, index: number) => {
            if (index < 0 || index >= state.lights.length) return {};
            const newLights = [...state.lights];
            newLights.splice(index, 1);
            return { lights: newLights };
        },
        duplicateLight: (state: LightingState, index: number) => {
            if (index < 0 || index >= state.lights.length || state.lights.length >= MAX_LIGHTS) return {};
            const clone = { ...state.lights[index], id: generateLightId() };
            const newLights = [...state.lights];
            newLights.splice(index + 1, 0, clone);
            return { lights: newLights };
        }
    }
};

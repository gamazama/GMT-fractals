
import { FeatureDefinition } from '../../engine/FeatureSystem';
import { LightParams } from '../../types';
import { MAX_LIGHTS } from '../../data/constants';
import { getShadowsGLSL } from '../../shaders/chunks/lighting/shadows';
import { LIGHTING_PBR } from '../../shaders/chunks/lighting/pbr';
import { getShadingGLSL } from '../../shaders/chunks/lighting/shading';
import { getPathTracerGLSL } from '../../shaders/chunks/pathtracer';
import { QualityState } from '../quality';

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
    lights: LightParams[];
}

export interface LightingActions {
    updateLight: (payload: { index: number, params: Partial<LightParams> }) => void;
    addLight: () => void;
    removeLight: (index: number) => void;
    // toggleLightFixed removed to break circular dependency. Logic moved to UI.
}

export const getLightFromSlice = (slice: LightingState | undefined, i: number): LightParams => {
    if (!slice || !slice.lights || i >= slice.lights.length) {
        return {
            position: { x: 0, y: 0, z: 0 }, color: '#ffffff', intensity: 0, falloff: 0,
            falloffType: 'Quadratic', fixed: false, visible: false, castShadow: true
        };
    }
    return slice.lights[i];
};

const DEFAULT_LIGHTS: LightParams[] = [
    { position: { x: -2.0, y: 1.0, z: 2.0 }, color: '#ffffff', intensity: 1.5, falloff: 0, falloffType: 'Quadratic', fixed: false, visible: true, castShadow: true },
    { position: { x: 2.0, y: -1.0, z: 1.0 }, color: '#ff8800', intensity: 0.5, falloff: 0, falloffType: 'Quadratic', fixed: false, visible: false, castShadow: true },
    { position: { x: 0.0, y: -5.0, z: 2.0 }, color: '#0088ff', intensity: 0.25, falloff: 0, falloffType: 'Quadratic', fixed: true, visible: false, castShadow: true }
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
    // Explicitly mark as scene (R3F) component
    viewportConfig: { componentId: 'overlay-lighting', renderOrder: 50, type: 'scene' },
    engineConfig: {
        toggleParam: 'advancedLighting',
        mode: 'compile',
        label: 'Lighting Engine', 
        groupFilter: 'engine_settings'
    },
    params: {
        // --- ENGINE MASTER ---
        advancedLighting: {
            type: 'boolean', default: true, label: 'Light Engine', shortId: 'le', group: 'main',
            noReset: true, hidden: true,
            description: 'Master switch for lighting logic. Disabling provides stubs only.'
        },

        // --- PATH TRACING GROUP (Engine Panel) ---
        ptEnabled: {
            type: 'boolean', default: true, label: 'Path Tracing Core', shortId: 'pe', 
            group: 'engine_settings',
            ui: 'checkbox',
            description: 'Compiles the Path Tracing module. Disable to reduce shader size.',
            onUpdate: 'compile',
            noReset: true
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
            description: 'Recursion depth. Higher = Brighter interiors, Slower render.',
            onUpdate: 'compile'
        },
        ptGIStrength: { 
            type: 'float', default: 1.0, label: 'GI Strength', shortId: 'pg', uniform: 'uPTGIStrength', 
            min: 0.0, max: 2.0, step: 0.01, 
            group: 'engine_settings',
            parentId: 'ptEnabled',
            description: 'Artistic boost for bounced light intensity.'
        },

        // --- SHADOWS COMPILER (Engine Panel) ---
        shadowsCompile: {
            type: 'boolean', default: true, label: 'Shadow Engine', shortId: 'sc', group: 'engine_settings',
            ui: 'checkbox',
            noReset: true,
            onUpdate: 'compile',
            description: 'Compiles the shadow raymarching loop. Disable to save code size.'
        },
        shadowAlgorithm: {
            type: 'float', default: 0.0, label: 'Algorithm', shortId: 'sa', 
            group: 'engine_settings',
            parentId: 'shadowsCompile',
            options: [{ label: 'Robust', value: 0.0 }, { label: 'Fast (Lite)', value: 1.0 }],
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

        // --- RUNTIME CONTROL (Light Panel / Quality Panel / Shadow Popup) ---
        
        // Changed group to 'main' so it doesn't appear in the 'shadows' AutoPanel group
        shadows: {
            type: 'boolean', default: true, label: 'Enable', shortId: 'sh', 
            group: 'main', 
            uniform: 'uShadows', 
            ui: 'checkbox',
            condition: { param: 'shadowsCompile', bool: true }
        },
        
        // REORDERED SLIDERS: Intensity -> Softness -> Steps -> Bias
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
        const state = config.lighting as LightingState;
        
        // OPTIMIZATION: Only inject lighting logic for the MAIN render.
        if (variant !== 'Main') {
             builder.addPostDEFunction(`
             float GetSoftShadow(vec3 ro, vec3 rd, float k, float lightDist) { return 1.0; }
             float GetHardShadow(vec3 ro, vec3 rd, float lightDist) { return 1.0; }
             `);
             return;
        }
        
        builder.addDefine('MAX_LIGHTS', MAX_LIGHTS.toString());

        if (state && state.advancedLighting === false) {
             builder.addPostDEFunction(`
             float GetSoftShadow(vec3 ro, vec3 rd, float k, float lightDist) { return 1.0; }
             float GetHardShadow(vec3 ro, vec3 rd, float lightDist) { return 1.0; }
             vec3 calculateShading(vec3 ro, vec3 rd, float d, vec4 result, float stochasticSeed) { return vec3(0.0); }
             vec3 calculatePathTracedColor(vec3 ro, vec3 rd, float d_init, vec4 result_init, float seed) { return vec3(0.0); }
             `);
             return;
        }

        const shadowsCompiled = state?.shadowsCompile !== false; 
        const shadowQuality = (state?.shadowAlgorithm === 1.0) ? 1 : 2;

        builder.addPostDEFunction(getShadowsGLSL(shadowsCompiled, shadowQuality));
        
        if (!shadowsCompiled && !state?.shadows) {
            builder.addDefine('DISABLE_SHADOWS', '1');
        } else {
            builder.addDefine('SHADOW_QUALITY', '2');
        }

        if (state?.ptEnabled !== false) {
            builder.addDefine('PT_ENABLED', '1');
        }
        
        const isPathTracing = config.renderMode === 'PathTracing' || state?.renderMode === 1.0;
        const quality = config.quality as QualityState;
        const isLite = quality?.precisionMode === 1.0;

        if (isPathTracing) {
            builder.setRenderMode('PathTracing');
            builder.addDefine('RENDER_MODE_PATHTRACING', '1');
            builder.addIntegrator(getPathTracerGLSL(isLite));
        } else {
            builder.setRenderMode('Direct');
            builder.addIntegrator(LIGHTING_PBR);
            builder.addIntegrator(getShadingGLSL(isLite));
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
                position: { x: 0, y: 0, z: 2.0 }, color: '#ffffff', intensity: 1.0, falloff: 0, falloffType: 'Quadratic', fixed: false, visible: true, castShadow: true
            };
            return { lights: [...state.lights, newLight] };
        },
        removeLight: (state: LightingState, index: number) => {
            if (index < 0 || index >= state.lights.length) return {};
            const newLights = [...state.lights];
            newLights.splice(index, 1);
            return { lights: newLights };
        }
    }
};


// Emits the PT compile-gated #defines (PT_ENV_MIS, PT_ENV_MIS_IS, PT_AREA_LIGHTS,
// PT_NEE_ALL_LIGHTS, PT_SOBOL_BOUNCE). These gates' bodies are the measured
// cold-compile hogs — their GLSL is the target of the compile-faster rewrites.
// @see docs/policy/shader-compile-optimization.md §2.3 + §8 (L5/L4)
import { FeatureDefinition } from '../../engine/FeatureSystem';
import { LightParams, generateLightId } from '../../types';
import { MAX_LIGHTS } from '../../../data/constants';
import { getShadowsGLSL } from '../../shaders/chunks/lighting/shadows';
import { getLightingPBRSimple, getLightingPBRFull } from '../../shaders/chunks/lighting/pbr';
import { LIGHTING_SHARED, LIGHTING_SHARED_CORE } from '../../shaders/chunks/lighting/shared';
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
    areaLights: boolean;
    ptAreaLights: boolean;
    ptNEEAllLights: boolean;
    /** @deprecated retained for back-compat scene loads — superseded by `ptReflMode`. */
    ptEnvNEE: boolean;
    /**
     * Path-traced reflection quality mode (compile-gated).
     *   0.0 = Off          — current behavior (BSDF samples only).
     *   1.0 = Env MIS      — adds direct env sample with MIS, uniform-sphere PDF.
     *   2.0 = Env MIS + IS — also imports samples bright env regions via CDF.
     */
    ptReflMode: number;
    /** Sobol(2)+Cranley-Patterson rotation for the bounce direction seed. */
    ptSobolBounce: boolean;
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

/**
 * Backfills fields the TS interface requires but legacy formula defaults / GMF
 * saves may omit (`id`, `type`, `position`, `rotation`). Returns the original
 * reference when nothing needs filling, so `===` callers can short-circuit.
 */
function normalizeLight(l: LightParams): LightParams {
    if (l.id && l.type && l.position && l.rotation) return l;
    return {
        ...l,
        id: l.id ?? generateLightId(),
        type: l.type ?? 'Point',
        position: l.position ?? { x: 0, y: 0, z: 0 },
        rotation: l.rotation ?? { x: 0, y: 0, z: 0 },
    };
}

export function normalizeLights(lights: LightParams[]): LightParams[] {
    let firstBadIdx = -1;
    for (let i = 0; i < lights.length; i++) {
        const l = lights[i];
        if (!l.id || !l.type || !l.position || !l.rotation) { firstBadIdx = i; break; }
    }
    if (firstBadIdx === -1) return lights;
    const out = lights.slice();
    for (let i = firstBadIdx; i < out.length; i++) out[i] = normalizeLight(out[i]);
    return out;
}

export const getLightFromSlice = (slice: LightingState | undefined, i: number): LightParams => {
    if (!slice || !slice.lights || i >= slice.lights.length) {
        return {
            id: '', type: 'Point',
            position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
            color: '#ffffff', intensity: 0, falloff: 0,
            falloffType: 'Quadratic', fixed: false, visible: false, castShadow: true, radius: 0.0,
            range: 0, intensityUnit: 'raw'
        };
    }
    return normalizeLight(slice.lights[i]);
};

const DEFAULT_LIGHTS: LightParams[] = [
    { id: generateLightId(), type: 'Point', position: { x: -2.0, y: 1.0, z: 2.0 }, rotation: { x: 0, y: 0, z: 0 }, color: '#fff4e6', intensity: 1.5, falloff: 0, falloffType: 'Quadratic', fixed: false, visible: true, castShadow: true, radius: 0.0, softness: 0.0, useTemperature: true, temperature: 5500 },
    { id: generateLightId(), type: 'Point', position: { x: 2.0, y: -1.0, z: 1.0 }, rotation: { x: 0, y: 0, z: 0 }, color: '#FFD6AA', intensity: 0.5, falloff: 0, falloffType: 'Quadratic', fixed: false, visible: false, castShadow: true, radius: 0.0, softness: 0.0, useTemperature: true, temperature: 3500 },
    { id: generateLightId(), type: 'Point', position: { x: 0.0, y: -5.0, z: 2.0 }, rotation: { x: 0, y: 0, z: 0 }, color: '#E0EEFF', intensity: 0.25, falloff: 0, falloffType: 'Quadratic', fixed: true, visible: false, castShadow: true, radius: 0.0, softness: 0.0, useTemperature: true, temperature: 7500 }
];

export const LightingFeature: FeatureDefinition = {
    id: 'lighting',
    shortId: 'l',
    name: 'Lighting',
    category: 'Rendering',
    tabConfig: {
        label: 'Light',
        condition: { param: '$advancedMode', bool: true }
    },
    viewportConfig: { componentId: 'overlay-lighting', renderOrder: 50, type: 'dom' },
    engineConfig: {
        toggleParam: 'advancedLighting',
        mode: 'compile',
        label: 'Lighting Engine', 
        groupFilter: 'engine_settings'
    },
    groups: {
        shadows: {
            label: 'Shadows',
            description: 'Per-light shadow tracing and softness.',
            helpId: 'shadows',
        },
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
        { name: Uniforms.LightHideEmitter, type: 'float', arraySize: MAX_LIGHTS, default: new Float32Array(MAX_LIGHTS).fill(0) },
        // Env map luminance CDF — populated by env_cdf.buildEnvCDF when ptReflMode = 'Env MIS + IS'.
        // Defaults are 1×1 stubs so the GLSL declarations stay valid when no CDF has been built.
        { name: Uniforms.EnvCDFMarginal, type: 'sampler2D', default: null },
        { name: Uniforms.EnvCDFConditional, type: 'sampler2D', default: null },
        { name: Uniforms.EnvCDFSize, type: 'vec2', default: new THREE.Vector2(1, 1) },
        { name: Uniforms.EnvLumIntegral, type: 'float', default: 1.0 },
        { name: Uniforms.EnvCDFMipBias, type: 'float', default: 0.0 },
        // Top mip level of the env map (floor(log2(max(W,H)))). Drives the
        // roughness→LOD env blur in GetEnvMap via textureLod (the texture()
        // bias form is clamped by GL_MAX_TEXTURE_LOD_BIAS, so rough reflections
        // stayed sharp — see ADR-0069). Set on env load; 8.0 is a safe pre-load
        // fallback (≈256px top mip).
        { name: Uniforms.EnvMaxMip, type: 'float', default: 8.0 },
        // sinθ-weighted solid-angle average of the env map (raw space), set on
        // env load. GetEnvMap blends rough reflections toward it instead of the
        // pole-biased box-mip top. (-1,-1,-1) = none yet → LOD-cap fallback.
        { name: Uniforms.EnvAvgColor, type: 'vec3', default: new THREE.Vector3(-1, -1, -1) },
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
            type: 'float', default: 0.0, label: 'Shadow Quality', shortId: 'sa',
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
            type: 'boolean', default: true, label: 'Soft Shadow Jitter', shortId: 'ps',
            group: 'engine_settings',
            parentId: 'shadowsCompile',
            ui: 'checkbox',
            onUpdate: 'compile',
            noReset: true,
            estCompileMs: 800,
            description: 'Stochastic shadow jitter for Point lights — fakes soft penumbras via accumulation. Independent of True Area Lights (which uses physical sphere sampling for type=Sphere lights).'
        },

        // --- PATH TRACING QUALITY (Engine Panel) ---
        ptAreaLights: {
            type: 'boolean', default: false, label: 'True Area Lights', shortId: 'pal2',
            group: 'engine_settings', parentId: 'ptEnabled',
            ui: 'checkbox', onUpdate: 'compile', noReset: true,
            estCompileMs: 1230,  // post-ADR-0074 single-march fix (was 2027; within-run A/B saved ~630ms/39% on Mandelbulb). @see docs/policy/shader-compile-optimization.md §8 L5
            description: 'Physically-correct sphere area light integration (sphere-surface sampling + MIS). Required for lights with type=Sphere. Enable + change a light type to Sphere via the per-light menu. Costs ~1s compile + one extra sphere intersection per bounce.'
        },
        ptNEEAllLights: {
            type: 'boolean', default: false, label: 'Sample All Lights', shortId: 'pal',
            group: 'engine_settings', parentId: 'ptEnabled',
            ui: 'checkbox', onUpdate: 'compile', noReset: true,
            estCompileMs: 832,  // measured cold marginal (§2.3); was unannotated
            description: 'Evaluates every active light per bounce instead of one random light. Reduces shadow noise at the cost of N× more shadow rays.'
        },
        ptReflMode: {
            type: 'float', default: 2.0, label: 'Env Sampling', shortId: 'prm',
            group: 'engine_settings', parentId: 'ptEnabled',
            options: [
                // estCompileMs recalibrated to measured cold marginal (§2.3);
                // were 250 / 650 (~5× / ~4× low).
                { label: 'Off',           value: 0.0, estCompileMs: 0 },
                { label: 'Env MIS',       value: 1.0, estCompileMs: 1361 },
                { label: 'Env MIS + IS',  value: 2.0, estCompileMs: 2579 },
            ],
            onUpdate: 'compile', noReset: true,
            description: 'Direct env-map sampling with MIS for path-traced reflections. Env MIS handles broad skies; Env MIS + IS adds importance sampling for HDR maps with sun discs / concentrated lights. Replaces the older Environment NEE (which only handled diffuse).'
        },
        ptSobolBounce: {
            type: 'boolean', default: true, label: 'Sobol Bounce Sampling', shortId: 'psb',
            group: 'engine_settings', parentId: 'ptEnabled',
            ui: 'checkbox', onUpdate: 'compile', noReset: true,
            estCompileMs: 25,  // measured cold marginal ~23ms (§2.3) — effectively free; was 50
            description: 'Low-discrepancy 2D sequence (Sobol) with per-pixel rotation for the bounce-direction seed. Measurably less variance on shiny surfaces; no effect on rough/diffuse-heavy scenes.'
        },
        ptEnvNEE: {
            type: 'boolean', default: false, hidden: true, label: 'Environment NEE (legacy)', shortId: 'pen',
            group: 'engine_settings', parentId: 'ptEnabled', noReset: true,
            description: 'Deprecated — kept so old scene files load without dropping state. Migrated to ptReflMode at boot.'
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
            condition: { param: 'shadowsCompile', bool: true },
            description: 'Toggle shadow casting at runtime without recompiling.',
            helpId: 'shadows',
        },
        areaLights: {
            type: 'boolean', default: false, label: 'Area Lights', shortId: 'al', uniform: 'uAreaLights',
            group: 'shadows',
            hidden: true,
            condition: { param: 'ptStochasticShadows', bool: true },
            description: 'Stochastic area light shadows. Disable for sharp analytical shadows.',
            helpId: 'shadows',
            // Compile-gated. ANGLE/D3D11 was likely predicating the runtime
            // `if (uAreaLights > 0.5)` shadow-path switch — running both
            // GetSoftShadow AND GetHardShadow per shadow-casting light. The
            // compile gate emits exactly one path. Toggle triggers recompile.
            onUpdate: 'compile', noReset: true
        },
        shadowIntensity: {
            type: 'float', default: 1.0, label: 'Opacity', shortId: 'si', uniform: 'uShadowIntensity',
            min: 0.0, max: 1.0, step: 0.01, group: 'shadows',
            condition: { bool: true },
            description: 'How dark the shadowed regions become (1 = fully black).',
            helpId: 'shadows',
        },
        shadowSoftness: {
            type: 'float', default: 16.0, label: 'Hardness', shortId: 'ss', uniform: 'uShadowSoftness',
            min: 2.0, max: 2000.0, step: 1.0, group: 'shadows', scale: 'log',
            condition: { bool: true },
            description: 'Higher values give crisper shadows; lower values give wider penumbras. Affects Point and Directional lights only — Sphere area lights derive shadow softness from physical sphere sampling.',
            helpId: 'shadows',
        },
        shadowSteps: {
            type: 'int', default: 128, label: 'Steps', shortId: 'st',
            min: 16, max: 512, step: 16,
            group: 'shadows',
            condition: { bool: true },
            uniform: 'uShadowSteps',
            ui: 'numeric',
            description: 'Quality vs Performance.',
            helpId: 'shadows',
        },
        shadowBias: {
            type: 'float', default: 0.002, label: 'Bias', shortId: 'sb', uniform: 'uShadowBias',
            min: 0.0, max: 1.0, step: 0.000001, group: 'shadows', scale: 'log',
            condition: { bool: true },
            description: 'Too low: acne. Too high: detached.',
            helpId: 'shadows',
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
        const alg = state?.shadowAlgorithm ?? 0.0;
        const shadowQuality = alg === 2.0 ? 3 : alg === 1.0 ? 1 : 2;

        builder.addPostDEFunction(getShadowsGLSL(shadowsCompiled, shadowQuality));

        if (!shadowsCompiled && !state?.shadows) {
            builder.addDefine('DISABLE_SHADOWS', '1');
        } else {
            builder.addDefine('SHADOW_QUALITY', '2');
        }

        // Light spheres: extracted to LightSpheresFeature (features/lighting/light_spheres.ts)

        if (state?.ptEnabled !== false) {
            builder.addDefine('PT_ENABLED', '1');
            if (state?.ptNEEAllLights) builder.addDefine('PT_NEE_ALL_LIGHTS', '1');
            if (state?.ptAreaLights)   builder.addDefine('PT_AREA_LIGHTS', '1');

            // Env reflection quality. Old scenes (saved before this feature
            // existed) lack `ptReflMode` entirely — when they also have
            // `ptEnvNEE = true`, auto-promote to Env MIS so their look
            // doesn't regress on first load. New scenes always write
            // `ptReflMode` explicitly (default Env MIS + IS = 2.0), so the
            // migration branch never fires past the upgrade — explicitly turning
            // the mode off sticks even if the orphan ptEnvNEE field is still true.
            const reflModeRaw = state?.ptReflMode;
            let reflMode: number;
            if (reflModeRaw === undefined && state?.ptEnvNEE === true) {
                reflMode = 1.0;
            } else {
                reflMode = reflModeRaw ?? 0.0;
            }
            if (reflMode >= 1.0) builder.addDefine('PT_ENV_MIS', '1');
            if (reflMode >= 2.0) builder.addDefine('PT_ENV_MIS_IS', '1');

            if (state?.ptSobolBounce) builder.addDefine('PT_SOBOL_BOUNCE', '1');
            // PT_VOLUMETRIC moved to features/volumetric
        }

        const stochasticShadows = state?.ptStochasticShadows === true && shadowsCompiled;
        // areaLightsActive: compile-gates the *runtime* `if (uAreaLights > 0.5)`
        // branch in the shadow path. When false (default), only soft shadows
        // are emitted; when true, only the stochastic+GetHardShadow path. This
        // resolves the case where ANGLE was likely predicating both paths.
        // Toggling the `areaLights` checkbox now triggers a recompile.
        const areaLightsActive = state?.areaLights === true && stochasticShadows;

        const isPathTracing = config.renderMode === 'PathTracing' || state?.renderMode === 1.0;
        const quality = config.quality as QualityState;
        const isLite = quality?.precisionMode === 1.0;

        if (isPathTracing) {
            builder.addIntegrator(LIGHTING_SHARED); // PT needs fresnelSchlick
            builder.setRenderMode('PathTracing');
            builder.addDefine('RENDER_MODE_PATHTRACING', '1');
            builder.addIntegrator(getPathTracerGLSL(isLite, MAX_LIGHTS, stochasticShadows, areaLightsActive));
        } else {
            const useCookTorrance = state?.specularModel === 1.0;
            builder.addIntegrator(useCookTorrance ? LIGHTING_SHARED : LIGHTING_SHARED_CORE);
            builder.setRenderMode('Direct');
            builder.addIntegrator(useCookTorrance ? getLightingPBRFull(stochasticShadows, areaLightsActive) : getLightingPBRSimple(stochasticShadows, areaLightsActive));
            // Shading integrator (calculateShading) is deferred to buildFragment() via requestShading()
            // so that reflection code from ReflectionsFeature is available at generation time.
            builder.requestShading();
        }

        // Light sphere GLSL injection handled by LightSpheresFeature
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
                color: '#ffffff', intensity: 1.0, falloff: 0, falloffType: 'Quadratic', fixed: false, visible: true, castShadow: true, radius: 0.0,
                range: 0, intensityUnit: 'raw'
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

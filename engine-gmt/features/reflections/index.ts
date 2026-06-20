
import { FeatureDefinition } from '../../engine/FeatureSystem';
import { getReflectionsGLSL } from './shader';

// Reflection modes (compile-time)
// Values are stable for preset compatibility — do not renumber.
export const REFL_MODE_OFF = 0.0;
export const REFL_MODE_ENV = 1.0;       // Environment map only (Fresnel-weighted)
// 2.0 was SSR (removed — fell back to ENV). Legacy presets with 2.0 map to ENV.
export const REFL_MODE_RAYMARCH = 3.0;  // Full raymarched reflections

// ---------------------------------------------------------------------------
// REFLECTION SHADING INTEGRATION GLSL
// Injected into calculateShading() via addShadingLogic().
// Variables in scope: p_ray, p_fractal, v, n, albedo, roughness, F, F0, NdotV,
//   reflDir, reflectionLighting (output), stochasticSeed, d, uReflection, uSpecular
// ---------------------------------------------------------------------------

/** Environment map only — Fresnel-weighted env sampling with fog. Zero extra cost. */
const REFL_ENV_SHADING = `
    // --- REFLECTIONS: ENVIRONMENT MAP ---
    vec3 envColor = applyEnvFog(GetEnvMap(reflDir, roughness) * uEnvStrength);
    reflectionLighting = envColor * F * uSpecular;
`;

/** Full raymarched reflections — traces a reflection ray, shades the hit point.
 *  VNDF importance sampling + firefly clamp + env/AO fill at the hit.
 *  @see docs/adr/0068-raymarched-reflection-importance-sampling.md */
const REFL_RAYMARCH_SHADING = `
    // --- REFLECTIONS: RAYMARCHED ---
    {
        // Adaptive bias: scales with pixel size at camera distance to avoid self-intersection.
        // Use camera distance (length(p_ray)) not ray travel distance (d) — for reflected
        // hits near the surface, d can be tiny, collapsing the bias and causing self-intersection.
        float pixelSizeScale = uPixelSizeBase / uInternalScale;
        float cameraDist_refl = length(p_ray);
        float reflPixelFootprint = (uCamType > 0.5 && uCamType < 1.5) ? pixelSizeScale : pixelSizeScale * cameraDist_refl;
        float reflBias = max(reflPixelFootprint * 2.0, length(p_fractal) * PRECISION_RATIO_HIGH * 2.0);
        vec3 currRo = p_ray + n * reflBias;
        vec3 currRd = reflDir;

        // Roughness regularization: floor the lobe width so near-mirror
        // surfaces don't degenerate (a=0 → NaN in the GGX basis) and the VNDF
        // weight stays bounded. Mirrors the PT path's max(roughness, 0.04).
        float reflRough = max(roughness, 0.04);

        // GGX VNDF importance sampling (Heitz 2018) replaces the old uniform-
        // cone jitter. The half-vector is drawn from the visible-normal
        // distribution conditioned on the view dir, so the single-sample weight
        // collapses to F * G1(L) — bounded, no grazing-angle fireflies — and
        // accumulated samples converge on the true glossy lobe instead of a
        // wrong-shaped blur. Perfect-mirror surfaces and in-motion frames keep
        // the deterministic reflDir for a clean, responsive view.
        bool isMoving = uBlendFactor >= 0.99;
        float reflG1L = 1.0;
        vec3 reflF = F;  // macro Fresnel fallback (mirror / in-motion)
        if (roughness > 0.05 && !isMoving) {
            vec4 blueNoise = getBlueNoise4(gl_FragCoord.xy);
            vec3 H = sampleReflVNDF(n, v, reflRough, blueNoise.gb);
            vec3 vndfDir = reflect(-v, H);
            if (dot(vndfDir, n) > 0.001) {
                currRd = vndfDir;
                // Smith G1 for the sampled outgoing direction — the term the
                // old cone jitter omitted (it weighted by F alone).
                float NdotL = max(0.001, dot(n, currRd));
                float kG = (reflRough * reflRough) * 0.5;
                reflG1L = NdotL / (NdotL * (1.0 - kG) + kG);
                // Micro-facet Fresnel at the sampled half-vector — accurate at
                // grazing angles where the macro NdotV Fresnel over-reflects.
                float HdotV = max(0.0, dot(H, v));
                reflF = F0 + (max(vec3(1.0 - reflRough), F0) - F0) * pow(1.0 - HdotV, 5.0);
            }
        }

        // VNDF specular throughput: F * G1(L). The D, G1(V) and 4·NdotV·NdotL
        // terms cancel against the VNDF pdf, leaving this bounded weight.
        vec3 currentThroughput = reflF * uSpecular * reflG1L;

        if (roughness <= uReflRoughnessCutoff && dot(currentThroughput, currentThroughput) >= 0.01) {

            vec4 refHit = traceReflectionRay(currRo, currRd);

            if (refHit.x > 0.0) {
                float hitD = refHit.x;
                vec3 p_next = currRo + currRd * hitD;
                vec3 p_next_fractal = p_next + uCameraPosition + uSceneOffsetLow + uSceneOffsetHigh;

                vec3 r_albedo, r_n, r_emission;
                float r_rough;

                // Use camera-to-reflected-point distance for normal epsilon, not reflection ray travel distance.
                // p_next is in camera-local space, so length(p_next) = camera distance.
                float reflCameraDist = length(p_next);
                getSurfaceMaterial(p_next, p_next_fractal, vec4(0.0, refHit.yzw), reflCameraDist, r_albedo, r_n, r_emission, r_rough, false);

                // Regularize the reflected surface's own roughness — its sharp
                // specular highlights are a secondary firefly source on the
                // reflection ray, which NEE on the bounce can never importance-
                // sample. Widening the lobe trades negligible bias for variance.
                r_rough = max(r_rough, 0.08);

                if (dot(r_n, -currRd) < 0.0) r_n = -r_n;

                vec3 hitColor = r_emission;
                #ifdef REFL_BOUNCE_SHADOWS
                    // Always compute shadows when enabled — avoids brightness pop
                    // between navigation (no shadows) and accumulation (shadows).
                    hitColor += calculatePBRContribution(p_next, r_n, -currRd, r_albedo, r_rough, uReflection, stochasticSeed + 0.1, true);
                #else
                    hitColor += calculatePBRContribution(p_next, r_n, -currRd, r_albedo, r_rough, uReflection, stochasticSeed + 0.1, false);
                #endif

                // Environment fill at the reflected hit. The primary surface
                // receives Ambient IBL (shading.ts step 7), but the reflection
                // hit only got direct lights — so reflected cavities, where
                // those lights are occluded, went black while the same cavity
                // reads fine on the primary surface. Add the matching env
                // irradiance (diffuse IBL, fills the dark cavities) plus a
                // Fresnel-weighted specular env lobe (so reflected surfaces also
                // show the environment, not just point lights). Deterministic
                // mip-filtered lookups — adds fill light, not noise.
                if (uEnvStrength > 0.001) {
                    vec3  r_F0    = mix(vec3(0.04), r_albedo, uReflection);
                    float r_NdotV = max(0.0, dot(r_n, -currRd));
                    vec3  r_F     = r_F0 + (max(vec3(1.0 - r_rough), r_F0) - r_F0) * pow(1.0 - r_NdotV, 5.0);
                    vec3  r_kD    = (vec3(1.0) - r_F) * (1.0 - uReflection);
                    vec3  r_envDiff = r_kD * r_albedo * GetEnvMap(r_n, 1.0) * uDiffuse;
                    vec3  r_envSpec = r_F * GetEnvMap(reflect(currRd, r_n), r_rough);
                    hitColor += applyEnvFog((r_envDiff + r_envSpec) * uEnvStrength);
                }

                // Ambient occlusion on the reflected surface — the same
                // treatment the primary surface gets (shading.ts step 8), so
                // reflected cavities occlude the env fill instead of reading
                // flat / over-lit. GetAO is a safe no-op (returns 1.0) when the
                // AO feature is disabled.
                float r_ao = GetAO(p_next, r_n, stochasticSeed + 0.1);
                hitColor *= mix(uAOColor, vec3(1.0), r_ao);

                // Firefly clamp on the single per-frame reflection sample (uses
                // the shared uPTMaxLuminance "Firefly Clamp" control). Clamping
                // before accumulation is what makes bright reflected highlights
                // average to a stable value instead of persisting as spikes.
                reflectionLighting += clampReflLum(hitColor * currentThroughput);

            } else {
                reflectionLighting += sampleMissEnv(currRo, currRd, roughness, currentThroughput);
            }
        } else {
            reflectionLighting += applyEnvFog(GetEnvMap(currRd, roughness) * uEnvStrength) * currentThroughput;
        }

        vec3 simpleEnv = applyEnvFog(GetEnvMap(reflDir, roughness) * uEnvStrength);
        simpleEnv *= currentThroughput;

        reflectionLighting = mix(simpleEnv, reflectionLighting, uReflStrength);
    }
`;

export interface ReflectionsState {
    enabled: boolean; // Master compile-time switch
    reflectionMode: number; // REFL_MODE_* constants
    bounceShadows: boolean; // Whether reflected surfaces cast shadows
    bounces: number;
    steps: number;
    roughnessThreshold: number;
    mixStrength: number;
}

export const ReflectionsFeature: FeatureDefinition = {
    id: 'reflections',
    shortId: 'rf',
    name: 'Reflections',
    category: 'Rendering',
    engineConfig: {
        toggleParam: 'enabled',
        mode: 'compile',
        label: 'Reflection Tracing',
        groupFilter: 'engine_settings'
    },
    groups: {
        shading: {
            label: 'Reflections',
            description: 'Screen-space reflection tracing for glossy surfaces.',
            helpId: 'render.reflections',
        },
    },
    params: {
        // --- REFLECTION MODE (Engine Panel) ---
        reflectionMode: {
            type: 'float', default: REFL_MODE_ENV, label: 'Reflection Method', shortId: 'rm',
            group: 'engine_settings',
            options: [
                { label: 'Off', value: REFL_MODE_OFF, estCompileMs: 0 },
                { label: 'Environment Map', value: REFL_MODE_ENV, estCompileMs: 0 },
                { label: 'Raymarched (Quality)', value: REFL_MODE_RAYMARCH, estCompileMs: 1500 }  // L6: measured ~1500-2000 cold (§2.6.1); was 7500
            ],
            description: 'Reflection technique. Higher quality = longer compile time. Raymarched adds ~1.5-2s.',
            onUpdate: 'compile',
            noAccumReset: true
        },

        // --- BOUNCE SHADOWS (Engine Panel, only for Raymarched) ---
        bounceShadows: {
            type: 'boolean', default: false, label: 'Bounce Shadows', shortId: 'bs',
            group: 'engine_settings',
            ui: 'checkbox',
            condition: { param: 'reflectionMode', eq: REFL_MODE_RAYMARCH },
            description: 'Compute shadows on reflected surfaces. Negligible extra compile time.',
            onUpdate: 'compile',
            noAccumReset: true,
            estCompileMs: 50  // L6: measured ~free (+42ms — calculatePBRContribution body already inlined; §2.6); was 4500 (~100x high)
        },

        // --- QUALITY PARAMS (Engine Panel, only for Raymarched) ---
        mixStrength: {
            type: 'float', default: 1.0, label: 'Raymarch Mix', shortId: 'mx', uniform: 'uReflStrength',
            min: 0.0, max: 1.0, step: 0.01,
            group: 'engine_settings',
            condition: { param: 'reflectionMode', eq: REFL_MODE_RAYMARCH },
            description: "Blends between Raymarched Reflections (1.0) and Environment Map (0.0)."
        },
        roughnessThreshold: {
            type: 'float', default: 0.62, label: 'Roughness Cutoff', shortId: 'rc', uniform: 'uReflRoughnessCutoff',
            min: 0.0, max: 1.0, step: 0.01,
            group: 'engine_settings',
            condition: { param: 'reflectionMode', eq: REFL_MODE_RAYMARCH },
            description: "Surfaces rougher than this will skip raymarching to save performance."
        },
        bounces: {
            type: 'int', default: 1, label: 'Max Bounces', shortId: 'rb',
            min: 1, max: 3, step: 1, group: 'engine_settings',
            uniform: 'uReflBounces',
            ui: 'numeric',
            description: "Maximum recursion depth. Clamped to 3. Default 1 for performance.",
            noAccumReset: true,
            onUpdate: 'compile',
            condition: { param: 'reflectionMode', eq: REFL_MODE_RAYMARCH }
        },
        steps: {
            type: 'int', default: 64, label: 'Trace Steps', shortId: 'rs',
            min: 16, max: 128, step: 8, group: 'engine_settings',
            uniform: 'uReflSteps',
            ui: 'numeric',
            description: "Precision of the reflection ray.",
            noAccumReset: true,
            condition: { param: 'reflectionMode', eq: REFL_MODE_RAYMARCH }
        },

        // Master Switch (Compile Time) — hidden, controlled by engine toggle
        enabled: {
            type: 'boolean', default: true, label: 'Enable Reflections', shortId: 're', group: 'main',
            hidden: true, noAccumReset: true,
            onUpdate: 'compile'
        }
    },
    inject: (builder, config, variant) => {
        // OPTIMIZATION: Only inject for Main Render
        if (variant !== 'Main') return;

        const state = config.reflections as ReflectionsState;
        if (!state || state.enabled === false) return;

        const mode = state.reflectionMode ?? REFL_MODE_ENV;

        if (mode === REFL_MODE_OFF) {
            // No reflection code — shading.ts default fallback handles basic env-map
            return;
        }

        if (mode !== REFL_MODE_RAYMARCH) {
            // ENV mode (or legacy SSR=2.0) — Fresnel-weighted env sampling with fog
            builder.addShadingLogic(REFL_ENV_SHADING);
            return;
        }

        if (mode === REFL_MODE_RAYMARCH) {
            // Full raymarched reflections — trace function + shading integration
            builder.addPostDEFunction(getReflectionsGLSL());

            const bounces = Math.max(1, Math.min(3, state.bounces ?? 1));
            builder.addDefine('MAX_REFL_BOUNCES', bounces.toString());

            if (state.bounceShadows) {
                builder.addDefine('REFL_BOUNCE_SHADOWS', '1');
            }

            builder.addShadingLogic(REFL_RAYMARCH_SHADING);
        }
    }
};

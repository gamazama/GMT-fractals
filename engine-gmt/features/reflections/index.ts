
import { FeatureDefinition } from '../../engine/FeatureSystem';
import type { QualityState } from '../quality';
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
    vec3 envColor = applyEnvFog(GetEnvMap(reflDir, roughness) * uEnvStrength, reflDir);
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

        // First-bounce throughput snapshot — the bounce loop attenuates
        // currentThroughput per surface; the simpleEnv mix below must use the
        // un-attenuated value (pre-loop behaviour).
        vec3 reflThroughput0 = currentThroughput;

        if (roughness <= uReflRoughnessCutoff && dot(currentThroughput, currentThroughput) >= 0.01) {

            // --- BOUNCE LOOP (ADR-0096) — Whitted continuation, MB3D CalcSR
            // recursion shape: mirror re-reflect at each hit, throughput ×=
            // the hit's Fresnel × specular, luma early-exit (MB3D uses 1e-4 on
            // its absorption vector, CalcSR.pas:352). MAX_REFL_BOUNCES is the
            // compile define from the 'Max Bounces' param (default 1 unrolls
            // to exactly the old single-trace body). Secondary bounces are
            // deterministic mirrors — the VNDF jitter applies to bounce 0 only,
            // so extra bounces add no extra noise.
            float reflPathDist = d; // view-cone distance at the current origin
            for (int b = 0; b < MAX_REFL_BOUNCES; b++) {

            float reflFade = 1.0; // hit confidence: 1 = real hit, <1 = recovered candidate (ADR-0095)
            vec4 refHit = traceReflectionRay(currRo, currRd, reflPathDist, reflFade);

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

                // Whether this iteration terminates the chain: the compiled
                // bounce ceiling, or a recovered low-confidence hit (a faded
                // near-graze is no basis for spawning another mirror ray).
                bool lastBounce = (b == MAX_REFL_BOUNCES - 1) || (reflFade < 0.999);

                vec3 hitColor = r_emission;
                #ifdef REFL_BOUNCE_SHADOWS
                    // Always compute shadows when enabled — avoids brightness pop
                    // between navigation (no shadows) and accumulation (shadows).
                    hitColor += calculatePBRContribution(p_next, r_n, -currRd, r_albedo, r_rough, uReflection, stochasticSeed + 0.1 + 0.31 * float(b), true);
                #else
                    hitColor += calculatePBRContribution(p_next, r_n, -currRd, r_albedo, r_rough, uReflection, stochasticSeed + 0.1 + 0.31 * float(b), false);
                #endif

                // Fresnel of the hit surface — feeds the env-spec fill AND the
                // next bounce's throughput attenuation (MB3D: tAbsorb ×= the
                // hit's specular colour, CalcSR.pas:635).
                vec3  r_F0    = mix(vec3(0.04), r_albedo, uReflection);
                float r_NdotV = max(0.0, dot(r_n, -currRd));
                vec3  r_F     = r_F0 + (max(vec3(1.0 - r_rough), r_F0) - r_F0) * pow(1.0 - r_NdotV, 5.0);

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
                    // Fog wraps the raw env radiance BEFORE the surface response
                    // (kD·albedo / F) — fogging after tinted dark-albedo surfaces
                    // toward gray. Matches the primary Ambient IBL (shading.ts step 7).
                    vec3  r_kD    = (vec3(1.0) - r_F) * (1.0 - uReflection);
                    vec3  r_envDiff = r_kD * r_albedo * applyEnvFog(GetEnvMap(r_n, 1.0) * uEnvStrength, r_n) * uDiffuse;
                    // Specular env lobe ONLY on the terminating bounce — on
                    // earlier bounces the traced next ray IS that lobe (it
                    // returns either real geometry or sampleMissEnv); adding
                    // both would double-count the mirror direction.
                    vec3  r_specDir = reflect(currRd, r_n);
                    vec3  r_envSpec = lastBounce ? r_F * applyEnvFog(GetEnvMap(r_specDir, r_rough) * uEnvStrength, r_specDir) : vec3(0.0);
                    hitColor += r_envDiff + r_envSpec;
                }

                // Ambient occlusion on the reflected surface — the same
                // treatment the primary surface gets (shading.ts step 8), so
                // reflected cavities occlude the env fill instead of reading
                // flat / over-lit. GetAO is a safe no-op (returns 1.0) when the
                // AO feature is disabled.
                float r_ao = GetAO(p_next, r_n, stochasticSeed + 0.1 + 0.31 * float(b));
                hitColor *= mix(uAOColor, vec3(1.0), r_ao);

                // Reflected-segment distance fog (ADR-0096). The atmosphere
                // post-process fogs the whole pixel by the PRIMARY travel d —
                // the camera→reflector segment — so reflections of distant
                // geometry read too crisp in foggy scenes. Add the reflected
                // segment's own travel through the same ramp (MB3D re-fogs
                // reflected hits by their depth, CalcSR.pas CalcZposAndRough →
                // CalcPixelColorSvecTrans). Misses already fog via applyEnvFog.
                if (uFogIntensity > 0.001) {
                    float rFog = smoothstep(uFogNear, uFogFar, hitD) * uFogIntensity;
                    hitColor = mix(hitColor, fogRadiance(currRd), rFog);
                }

                // Firefly clamp on the single per-frame reflection sample (uses
                // the shared uPTMaxLuminance "Firefly Clamp" control). Clamping
                // before accumulation is what makes bright reflected highlights
                // average to a stable value instead of persisting as spikes.
                vec3 hitContrib = clampReflLum(hitColor * currentThroughput);

                // Graded confidence (ADR-0095): a recovered closest-approach
                // candidate blends toward the env miss colour by reflFade, so
                // budget-exhausted rays and reflected silhouettes fade smoothly
                // instead of flipping hit/miss (the "dotty" env speckle).
                if (reflFade < 1.0) {
                    hitContrib = mix(sampleMissEnv(currRo, currRd, roughness, currentThroughput), hitContrib, reflFade);
                }
                reflectionLighting += hitContrib;

                if (lastBounce) break;

                // Continue the chain: attenuate throughput by the hit surface's
                // specular reflectance (r_F × uSpecular — the GMT twin of MB3D's
                // tAbsorb ×= specular colour × SRamount) and mirror-reflect.
                currentThroughput *= r_F * uSpecular;
                if (dot(currentThroughput, vec3(0.299, 0.587, 0.114)) < 1.0e-3) break;
                reflPathDist += hitD;
                currRd = reflect(currRd, r_n);
                // Same bias recipe as bounce 0: pixel footprint at the point's
                // camera distance, floored by float precision at the point.
                float nextFootprint = (uCamType > 0.5 && uCamType < 1.5) ? pixelSizeScale : pixelSizeScale * reflCameraDist;
                float nextBias = max(nextFootprint * 2.0, length(p_next_fractal) * PRECISION_RATIO_HIGH * 2.0);
                currRo = p_next + r_n * nextBias;

            } else {
                reflectionLighting += sampleMissEnv(currRo, currRd, roughness, currentThroughput);
                break;
            }
            } // end bounce loop
        } else {
            reflectionLighting += applyEnvFog(GetEnvMap(currRd, roughness) * uEnvStrength, currRd) * currentThroughput;
        }

        vec3 simpleEnv = applyEnvFog(GetEnvMap(reflDir, roughness) * uEnvStrength, reflDir);
        simpleEnv *= reflThroughput0;

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
    accurateColors: boolean; // True trap-colour at reflected hits (compile gate, ADR-0096)
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
            ui: 'numeric',
            description: "Mirror recursion depth — 2+ shows reflections inside reflections. Each extra bounce recompiles and adds a full trace + shade per pixel.",
            noAccumReset: true,
            onUpdate: 'compile',
            condition: { param: 'reflectionMode', eq: REFL_MODE_RAYMARCH },
            estCompileMs: 800  // speculative: each bounce unrolls another trace+shade body; owner to measure
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
        accurateColors: {
            type: 'boolean', default: false, label: 'Accurate Colors', shortId: 'ac',
            group: 'engine_settings',
            ui: 'checkbox',
            condition: { param: 'reflectionMode', eq: REFL_MODE_RAYMARCH },
            description: "Sample the true surface colour (orbit traps / colour smoothing) at reflected hits instead of the gradient default. Adds compile time.",
            onUpdate: 'compile',
            noAccumReset: true,
            estCompileMs: 400  // speculative: one full map() call site at the march exit; owner to measure
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
            // Full raymarched reflections — trace function + shading integration.
            // The bisection hit-refine rides the quality feature's 'Surface
            // Refinement' compile gate (same source quality.ts inject reads, so
            // inject order doesn't matter) — its REFINE_HARD_CAP define and
            // uRefineActive/uRefineSteps runtime controls drive both marches.
            // Un-refined builds get zero extra GLSL (no new DE_Dist call site).
            const refine = !!(config.quality as QualityState | undefined)?.refineEnabled;
            builder.addPostDEFunction(getReflectionsGLSL({ refine, accurateColors: !!state.accurateColors }));

            const bounces = Math.max(1, Math.min(3, state.bounces ?? 1));
            builder.addDefine('MAX_REFL_BOUNCES', bounces.toString());

            if (state.bounceShadows) {
                builder.addDefine('REFL_BOUNCE_SHADOWS', '1');
            }

            builder.addShadingLogic(REFL_RAYMARCH_SHADING);
        }
    }
};

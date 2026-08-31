
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

/** Environment map only — Fresnel-weighted env sampling with fog. Zero extra cost
 *  unless coneAA is on, which adds one GetNormal (4 DE taps) for the env-map
 *  minification footprint. coneAA=false emits BYTE-IDENTICAL source to the
 *  pre-2026-09-01 block. @see docs/adr/0069 (update 2026-09-01) */
export const reflEnvShading = (coneAA: boolean) => `
    // --- REFLECTIONS: ENVIRONMENT MAP ---${coneAA ? `
    {
        float pixelSizeScale = uPixelSizeBase / uInternalScale;
        float reflPixelFootprint = (uCamType > 0.5 && uCamType < 1.5) ? pixelSizeScale : pixelSizeScale * length(p_ray);
    // Angular footprint of the REFLECTED cone, for env-map minification.
    // A mirror off curved geometry sweeps the reflected direction far faster
    // than the pixel's own angular size: reflect() doubles the normal's rate
    // of change, so CURVATURE, not pixel size, sets the filter width. Measured
    // directly — re-estimate the normal one pixel-footprint along the surface
    // and take |dn|, which IS the normal change across one pixel. No SDF or
    // Laplacian assumption (fractal DEs are Lipschitz bounds, not true SDFs),
    // and no screen-space derivatives: fwidth is undefined here because
    // calculateShading runs inside if (hit). Costs one GetNormal = 4 DE taps.
    {
        vec3 t1 = cross(n, v);
        float tl = length(t1);
        // Degenerate at normal incidence (n parallel to v) — any tangent will do.
        t1 = (tl > 1.0e-6) ? t1 / tl : normalize(cross(n, vec3(0.0, 0.0, 1.0)) + vec3(1.0e-6));
        float ceps = max(reflPixelFootprint, length(p_fractal) * PRECISION_RATIO_HIGH);
        vec3 nOff = GetNormal(p_ray + t1 * reflPixelFootprint, ceps);
        // x2 for reflect(); + the pixel's own angular size as the floor.
        g_envConeAngle = 2.0 * length(nOff - n) + pixelSizeScale;
    }
    }` : ''}
    vec3 envColor = applyEnvFog(GetEnvMap(reflDir, roughness) * uEnvStrength, reflDir);
    reflectionLighting = envColor * F * uSpecular;${coneAA ? `
    g_envConeAngle = 0.0;` : ''}
`;

/** Full raymarched reflections — traces a reflection ray, shades the hit point.
 *  VNDF importance sampling + firefly clamp + env/AO fill at the hit.
 *
 *  @invariant SINGLE bounce by design — never wrap this shade body in a loop.
 *  Direct-mode multi-bounce was removed (owner call, 2026-07-10): PT owns bounce
 *  recursion (uPTBounces), and the Direct bounce wrapper both tripped an fxc
 *  nested-loop pathology (+34s cold compile at ONE trip; §2.6.2 of
 *  shader-compile-optimization.md) and cost +5.2s even when emission-gated to
 *  2+ bounces — all for a situational mirror-in-mirror gain PT already covers.
 *  @see docs/adr/0068-raymarched-reflection-importance-sampling.md
 *  @see docs/adr/0096-reflection-bounces-fog-colors.md (2026-07-10 update blocks) */
export const reflRaymarchShading = (coneAA: boolean) => `
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
        vec3 currRd = reflDir;${coneAA ? `
        // Angular footprint of the REFLECTED cone, for env-map minification.
        // A mirror off curved geometry sweeps the reflected direction far faster
        // than the pixel's own angular size: reflect() doubles the normal's rate
        // of change, so CURVATURE, not pixel size, sets the filter width. Measured
        // directly — re-estimate the normal one pixel-footprint along the surface
        // and take |dn|, which IS the normal change across one pixel. No SDF or
        // Laplacian assumption (fractal DEs are Lipschitz bounds, not true SDFs),
        // and no screen-space derivatives: fwidth is undefined here because
        // calculateShading runs inside if (hit). Costs one GetNormal = 4 DE taps.
        {
            vec3 t1 = cross(n, v);
            float tl = length(t1);
            // Degenerate at normal incidence (n parallel to v) — any tangent will do.
            t1 = (tl > 1.0e-6) ? t1 / tl : normalize(cross(n, vec3(0.0, 0.0, 1.0)) + vec3(1.0e-6));
            float ceps = max(reflPixelFootprint, length(p_fractal) * PRECISION_RATIO_HIGH);
            vec3 nOff = GetNormal(p_ray + t1 * reflPixelFootprint, ceps);
            // x2 for reflect(); + the pixel's own angular size as the floor.
            g_envConeAngle = 2.0 * length(nOff - n) + pixelSizeScale;
        }` : ''}

        // ONE fog-radiance sample shared by every fogged term in this block
        // (segment fog, env fills, miss env, simpleEnv) — each used to inline its
        // own fogRadiance -> env-sample chain (~260ms of cold compile per site,
        // section 2.6.2; 7 inlines -> 1). At the fog sample's max-blur lod the
        // direction dependence is gentle, so reflDir stands in for the per-term
        // directions within this pixel's reflection. Primary-view fog terms
        // (Ambient IBL, sky, light spheres) keep exact per-direction sampling.
        // reflFogW replicates applyEnvFog's gate bit-exactly: 0 when fog is off
        // or the far plane is parked, so mix(env, reflFog*, reflFogW) == env.
        bool reflFogOn = uFogIntensity >= 0.001;
        // Atmospheric fog-volume colour (UNSCALED) — the reflected-segment DISTANCE
        // fog target that fades a reflected surface colour toward the fog, exactly
        // like the primary post-process distance fog.
        vec3 reflFogRad = reflFogOn ? fogRadiance(reflDir) : vec3(0.0);
        // Env-LIGHTING fog target: the same colour scaled by uEnvStrength so the env
        // fills below (each a GetEnvMap * uEnvStrength term) fog toward a consistent
        // brightness. Raw reflFogRad here would inject full-strength sky as reflected
        // LIGHT when the dome is dimmed/off — the "fog switches the env light on" pop
        // (mirrors applyEnvFog's fix in shading.ts). @see docs/adr/0097
        vec3 reflFogLit = reflFogRad * uEnvStrength;
        float reflFogW = (reflFogOn && uFogFar < 1000.0) ? uFogIntensity : 0.0;

        // Roughness regularization: floor the lobe width so near-mirror
        // surfaces don't degenerate (a=0 → NaN in the GGX basis) and the VNDF
        // weight stays bounded. Mirrors the PT path's max(roughness, 0.04).
        float reflRough = max(roughness, 0.04);

        // GGX VNDF importance sampling (Heitz 2018) replaces the old uniform-
        // cone jitter. The half-vector is drawn from the visible-normal
        // distribution conditioned on the view dir, so the single-sample weight
        // collapses to F * G1(L) — bounded, no grazing-angle fireflies — and
        // accumulated samples converge on the true glossy lobe instead of a
        // wrong-shaped blur. Perfect-mirror surfaces (roughness <= 0.05) keep the
        // deterministic reflDir; glossy surfaces run VNDF in BOTH navigation and
        // accumulation, so the first accumulation sample (drawn with blend==1) is a
        // valid sample of the final estimator rather than a sharp-mirror frame that
        // biases the running mean. Stable blue noise while moving (frozen per-pixel
        // -> no shimmer), animated once accumulating -- the DOF/stochasticSeed idiom.
        bool isMoving = uBlendFactor >= 0.99;
        float reflG1L = 1.0;
        vec3 reflF = F;  // macro Fresnel fallback (perfect mirror only)
        if (roughness > 0.05) {
            vec4 blueNoise = isMoving ? getStableBlueNoise4(gl_FragCoord.xy)
                                      : getBlueNoise4(gl_FragCoord.xy);
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

            // SINGLE reflection bounce by design (see JSDoc — PT owns bounce
            // recursion). Hit-fade and miss both route through ONE weighted
            // sampleMissEnvPre call after the block (mix(miss, hit, fade) ==
            // hit·fade + miss·(1−fade)) — halves the inlined sampleMiss bodies.
            float reflMissW = 0.0;

            float reflFade = 1.0; // hit confidence: 1 = real hit, <1 = recovered candidate (ADR-0095)
            vec4 refHit = traceReflectionRay(currRo, currRd, d, reflFade);

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

                // Fresnel of the hit surface — feeds the env-spec fill
                // (MB3D: tAbsorb ×= the hit's specular colour, CalcSR.pas:635).
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
                    // Fog mix uses the block-shared reflFogLit (env-lighting target).
                    vec3  r_kD    = (vec3(1.0) - r_F) * (1.0 - uReflection);
                    vec3  r_envDiff = r_kD * r_albedo * mix(GetEnvMap(r_n, 1.0) * uEnvStrength, reflFogLit, reflFogW) * uDiffuse;
                    // Fresnel-weighted specular env lobe — the chain terminates
                    // at this hit (single bounce), so the env stands in for the
                    // ray we don't spawn.
                    vec3  r_specDir = reflect(currRd, r_n);
                    vec3  r_envSpec = r_F * mix(GetEnvMap(r_specDir, r_rough) * uEnvStrength, reflFogLit, reflFogW);
                    hitColor += r_envDiff + r_envSpec;
                }

                // Ambient occlusion on the reflected surface — the same
                // treatment the primary surface gets (shading.ts step 8), so
                // reflected cavities occlude the env fill instead of reading
                // flat / over-lit. GetAO is a safe no-op (returns 1.0) when the
                // AO feature is disabled.
                float r_ao = GetAO(p_next, r_n, stochasticSeed + 0.1);
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
                    hitColor = mix(hitColor, reflFogRad, rFog);
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
                reflectionLighting += hitContrib * reflFade;
                reflMissW = 1.0 - reflFade;
            } else {
                reflMissW = 1.0;
            }
            // The ONE miss-env evaluation (see reflMissW above).
            if (reflMissW > 0.0001) {
                reflectionLighting += reflMissW * sampleMissEnvPre(currRo, currRd, roughness, currentThroughput, reflFogLit, reflFogW);
            }
        } else {
            reflectionLighting += mix(GetEnvMap(currRd, roughness) * uEnvStrength, reflFogLit, reflFogW) * currentThroughput;
        }

        vec3 simpleEnv = mix(GetEnvMap(reflDir, roughness) * uEnvStrength, reflFogLit, reflFogW);
        simpleEnv *= currentThroughput;

        reflectionLighting = mix(simpleEnv, reflectionLighting, uReflStrength);${coneAA ? `
        g_envConeAngle = 0.0;` : ''}
    }
`;

export interface ReflectionsState {
    enabled: boolean; // Master compile-time switch
    reflectionMode: number; // REFL_MODE_* constants
    bounceShadows: boolean; // Whether reflected surfaces cast shadows
    steps: number;
    roughnessThreshold: number;
    mixStrength: number;
    accurateColors: boolean; // True trap-colour at reflected hits (compile gate, ADR-0096)
    coneAA: boolean; // Env-map minification AA from the reflected cone footprint (compile gate)
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
                { label: 'Raymarched (Quality)', value: REFL_MODE_RAYMARCH, estCompileMs: 2900 }  // measured cold 2026-07-10 post-optimization (§2.6.2): 5.0s total − 2.1s off; pre-opt overhaul body was 5800
            ],
            description: 'Reflection technique. Higher quality = longer compile time. Raymarched adds ~3s of compile.',
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
        // NOTE: 'Max Bounces' (shortId 'rb') REMOVED 2026-07-10 (owner call): Direct
        // reflections are single-bounce by design — PT owns bounce recursion
        // (lighting.ptBounces). The bounce loop cost +5.2s of cold compile even
        // emission-gated (§2.6.2). Old scenes' stored `bounces` values are ignored.
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
            description: "Sample the true surface colour (orbit traps / colour smoothing) at reflected hits instead of the gradient default. Adds a little compile time.",
            onUpdate: 'compile',
            noAccumReset: true,
            estCompileMs: 600  // measured cold 2026-07-10 post-optimization (§2.6.2): +0.5s — one full DE() call site at the march exit; ~noise floor
        },

        coneAA: {
            type: 'boolean', default: false, label: 'Reflection Filtering', shortId: 'ca',
            group: 'engine_settings',
            ui: 'checkbox',
            condition: { param: 'reflectionMode', neq: REFL_MODE_OFF },
            description: "Filter the environment map by how fast the reflection sweeps across the surface, so mirrors on curved geometry stop aliasing bright highlights. Adds ~1s of compile and one extra normal estimate per pixel; the gain is mostly in the live preview, since accumulation already smooths much of it.",
            onUpdate: 'compile',
            noAccumReset: true,
            // MEASURED cold 2026-09-01, d3d11 with the ANGLE disk cache off,
            // median of 3 fresh browsers per variant: 8620ms off -> 9574ms on.
            // One GetNormal = 4 DE_Dist inlines, i.e. a new DE call site — the
            // same shape of cost as accurateColors' 600ms for one DE() site.
            // Default OFF because that second of compile buys a difference that
            // a converged render of the reference scene cannot show.
            estCompileMs: 950
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
            builder.addShadingLogic(reflEnvShading(state.coneAA === true));
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

            if (state.bounceShadows) {
                builder.addDefine('REFL_BOUNCE_SHADOWS', '1');
            }

            builder.addShadingLogic(reflRaymarchShading(state.coneAA === true));
        }
    }
};

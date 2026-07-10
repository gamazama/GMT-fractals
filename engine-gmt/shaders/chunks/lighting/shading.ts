
export const getShadingGLSL = (reflectionCode: string = '') => {
    // If no feature injects reflection code, use simple env-map fallback
    const reflectionBlock = reflectionCode || `
        // --- REFLECTIONS OFF (default) ---
        // Fog wraps the raw env radiance before the surface response (F, uSpecular) —
        // same treatment as the ENV-mode injection; the dome sits at the fog far plane.
        vec3 envColor = applyEnvFog(GetEnvMap(reflDir, roughness) * uEnvStrength, reflDir);
        reflectionLighting = envColor * F * uSpecular;
    `;

    return `
// ------------------------------------------------------------------
// DIRECT LIGHTING INTEGRATOR (Multi-Bounce)
// ------------------------------------------------------------------

// Apply fog to environment samples (treat as being at fog far plane).
// dir = the direction the env was sampled along — the in-scatter colour is
// per-direction (fogRadiance, ADR-0097), so a fogged sky keeps its gradient.
vec3 applyEnvFog(vec3 env, vec3 dir) {
    if (uFogIntensity < 0.001 || uFogFar >= 1000.0) return env;
    return mix(env, fogRadiance(dir), uFogIntensity);
}

// Sample environment for a miss ray (reflection/bounce), with fog and feature overrides.
// The flat far-plane env fog spares the fraction covered by a self-fogged overlay
// (light spheres fog themselves by their own distance inside sampleMiss and report
// coverage via g_missSelfFogCover) — otherwise reflected emitters wipe to fog colour
// at full intensity even when they sit right next to the reflector.
vec3 sampleMissEnv(vec3 ro, vec3 rd, float roughness, vec3 throughput) {
    g_missSelfFogCover = 0.0;
    vec3 raw = sampleMiss(ro, rd, roughness, uEnvStrength);
    return mix(applyEnvFog(raw, rd), raw, g_missSelfFogCover) * throughput;
}

// Fog-hoisted twin of sampleMissEnv for the raymarched reflection block: takes the
// caller's precomputed fog radiance + weight instead of running the per-direction
// applyEnvFog -> fogRadiance -> env-sample chain per call site. fxc inlines that
// chain at EVERY call site (~260ms each cold, section 2.6.2) — the reflection block
// samples fog once at reflDir and shares it. fogW MUST be 0.0 when fog is inactive
// (callers replicate applyEnvFog's uFogIntensity/uFogFar gate).
vec3 sampleMissEnvPre(vec3 ro, vec3 rd, float roughness, vec3 throughput, vec3 fogRad, float fogW) {
    g_missSelfFogCover = 0.0;
    vec3 raw = sampleMiss(ro, rd, roughness, uEnvStrength);
    vec3 fogged = mix(raw, fogRad, fogW);
    return mix(fogged, raw, g_missSelfFogCover) * throughput;
}

vec3 calculateShading(vec3 ro, vec3 rd, float d, vec4 result, float stochasticSeed) {
    vec3 p_ray = ro + rd * d;
    vec3 p_fractal = p_ray + uCameraPosition + uSceneOffsetLow + uSceneOffsetHigh;

    vec3 albedo, n, emission;
    float roughness;

    // 1. Primary Surface — 3-tap forward-difference (GetFastNormal). With
    // shadows dominating cost on the corrected bench, this is statistically
    // tied with 4-tap tetra (within run-to-run noise) but ~5% theoretically
    // cheaper on math-only scenes. Visually indistinguishable for default
    // Mandelbulb. Audit Tier 1 #2.
    getSurfaceMaterial(p_ray, p_fractal, result, d, albedo, n, emission, roughness, false);

    vec3 v = normalize(-rd);

    // 2. Direct Light (Primary)
    vec3 directLighting = calculatePBRContribution(p_ray, n, v, albedo, roughness, uReflection, stochasticSeed, true);

    // 3. Ambient Occlusion (Primary)
    float ao = GetAO(p_ray, n, stochasticSeed);

    // 4. Fresnel & Reflection Setup
    vec3 F0 = mix(vec3(0.04), albedo, uReflection);
    float NdotV = max(0.0, dot(n, v));
    // Schlick-Roughness: clamps grazing Fresnel so rough surfaces don't over-reflect
    // (distinct from per-light Schlick in PBR which uses HdotV for specular response)
    vec3 F = F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(1.0 - NdotV, 5.0);

    // 5. Reflection
    vec3 reflectionLighting = vec3(0.0);
    vec3 ambient = vec3(0.0);

    // Cache un-jittered reflection direction (reused for env fallback)
    vec3 reflDir = reflect(-v, n);

    // --- FEATURE INJECTION: REFLECTION EVALUATION ---
    // Variables in scope: p_ray, p_fractal, v, n, albedo, roughness, F, NdotV,
    //   reflDir, reflectionLighting (output), stochasticSeed, d, uReflection, uSpecular
    // Functions available: GetEnvMap, applyEnvFog, sampleMissEnv, getSurfaceMaterial,
    //   calculatePBRContribution, getBlueNoise4, traceReflectionRay (if injected)
    ${reflectionBlock}

    // 6. Rim
    float fresnelTerm = pow(1.0 - NdotV, uRimExponent);
    vec3 rimColor = uRimColor * fresnelTerm * uRim;

    // 7. Ambient IBL — the env map acting as a dome light. Fog wraps the raw
    // irradiance BEFORE the surface response (kD·albedo): in heavy fog the dome
    // light reaching a surface dims/tints toward the fog colour, matching the
    // fogged sky behind it — otherwise surfaces glow unfogged against the fog.
    // (applyEnvFog is identity when fog is off.)
    if (uEnvStrength > 0.001) {
        vec3 envIrradiance = applyEnvFog(GetEnvMap(n, 1.0) * uEnvStrength, n);
        vec3 kD = (vec3(1.0) - F) * (1.0 - uReflection);
        ambient = kD * albedo * envIrradiance * uDiffuse;
    }

    // 8. Compose
    vec3 finalColor = directLighting + reflectionLighting + rimColor + emission + ambient;

    // AO Tint: black = classic darkening. Custom color = tinted occlusion.
    finalColor *= mix(uAOColor, vec3(1.0), ao);

    return finalColor;
}
`;
};

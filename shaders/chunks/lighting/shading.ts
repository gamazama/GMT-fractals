
export const getShadingGLSL = () => {
    return `
// ------------------------------------------------------------------
// DIRECT LIGHTING INTEGRATOR (Multi-Bounce)
// ------------------------------------------------------------------

// Apply fog to environment samples (treat as being at fog far plane)
vec3 applyEnvFog(vec3 env) {
    if (uFogFar >= 1000.0) return env;
    float fogFactor = smoothstep(uFogNear, uFogFar, uFogFar);
    return mix(env, uFogColorLinear, fogFactor);
}

// Apply distance-based fog to shaded geometry
vec3 applyDistanceFog(vec3 col, float dist) {
    if (uFogFar >= 1000.0) return col;
    float fogFactor = smoothstep(uFogNear, uFogFar, dist);
    return mix(col, uFogColorLinear, fogFactor);
}

// Test reflection ray against visible light spheres, fallback to environment
vec3 sampleLightSphereOrEnv(vec3 ro, vec3 rd, float roughness, vec3 throughput) {
    vec3 env = applyEnvFog(GetEnvMap(rd, roughness) * uEnvStrength);
    #ifdef LIGHT_SPHERES
    vec2 lsHit = intersectLightSphere(ro, rd);
    if (lsHit.x > 0.0) {
        int li = int(lsHit.y);
        vec3 lc = uLightColor[li] * uLightIntensity[li];
        return mix(env, lc, lsHit.x) * throughput;
    }
    #endif
    return env * throughput;
}

vec3 calculateShading(vec3 ro, vec3 rd, float d, vec4 result, float stochasticSeed) {
    vec3 p_ray = ro + rd * d;
    vec3 p_fractal = p_ray + uCameraPosition + uSceneOffsetLow + uSceneOffsetHigh;

    vec3 albedo, n, emission;
    float roughness;

    // 1. Primary Surface
    getSurfaceMaterial(p_ray, p_fractal, result, d, albedo, n, emission, roughness, true);

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

    // 5. Reflection (Single Bounce - Flattened Loop)
    vec3 reflectionLighting = vec3(0.0);
    vec3 ambient = vec3(0.0);

    // Cache un-jittered reflection direction (reused for simpleEnv fallback)
    vec3 reflDir = reflect(-v, n);

    #ifdef REFLECTIONS_ENABLED
        // --- RAYMARCHED REFLECTIONS ---
        // Adaptive bias: scales with pixel size and distance to avoid self-intersection
        float pixelSizeScale = uPixelSizeBase / uInternalScale;
        float reflPixelFootprint = (uCamType > 0.5 && uCamType < 1.5) ? pixelSizeScale : pixelSizeScale * d;
        float reflBias = max(0.001, reflPixelFootprint * 2.0);
        vec3 currRo = p_ray + n * reflBias;
        vec3 currRd = reflDir;

        // Jitter first bounce based on roughness using Blue Noise
        bool isMoving = uBlendFactor >= 0.99;
        if (roughness > 0.05 && !isMoving) {
             vec4 blueNoise = getBlueNoise4(gl_FragCoord.xy);
             vec3 randomVec = vec3(blueNoise.b, blueNoise.a, blueNoise.r) * 2.0 - 1.0;

             if (dot(randomVec, randomVec) > 0.001) {
                 vec3 jittered = normalize(currRd + normalize(randomVec) * (roughness * 0.8));
                 if (dot(jittered, n) > 0.05) currRd = jittered;
             }
        }

        vec3 currentThroughput = F * uSpecular;

        if (roughness <= uReflRoughnessCutoff && dot(currentThroughput, currentThroughput) >= 0.01) {

            vec4 refHit = traceReflectionRay(currRo, currRd);

            if (refHit.x > 0.0) {
                float hitD = refHit.x;
                vec3 p_next = currRo + currRd * hitD;
                vec3 p_next_fractal = p_next + uCameraPosition + uSceneOffsetLow + uSceneOffsetHigh;

                vec3 r_albedo, r_n, r_emission;
                float r_rough;

                getSurfaceMaterial(p_next, p_next_fractal, vec4(0.0, refHit.yzw), hitD, r_albedo, r_n, r_emission, r_rough, false);

                if (dot(r_n, -currRd) < 0.0) r_n = -r_n;

                vec3 hitColor = r_emission;
                // REFL_BOUNCE_SHADOWS: compile-time control over shadow cost in reflections
                #ifdef REFL_BOUNCE_SHADOWS
                    hitColor += calculatePBRContribution(p_next, r_n, -currRd, r_albedo, r_rough, uReflection, stochasticSeed + 0.1, !isMoving);
                #else
                    hitColor += calculatePBRContribution(p_next, r_n, -currRd, r_albedo, r_rough, uReflection, stochasticSeed + 0.1, false);
                #endif

                reflectionLighting += hitColor * currentThroughput;

            } else {
                reflectionLighting += sampleLightSphereOrEnv(currRo, currRd, roughness, currentThroughput);
            }
        } else {
            reflectionLighting += applyEnvFog(GetEnvMap(currRd, roughness) * uEnvStrength) * currentThroughput;
        }

        vec3 simpleEnv = applyEnvFog(GetEnvMap(reflDir, roughness) * uEnvStrength);
        simpleEnv *= currentThroughput;

        reflectionLighting = mix(simpleEnv, reflectionLighting, uReflStrength);

    #elif defined(REFLECTIONS_SSR)
        // --- SCREEN-SPACE REFLECTIONS ---
        // TODO: Requires uProjectionMatrix, uViewMatrix, uPrevColorBuffer, uPrevDepthBuffer
        // Currently falls back to enhanced env map until pipeline plumbing is added
        {
            vec3 currentThroughput = F * uSpecular;

            // Enhanced env map: use roughness-aware sampling with Fresnel
            vec3 envColor = applyEnvFog(GetEnvMap(reflDir, roughness) * uEnvStrength);
            reflectionLighting = envColor * currentThroughput;
        }

    #elif defined(REFLECTIONS_ENV)
        // --- ENVIRONMENT MAP ONLY ---
        // Fresnel-weighted environment sampling, zero extra cost
        vec3 envColor = applyEnvFog(GetEnvMap(reflDir, roughness) * uEnvStrength);
        reflectionLighting = envColor * F * uSpecular;

    #else
        // --- REFLECTIONS OFF ---
        vec3 envColor = GetEnvMap(reflDir, roughness) * uEnvStrength;
        reflectionLighting = envColor * F * uSpecular;
    #endif

    // 6. Rim
    float fresnelTerm = pow(1.0 - NdotV, uRimExponent);
    vec3 rimColor = vec3(0.5, 0.7, 1.0) * fresnelTerm * uRim;

    // 7. Ambient IBL
    if (uEnvStrength > 0.001) {
        vec3 envIrradiance = GetEnvMap(n, 1.0);
        vec3 kD = (vec3(1.0) - F) * (1.0 - uReflection);
        ambient = kD * albedo * envIrradiance * uEnvStrength * uDiffuse;
    }

    // 8. Compose
    vec3 finalColor = directLighting + reflectionLighting + rimColor + emission + ambient;

    // AO Tint: black = classic darkening. Custom color = tinted occlusion.
    finalColor *= mix(uAOColor, vec3(1.0), ao);

    return finalColor;
}
`;
};

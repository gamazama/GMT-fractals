
export const getShadingGLSL = (isMobile: boolean) => {
    return `
// ------------------------------------------------------------------
// DIRECT LIGHTING INTEGRATOR (Multi-Bounce)
// ------------------------------------------------------------------
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
    vec3 F = F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(1.0 - NdotV, 5.0);
    
    // 5. Reflection (Single Bounce - Flattened Loop)
    vec3 reflectionLighting = vec3(0.0);
    vec3 ambient = vec3(0.0);
    
    #ifdef REFLECTIONS_ENABLED
        vec3 currRo = p_ray + n * 0.01;
        vec3 currRd = reflect(-v, n);
        
        // Jitter first bounce based on roughness
        bool isMoving = uBlendFactor >= 0.99;
        if (roughness > 0.05 && !isMoving) {
             vec3 randomVec = vec3(fract(stochasticSeed * 13.3), fract(stochasticSeed * 19.5), fract(stochasticSeed * 21.1)) * 2.0 - 1.0;
             if (dot(randomVec, randomVec) > 0.001) {
                 vec3 jittered = normalize(currRd + normalize(randomVec) * (roughness * 0.8));
                 if (dot(jittered, n) > 0.05) currRd = jittered;
             }
        }
        
        vec3 currentThroughput = F * uSpecular;
        
        if (roughness <= uReflRoughnessCutoff && dot(currentThroughput, currentThroughput) >= 0.01) {
            
            // Single Bounce Trace - No loops, just straight logic
            vec4 refHit = traceReflectionRay(currRo, currRd);
            
            if (refHit.x > 0.0) {
                // HIT
                float hitD = refHit.x;
                vec3 p_next = currRo + currRd * hitD;
                vec3 p_next_fractal = p_next + uCameraPosition + uSceneOffsetLow + uSceneOffsetHigh;
                
                vec3 r_albedo, r_n, r_emission;
                float r_rough;
                
                getSurfaceMaterial(p_next, p_next_fractal, vec4(0.0, refHit.yzw), hitD, r_albedo, r_n, r_emission, r_rough, false);
                
                vec3 hitColor = r_emission;
                hitColor += calculatePBRContribution(p_next, r_n, -currRd, r_albedo, r_rough, 0.0, stochasticSeed + 0.1, false);

                if (uFogFar < 1000.0) {
                    vec3 fogCol = InverseACESFilm(uFogColor);
                    float fogFactor = smoothstep(uFogNear, uFogFar, hitD);
                    hitColor = mix(hitColor, fogCol, fogFactor);
                }

                reflectionLighting += hitColor * currentThroughput;
                
            } else {
                // MISS -> Environment
                vec3 env = GetEnvMap(currRd, roughness) * uEnvStrength;
                
                if (uFogFar < 1000.0) {
                     vec3 fogCol = InverseACESFilm(uFogColor);
                     env = mix(env, fogCol, 0.8);
                }
                
                reflectionLighting += env * currentThroughput;
            }
        } else {
            // Roughness Fallback
            vec3 env = GetEnvMap(currRd, roughness) * uEnvStrength;
            if (uFogFar < 1000.0) env = mix(env, InverseACESFilm(uFogColor), 0.8);
            reflectionLighting += env * currentThroughput;
        }

        // Mix with Simple Env for softness
        vec3 simpleEnv = GetEnvMap(reflect(-v, n), roughness) * uEnvStrength;
        if (uFogFar < 1000.0) simpleEnv = mix(simpleEnv, InverseACESFilm(uFogColor), 0.8);
        
        reflectionLighting = mix(simpleEnv, reflectionLighting, uReflStrength);

    #else
        // Fallback: Simple Environment Map (Compilation branch optimization)
        vec3 envColor = GetEnvMap(reflect(-v, n), roughness) * uEnvStrength;
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
    
    finalColor *= ao;
    
    return finalColor;
}
`;
};

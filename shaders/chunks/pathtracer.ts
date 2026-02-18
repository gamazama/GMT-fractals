

export const getPathTracerGLSL = (isMobile: boolean) => {
    
    const loopLimit = isMobile ? '2' : 'maxBounces';
    const shadowLogic = isMobile ? `
        shadow = GetSoftShadow(shadowRo, lDir, uShadowSoftness, distToLight, blueNoise.r);
    ` : `
        if (uPTStochasticShadows > 0.5) {
            vec2 jitter = fract(sin(vec2(lightSeed + float(bounce)*7.1, lightSeed * 9.2)) * 43758.5453);
            vec3 w = lDir;
            vec3 u = normalize(cross(w, abs(w.y) > 0.9 ? vec3(1,0,0) : vec3(0,1,0)));
            vec3 v = cross(w, u);
            
            // Softness acts as spread. For Directional: Angle. For Point: Size.
            float spread = 2.0 / max(uShadowSoftness, 0.1);
            
            float r = sqrt(jitter.x) * spread;
            float theta = jitter.y * 6.283185;
            
            vec3 offsetDir = u * cos(theta) * r + v * sin(theta) * r;
            vec3 shadowDir = normalize(lDir + offsetDir);
            float shadowDist = distToLight;
            
            if (!isDirectional) {
                 // For point lights, we jitter the target position
                 // Approximate sphere radius = spread * distance
                 float radius = spread * distToLight;
                 vec3 jitterOffset = (u * cos(theta) + v * sin(theta)) * sqrt(jitter.x) * radius;
                 vec3 targetPos = uLightPos[lightIdx] + jitterOffset;
                 vec3 tVec = targetPos - p_ray;
                 shadowDist = length(tVec);
                 shadowDir = tVec / max(1.0e-5, shadowDist);
            }
            
            shadow = GetHardShadow(shadowRo, shadowDir, shadowDist);
        } else {
            shadow = GetSoftShadow(shadowRo, lDir, uShadowSoftness, distToLight, blueNoise.r);
        }
    `;

    return `
// ------------------------------------------------------------------
// MONTE CARLO PBR PATH TRACER
// ------------------------------------------------------------------

float luminance(vec3 c) {
    return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

vec3 cosineSampleHemisphere(vec3 n, vec2 seedVec) {
    float r = fract(seedVec.x * 1.61803398875); 
    float angle = seedVec.y * 6.283185; 
    vec2 p = vec2(sqrt(r) * cos(angle), sqrt(r) * sin(angle));
    vec3 u = normalize(cross(abs(n.z) < 0.999 ? vec3(0,0,1) : vec3(1,0,0), n));
    vec3 v = cross(n, u);
    float rz = sqrt(max(0.0, 1.0 - dot(p, p)));
    return normalize(u * p.x + v * p.y + n * rz);
}

vec3 importanceSampleGGX(vec3 n, float roughness, vec2 seedVec) {
    vec2 xi = vec2(
        fract(seedVec.x * 1.61803398875),
        fract(seedVec.y * 1.61803398875 + 0.5)
    );
    float a = roughness * roughness;
    float phi = 2.0 * 3.14159 * xi.x;
    float cosTheta = sqrt((1.0 - xi.y) / (1.0 + (a*a - 1.0) * xi.y));
    float sinTheta = sqrt(max(0.0, 1.0 - cosTheta*cosTheta));
    vec3 h = vec3(cos(phi) * sinTheta, sin(phi) * sinTheta, cosTheta);
    vec3 up = abs(n.z) < 0.999 ? vec3(0,0,1) : vec3(1,0,0);
    vec3 tangent = normalize(cross(up, n));
    vec3 bitangent = cross(n, tangent);
    return normalize(tangent * h.x + bitangent * h.y + n * h.z);
}

vec3 calculatePathTracedColor(vec3 ro, vec3 rd, float d_init, vec4 result_init, float seed) {
    vec3 radiance = vec3(0.0);
    vec3 throughput = vec3(1.0);
    vec3 currentRo = ro;
    vec3 currentRd = rd;
    float d = d_init;
    vec4 result = result_init;
    bool hit = true;
    int maxBounces = uPTBounces;
    float pixelSizeScale = length(uCamBasisY) / uResolution.y * 2.0 / uInternalScale;
    
    for (int bounce = 0; bounce < 8; bounce++) {
        if (bounce >= ${loopLimit}) break;
        
        vec2 bounceOffset = vec2(float(bounce) * 17.123, float(bounce) * 23.456);
        vec4 blueNoise = getBlueNoise4(gl_FragCoord.xy + bounceOffset);

        if (!hit) {
            float skyIntensity = (bounce == 0) ? uEnvBackgroundStrength : uEnvStrength;
            vec3 env = GetEnvMap(currentRd, 0.0);
            if (bounce == 0) {
                float fogFactor = smoothstep(uFogNear, uFogFar, 100.0);
                vec3 safeFog = InverseACESFilm(uFogColor);
                vec3 sky = mix(env * skyIntensity, safeFog, fogFactor * 0.5);
                radiance += sky * throughput;
            } else {
                radiance += env * skyIntensity * throughput;
            }
            break;
        }
        
        vec3 p_ray = currentRo + currentRd * d;
        vec3 p_fractal = p_ray + uCameraPosition + uSceneOffsetLow + uSceneOffsetHigh;
        vec3 albedo, n, emission;
        float roughness;
        getSurfaceMaterial(p_ray, p_fractal, result, d, albedo, n, emission, roughness, bounce == 0);
        
        float ao = 1.0;
        if (uAOIntensity > 0.01 && bounce == 0) {
            ao = GetAO(p_ray, n, seed + float(bounce) * 13.37);
        }
        
        if (uRim > 0.01) {
            float NdotV_rim = max(0.0, dot(n, -currentRd));
            float rimFactor = pow(1.0 - NdotV_rim, uRimExponent) * uRim;
            emission += vec3(0.5, 0.7, 1.0) * rimFactor; 
        }

        roughness = max(roughness, 0.04);
        float emissionMult = (bounce == 0) ? 1.0 : uPTEmissionMult;
        radiance += (emission * ao * emissionMult) * throughput;
        
        // --- NEXT EVENT ESTIMATION ---
        {
            int activeCount = 0;
            int activeIndices[3];
            if (uLightIntensity[0] > 0.01) activeIndices[activeCount++] = 0;
            if (uLightIntensity[1] > 0.01) activeIndices[activeCount++] = 1;
            if (uLightIntensity[2] > 0.01) activeIndices[activeCount++] = 2;
            
            if (activeCount > 0) {
                float lightSeed = blueNoise.r;
                int pick = clamp(int(lightSeed * float(activeCount)), 0, activeCount - 1);
                int lightIdx = activeIndices[pick];
                
                float type = uLightType[lightIdx];
                bool isDirectional = type > 0.5;

                float distFromFractalOrigin = length(p_fractal);
                float floatLimit = max(1.0e-20, distFromFractalOrigin * 5.0e-7);
                float visualLimit = pixelSizeScale * d * (1.0 / uDetail);
                float biasEps = max(floatLimit, visualLimit);
                vec3 shadowRo = p_ray + n * (biasEps * 2.0 + uShadowBias);
                
                vec3 lVec;
                float distToLight;
                if (isDirectional) {
                     lVec = -uLightDir[lightIdx];
                     distToLight = 10000.0;
                } else {
                     lVec = uLightPos[lightIdx] - p_ray;
                     distToLight = length(lVec);
                }
                
                vec3 lDir = isDirectional ? normalize(lVec) : lVec / max(1.0e-5, distToLight);
                
                float shadow = 1.0;
                if (uShadows > 0.5 && uLightShadows[lightIdx] > 0.5) {
                    ${shadowLogic}
                    shadow = mix(1.0, shadow, uShadowIntensity);
                }
                
                if (shadow > 0.01) {
                    vec3 v = -currentRd;
                    vec3 h = normalize(lDir + v);
                    float ndotl = max(0.0, dot(n, lDir));
                    float hdotv = max(0.0, dot(h, v));
                    float ndoth = max(0.0, dot(n, h));
                    
                    float att = 1.0;
                    if (!isDirectional && uLightFalloff[lightIdx] > 0.001) {
                        if (uLightFalloffType[lightIdx] < 0.5) att = 1.0 / (1.0 + uLightFalloff[lightIdx] * distToLight * distToLight);
                        else att = 1.0 / (1.0 + uLightFalloff[lightIdx] * distToLight);
                    }
                    
                    vec3 F0 = mix(vec3(0.04) * uSpecular, albedo, uReflection);
                    vec3 F = F0 + (1.0 - F0) * pow(1.0 - hdotv, 5.0);
                    float specPower = 2.0 / (roughness * roughness) - 2.0;
                    float spec = pow(ndoth, max(0.001, specPower)) * (specPower + 8.0) / (8.0 * 3.14159);
                    
                    vec3 kS = F;
                    vec3 kD = (vec3(1.0) - kS) * (1.0 - uReflection);
                    
                    float pdf = float(activeCount); 
                    vec3 lightCol = (kD * albedo * uDiffuse + kS * spec) * uLightColor[lightIdx] * uLightIntensity[lightIdx];
                    radiance += lightCol * ndotl * shadow * att * ao * pdf * throughput;
                }
            }
        } // End NEE
        
        float NdotV = max(0.0, dot(n, -currentRd));
        vec3 F0 = mix(vec3(0.04) * uSpecular, albedo, uReflection);
        vec3 F = F0 + (1.0 - F0) * pow(1.0 - NdotV, 5.0);
        vec3 kS = F;
        vec3 kD = (vec3(1.0) - kS) * (1.0 - uReflection);
        vec3 weightSpec = kS;
        vec3 weightDiff = kD * albedo * uDiffuse; 
        float lumSpec = luminance(weightSpec);
        float lumDiff = luminance(weightDiff);
        float probSpec = lumSpec / max(0.0001, lumSpec + lumDiff);
        float smoothness = 1.0 - roughness; 
        probSpec = mix(probSpec, 1.0, smoothness * 0.4);
        probSpec = clamp(probSpec, 0.05, 0.95);
        float randType = fract(blueNoise.a * 1.618);
        vec2 dirSeed = blueNoise.gb;

        if (randType < probSpec) {
            vec3 H = importanceSampleGGX(n, roughness, dirSeed);
            currentRd = reflect(currentRd, H);
            throughput *= F / probSpec;
            if (dot(currentRd, n) < 0.0) currentRd = cosineSampleHemisphere(n, dirSeed); 
        } else {
            currentRd = cosineSampleHemisphere(n, dirSeed);
            throughput *= (weightDiff * ao) / (1.0 - probSpec);
        }
        
        throughput *= uPTGIStrength;
        float floatLimit = max(1.0e-20, length(p_fractal) * 5.0e-7);
        float visualLimit = pixelSizeScale * d * (1.0 / uDetail);
        float biasEps = max(floatLimit, visualLimit);
        currentRo = p_ray + n * (biasEps * 2.0); 
        float volumetric = 0.0;
        vec3 dummyGlow = vec3(0.0);
        hit = traceScene(currentRo, currentRd, d, result, dummyGlow, seed + float(bounce), volumetric);
        
        if (uFogDensity > 0.001) {
             vec3 fogCol = InverseACESFilm(uFogColor);
             float trans = exp(-volumetric * 2.0);
             radiance += fogCol * (1.0 - trans) * throughput;
             throughput *= trans;
        }
        
        if (bounce > 2) {
            float maxThroughput = max(throughput.r, max(throughput.g, throughput.b));
            if (maxThroughput < 0.05) { 
                if (randType > maxThroughput * 10.0) break;
                throughput /= (maxThroughput * 10.0);
            }
        }
        throughput = min(throughput, vec3(4.0)); 
    }
    return radiance;
}
`;
};

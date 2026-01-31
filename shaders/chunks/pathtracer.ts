


export const getPathTracerGLSL = (isMobile: boolean) => {
    
    // Optimization: On mobile, drastically reduce bounces and shadow quality even if user forces PT mode
    const loopLimit = isMobile ? '2' : 'maxBounces';
    const shadowLogic = isMobile ? `
        // Mobile: Force simple soft shadow, no stochastic area lights
        shadow = GetSoftShadow(shadowRo, lDir, uShadowSoftness, distToLight);
    ` : `
        // Desktop: Full Stochastic Area Shadows support
        if (uPTStochasticShadows > 0.5 && lightRadius > 0.0001) {
            vec2 jitter = fract(sin(vec2(lightSeed + float(bounce)*7.1, lightSeed * 9.2)) * 43758.5453);
            vec3 w = lDir;
            vec3 u = normalize(cross(w, abs(w.y) > 0.9 ? vec3(1,0,0) : vec3(0,1,0)));
            vec3 v = cross(w, u);
            float r = sqrt(jitter.x) * lightRadius;
            float theta = jitter.y * 6.283185;
            vec3 offset = u * cos(theta) * r + v * sin(theta) * r;
            vec3 targetPos = uLightPos[lightIdx] + offset;
            vec3 targetVec = targetPos - p_ray;
            
            // Optimization: Reuse length for normalization
            float shadowDist = length(targetVec);
            vec3 shadowDir = targetVec / max(1.0e-5, shadowDist);
            
            shadow = GetHardShadow(shadowRo, shadowDir, shadowDist);
        } else {
            shadow = GetSoftShadow(shadowRo, lDir, uShadowSoftness, distToLight);
        }
    `;

    return `
// ------------------------------------------------------------------
// MONTE CARLO PBR PATH TRACER
// ------------------------------------------------------------------

float luminance(vec3 c) {
    return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

// --- GOLDEN RATIO SAMPLING (Vogel Method) ---
// Converges significantly faster than random white noise
vec3 cosineSampleHemisphere(vec3 n, float seed) {
    // 1. Generate Uniform points on disk
    float r = fract(seed * 1.61803398875); // Golden Ratio
    float angle = seed * 6.283185 * 1.61803398875; // Golden Angle
    
    vec2 p = vec2(sqrt(r) * cos(angle), sqrt(r) * sin(angle));
    
    // 2. Project to Hemisphere (Cosine Weighted)
    vec3 u = normalize(cross(abs(n.z) < 0.999 ? vec3(0,0,1) : vec3(1,0,0), n));
    vec3 v = cross(n, u);
    
    // 3. Construct Vector
    float rz = sqrt(max(0.0, 1.0 - dot(p, p)));
    return normalize(u * p.x + v * p.y + n * rz);
}

// GGX/Trowbridge-Reitz Importance Sampling
vec3 importanceSampleGGX(vec3 n, float roughness, float seed) {
    vec2 xi = vec2(
        fract(seed * 1.61803398875),
        fract(seed * 1.61803398875 + 0.5)
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
    
    // Primary Hit Info
    float d = d_init;
    vec4 result = result_init;
    bool hit = true;
    
    // COMPILER OPTIMIZATION: Prevent unrolling of bounce loop
    int maxBounces = uPTBounces;
    
    // --- ADAPTIVE BIAS ---
    float pixelSizeScale = length(uCamBasisY) / uResolution.y * 2.0;
    
    for (int bounce = 0; bounce < 8; bounce++) {
        if (bounce >= ${loopLimit}) break;

        // --- MISS: Sample Environment ---
        if (!hit) {
            // Environment Map lookup (IBL)
            vec3 env = GetEnvMap(currentRd, 0.0) * uEnvBackgroundStrength; 
            
            float fogFactor = smoothstep(uFogNear, uFogFar, 100.0);
            vec3 safeFog = InverseACESFilm(uFogColor);
            vec3 sky = mix(env, safeFog, fogFactor * 0.5);
            
            radiance += sky * throughput;
            break;
        }
        
        vec3 p_ray = currentRo + currentRd * d;
        vec3 p_fractal = p_ray + uCameraPosition + uSceneOffsetLow + uSceneOffsetHigh;
        
        vec3 albedo, n, emission;
        float roughness;
        
        // Material Evaluation (Only high quality normals on first bounce)
        getSurfaceMaterial(p_ray, p_fractal, result, d, albedo, n, emission, roughness, bounce == 0);
        
        // --- AO ---
        float ao = 1.0;
        if (uAOIntensity > 0.01) {
            ao = GetAO(p_ray, n, seed + float(bounce) * 13.37);
        }
        
        // --- RIM ---
        if (uRim > 0.01) {
            float NdotV_rim = max(0.0, dot(n, -currentRd));
            float rimFactor = pow(1.0 - NdotV_rim, uRimExponent) * uRim;
            emission += vec3(0.5, 0.7, 1.0) * rimFactor; 
        }

        roughness = max(roughness, 0.04);
        
        // Apply Emission
        float giMultiplier = (bounce == 0) ? 1.0 : uPTEmissionMult;
        radiance += (emission * ao * giMultiplier) * throughput;
        
        // --- NEXT EVENT ESTIMATION (Direct Light Sampling) ---
        {
            // 1. Identify Active Lights
            int activeCount = 0;
            int activeIndices[3];
            if (uLightIntensity[0] > 0.01) activeIndices[activeCount++] = 0;
            if (uLightIntensity[1] > 0.01) activeIndices[activeCount++] = 1;
            if (uLightIntensity[2] > 0.01) activeIndices[activeCount++] = 2;
            
            if (activeCount > 0) {
                float lightSeed = hash21(gl_FragCoord.xy + vec2(uExtraSeed * 1.5, float(bounce) * 3.3));
                int pick = clamp(int(lightSeed * float(activeCount)), 0, activeCount - 1);
                int lightIdx = activeIndices[pick];
                
                float distFromFractalOrigin = length(p_fractal);
                float floatLimit = max(1.0e-20, distFromFractalOrigin * 5.0e-7);
                float visualLimit = pixelSizeScale * d * (1.0 / uDetail);
                float biasEps = max(floatLimit, visualLimit);
                vec3 shadowRo = p_ray + n * (biasEps * 2.0 + uShadowBias);
                
                vec3 lVec = uLightPos[lightIdx] - p_ray;
                float distToLight = length(lVec);
                
                // Optimization: Reuse length for normalization
                vec3 lDir = lVec / max(1.0e-5, distToLight);
                
                float shadow = 1.0;
                
                if (uShadows > 0.5 && uLightShadows[lightIdx] > 0.5) {
                    float lightRadius = 2.0 / max(uShadowSoftness, 0.1); 
                    
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
                    if (uLightFalloff[lightIdx] > 0.001) {
                        if (uLightFalloffType[lightIdx] < 0.5) att = 1.0 / (1.0 + uLightFalloff[lightIdx] * distToLight * distToLight);
                        else att = 1.0 / (1.0 + uLightFalloff[lightIdx] * distToLight);
                    }
                    
                    // --- PHYSICAL FRESNEL ---
                    // uReflection is the Metallic parameter.
                    // Dielectric F0 = 0.04 (Plastic/Water). Metal F0 = Albedo.
                    // We apply uSpecular only to the Dielectric component for artistic control.
                    vec3 F0 = mix(vec3(0.04) * uSpecular, albedo, uReflection);
                    vec3 F = F0 + (1.0 - F0) * pow(1.0 - hdotv, 5.0);
                    
                    float specPower = 2.0 / (roughness * roughness) - 2.0;
                    float spec = pow(ndoth, max(0.001, specPower)) * (specPower + 8.0) / (8.0 * 3.14159);
                    
                    // Conservation: Diffuse is only valid for Dielectrics
                    vec3 kS = F;
                    vec3 kD = (vec3(1.0) - kS) * (1.0 - uReflection);
                    
                    float pdf = float(activeCount); 
                    
                    vec3 lightCol = (kD * albedo * uDiffuse + kS * spec) * uLightColor[lightIdx] * uLightIntensity[lightIdx];
                    radiance += lightCol * ndotl * shadow * att * ao * pdf * throughput;
                }
            }
        } // End NEE
        
        // --- INDIRECT BOUNCE (Russian Roulette with Lobe Weights) ---
        float NdotV = max(0.0, dot(n, -currentRd));
        
        // 1. Calculate Specular (F) and Diffuse Weights
        vec3 F0 = mix(vec3(0.04) * uSpecular, albedo, uReflection);
        vec3 F = F0 + (1.0 - F0) * pow(1.0 - NdotV, 5.0);
        
        // Energy conservation: Metals have 0 diffuse.
        vec3 kS = F;
        vec3 kD = (vec3(1.0) - kS) * (1.0 - uReflection);
        
        vec3 weightSpec = kS;
        vec3 weightDiff = kD * albedo * uDiffuse; // Diffuse albedo already applied in kD derivation usually, but here separated
        
        // 2. Determine Lobe Probability
        float lumSpec = luminance(weightSpec);
        float lumDiff = luminance(weightDiff);
        
        // Prob to select Specular path based on energy
        float probSpec = lumSpec / max(0.0001, lumSpec + lumDiff);
        
        // OPTIMIZATION: Bias towards specular samples for low roughness surfaces
        // Smooth surfaces show noise more clearly, so we spend more rays there.
        // We gently boost the specular probability when roughness is low.
        float smoothness = 1.0 - roughness; 
        // Bias factor: up to +0.4 for perfectly smooth surfaces
        probSpec = mix(probSpec, 1.0, smoothness * 0.4);
        
        // Clamp to avoid 0/0 or extreme variance (Allow closer to 1.0 for mirrors)
        probSpec = clamp(probSpec, 0.05, 0.95);

        float randType = fract((seed + float(bounce)) * 1.618);
        float nextSeed = seed + float(bounce) * 1.618;

        if (randType < probSpec) {
            // --- SPECULAR PATH ---
            vec3 H = importanceSampleGGX(n, roughness, nextSeed);
            currentRd = reflect(currentRd, H);
            
            // Throughput update: Weight / Probability
            // Weight = F. Probability = probSpec.
            throughput *= F / probSpec;
            
            // Check below horizon
            if (dot(currentRd, n) < 0.0) currentRd = cosineSampleHemisphere(n, nextSeed); 
        } else {
            // --- DIFFUSE PATH ---
            currentRd = cosineSampleHemisphere(n, nextSeed);
            
            // Throughput update: Weight / Probability
            // Weight = kD * Albedo. Probability = (1 - probSpec).
            // Note: cosineSampleHemisphere inherently accounts for NdotL (Lambert), so we don't multiply by NdotL here again.
            throughput *= (weightDiff * ao) / (1.0 - probSpec);
        }
        
        // Apply Global Illumination Decay
        throughput *= uPTGIStrength;
        
        // Setup next ray
        float distFromFractalOrigin = length(p_fractal);
        float floatLimit = max(1.0e-20, distFromFractalOrigin * 5.0e-7);
        float visualLimit = pixelSizeScale * d * (1.0 / uDetail);
        float biasEps = max(floatLimit, visualLimit);
        
        currentRo = p_ray + n * (biasEps * 2.0); 
        
        float volumetric = 0.0;
        vec3 dummyGlow = vec3(0.0);
        hit = traceScene(currentRo, currentRd, d, result, dummyGlow, nextSeed, volumetric);
        
        if (uFogDensity > 0.001) {
             vec3 fogCol = InverseACESFilm(uFogColor);
             float trans = exp(-volumetric * 2.0);
             radiance += fogCol * (1.0 - trans) * throughput;
             throughput *= trans;
        }
        
        // Prune weak rays
        if (bounce > 2) {
            float maxThroughput = max(throughput.r, max(throughput.g, throughput.b));
            if (maxThroughput < 0.05) { 
                if (randType > maxThroughput * 10.0) break;
                throughput /= (maxThroughput * 10.0);
            }
        }
        
        throughput = min(throughput, vec3(4.0)); // Firefly clamping
    }
    
    return radiance;
}
`;
};

export const PATHTRACER = getPathTracerGLSL(false);

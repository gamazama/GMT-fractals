
export const LIGHTING_PBR = `
// ------------------------------------------------------------------
// PBR HELPERS
// ------------------------------------------------------------------

// Simplified PBR Integration (Cook-Torrance / Blinn-Phong Hybrid)
// Returns the accumulated radiance from all direct lights.
vec3 calculatePBRContribution(vec3 p, vec3 n, vec3 v, vec3 albedo, float roughness, float metallic, float stochasticSeed, bool calcShadows) {
    vec3 F0 = mix(vec3(0.04), albedo, metallic);
    vec3 Lo = vec3(0.0);
    
    // Pixel size estimate for shadow bias
    float pixelSizeScale = length(uCamBasisY) / uResolution.y * 2.0;
    
    // Bias: Push start point away from surface
    float biasAmount = uShadowBias + pixelSizeScale * 2.0;
    vec3 shadowRo = p + n * biasAmount;

    // Stochastic Shadows: Allow them even when moving
    bool useStochasticShadows = (uPTStochasticShadows > 0.5);
    
    // COMPILER OPTIMIZATION: Prevent unrolling of light loop
    int lightCount = uLightCount;
    
    #ifndef MAX_LIGHTS
    #define MAX_LIGHTS 8
    #endif

    for (int i = 0; i < MAX_LIGHTS; i++) {
        if (i >= lightCount) break;
        
        float intensity = uLightIntensity[i];
        if (intensity < 0.01) continue;
        
        vec3 lVec = uLightPos[i] - p;
        float distToLight = length(lVec);
        
        // --- OPTIMIZATION: SINGULARITY CHECK ---
        if (distToLight < 0.0001) continue;

        // Optimization: Reuse distance for normalization
        // Avoids redundant dot() and inversesqrt()
        vec3 l = lVec / distToLight;
        
        vec3 h = normalize(l + v);
        
        float NdotL = max(0.0, dot(n, l));
        
        // BACKFACE CULLING
        if (NdotL <= 0.0) continue; 

        float HdotV = max(0.0, dot(h, v));
        float NdotH = max(0.0, dot(n, h));
        
        float shadow = 1.0;
        if (calcShadows && uShadows > 0.5 && uLightShadows[i] > 0.5) {
            float s = 1.0;
            float lightRadius = 2.0 / max(uShadowSoftness, 0.1);
            
            if (useStochasticShadows && lightRadius > 0.0001) {
                 // --- VOGEL DISK SAMPLING (GOLDEN RATIO) ---
                 // Creates a uniform distribution without clumping, converging faster.
                 
                 // Generate unique seed for this pixel+light+frame combination
                 float samplingSeed = fract(stochasticSeed + float(i) * 1.618);
                 
                 // Create Basis
                 vec3 w = l;
                 vec3 helperUp = abs(w.y) > 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
                 vec3 u = normalize(cross(w, helperUp));
                 vec3 v = cross(w, u);
                 
                 // Vogel Disk Math
                 // r = sqrt(random)
                 // theta = random * GoldenAngle
                 float r = sqrt(samplingSeed) * lightRadius;
                 float theta = samplingSeed * 6.283185 * 1.618033; // Golden angle rotation
                 
                 vec3 offset = (u * cos(theta) * r) + (v * sin(theta) * r);
                 
                 vec3 jitteredTarget = uLightPos[i] + offset;
                 vec3 jitteredLVec = jitteredTarget - p;
                 
                 // Optimization: Reuse length for normalization
                 float jitteredDist = length(jitteredLVec);
                 vec3 jitteredLDir = jitteredLVec / max(1.0e-5, jitteredDist);
                 
                 s = GetHardShadow(shadowRo, jitteredLDir, jitteredDist);
            } else {
                 // Standard SDF Soft Shadows (Uses Soft Trace)
                 // Use simple seed for jitter
                 s = GetSoftShadow(shadowRo, l, uShadowSoftness, distToLight);
            }
            shadow = mix(1.0, s, uShadowIntensity);
        }
        
        // Attenuation
        float att = 1.0;
        if (uLightFalloff[i] > 0.001) {
            float k = uLightFalloff[i];
            if (uLightFalloffType[i] < 0.5) att = 1.0 / (1.0 + k * distToLight * distToLight);
            else att = 1.0 / (1.0 + k * distToLight);
        }
        
        // Specular (Blinn-Phong adapted for PBR look)
        vec3 F = F0 + (1.0 - F0) * pow(1.0 - HdotV, 5.0);
        float specPower = 2.0 / (max(roughness * roughness, 0.0001)) - 2.0;
        float spec = pow(NdotH, max(0.001, specPower)) * (specPower + 8.0) / (8.0 * 3.14159);
        
        // Energy Conservation
        vec3 kS = F;
        vec3 kD = vec3(1.0) - kS;
        kD *= (1.0 - metallic);
        
        vec3 radiance = uLightColor[i] * intensity * att * shadow;
        
        // Combine Diffuse + Specular
        Lo += (kD * albedo * uDiffuse / 3.14159 + kS * spec * uSpecular) * radiance * NdotL;
    }
    
    return Lo;
}
`;

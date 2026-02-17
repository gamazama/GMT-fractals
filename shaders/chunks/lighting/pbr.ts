
export const LIGHTING_PBR = `
// ------------------------------------------------------------------
// PBR HELPERS
// ------------------------------------------------------------------

// Simplified PBR Integration (Cook-Torrance / Blinn-Phong Hybrid)
// Returns the accumulated radiance from all direct lights.
vec3 calculatePBRContribution(vec3 p, vec3 n, vec3 v, vec3 albedo, float roughness, float metallic, float stochasticSeed, bool calcShadows) {
    // F0: Surface reflection at 0 degrees.
    // Dielectric: 0.04 (Linear). Metal: Albedo.
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
        
        float type = uLightType[i]; // 0=Point, 1=Directional
        bool isDirectional = type > 0.5;
        
        vec3 lVec;
        float distToLight;
        
        if (isDirectional) {
             lVec = -uLightDir[i]; // Light comes from source
             distToLight = 10000.0; // Infinite
        } else {
             lVec = uLightPos[i] - p;
             distToLight = length(lVec);
             if (distToLight < 0.0001) continue; // Singularity check
        }

        // Optimization: Reuse distance for normalization if point light
        vec3 l = isDirectional ? normalize(lVec) : lVec / distToLight;
        
        vec3 h = normalize(l + v);
        
        float NdotL = max(0.0, dot(n, l));
        
        // BACKFACE CULLING
        if (NdotL <= 0.0) continue; 

        float HdotV = max(0.0, dot(h, v));
        float NdotH = max(0.0, dot(n, h));
        
        float shadow = 1.0;
        if (calcShadows && uShadows > 0.5 && uLightShadows[i] > 0.5) {
            float s = 1.0;
            
            if (useStochasticShadows) {
                 // --- VOGEL DISK SAMPLING (GOLDEN RATIO) ---
                 float samplingSeed = fract(stochasticSeed + float(i) * 1.618);
                 
                 vec3 w = l;
                 vec3 helperUp = abs(w.y) > 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
                 vec3 u = normalize(cross(w, helperUp));
                 vec3 v = cross(w, u);
                 
                 float r_jitter = sqrt(samplingSeed);
                 float theta = samplingSeed * 6.283185 * 1.618033;
                 
                 // Radius scaling
                 float spread = 2.0 / max(uShadowSoftness, 0.1); 
                 
                 vec3 offset = (u * cos(theta) + v * sin(theta)) * r_jitter * spread;
                 
                 // Apply jitter to direction
                 vec3 jitteredLDir = normalize(l + offset);
                 float jitteredDist = distToLight;
                 
                 // For Point lights, offset affects origin, not just angle
                 if (!isDirectional) {
                      vec3 jitteredTarget = uLightPos[i] + offset * distToLight; // Approximate sphere
                      vec3 jVec = jitteredTarget - p;
                      jitteredDist = length(jVec);
                      jitteredLDir = jVec / jitteredDist;
                 }
                 
                 s = GetHardShadow(shadowRo, jitteredLDir, jitteredDist);
            } else {
                 // Standard SDF Soft Shadows
                 s = GetSoftShadow(shadowRo, l, uShadowSoftness, distToLight, stochasticSeed);
            }
            shadow = mix(1.0, s, uShadowIntensity);
        }
        
        // Attenuation
        float att = 1.0;
        if (!isDirectional && uLightFalloff[i] > 0.001) {
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
        
        // CORRECTION: Enforce physical metallic properties
        // Metals absorb refracted light (no diffuse).
        kD *= (1.0 - metallic);
        
        vec3 radiance = uLightColor[i] * intensity * att * shadow;
        
        // Combine Diffuse + Specular
        Lo += (kD * albedo * uDiffuse / 3.14159 + kS * spec * uSpecular) * radiance * NdotL;
    }
    
    return Lo;
}
`;

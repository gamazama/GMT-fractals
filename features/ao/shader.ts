

export const getAOGLSL = (aoEnabled: boolean, enableStochastic: boolean, maxSamples: number = 32) => {
    // If feature is hard-disabled in Engine, return dummy function
    if (!aoEnabled) {
        return `
        float GetAO(vec3 p, vec3 n, float seed) { return 1.0; }
        `;
    }

    let helperFunctions = '';
    
    if (enableStochastic) {
        helperFunctions = `
        vec3 getCosHemisphereDir(vec3 n, float seed) {
            vec2 r = fract(sin(vec2(seed, seed + 1.0)) * vec2(43758.5453, 22578.1459));
            float sign = n.z >= 0.0 ? 1.0 : -1.0;
            float a = -1.0 / (sign + n.z);
            float b = n.x * n.y * a;
            vec3 tangent = vec3(1.0 + sign * n.x * n.x * a, sign * b, -sign * n.x);
            vec3 bitangent = vec3(b, sign + n.y * n.y * a, -n.y);
            float ra = sqrt(r.y);
            float rx = ra * cos(6.2831 * r.x);
            float ry = ra * sin(6.2831 * r.x);
            float rz = sqrt(1.0 - r.y);
            return normalize(rx * tangent + ry * bitangent + rz * n);
        }`;
    }

    return `
// ------------------------------------------------------------------
// AMBIENT OCCLUSION (Modular Feature)
// ------------------------------------------------------------------

${helperFunctions}

float GetAO(vec3 p_ray, vec3 n, float seed) {
    if (uAOIntensity < 0.001) return 1.0;

    float occ = 0.0;
    float weight = 1.0;
    float spread = max(uAOSpread, 0.001);
    
    bool isMoving = uBlendFactor >= 0.99;
    bool isStochastic = uAOMode > 0.5;
    
    float jitter = 0.5;
    
    #if defined(RENDER_MODE_PATHTRACING)
        jitter = fract(seed * 13.5);
    #else
        if (!isMoving) jitter = fract(seed * 13.5);
    #endif

    vec3 dir = n;
    bool useRandomDir = isStochastic;
    
    #if !defined(RENDER_MODE_PATHTRACING)
        if (isMoving) useRandomDir = false;
    #endif

    #if ${enableStochastic ? 1 : 0}
        if (useRandomDir) {
            dir = getCosHemisphereDir(n, seed);
        } else if (isStochastic) {
            dir = normalize(mix(n, getCosHemisphereDir(n, 0.123), 0.5));
        }
    #endif
    
    vec3 p_bias = p_ray;
    float totalWeight = 0.0;
    int limit = uAOSamples;

    // Use dynamic limit injected from DDFS
    for(int i = 0; i < ${maxSamples}; i++) {
        if (i >= limit) break;

        float h = (0.1 + 0.5 * float(i) / 4.0) * spread;
        h += (jitter * 0.1) * spread; 
        
        vec3 aopos = p_bias + dir * h;
        
        // OPTIMIZATION: Use DE_Dist for geometry-only check
        float d = DE_Dist(aopos);
        
        if (d < h) {
            float diff = h - d;
            occ += diff * weight;
        }
        
        totalWeight += h * weight;
        weight *= 0.8; 
    }
    
    occ /= (totalWeight + 0.0001);
    
    return clamp(1.0 - (occ * uAOIntensity * 2.5), 0.0, 1.0);
}
`;
};

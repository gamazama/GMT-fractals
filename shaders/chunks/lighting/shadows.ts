
export const getShadowsGLSL = (enabled: boolean, qualityLevel: number) => {
    
    // ZERO-COST ABSTRACTION:
    // If disabled, replace the entire complex function with a constant return.
    if (!enabled) {
        return `
        float GetSoftShadow(vec3 ro, vec3 rd, float k, float lightDist) { return 1.0; }
        float GetHardShadow(vec3 ro, vec3 rd, float lightDist) { return 1.0; }
        `;
    }

    // qualityLevel: 1=Lite, 2=High
    const MAX_SHADOW_STEPS = 256; 

    const settings = qualityLevel < 1.5 ? `
        float t = 0.05;       
        float fudge = 1.0;
    ` : `
        float t = 0.0;
        float fudge = uFudgeFactor; 
    `;

    const softLoopBody = qualityLevel < 1.5 ? `
            if(h < 0.005) return 0.0;
            res = min(res, k * h / t);
            t += max(h, 0.05); 
    ` : `
            float thresh = max(1.0e-6, t * 0.0005); 
            if(h < thresh) return 0.0; 
            res = min(res, k * h / max(t, 1.0e-5));
            t += h * fudge;
    `;

    return `
// ------------------------------------------------------------------
// SHADOWS
// ------------------------------------------------------------------

// Classic Robust Soft Shadows
float GetSoftShadow(vec3 ro, vec3 rd, float k, float lightDist) {
    if (uShadowIntensity < 0.001) return 1.0;

    float res = 1.0;
    
    // Blue Noise Jitter for Soft Shadow Penumbra
    // We use the Red channel of the blue noise texture via helper
    float jitter = getBlueNoise(gl_FragCoord.xy);
    
    ${settings}
    
    // Jitter starting position to break banding
    t += jitter * 0.01;
    
    int limit = uShadowSteps;

    // Compiler Safety: Use constant max, break on dynamic uniform
    for(int i = 0; i < ${MAX_SHADOW_STEPS}; i++) {
        if (i >= limit) break;

        // OPTIMIZATION: Use DE_Dist for geometry-only check
        float h = DE_Dist(ro + rd * t);
        ${softLoopBody}
        if(t > lightDist) break;
    }
    return clamp(res, 0.0, 1.0); 
}

// Physically Accurate Hard Shadows (Used for Stochastic Area Lights)
float GetHardShadow(vec3 ro, vec3 rd, float lightDist) {
    #if defined(DISABLE_SHADOWS) && DISABLE_SHADOWS == 1
        return 1.0;
    #endif

    float t = 0.0; 
    float fudge = uFudgeFactor;
    int limit = uShadowSteps;
    
    for(int i = 0; i < ${MAX_SHADOW_STEPS}; i++) {
        if (i >= limit) break;

        // OPTIMIZATION: Use DE_Dist for geometry-only check
        float h = DE_Dist(ro + rd * t);
        
        // Adaptive Epsilon:
        float thresh = max(1.0e-6, t * 0.0002);
        
        if(h < thresh) return 0.0; 
        
        t += h * fudge;
        
        if(t > lightDist) return 1.0;
    }
    
    return 1.0;
}
`;
};

export const LIGHTING_SHADOWS = getShadowsGLSL(true, 2);

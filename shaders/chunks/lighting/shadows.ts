

// qualityLevel: 1=Lite Soft, 2=Robust Soft, 3=Hard Only
export const getShadowsGLSL = (enabled: boolean, qualityLevel: number) => {

    // ZERO-COST ABSTRACTION:
    // If disabled, replace the entire complex function with a constant return.
    if (!enabled) {
        return `
        float GetSoftShadow(vec3 ro, vec3 rd, float k, float lightDist, float noise) { return 1.0; }
        float GetHardShadow(vec3 ro, vec3 rd, float lightDist) { return 1.0; }
        `;
    }

    // Hard Only mode: compile only the hard shadow function, stub the soft one
    // This minimizes DE call sites — one loop instead of two
    if (qualityLevel === 3) {
        const MAX_HARD_STEPS = 128;
        return `
// ------------------------------------------------------------------
// SHADOWS (Hard Only — Fastest)
// ------------------------------------------------------------------
float GetHardShadow(vec3 ro, vec3 rd, float lightDist) {
    if (uShadowIntensity < 0.001) return 1.0;

    float t = 0.01;
    int limit = min(uShadowSteps, ${MAX_HARD_STEPS});

    for(int i = 0; i < ${MAX_HARD_STEPS}; i++) {
        if (i >= limit) break;

        float h = DE_Dist(ro + rd * t);
        if(h < max(1.0e-5, t * 0.0005)) return 0.0;  // Distance-adaptive hit threshold (0.05% of ray distance)
        t += h;
        if(t > lightDist) return 1.0;
    }
    return 1.0;
}

float GetSoftShadow(vec3 ro, vec3 rd, float k, float lightDist, float noise) {
    return GetHardShadow(ro, rd, lightDist);
}
`;
    }

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
            float thresh = max(1.0e-6, t * 0.0001);
            if(h < thresh) return 0.0;
            res = min(res, k * h / max(t, 1.0e-5));
            t += h * fudge;
    `;

    return `
// ------------------------------------------------------------------
// SHADOWS (${qualityLevel < 1.5 ? 'Lite Soft' : 'Robust Soft'})
// ------------------------------------------------------------------

float GetSoftShadow(vec3 ro, vec3 rd, float k, float lightDist, float noise) {
    if (uShadowIntensity < 0.001) return 1.0;

    float res = 1.0;

    ${settings}

    // Jitter starting position to break banding
    t += noise * 0.01;

    int limit = uShadowSteps;

    for(int i = 0; i < ${MAX_SHADOW_STEPS}; i++) {
        if (i >= limit) break;

        float h = DE_Dist(ro + rd * t);
        ${softLoopBody}
        if(t > lightDist) break;
    }
    return clamp(res, 0.0, 1.0);
}

float GetHardShadow(vec3 ro, vec3 rd, float lightDist) {
    #if defined(DISABLE_SHADOWS) && DISABLE_SHADOWS == 1
        return 1.0;
    #endif

    float t = 0.0;
    float fudge = uFudgeFactor;
    int limit = uShadowSteps;

    for(int i = 0; i < ${MAX_SHADOW_STEPS}; i++) {
        if (i >= limit) break;

        float h = DE_Dist(ro + rd * t);

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

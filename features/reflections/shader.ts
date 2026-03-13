

export const getReflectionsGLSL = () => {
    // Dynamic loop cap handled by uniform uReflSteps
    const MAX_REFL_STEPS = 256; 

    return `
// ------------------------------------------------------------------
// REFLECTIONS (Forge Kernel)
// ------------------------------------------------------------------

#define REFL_HIT_THRESHOLD 0.002

// Lightweight Raymarcher for Reflection Bounce
vec4 traceReflectionRay(vec3 ro, vec3 rd) {
    float t = 0.01; // Start offset

    // Dynamic loop
    int limit = uReflSteps;

    for(int i=0; i<${MAX_REFL_STEPS}; i++) {
        if (i >= limit) break;

        // OPTIMIZATION: Use Geometry-only estimator for marching
        // This skips Orbit Traps, Decomposition, and Color Smoothing logic
        float d = DE_Dist(ro + rd * t);

        if(d < REFL_HIT_THRESHOLD * t) {
            // HIT: Retreat by half the last step to refine surface position.
            // Reduces orbit-trap noise at glancing angles where the hit threshold is loose.
            float refinedT = t - d * 0.5;
            vec4 fullRes = DE(ro + rd * refinedT);
            return vec4(refinedT, fullRes.yzw);
        }
        t += d;
        if(t > MAX_DIST) break;
    }
    return vec4(-1.0); // MISS
}
    `;
};



export const getReflectionsGLSL = () => {
    // Dynamic loop cap handled by uniform uReflSteps
    const MAX_REFL_STEPS = 256; 

    return `
// ------------------------------------------------------------------
// REFLECTIONS (Forge Kernel)
// ------------------------------------------------------------------

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
        
        if(d < 0.002 * t) {
            // HIT
            // Now we calculate the heavy Orbit Traps ONCE at the impact point
            vec4 fullRes = DE(ro + rd * t);
            return vec4(t, fullRes.yzw);
        }
        t += d;
        if(t > MAX_DIST) break;
    }
    return vec4(-1.0); // MISS
}
    `;
};

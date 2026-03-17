
export const getPostGLSL = (injectedCode: string = '') => `
// ------------------------------------------------------------------
// POST PROCESSING (LINEAR ONLY)
// All fog, glow, and scatter code is feature-injected via addPostProcessLogic().
// Atmosphere feature: fog (distance + volumetric density) + glow
// Volumetric feature: scatter (god rays)
// ------------------------------------------------------------------
vec3 applyPostProcessing(vec3 col, float d, vec3 glow, float volumetric, vec3 fogScatter) {

    // --- FEATURE INJECTION: POST-PROCESSING ---
    // Variables in scope: col (modifiable), d, glow, volumetric, fogScatter.
    // Uniforms available: uFogNear, uFogFar, uFogIntensity, uFogDensity,
    //   uFogColorLinear, uGlowIntensity, uEnvBackgroundStrength, MISS_DIST.
    ${injectedCode}

    // Tone Mapping is handled in the Display Shader
    return col;
}
`;

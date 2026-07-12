
export const getPostGLSL = (injectedCode: string = '') => `
// ------------------------------------------------------------------
// POST PROCESSING (LINEAR ONLY)
// All fog, glow, and scatter code is feature-injected via addPostProcessLogic().
// Atmosphere feature: fog (distance + volumetric density) + glow
// Volumetric feature: scatter (god rays)
// ------------------------------------------------------------------
vec3 applyPostProcessing(vec3 col, float d, vec3 rd, vec3 glow, float volumetric, vec3 fogScatter) {

    // --- FEATURE INJECTION: POST-PROCESSING ---
    // Variables in scope: col (modifiable), d, rd (primary ray direction — for
    //   per-direction fog in-scatter), glow, volumetric, fogScatter.
    // Uniforms available: uFogNear, uFogFar, uFogIntensity, uFogDensity,
    //   uFogColorLinear, uGlowIntensity, uEnvBackgroundStrength, MISS_DIST.
    // Functions available: fogRadiance(dir) — per-direction fog colour (env.ts, ADR-0097).
    ${injectedCode}

    // Tone Mapping is handled in the Display Shader
    return col;
}
`;

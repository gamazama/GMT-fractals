
export const POST = `
// ------------------------------------------------------------------
// POST PROCESSING (LINEAR ONLY)
// ------------------------------------------------------------------
vec3 applyPostProcessing(vec3 col, float d, vec3 glow, float volumetric) {
    float d_norm = d;
    // Scale smoothstep by intensity slider
    float fogFactor = smoothstep(uFogNear, uFogFar, d_norm) * uFogIntensity;
    
    // Inverse ACES on Fog Color to match UI selection after Tone Mapping
    vec3 fogColor = InverseACESFilm(uFogColor);
    
    // Volumetric Fog
    // 'volumetric' is the accumulated optical density along the ray
    if (uFogDensity > 0.0001) {
        // Clamp density for safety, though accumulated values can exceed 1
        // Multiply by uFogIntensity to allow fading out volume with the main slider
        float volAlpha = clamp(volumetric * uFogIntensity, 0.0, 1.0);
        col = mix(col, fogColor, volAlpha);
    }
    
    // Distance Fog (Mix)
    if (uEnvBackgroundStrength > 0.001) {
        // If "Background Visibility" is ON:
        // Only apply fog to GEOMETRY (d < MAX_DIST).
        // Leave the background (infinity) untouched so the EnvMap shows through.
        if (d < 990.0) {
            col = mix(col, fogColor, fogFactor);
        }
        // If d > 990.0 (Miss), we skip the mix, preserving the EnvMap in 'col'.
    } else {
        // Standard Mode: Everything fades to Fog Color
        col = mix(col, fogColor, fogFactor);
    }
    
    // Glow (Additive Bloom)
    if (uGlowIntensity > 0.0001) {
        col += glow * uGlowIntensity;
    }
    
    // Tone Mapping is handled in the Display Shader (MandelbulbScene.tsx)
    
    return col;
}
`;

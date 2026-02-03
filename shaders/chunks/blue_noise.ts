
// Returns 4 components of blue noise.
// Allows us to use different channels for different effects to avoid correlation artifacts.
// e.g. .r for Shadows, .g for AO, .b for Reflections, .a for DOF.

export const BLUE_NOISE = `
vec4 getBlueNoise4(vec2 screenCoord) {
    vec2 texSize = vec2(128.0); 
    vec2 uv = screenCoord / texSize;
    
    // Golden Ratio offset for temporal dithering
    // (phi, phi*phi) approx
    // This shifts the texture lookup over time to ensure convergence
    vec2 offset = vec2(0.61803398875, 0.754877666) * float(uFrameCount);
    
    return texture(uBlueNoiseTexture, uv + offset);
}

float getBlueNoise(vec2 screenCoord) {
    return getBlueNoise4(screenCoord).r;
}
`;

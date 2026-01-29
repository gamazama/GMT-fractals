

export const COLORING = `
// ------------------------------------------------------------------
// COLORING & PATTERN GENERATION
// ------------------------------------------------------------------

// Forward Declaration for Linkage
vec3 getGlowColor(vec3 p_fractal, vec4 result);
float getMappingValue(float mode, vec3 p, vec4 result, vec3 n, float repeatScale);

// The 'getMappingValue' function is now injected dynamically by ColoringFeature.
// See features/coloring/MappingModes.ts for logic.

vec3 blendColors(vec3 c1, vec3 c2, float opacity, float mode) {
    vec3 col = c1;
    
    if (mode < 0.5) {
        col = mix(c1, c2, opacity); // Mix
    } else if (mode < 1.5) {
        col = c1 + c2 * opacity; // Add
    } else if (mode < 2.5) {
        col = c1 * mix(vec3(1.0), c2, opacity); // Multiply
    } else if (mode < 3.5) { 
        vec3 check = step(0.5, c1);
        vec3 res = mix(2.0 * c1 * c2, 1.0 - 2.0 * (1.0 - c1) * (1.0 - c2), check);
        col = mix(c1, res, opacity);
    } else {
        col = 1.0 - (1.0 - c1) * (1.0 - c2 * opacity);
    }
    
    return col;
}

float getLayer3Noise(vec3 p) {
    float n = 0.0;
    if (uLayer3Turbulence > 0.001) {
        vec3 warp = vec3(
            snoise(p),
            snoise(p + vec3(12.4, 3.2, 1.1)),
            snoise(p + vec3(7.8, 9.2, 4.3))
        );
        n = snoise(p + warp * uLayer3Turbulence);
    } else {
        n = snoise(p);
    }
    return n;
}

vec3 getTextureColor(vec3 p, vec3 n, vec4 result) {
    float u = getMappingValue(uTextureModeU, p, result, n, 1.0);
    float v = getMappingValue(uTextureModeV, p, result, n, 1.0);
    vec2 uv = vec2(u, v) * uTextureScale + uTextureOffset;
    return textureLod0(uTexture, uv).rgb;
}

// Lightweight coloring for volumetric glow
vec3 getGlowColor(vec3 p_fractal, vec4 result) {
    if (uGlowIntensity < 0.0001) return vec3(0.0);
    
    vec3 color = vec3(0.0);
    if (uGlowMode > 0.5) {
        color = uGlowColor;
    } else {
        vec3 n = vec3(0.0, 1.0, 0.0); 
        float val1 = getMappingValue(uColorMode, p_fractal, result, n, uColorScale);
        float twistAngle = (abs(uColorTwist) > 0.001) ? atan(p_fractal.y, p_fractal.x) * 0.15915 : 0.0;
        
        float t1Raw = val1 * uColorScale + uColorOffset + (length(p_fractal) + twistAngle) * uColorTwist;
        float t1Wrapped = fract(t1Raw);
        if (t1Raw < 0.0) t1Wrapped = 1.0 - t1Wrapped;
        
        float t1 = pow(t1Wrapped, uGradientBias);
        color = textureLod0(uGradientTexture, vec2(t1, 0.5)).rgb;
    }
    return color;
}
`;
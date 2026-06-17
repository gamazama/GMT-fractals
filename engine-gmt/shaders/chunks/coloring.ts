

export const COLORING = `
// ------------------------------------------------------------------
// COLORING & PATTERN GENERATION
// ------------------------------------------------------------------

// Forward Declaration for Linkage
vec3 getGlowColor(vec3 p_fractal, vec4 result);
float getMappingValue(float mode, vec3 p, vec4 result, vec3 n, float repeatScale);

// The 'getMappingValue' function is now injected dynamically by ColoringFeature.
// See features/coloring/MappingModes.ts for logic.

// Log-spiral palette warp — single source of truth for the colour Twist control.
//   index += arms * azimuth(turns) + twist * log(radius)
// Integer arms keep the atan(-x) branch cut seamless; log(r) makes the spiral
// scale-invariant (self-similar under zoom). Returns 0 when both knobs are off.
// NOTE: MandelTerrain inlines the same maths because it compiles into the mesh
// SDF library, which does not include this COLORING chunk — keep them in sync.
float gmt_colorSpiral(vec3 p, float twist, float arms) {
    if (abs(twist) <= 0.001 && abs(arms) <= 0.001) return 0.0;
    return arms * (atan(p.y, p.x) * INV_TAU) + twist * log(max(length(p), 1.0e-3));
}

// Blend modes: 0=Mix, 1=Add, 2=Multiply, 3=Overlay, 4+=Screen
vec3 blendColors(vec3 c1, vec3 c2, float opacity, float mode) {
    vec3 col = c1;

    switch(int(mode + 0.1)) {
    case 0: // Mix
        col = mix(c1, c2, opacity);
        break;
    case 1: // Add
        col = c1 + c2 * opacity;
        break;
    case 2: // Multiply
        col = c1 * mix(vec3(1.0), c2, opacity);
        break;
    case 3: { // Overlay
        vec3 check = step(0.5, c1);
        vec3 res = mix(2.0 * c1 * c2, 1.0 - 2.0 * (1.0 - c1) * (1.0 - c2), check);
        col = mix(c1, res, opacity);
    } break;
    default: // Screen
        col = 1.0 - (1.0 - c1) * (1.0 - c2 * opacity);
        break;
    }

    return col;
}

#ifdef LAYER3_ENABLED
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
#else
float getLayer3Noise(vec3 p) { return 0.0; }
#endif // LAYER3_ENABLED

vec3 getTextureColor(vec3 p, vec3 n, vec4 result) {
    float u = getMappingValue(uTextureModeU, p, result, n, 1.0);
    float v = getMappingValue(uTextureModeV, p, result, n, 1.0);
    vec2 uv = vec2(u, v) * uTextureScale + uTextureOffset;
    
    vec3 col = textureLod0(uTexture, uv).rgb;
    return applyTextureProfile(col, uTextureColorSpace);
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
        float t1Raw = val1 * uColorScale + uColorOffset
                    + gmt_colorSpiral(p_fractal, uColorTwist, uColorTwistArms);
        float t1Wrapped = fract(t1Raw);
        if (t1Raw < 0.0) t1Wrapped = 1.0 - t1Wrapped;
        
        float t1 = pow(t1Wrapped, uGradientBias);
        color = textureLod0(uGradientTexture, vec2(t1, 0.5)).rgb;
    }
    return color;
}
`;

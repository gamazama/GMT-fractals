
// Updated signature to accept injected code block for volume logic
export const getTraceGLSL = (
    isMobile: boolean, 
    enableGlow: boolean, 
    precisionMode: number = 0, 
    glowQuality: number = 0,
    volumeBodyCode: string = "",
    volumeFinalizeCode: string = ""
) => {
    
    const useLowPrecision = (precisionMode === 1) || isMobile;

    const precisionLogic = useLowPrecision ? `
        float floatPrecision = max(1.0e-5, distFromFractalOrigin * 1.0e-5);
    ` : `
        float floatPrecision = max(1.0e-20, distFromFractalOrigin * 5.0e-7);
    `;

    return `
// ------------------------------------------------------------------
// STAGE 2: RAYMARCHING (Flattened & Optimized)
// ------------------------------------------------------------------

bool traceScene(vec3 ro, vec3 rd, out float d, out vec4 result, inout vec3 glow, float stochasticSeed, inout float volumetric) {
    d = 0.0;
    result = vec4(0.0);

    // 1. Bounding Sphere
    vec3 sphereCenter = -(uSceneOffsetHigh + uSceneOffsetLow);
    vec2 bounds = intersectSphere(ro - sphereCenter, rd, BOUNDING_RADIUS);
    if (bounds.x > bounds.y) return false;
    
    d = max(0.0, bounds.x);
    
    // 2. Flattened Accumulators
    vec3 accColor = vec3(0.0);
    float accDensity = 0.0;
    float accAlpha = 0.0; // Scalar glow accumulator for Fast Mode
    
    // 3. Loop Config
    float pixelSizeScale = length(uCamBasisY) / uResolution.y * 2.0;
    int limit = int(uMaxSteps);
    float maxMarch = MAX_DIST;
    
    // Temporary Hit holder (distance, trap, iter, decomp)
    vec4 h = vec4(0.0);

    for (int i = 0; i < MAX_HARD_ITERATIONS; i++) {
        if (i >= limit) break;

        vec3 p = ro + rd * d;
        
        // A. Distance Estimation (Raw vec4 return)
        // Note: map() now adds uCameraPosition internally
        h = map(p + uCameraPosition);
        
        // B. Volumetric Effects (Inlined Code Block)
        // Uses: d, h, p, accColor, accDensity, accAlpha
        ${volumeBodyCode}
        
        // C. Precision
        vec3 p_fractal_approx = p + uCameraPosition + uSceneOffsetLow + uSceneOffsetHigh;
        float distFromFractalOrigin = length(p_fractal_approx);
        
        ${precisionLogic}
        
        float threshold = pixelSizeScale * d * (uPixelThreshold / uDetail);
        float finalEps = max(threshold, floatPrecision);
        
        // D. Hit Detection
        if (h.x < finalEps) {
            // Apply Final Volumetric Resolve (Inlined)
            ${volumeFinalizeCode}
            
            // Output
            glow = accColor;
            volumetric = accDensity;
            result = h; // h.x is dist, h.yzw is trap data
            return true;
        }
        
        // E. Step Advance
        d += max(h.x, floatPrecision * 0.5) * uFudgeFactor;
        
        if (d > maxMarch) break;
    }
    
    // MISS: Resolve volume at infinity
    vec3 p_end = ro + rd * d;
    h = map(p_end + uCameraPosition);
    h.x = 1000.0; // Override dist
    
    // Run finalize on the miss state to color any accumulated glow
    vec3 p = p_end; // Alias for injected code
    ${volumeFinalizeCode}
    
    glow = accColor;
    volumetric = accDensity;
    
    return false;
}
`;
};

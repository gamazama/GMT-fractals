

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
    // pixelSizeScale: world-space size of an output pixel (NOT affected by internal scale)
    // Internal scale affects ray detail, not pixel size calculations
    float pixelSizeScale = length(uCamBasisY) / uResolution.y * 2.0;
    int limit = int(uMaxSteps);
    float maxMarch = MAX_DIST;
    
    // Temporary Hit holder (distance, trap, iter, decomp)
    vec4 h = vec4(0.0);

    // --- CANDIDATE TRACKING (Overstep Recovery) ---
    // Tracks the closest the ray ever got to a surface, normalized by the required precision at that depth.
    float minCandidateRatio = 1.0e10; 
    float candidateD = -1.0;

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
        
        // Dynamic Epsilon (Cone Tracing concept)
        // We relax the hit requirement as we get further away to prevent aliasing and stepping issues
        // Note: uDetail is divided by uInternalScale because at higher internal resolutions,
        // each output pixel covers more render pixels, so we need less precision per output pixel
        float effectiveDetail = uDetail / uInternalScale;
        float threshold = pixelSizeScale * d * (uPixelThreshold / effectiveDetail);
        float finalEps = max(threshold, floatPrecision);
        
        // D. Hit Detection
        if (h.x < finalEps) {
            
            // --- SURFACE REFINEMENT (Edge Polish) ---
            // If enabled, take a few extra tiny steps to settle exactly on the surface.
            // Helps significantly when uFudgeFactor is low but step count limited.
            int refine = uRefinementSteps;
            if (refine > 0) {
                float refineStep = h.x; 
                // We use a safe fraction to converge without overshooting
                float convergeFactor = uFudgeFactor * 0.8; 
                
                for(int j=0; j<5; j++) {
                    if (j >= refine) break;
                    d += refineStep * convergeFactor;
                    vec3 p_ref = ro + rd * d;
                    vec4 h_ref = map(p_ref + uCameraPosition);
                    
                    // If we went inside (negative or very small), or improvement is negligible, stop
                    if (h_ref.x < floatPrecision * 0.1) break;
                    
                    h = h_ref;
                    refineStep = h.x;
                }
            }

            // Apply Final Volumetric Resolve (Inlined)
            vec3 p_final = ro + rd * d; 
            vec3 p = p_final; // Alias for volumeFinalizeCode
            ${volumeFinalizeCode}
            
            // Output
            glow = accColor;
            volumetric = accDensity;
            result = h; // h.x is dist, h.yzw is trap data
            return true;
        }

        // E. Candidate Tracking
        if (uOverstepTolerance > 0.0) {
            float ratio = h.x / finalEps;
            // Capture the 'closest miss'
            if (ratio < minCandidateRatio) {
                minCandidateRatio = ratio;
                candidateD = d;
            }
        }
        
        // F. Step Advance (Dynamic Step Relaxation)
        // If uStepRelaxation > 0, we interpolate between uFudgeFactor and 1.0 based on distance.
        // Far from surface = Fast. Close to surface = Precise.
        float currentFudge = uFudgeFactor;
        if (uStepRelaxation > 0.0) {
             // 1.0 / (1.0 + 10.0 * uStepRelaxation) scales the "closeness" sensitivity.
             // If h.x is large relative to eps, we can be aggressive.
             float safeZone = h.x / (finalEps * 10.0); // 10x epsilon buffer
             float relax = smoothstep(0.0, 1.0, safeZone);
             currentFudge = mix(uFudgeFactor, 1.0, relax * uStepRelaxation);
        }

        d += max(h.x, floatPrecision * 0.5) * currentFudge;
        
        if (d > maxMarch) break;
    }
    
    // --- RECOVERY CHECK ---
    // If we missed, but we tracked a candidate that was within 'uOverstepTolerance' multiples of the threshold,
    // we assume we tunneled through a detailed surface and snap back to it.
    if (uOverstepTolerance > 0.0 && candidateD > 0.0) {
        // Example: If tolerance is 2.0, we accept misses that were within 2x the epsilon.
        // E.g. We missed with ratio 1.5, which is < 1.0 (hit) + 2.0 (tol).
        if (minCandidateRatio <= (1.0 + uOverstepTolerance)) {
             d = candidateD;
             // Re-evaluate map at the candidate position to get correct Trap/Color data
             // We can't trust 'h' because it's from the last missed step at infinity
             vec3 p_cand = ro + rd * d;
             result = map(p_cand + uCameraPosition);
             result.x = 0.0; // Force hit
             
             // Finalize volume for the recovered path? 
             // Strictly speaking we should, but for visual consistency we use the accumulated values.
             
             vec3 p = p_cand; // Alias for injected code which expects 'p'
             
             ${volumeFinalizeCode}
             glow = accColor;
             volumetric = accDensity;
             return true;
        }
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

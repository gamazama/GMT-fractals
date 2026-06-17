

// Updated signature to accept injected code block for volume logic
export const getTraceGLSL = (
    isMobile: boolean,
    enableGlow: boolean,
    precisionMode: number = 0,
    glowQuality: number = 0,
    volumeBodyCode: string = "",
    volumeFinalizeCode: string = "",
    functionName: string = "traceScene"
) => {
    
    const useLowPrecision = (precisionMode === 1) || isMobile;

    // Adaptive precision: epsilon scales with distance from fractal origin to prevent
    // floating-point artifacts at deep zoom. The ratio (5e-7 high / 1e-5 low) determines
    // minimum detail size relative to distance — lower ratio = finer detail but more noise.
    const precisionLogic = useLowPrecision ? `
        float floatPrecision = max(PRECISION_RATIO_LOW, distFromFractalOrigin * PRECISION_RATIO_LOW);  // Low precision: ~10 ppm
    ` : `
        float floatPrecision = max(1.0e-20, distFromFractalOrigin * PRECISION_RATIO_HIGH);  // High precision: ~0.5 ppm
    `;

    const missBlock = volumeFinalizeCode.trim().length > 0
        ? `vec3 p_end = ro + rd * d;
    h = map(p_end + uCameraPosition);
    h.x = MISS_DIST;
    vec3 p = p_end;
    ${volumeFinalizeCode}`
        : `h = vec4(MISS_DIST, 0.0, 0.0, 0.0);`;

    // Audit Tier 1 #1 (split map/mapDist in march loop) was tried and reverted:
    // the compiler already DCEs unused trap/iter/decomposition in map() because
    // h.y/h.z/h.w aren't read downstream when no volumetric body needs them.
    // Replacing the inner call with mapDist() saved nothing per-step but added
    // a redundant map() call at hit detection, net slower (+5%). See
    // bench-shader history 2026-05-02 for the regression run.
    const innerDistCall = `h = map(p + uCameraPosition);`;
    const hitFinalizeCall = ``;

    return `
// ------------------------------------------------------------------
// STAGE 2: RAYMARCHING (Flattened & Optimized)
// ------------------------------------------------------------------

bool ${functionName}(vec3 ro, vec3 rd, out float d, out vec4 result, inout vec3 glow, float stochasticSeed, inout float volumetric, out vec3 fogScatter) {
    d = 0.0;
    result = vec4(0.0);

    // 1. Bounding Sphere
    // Pre-compute the world-origin offset once. uCameraPosition + uSceneOffset*
    // are all frame-constant and were being re-summed every march step at the
    // precision-check site below — moving the addition outside the loop saves
    // 2 vec3 adds per step per pixel (audit Tier 1).
    vec3 worldOriginOffset = uCameraPosition + uSceneOffsetLow + uSceneOffsetHigh;
    vec3 sphereCenter = -(uSceneOffsetHigh + uSceneOffsetLow);
    vec2 bounds = intersectSphere(ro - sphereCenter, rd, BOUNDING_RADIUS);
    if (bounds.x > bounds.y) { fogScatter = vec3(0.0); return false; }

    d = max(0.0, bounds.x);

    // 2. Flattened Accumulators
    vec3 accColor = vec3(0.0);
    vec3 accScatter = vec3(0.0); // Volumetric scatter (god rays) accumulator
    float accDensity = 0.0;
    float accAlpha = 0.0; // Scalar glow accumulator for Fast Mode
    
    // 3. Loop Config
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
        
        // A. Distance Estimation
        // When no per-step volumetric body needs trap data, use mapDist() —
        // distance only, skipping orbit-trap mins / decomposition / smoothing.
        ${innerDistCall}
        
        // B. Volumetric Effects (Inlined Code Block)
        // Uses: d, h, p, accColor, accDensity, accAlpha
        ${volumeBodyCode}
        
        // C. Precision
        vec3 p_fractal_approx = p + worldOriginOffset;
        float distFromFractalOrigin = length(p_fractal_approx);
        
        ${precisionLogic}
        
        // Dynamic Epsilon (Cone Tracing). uPixelSizeBase is viewport-pixel size
        // (invariant to adaptive downscale — see UniformManager.syncFrame). The
        // uDetail / uInternalScale factor also cancels DPR from the threshold, so
        // uPixelThreshold means "fraction of a viewport pixel" across all scales.
        // Ortho: parallel rays → pixel footprint is constant.
        // Perspective/360: cone widens with distance → scale by d.
        float effectiveDetail = uDetail / uInternalScale;
        float pixelFootprint = (uCamType > 0.5 && uCamType < 1.5)
            ? uPixelSizeBase
            : uPixelSizeBase * d;
        float threshold = pixelFootprint * (uPixelThreshold / effectiveDetail);
        float finalEps = max(threshold, floatPrecision);
        
        // D. Hit Detection
        if (h.x < finalEps) {

            // Populate full map() data (orbit-trap, iter, decomposition) once
            // at the hit point — only the distance was tracked through the
            // inner loop when innerVolumeBodyEmpty is true. No-op otherwise.
            ${hitFinalizeCall}

            // --- SURFACE REFINEMENT (Edge Polish) ---
            // If enabled, take a few extra tiny steps to settle exactly on the surface.
            // Helps significantly when uFudgeFactor is low but step count limited.
            int refine = uRefinementSteps;
            if (refine > 0) {
                float refineStep = h.x; 
                // We use a safe fraction to converge without overshooting
                float convergeFactor = uFudgeFactor * 0.8;  // 80% of fudge factor — conservative to prevent overshooting surface
                
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
            fogScatter = accScatter;
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
        // Interpolate between uFudgeFactor and 1.0 based on distance-to-surface ratio.
        // When uStepRelaxation == 0, relax * 0 == 0 so mix returns uFudgeFactor (no-op).
        float safeZone = h.x / (finalEps * 10.0);
        float relax = smoothstep(0.0, 1.0, safeZone);
        float currentFudge = mix(uFudgeFactor, 1.0, relax * uStepRelaxation);

        // Stochastic step jitter: break up deterministic DE banding.
        // Asymmetric [1-jitter, 1.0] — biased short to avoid overshoot.
        // uStepJitter=0 disables (stepJitter=1.0). uStepJitter=0.15 is default.
        // Disabled during navigation for a clean image — banding
        // averages away once accumulation starts.
        // Stochastic step jitter — coprime hash constants (127.1, 31.7) prevent banding artifacts
        float stepJitter = uBlendFactor >= 0.99 ? 1.0 : (1.0 - uStepJitter) + uStepJitter * fract(stochasticSeed * 127.1 + d * 31.7);
        d += max(h.x, floatPrecision * 0.5) * currentFudge * stepJitter;

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
             fogScatter = accScatter;
             volumetric = accDensity;
             return true;
        }
    }

    // MISS: Resolve volume at infinity
    ${missBlock}

    glow = accColor;
    fogScatter = accScatter;
    volumetric = accDensity;

    return false;
}
`;
};
